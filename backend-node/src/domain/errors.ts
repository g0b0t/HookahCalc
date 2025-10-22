// Базовые ошибки домена + хелперы для HTTP-ответов
import type { FastifyReply } from "fastify";

export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message?: string, details?: unknown) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "bad_request", details?: unknown) {
    super(400, "bad_request", message, details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = "unauthorized") {
    super(401, "unauthorized", message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "forbidden") {
    super(403, "forbidden", message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = "not_found") {
    super(404, "not_found", message);
  }
}
export class ConflictError extends AppError {
  constructor(message = "conflict", details?: unknown) {
    super(409, "conflict", message, details);
  }
}

/** Преобразует произвольную ошибку в HTTP-ответ Fastify */
export function sendError(reply: FastifyReply, err: unknown) {
  if (err instanceof AppError) {
    return reply.code(err.status).send({
      error: err.code,
      message: err.message,
      details: err.details ?? undefined
    });
  }

  // Если это похожее на ZodError (без жёсткой зависимости от zod)
  if (typeof err === "object" && err && "issues" in err) {
    const anyErr = err as any;
    return reply.code(400).send({
      error: "validation_error",
      message: "Validation failed",
      details: anyErr.issues
    });
  }

  // По умолчанию — 500
  const message = err instanceof Error ? err.message : "internal_error";
  return reply.code(500).send({ error: "internal_error", message });
}
