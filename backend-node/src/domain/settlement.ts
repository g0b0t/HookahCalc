// Взаимозачёт и расчёт балансов в РУБЛЯХ (целых)
import type { ID } from "./types.js";

export type Balances = Record<ID, number>; // рубли (целые)
export type Transfer = { from: ID; to: ID; cents: number }; // "cents" = рубли (для совместимости с фронтом S0)

/**
 * Считает нетто-баланс по пользователям.
 * Потребление считается "минусом", внешние расходы (если переданы) — "плюсом".
 * Остаточные рубли при делении распределяются детерминированно по отсортированным участникам.
 */
export function computeBalances(
  users: { id: ID }[],
  bowls: { priceRub: number; participantIds: ID[] }[],
  expenses: Partial<Record<ID, number>> = {}
): Balances {
  const balances: Balances = Object.fromEntries(users.map(u => [u.id, 0]));

  // Внешние расходы (если используешь) — плюсуем плательщику
  for (const [uid, amt] of Object.entries(expenses)) {
    if (uid in balances && typeof amt === "number") {
      balances[uid] += amt;
    }
  }

  for (const bowl of bowls) {
    const n = bowl.participantIds.length || 1;
    const base = Math.floor(bowl.priceRub / n);
    let leftover = bowl.priceRub - base * n; // остаточные рубли

    // детерминированно распределяем остатки по отсортированному списку
    const sorted = bowl.participantIds.slice().sort();
    for (const uid of sorted) {
      let share = base;
      if (leftover > 0) { share += 1; leftover -= 1; }
      if (uid in balances) balances[uid] -= share; // потребление = минус
    }
  }

  return balances;
}

/**
 * Жадный алгоритм взаимозачёта:
 * сводим крупнейшего должника с крупнейшим кредитором, пока есть несведённые суммы.
 */
export function settle(balances: Balances): Transfer[] {
  const debtors: [ID, number][] = [];
  const creditors: [ID, number][] = [];

  for (const [id, v] of Object.entries(balances)) {
    if (v < 0) debtors.push([id, v]);
    else if (v > 0) creditors.push([id, v]);
  }
  if (debtors.length === 0 || creditors.length === 0) return [];

  // должники: по возрастанию (самый "в минусе" — в конце), кредиторы: по убыванию
  debtors.sort((a, b) => a[1] - b[1]);
  creditors.sort((a, b) => b[1] - a[1]);

  const out: Transfer[] = [];
  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const [dId, dVal] = debtors[di];
    const [cId, cVal] = creditors[ci];
    const pay = Math.min(-dVal, cVal);
    out.push({ from: dId, to: cId, cents: pay });
    const newD = dVal + pay; // dVal < 0
    const newC = cVal - pay; // cVal > 0
    debtors[di][1] = newD;
    creditors[ci][1] = newC;
    if (newD === 0) di++;
    if (newC === 0) ci++;
  }
  return out;
}