import type { AppState, Session, ID } from "./types";


const KEY = "hookah-split-state-v1";

function load(): AppState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { sessions: [], schemaVersion: 1 };
  try { return JSON.parse(raw) as AppState; } catch { return { sessions: [], schemaVersion: 1 }; }
}

function save(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export const repo = {
  getState(): AppState {
    return load();
  },

  upsertSession(s: Session) {
    const st = load();
    const i = st.sessions.findIndex(x => x.id === s.id);
    if (i >= 0) st.sessions[i] = s; else st.sessions.push(s);
    st.lastSessionId = s.id;
    save(st);
  },

  getSession(id: ID): Session | undefined {
    return load().sessions.find(s => s.id === id);
  },

  listSessions(): Session[] {
    return load().sessions.slice().sort((a, b) =>
      (b.startedAt || "").localeCompare(a.startedAt || "")
    );
  },

  setLastSession(id?: ID) {
    const st = load();
    st.lastSessionId = id;
    save(st);
  },

  exportJson(): Blob {
    return new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
  },

  importJson(fileText: string) {
    const data = JSON.parse(fileText) as AppState;
    // простая валидация: проверим ключевые поля
    if (!data.sessions || typeof data.schemaVersion !== "number") {
      throw new Error("Неверный формат файла");
    }
    save(data);
  }
};
