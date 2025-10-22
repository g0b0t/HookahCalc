import type { FastifyPluginCallback } from "fastify";
import rateLimit from "@fastify/rate-limit";

/**
 * Простое ограничение запросов:
 *  - RATE_MAX (по умолчанию 60)
 *  - RATE_WINDOW (по умолчанию "1 minute")
 */
export const rateLimitPlugin: FastifyPluginCallback = async (app) => {
  const max = Number(process.env.RATE_MAX ?? 60);
  const timeWindow = String(process.env.RATE_WINDOW ?? "1 minute");
  await app.register(rateLimit, { max, timeWindow });
};
