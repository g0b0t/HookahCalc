import type { FastifyPluginCallback } from "fastify";
import { verifyInitData } from "./telegramVerify.js";

const DEV_ALLOW_ANON = process.env.DEV_ALLOW_ANON === "1";

export const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.log.info({ DEV_ALLOW_ANON, NODE_ENV: process.env.NODE_ENV }, "authPlugin: init");

  fastify.addHook("onRequest", (req, _reply, next) => {
    (req as any).tg = undefined;

    // --- DEV обход: x-dev-user -> авторизуем тестового юзера
    if (DEV_ALLOW_ANON) {
      const devUser = req.headers["x-dev-user"];
      if (devUser) {
        (req as any).tg = {
          user: {
            id: Number(devUser) || 1,
            username: "dev",
            first_name: "Dev",
          },
          auth_date: Math.floor(Date.now() / 1000),
          start_param: undefined,
        };
        req.log.info({ devUser }, "auth: dev user accepted");
        return next();
      }
    }

    // --- Боевая ветка: проверяем X-Telegram-Init-Data
    const initData = req.headers["x-telegram-init-data"];
    if (initData && typeof initData === "string") {
      try {
        const v = verifyInitData(
          initData,
          process.env.TELEGRAM_BOT_TOKEN!,
          Number(process.env.INITDATA_MAX_AGE_SEC ?? 86400)
        );
        (req as any).tg = v;
        req.log.debug("auth: telegram initData ok");
      } catch (e) {
        req.log.warn({ err: e }, "auth: telegram initData failed");
      }
    }
    next();
  });

  done();
};