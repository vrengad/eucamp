export function summarizeExpenses(entries, familyIds) {
  const paidTotals = Object.fromEntries(familyIds.map((id) => [id, 0]));
  const owedTotals = Object.fromEntries(familyIds.map((id) => [id, 0]));

  entries.forEach((entry) => {
    if (!entry || !Number.isFinite(entry.amount) || entry.amount <= 0) return;
    if (paidTotals[entry.paidBy] !== undefined) {
      paidTotals[entry.paidBy] += entry.amount;
    }
    const participants = Array.isArray(entry.sharedWith) && entry.sharedWith.length ? entry.sharedWith : familyIds;
    const perHead = entry.amount / participants.length;
    participants.forEach((id) => {
      if (owedTotals[id] !== undefined) {
        owedTotals[id] += perHead;
      }
    });
  });

  const net = Object.fromEntries(
    familyIds.map((id) => [id, +(paidTotals[id] - owedTotals[id]).toFixed(2)])
  );

  return { paidTotals, owedTotals, net };
}

export function buildSettlement(netByFamily) {
  const creditors = [];
  const debtors = [];

  Object.entries(netByFamily).forEach(([familyId, amount]) => {
    if (amount > 0.009) creditors.push({ familyId, amount });
    if (amount < -0.009) debtors.push({ familyId, amount: Math.abs(amount) });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({ from: debtors[i].familyId, to: creditors[j].familyId, amount: +pay.toFixed(2) });
    debtors[i].amount = +(debtors[i].amount - pay).toFixed(2);
    creditors[j].amount = +(creditors[j].amount - pay).toFixed(2);
    if (debtors[i].amount <= 0.009) i += 1;
    if (creditors[j].amount <= 0.009) j += 1;
  }

  return settlements;
}
