const thisYear = new Date().getFullYear();
const short = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const day = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const stamp = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** "11 Nov" this year, "11 Nov 2025" otherwise. */
export const formatDay = (iso: string) => {
  const d = new Date(iso);
  return (d.getFullYear() === thisYear ? short : day).format(d);
};
export const formatStamp = (iso: string) => stamp.format(new Date(iso));

/** Counts up from the oldest, so the newest is highest. */
export const indexNo = (n: number) => String(n).padStart(3, '0');
