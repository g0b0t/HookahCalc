// Мини-обёртка над Telegram WebApp API с мок-режимом
type TgUser = { id: number; first_name?: string; username?: string };
type TgWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: TgUser; start_param?: string };
  ready: () => void;
  expand: () => void;
  themeParams?: Record<string, string>;
  BackButton?: { show(): void; hide(): void; onClick(cb: () => void): void };
  MainButton?: { setText(t: string): void; show(): void; hide(): void; onClick(cb: () => void): void };
};

export type TelegramCtx = {
  tg: TgWebApp;
  inTelegram: boolean;         // true при запуске в Telegram
  user?: TgUser;               // из initDataUnsafe (не верифицировано на S0)
  startParam?: string;         // deeplink параметр (например add_bowl:SESSION_ID)
};

export function getTelegramCtx(): TelegramCtx {
  const tg = (window as any).Telegram?.WebApp as TgWebApp | undefined;

  if (tg && typeof tg.ready === "function") {
    tg.ready();
    tg.expand?.();
    return {
      tg,
      inTelegram: true,
      user: tg.initDataUnsafe?.user,
      startParam: tg.initDataUnsafe?.start_param,
    };
  }

  // Мок для dev-режима (браузер)
  const mock: TgWebApp = {
    ready: () => {},
    expand: () => {},
    initDataUnsafe: { user: { id: 1, first_name: "Dev", username: "dev" }, start_param: "" },
  };
  return { tg: mock, inTelegram: false, user: mock.initDataUnsafe!.user, startParam: "" };
}
