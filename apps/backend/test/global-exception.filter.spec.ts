import { describe, expect, it } from "vitest";
import type { ArgumentsHost } from "@nestjs/common";
import { HttpException, HttpStatus } from "@nestjs/common";
import { GlobalExceptionFilter } from "../src/common/http/global-exception.filter";

interface RecordedResponse {
  status?: number;
  body?: Record<string, unknown>;
}

interface FilterResponse {
  status(code: number): FilterResponse;
  json(body: Record<string, unknown>): FilterResponse;
}

function mockHost(recorded: RecordedResponse): ArgumentsHost {
  const response: FilterResponse = {
    status(code: number): FilterResponse {
      recorded.status = code;
      return response;
    },
    json(body: Record<string, unknown>): FilterResponse {
      recorded.body = body;
      return response;
    },
  };
  return {
    switchToHttp: (): {
      getResponse: () => typeof response;
      getRequest: () => { header: () => undefined };
    } => ({
      getResponse: (): typeof response => response,
      getRequest: (): { header: () => undefined } => ({
        header: (): undefined => undefined,
      }),
    }),
  } as unknown as ArgumentsHost;
}

describe("GlobalExceptionFilter", () => {
  it("returns a generic 500 without a stack trace", () => {
    const recorded: RecordedResponse = {};
    new GlobalExceptionFilter().catch(
      new Error("secret boom\n    at secret.ts:1:1"),
      mockHost(recorded),
    );

    expect(recorded.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(recorded.body?.code).toBe("INTERNAL_ERROR");
    expect(recorded.body?.message).toBe("An unexpected error occurred");
    expect(JSON.stringify(recorded.body)).not.toContain("secret boom");
    expect(JSON.stringify(recorded.body)).not.toContain("secret.ts");
  });

  it("hides HttpException details on 500s", () => {
    const recorded: RecordedResponse = {};
    new GlobalExceptionFilter().catch(
      new HttpException("database password leaked", 500),
      mockHost(recorded),
    );
    expect(recorded.body?.message).toBe("An unexpected error occurred");
    expect(JSON.stringify(recorded.body)).not.toContain("password");
  });
});
