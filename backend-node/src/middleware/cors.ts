import type { FastifyPluginCallback } from "fastify";
import fastifyCors from "@fastify/cors";

/**
 * CORS-плагин с белым списком из ORIGIN_ALLOWED (через запятую).
 * Разрешаем:
 *  - отсутствующий Origin (curl, браузерные webview)
 *  - origin, который равен одному из разрешённых,
 *  - origin, который оканчивается на разрешённый шаблон (например, .github.io)
 */
export const corsPlugin: FastifyPluginCallback = async (app) => {
  const allowed = (process.env.ORIGIN_ALLOWED ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const ok = allowed.some(a => origin === a || origin.endsWith(a));
      cb(ok ? null : new Error("Origin not allowed"), ok);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  });
};
