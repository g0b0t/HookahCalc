import type { FastifyInstance } from "fastify";
import QRCode from "qrcode";

export async function registerQrRoutes(app: FastifyInstance) {
  app.get("/sessions/:id/qr", async (req, reply) => {
    const id = (req.params as any).id;
    const bot = process.env.PUBLIC_BOT_USERNAME!;
    const deeplink = `https://t.me/${bot}?startapp=add_bowl:${id}`;
    const svg = await QRCode.toString(deeplink, { type: "svg", margin: 0 });
    reply.header("Content-Type", "image/svg+xml").send(svg);
  });
}