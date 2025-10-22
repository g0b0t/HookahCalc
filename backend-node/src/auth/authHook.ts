import type { FastifyPluginCallback } from "fastify";
import { verifyInitData } from "./telegramVerify.js";
import { z } from "zod";

export const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook("onRequest", (req, reply, next) => {
    // только для write-ручек будем требовать авторизацию (ниже покажу)
    (req as any).tg = undefined;

    const initData = req.headers["x-telegram-init-data"];
    if (!initData || typeof initData !== "string") return next();

    try {
      const v = verifyInitData(
        initData,
        process.env.TELEGRAM_BOT_TOKEN!,
        Number(process.env.INITDATA_MAX_AGE_SEC ?? 86400)
      );
      (req as any).tg = v;
      next();
    } catch {
      // оставляем как anonymous — а конкретные ручки сами вернут 401
      next();
    }
  });
  done();
};