import type { FastifyInstance } from "fastify";
import { readSession } from "../repo/fileRepo.js";
import { computeBalances, settle } from "../domain/settlement.js";
import { sendError } from "../domain/errors.js";

export async function registerSettlementRoutes(app: FastifyInstance) {
  app.get("/sessions/:id/settlement", async (req, reply) => {
    try {
      const id = (req.params as any).id;
      const s = await readSession(id);
      if (!s) return reply.code(404).send({ error: "not_found" });

      const balances = computeBalances(s.users, s.bowls);
      const transfers = settle(balances);

      return { balances, transfers };
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
