import { useState } from "react";
import { repo } from "../storage/localRepo";
import type { Session, User } from "../storage/types";
import { fmtMoney } from "../domain/money";

export default function SessionScreen() {
  const [session, setSession] = useState<Session | null>(() => {
    const st = repo.getState();
    const id = st.lastSessionId ?? st.sessions[0]?.id;
    return id ? repo.getSession(id)! : null;
  });

  if (!session) return <CreateSession onCreate={setSession} />;
  return <SessionView session={session} setSession={setSession} />;
}

function SessionView({
  session,
  setSession,
}: {
  session: Session;
  setSession: (s: Session) => void;
}) {
  const price = session.pricePerBowlRub;

  function toggleUser(u: User) {
    const s: Session = {
      ...session,
      users: session.users.map((x) =>
        x.id === u.id ? { ...x, active: !x.active } : x
      ),
    };
    repo.upsertSession(s);
    setSession(s);
  }

  function addBowl() {
    const bowl = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      priceRub: price,
      participantIds: session.users.filter((u) => u.active).map((u) => u.id),
    };
    const s: Session = { ...session, bowls: [bowl, ...session.bowls] };
    repo.upsertSession(s);
    setSession(s);
  }

  return (
    <div className="wrap">
      <header>
        <div className="title">{session.title}</div>
        <div className="sub">
          {session.place ?? "—"} • Цена за чашу: {fmtMoney(price)}
        </div>
      </header>

      <section>
        <div className="section-title">Участники</div>
        <div className="chips">
          {session.users.map((u) => (
            <button
              key={u.id}
              className={`chip ${u.active ? "chip-on" : ""}`}
              onClick={() => toggleUser(u)}
            >
              {u.label}
            </button>
          ))}
          <button
            className="chip"
            onClick={() => {
              const label = prompt("Имя / метка участника?");
              if (!label) return;
              const u: User = { id: crypto.randomUUID(), label, active: true };
              const s: Session = { ...session, users: [...session.users, u] };
              repo.upsertSession(s);
              setSession(s);
            }}
          >
            + участник
          </button>
        </div>
      </section>

      <section>
        <button className="primary" onClick={addBowl}>
          + Чаша
        </button>
        <div className="hint">
          По умолчанию делится между отмеченными участниками
        </div>
      </section>

      <section>
        <div className="section-title">Сегодня</div>
        <div className="list">
          {session.bowls.map((b) => (
            <div className="card" key={b.id}>
              <div>
                <div className="card-title">
                  Чаша • {new Date(b.at).toLocaleTimeString()}
                </div>
                <div className="card-sub">
                  Участников: {b.participantIds.length}
                </div>
              </div>
              <div className="sum">{fmtMoney(b.priceRub)}</div>
            </div>
          ))}
          {session.bowls.length === 0 && (
            <div className="empty">Пока нет чаш</div>
          )}
        </div>
      </section>
    </div>
  );
}

function CreateSession({ onCreate }: { onCreate: (s: Session) => void }) {
  const [title, setTitle] = useState("Пятница у Алекса");
  const [place, setPlace] = useState("Дом");
  const [price, setPrice] = useState(700); // рубли (целое)

  function create() {
    const s: Session = {
      id: crypto.randomUUID(),
      title,
      place,
      pricePerBowlRub: price,
      startedAt: new Date().toISOString(),
      users: [],
      bowls: [],
      version: 1,
    };
    repo.upsertSession(s);
    onCreate(s);
  }

  return (
    <div className="wrap">
      <header>
        <div className="title">Новая сессия</div>
      </header>
      <section className="form">
        <label>
          Название
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Место
          <input value={place} onChange={(e) => setPlace(e.target.value)} />
        </label>
        <label>
          Цена за чашу (в рублях)
          <input
            type="number"
            value={price}
            onChange={(e) =>
              setPrice(parseInt(e.target.value || "0", 10))
            }
          />
        </label>
        <button className="primary" onClick={create}>
          Создать
        </button>
      </section>
    </div>
  );
}