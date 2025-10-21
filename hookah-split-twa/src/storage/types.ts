export type ID = string; // crypto.randomUUID()

export type User = {
  id: ID;
  label: string;   // "Alex", "MS" и т.п. (локальные обозначения)
  active: boolean;
};

export type Bowl = {
  id: ID;
  at: string;              // ISO-время добавления
  priceRub: number;        // сумма чаши в РУБЛЯХ (целое число)
  participantIds: ID[];    // список участников, кто делит чашу
};

export type Session = {
  id: ID;
  title: string;
  place?: string;
  pricePerBowlRub: number; // цена за чашу (руб.)
  startedAt: string;       // ISO
  closedAt?: string;
  users: User[];
  bowls: Bowl[];
  version: number;         // для будущих миграций
};

export type AppState = {
  sessions: Session[];
  lastSessionId?: ID;
  schemaVersion: number;   // версия структуры файла
};