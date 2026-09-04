import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { DomainError } from "../errors/domain.error";

type RequestWithId = Pick<Request, "headers"> & { readonly id?: unknown };

export function requestIdForIncomingRequest(
  request: RequestWithId,
  generate: () => string = randomUUID,
): string {
  return (
    normalizedRequestId(request.id) ??
    normalizedRequestId(request.headers?.["x-request-id"]) ??
    generate()
  );
}

export function requireRequestId(request: { readonly id?: unknown }): string {
  const requestId = normalizedRequestId(request.id);
  if (requestId === undefined) {
    throw new DomainError(
      "REQUEST_CONTEXT_UNAVAILABLE",
      "Request context is unavailable. Please try again.",
      500,
    );
  }
  return requestId;
}

export function requestIdForError(
  request: RequestWithId,
  generate: () => string = randomUUID,
): string {
  return requestIdForIncomingRequest(request, generate);
}

function normalizedRequestId(value: unknown): string | undefined {
  const scalar: unknown = Array.isArray(value) ? value[0] : value;
  if (typeof scalar !== "string" && typeof scalar !== "number") {
    return undefined;
  }
  const normalized = String(scalar).trim();
  if (
    normalized.length === 0 ||
    normalized.length > 200 ||
    normalized === "undefined" ||
    normalized === "null"
  ) {
    return undefined;
  }
  return normalized;
}
