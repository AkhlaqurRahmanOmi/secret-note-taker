export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A class, so ResponseInterceptor can detect it with `instanceof`. */
export class Paginated<T> {
  readonly data: T[];
  readonly meta: PageMeta;

  constructor(data: T[], { page, limit, total }: Omit<PageMeta, 'totalPages'>) {
    this.data = data;
    this.meta = { page, limit, total, totalPages: Math.ceil(total / limit) };
  }
}
