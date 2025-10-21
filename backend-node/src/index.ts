import Fastify from "fastify";
import cors from "@fastify/cors";
import rate from "@fastify/rate-limit";
import pino from "pino";
import { authPlugin } from "./auth/authHook";
import { metricsPlugin } from "./metrics/metrics";
import { registerAuthRoutes } from "./routes/auth";
import { registerSessionRoutes } from "./routes/sessions";
import { registerParticipantRoutes } from "./routes/participants";
import { registerBowlRoutes } from "./routes/bowls";
import { registerSettlementRoutes } from "./routes/settlement";
import { registerQrRoutes } from "./routes/qr";

const app = Fastify({ logger: pino({ level: "info" }) });

await app.register(cors, {
  origin: (origin, cb) => {
    const allowed = (process.env.ORIGIN_ALLOWED ?? "").split(",").map(s => s.trim()).filter(Boolean);
    if (!origin || allowed.some(a => origin.endsWith(a))) cb(null, true);
    else cb(new Error("Origin not allowed"), false);
  }
});
await app.register(rate, { max: 60, timeWindow: "1 minute" });
await app.register(authPlugin);
await app.register(metricsPlugin);

app.get("/health", async () => ({ ok: true }));

await registerAuthRoutes(app);
await registerSessionRoutes(app);
await registerParticipantRoutes(app);
await registerBowlRoutes(app);
await registerSettlementRoutes(app);
await registerQrRoutes(app);

const port = Number(process.env.PORT ?? 8080);
app.listen({ port, host: "0.0.0.0" }).catch((e) => {
  app.log.error(e); process.exit(1);
});