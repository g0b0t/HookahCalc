import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
// Здесь можно организовать файл users.json (упрощённо пока in-memory)

const memUsers = new Map<number, { id: string; tgId: number; name: string; username?: string }>();

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/verify", async (req, reply) => {
    const tg = (req as any).tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    const u = tg.user;
    let user = memUsers.get(u.id);
    if (!user) {
      user = { id: randomUUID(), tgId: u.id, name: u.first_name ?? "User", username: u.username };
      memUsers.set(u.id, user);
    }
    return { user };
  });
}