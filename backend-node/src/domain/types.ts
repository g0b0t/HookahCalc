export type ID = string;

export type User = {
  id: ID;            // UUID сервера
  tgId: number;      // Telegram user id
  name: string;
  username?: string;
  createdAt: string; // ISO
};

export type Bowl = {
  id: ID;
  at: string;             // ISO
  priceRub: number;       // целые рубли
  participantIds: ID[];   // ссылка на участников сессии
};

export type Session = {
  id: ID;
  hostUserId: ID;
  title: string;
  place?: string;
  pricePerBowlRub: number;
  startedAt: string;
  closedAt?: string;
  users: { id: ID; label: string; active: boolean }[];
  bowls: Bowl[];
  version: number;
};