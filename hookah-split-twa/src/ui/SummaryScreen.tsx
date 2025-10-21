import { useMemo, useState } from "react";
import { repo } from "../storage/localRepo";
import { fmtMoney } from "../domain/money";
import { computeBalances, settle } from "../domain/settlement";
import type { Transfer } from "../domain/settlement";
import type { Session } from "../storage/types";

export default function SummaryScreen() {
  const [session] = useState<Session | null>(() => {
    const st = repo.getState();
    const id = st.lastSessionId ?? st.sessions[0]?.id;
    return id ? repo.getSession(id)! : null;
  });

  if (!session) {
    return (
      <div className="wrap">
        <header>
          <div className="title">Нет активной сессии</div>
        </header>
      </div>
    );
  }

  return <SummaryView session={session} />;
}

function SummaryView({ session }: { session: Session }) {
  const balances = useMemo(
    () => computeBalances(session.users, session.bowls),
    [session.users, session.bowls]
  );

  const transfers: Transfer[] = useMemo(
    () => settle(balances),
    [balances]
  );

  const sum = useMemo(
    () => session.bowls.reduce((a, b) => a + b.priceRub, 0),
    [session.bowls]
  );

  function shareText() {
    const lines: string[] = [];
    lines.push(`Итоги: ${session.title} (${session.place ?? "—"})`);
    lines.push(`Всего чаш: ${session.bowls.length}, сумма: ${fmtMoney(sum)}`);
    lines.push(`Личные балансы:`);
    for (const u of session.users) {
      const b = balances[u.id] ?? 0;
      const sign = b > 0 ? "+" : "";
      lines.push(`• ${u.label}: ${sign}${fmtMoney(b)}`);
    }
    if (transfers.length) {
      lines.push(`Переводы:`);
      for (const t of transfers) {
        const from = session.users.find((x) => x.id === t.from)?.label ?? "—";
        const to = session.users.find((x) => x.id === t.to)?.label ?? "—";
        lines.push(`→ ${from} → ${to}: ${fmtMoney(t.cents)}`);
      }
    }
    return lines.join("\n");
  }

  return (
    <div className="wrap">
      <header>
        <div className="title">Итоги</div>
        <div className="sub">
          Всего чаш: {session.bowls.length} • Сумма: {fmtMoney(sum)}
        </div>
      </header>

      <section>
        <div className="section-title">Личные балансы</div>
        <div className="list">
          {session.users.map((u) => {
            const b = balances[u.id] ?? 0;
            const cls = b >= 0 ? "plus" : "minus";
            return (
              <div className="card" key={u.id}>
                <div className="card-title">{u.label}</div>
                <div className={`sum ${cls}`}>
                  {b >= 0 ? "+" : ""}
                  {fmtMoney(b)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-title">Минимальные переводы</div>
        <div className="list">
          {transfers.length === 0 && (
            <div className="empty">Никто никому ничего не должен</div>
          )}
          {transfers.map((t, i) => {
            const from = session.users.find((x) => x.id === t.from)?.label ?? "—";
            const to = session.users.find((x) => x.id === t.to)?.label ?? "—";
            return (
              <div className="card" key={i}>
                <div className="card-title">
                  {from} → {to}
                </div>
                <div className="sum">{fmtMoney(t.cents)}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <button
          className="secondary"
          onClick={async () => {
            const text = shareText();
            if (navigator.share) {
              try {
                await navigator.share({ text });
                return;
              } catch {}
            }
            await navigator.clipboard.writeText(text);
            alert("Итоги скопированы в буфер обмена");
          }}
        >
          Поделиться итогами
        </button>
      </section>
    </div>
  );
}