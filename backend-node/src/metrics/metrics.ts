import type { FastifyPluginCallback } from "fastify";
import client from "prom-client";

export const metricsPlugin: FastifyPluginCallback = (app, _o, done) => {
  const reg = new client.Registry();
  client.collectDefaultMetrics({ register: reg });
  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", reg.contentType);
    reply.send(await reg.metrics());
  });
  done();
};  