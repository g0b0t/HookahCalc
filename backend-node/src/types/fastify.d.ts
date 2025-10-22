import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    tg?: {
      user?: { id: number; username?: string; first_name?: string; last_name?: string };
      auth_date?: number;
      start_param?: string;
    };
  }
}
