import type { ID } from "../storage/types";

export type Balances = Record<ID, number>;     // рубли (целые)
export type Transfer = { from: ID; to: ID; cents: number }; // назови поле как хочешь, это рубли

export function settle(balances: Balances): Transfer[] {
  const debtors: [ID, number][] = [];
  const creditors: [ID, number][] = [];

  for (const [id, v] of Object.entries(balances)) {
    if (v < 0) debtors.push([id, v]);
    else if (v > 0) creditors.push([id, v]);
  }
  debtors.sort((a,b) => a[1] - b[1]);   // должники: самый "в минусе" — в конце
  creditors.sort((a,b) => b[1] - a[1]); // кредиторы: самый "в плюсе" — в начале

  const out: Transfer[] = [];
  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const [dId, dVal] = debtors[di];
    const [cId, cVal] = creditors[ci];
    const pay = Math.min(-dVal, cVal);
    out.push({ from: dId, to: cId, cents: pay }); // тут "cents" = рубли
    const newD = dVal + pay; // dVal < 0
    const newC = cVal - pay; // cVal > 0
    debtors[di][1] = newD;
    creditors[ci][1] = newC;
    if (newD === 0) di++;
    if (newC === 0) ci++;
  }
  return out;
}

/** Балансы по сессии в рублях.
 * priceTotal — сумма чаши; доля участника = floor(priceTotal / n), остаток (<= n-1 руб.) распределяем по отсортированному списку id.
 */
export function computeBalances(
  users: {id: ID}[],
  bowls: { priceRub: number; participantIds: ID[] }[],
  expenses: { [id: ID]: number } = {} // если кто-то покупал расходники (на S0 можно не использовать)
): Balances {
  const balances: Balances = Object.fromEntries(users.map(u => [u.id, 0]));

  // расходы на общие (если используешь) — в плюс плательщику
  for (const [uid, amt] of Object.entries(expenses)) {
    if (balances[uid] !== undefined) balances[uid] += amt;
  }

  for (const bowl of bowls) {
    const n = bowl.participantIds.length || 1;
    const base = Math.floor(bowl.priceRub / n);
    let leftover = bowl.priceRub - base * n; // остаточные рубли
    const sorted = bowl.participantIds.slice().sort(); // детерминизм
    for (const uid of sorted) {
      let share = base;
      if (leftover > 0) { share += 1; leftover -= 1; }
      // участник "потребил" share → это минус в его балансе
      if (balances[uid] !== undefined) balances[uid] -= share;
    }
  }
  return balances;
}
