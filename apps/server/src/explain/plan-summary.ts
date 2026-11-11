/** Reads explain() output for classic and slot-based plans. */

export type Doc = Record<string, unknown>;

export interface PlanSummary {
  /** Index names used anywhere in the command, plus "COLLSCAN" and "metadata" markers. */
  access: string[];
  /** The winning plan as indented lines (stage, index, bounds). */
  tree: string[];
  /** Per-$lookup stats, when the pipeline has one. */
  lookups: Doc[];
  nReturned?: number;
  keysExamined?: number;
  docsExamined?: number;
  millis?: number;
  /** A blocking in-memory SORT in the query layer (not counting $sort on grouped results). */
  blockingSort: boolean;
}

/** Shell-style JSON: ObjectId('...'), MinKey/MaxKey, and Maps as objects. */
export function toText(value: unknown): string {
  return JSON.stringify(value, function (this: Doc, key: string, current: unknown) {
    const raw = key === '' ? current : this[key];
    if (raw instanceof Map) return Object.fromEntries(raw);
    const type = (raw as { _bsontype?: string } | null)?._bsontype;
    if (type === 'ObjectId') return `ObjectId('${String(raw)}')`;
    if (type === 'MinKey' || type === 'MaxKey') return type;
    return current;
  });
}

const asDoc = (v: unknown): Doc | undefined => (v && typeof v === 'object' ? (v as Doc) : undefined);

/** Classic plans nest inputStage(s); slot-based ones keep a classic-shaped `queryPlan`. */
function planRoot(queryPlanner: Doc | undefined): Doc | undefined {
  const winning = asDoc(queryPlanner?.['winningPlan']);
  return asDoc(winning?.['queryPlan']) ?? winning;
}

function walk(node: Doc | undefined, depth: number, out: PlanSummary): void {
  if (!node) return;
  const stage = String(node['stage']);
  const index = node['indexName'] as string | undefined;
  const bounds = node['indexBounds'] ? ` bounds ${toText(node['indexBounds'])}` : '';
  out.tree.push(`${'  '.repeat(depth)}${stage}${index ? ` ${index}` : ''}${bounds}`);
  if (index) out.access.push(index);
  if (stage === 'IDHACK' || stage === 'EXPRESS_IXSCAN' || stage === 'EXPRESS_IDHACK') out.access.push(index ?? '_id_');
  if (stage === 'COLLSCAN') out.access.push('COLLSCAN');
  if (stage === 'RECORD_STORE_FAST_COUNT' || (stage === 'COUNT' && !node['inputStage'])) out.access.push('metadata');
  if (stage === 'SORT') out.blockingSort = true;
  for (const child of [node['inputStage'], ...((node['inputStages'] as unknown[]) ?? [])]) walk(asDoc(child), depth + 1, out);
}

export function summarise(explain: Doc): PlanSummary {
  const out: PlanSummary = { access: [], tree: [], lookups: [], blockingSort: false };
  const stages = explain['stages'] as Doc[] | undefined;
  // An aggregate either runs fully in the query layer (no `stages`) or starts with a $cursor.
  const cursor = asDoc(asDoc(stages?.[0])?.['$cursor']) ?? explain;
  walk(planRoot(asDoc(cursor['queryPlanner'])), 0, out);
  const stats = asDoc(cursor['executionStats']);
  out.nReturned = stats?.['nReturned'] as number | undefined;
  out.keysExamined = stats?.['totalKeysExamined'] as number | undefined;
  out.docsExamined = stats?.['totalDocsExamined'] as number | undefined;
  out.millis = stats?.['executionTimeMillis'] as number | undefined;
  for (const stage of stages ?? []) {
    if (!stage['$lookup']) continue;
    const lookup = {
      from: asDoc(stage['$lookup'])?.['from'],
      indexesUsed: stage['indexesUsed'],
      collectionScans: stage['collectionScans'],
      totalKeysExamined: stage['totalKeysExamined'],
      totalDocsExamined: stage['totalDocsExamined'],
    };
    out.lookups.push(lookup);
    out.tree.push(
      `$lookup ${String(lookup.from)} indexesUsed=${toText(lookup.indexesUsed)} collectionScans=${String(lookup.collectionScans)}` +
        ` totalKeysExamined=${String(lookup.totalKeysExamined)} totalDocsExamined=${String(lookup.totalDocsExamined)}`,
    );
    out.access.push(...((lookup.indexesUsed as string[]) ?? []));
    if (Number(lookup.collectionScans) > 0) out.access.push('COLLSCAN');
  }
  return out;
}

/** Driver-added fields that `explain` rejects or that only describe the session. */
export function bareCommand(command: Doc): Doc {
  const bare: Doc = {};
  for (const [key, value] of Object.entries(command)) {
    if (key.startsWith('$') || ['lsid', 'txnNumber', 'readConcern', 'apiVersion', 'apiStrict', 'apiDeprecationErrors'].includes(key)) continue;
    bare[key] = value;
  }
  return bare;
}
