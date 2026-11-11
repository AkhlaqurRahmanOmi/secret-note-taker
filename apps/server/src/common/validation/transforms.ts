/** DTO normalisers, run before validation. Non-strings pass through for the validators. */

type TransformArgs = { value: unknown };

export const trim = ({ value }: TransformArgs) => (typeof value === 'string' ? value.trim() : value);

/** One form per email, so case doesn't create a second account. */
export const trimLower = ({ value }: TransformArgs) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** Trimmed, lowercased, de-duplicated: a user counts once per interest when grouping. */
export const normaliseList = ({ value }: TransformArgs) =>
  Array.isArray(value)
    ? [...new Set(value.map((v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v)))]
    : value;
