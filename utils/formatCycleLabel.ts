const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Turns a stored cycle label into something readable. Display only: the stored
// label ('2026-10', '2026-10-14') is unchanged.
export function formatCycleLabel(cycle: string) {
  const monthly = /^(\d{4})-(\d{2})$/.exec(cycle);
  if (monthly) {
    return `${MONTH_NAMES[Number(monthly[2]) - 1]} ${monthly[1]}`;
  }
  const weekly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cycle);
  if (weekly) {
    return `week of ${MONTH_NAMES[Number(weekly[2]) - 1].slice(0, 3)} ${Number(weekly[3])}, ${weekly[1]}`;
  }
  return cycle; // old-style labels like '2026-W42' are shown as they are
}