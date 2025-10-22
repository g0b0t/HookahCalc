import type { FastifyPluginCallback } from "fastify";
import { verifyInitData } from "./telegramVerify.js";

const DEV_ALLOW_ANON = process.env.DEV_ALLOW_ANON === "1";

export const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  // Страховка: в проде dev-режим запрещён
  if (process.env.NODE_ENV === "production" && DEV_ALLOW_ANON) {
    fastify.log.warn("DEV_ALLOW_ANON is ON in production — disabling it");
  }

  fastify.addHook("onRequest", (req, _reply, next) => {
    // Повесим результат сюда, чтобы роуты могли проверять авторизацию
    (req as any).tg = undefined;

    // 1) DEV-обход: если разрешено и пришёл x-dev-user — считаем авторизованным
    if (DEV_ALLOW_ANON && process.env.NODE_ENV !== "production") {
      const devUser = req.headers["x-dev-user"];
      if (devUser) {
        (req as any).tg = {
          user: {
            id: Number(devUser) || 1,
            username: "dev",
            first_name: "Dev"
          },
          auth_date: Math.floor(Date.now() / 1000),
          start_param: undefined
        };
        return next();
      }
    }

    // 2) Обычная проверка X-Telegram-Init-Data
    const initData = req.headers["x-telegram-init-data"];
    if (initData && typeof initData === "string") {
      try {
        const v = verifyInitData(
          initData,
          process.env.TELEGRAM_BOT_TOKEN!,
          Number(process.env.INITDATA_MAX_AGE_SEC ?? 86400)
        );
        (req as any).tg = v; // { user, auth_date, start_param }
      } catch {
        // остаёмся анонимом — write-ручки вернут 401
      }
    }

    next();
  });

  done();
};