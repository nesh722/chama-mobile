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

// How far through a cycle we are. Returns null for old-style labels (e.g. '2026-W42')
// that don't carry their dates.
export function getCycleProgress(cycle: string) {
  let start: Date;
  let totalDays: number;

  const monthly = /^(\d{4})-(\d{2})$/.exec(cycle);
  const weekly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cycle);

  if (monthly) {
    const year = Number(monthly[1]);
    const month = Number(monthly[2]);
    start = new Date(year, month - 1, 1);
    totalDays = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this one
  } else if (weekly) {
    start = new Date(Number(weekly[1]), Number(weekly[2]) - 1, Number(weekly[3]));
    totalDays = 7;
  } else {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const elapsed = Math.round((today.getTime() - start.getTime()) / 86400000);
  const day = Math.min(Math.max(elapsed + 1, 1), totalDays);

  return { day, totalDays, daysLeft: totalDays - day };
}