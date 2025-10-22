import Fastify from "fastify";

import { corsPlugin } from "./middleware/cors.js";
import { rateLimitPlugin } from "./middleware/rateLimit.js";
//import { authPlugin } from "./auth/authHook.js";
import { metricsPlugin } from "./metrics/metrics.js";
import { installAuth } from "./auth/authHook.js";

import { registerAuthRoutes } from "./routes/auth.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { registerParticipantRoutes } from "./routes/participants.js";
import { registerBowlRoutes } from "./routes/bowls.js";
import { registerSettlementRoutes } from "./routes/settlement.js";
import { registerQrRoutes } from "./routes/qr.js";

import { sendError } from "./domain/errors.js";

async function main() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });

  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  //await app.register(authPlugin);
  
  installAuth(app);

  await app.register(metricsPlugin);

  app.get("/health", async () => ({ ok: true }));

  //----------------debug---------------------------------
  app.get("/debug/env", async () => ({
    DEV_ALLOW_ANON: process.env.DEV_ALLOW_ANON,
    NODE_ENV: process.env.NODE_ENV,
  }));
  app.get("/debug/auth", async (req) => ({ tg: (req as any).tg ?? null, headers: req.headers }));
   //----------------debug---------------------------------

  await registerAuthRoutes(app);
  await registerSessionRoutes(app);
  await registerParticipantRoutes(app);
  await registerBowlRoutes(app);
  await registerSettlementRoutes(app);
  await registerQrRoutes(app);

  app.setErrorHandler((err, _req, reply) => {
    app.log.error({ err }, "unhandled_error");
    return sendError(reply, err);
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: "not_found" });
  });

  const port = Number(process.env.PORT ?? 8080);
  const host = process.env.HOST ?? "0.0.0.0";

  try {
    await app.listen({ port, host });
    app.log.info(
      { port, host, dataDir: process.env.DATA_DIR ?? "./data" },
      "Backend started"
    );
  } catch (e) {
    app.log.fatal(e as Error);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutdown");
    try {
      await app.close();
      process.exit(0);
    } catch (e) {
      app.log.fatal(e as Error);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void main();