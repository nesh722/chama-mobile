export function describeInterest(rate: any, period: string, grace: any, cap: any) {
  const r = parseFloat(rate) || 0;
  if (r <= 0) return 'No late interest on loans in this group.';
  const per = period === 'weekly' ? 'week' : 'month';
  const g = parseInt(grace, 10) || 0;
  const c = parseFloat(cap) || 50;
  return `Late interest: ${r}% of the unpaid balance per ${per} overdue${g > 0 ? `, starting ${g} day${g === 1 ? '' : 's'} after the due date` : ''}, capped at ${c}% of the loan.`;
}

// Short form for chips and cards: '10% per month after 3-day grace'
export function describeInterestShort(rate: any, period: string, grace?: any) {
  const r = parseFloat(rate) || 0;
  if (r <= 0) return 'No late interest';
  const per = period === 'weekly' ? 'week' : 'month';
  const g = parseInt(grace, 10) || 0;
  return `${r}% per ${per}${g > 0 ? ` after ${g}-day grace` : ''}`;
}

// 1000 -> 'KES 1,000.00'
export function formatMoney(value: any) {
  const n = Number(value) || 0;
  return `KES ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}