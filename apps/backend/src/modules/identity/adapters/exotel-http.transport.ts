import { Injectable } from "@nestjs/common";

export const EXOTEL_HTTP_TRANSPORT = Symbol("EXOTEL_HTTP_TRANSPORT");

export interface ExotelHttpRequest {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly timeoutMs: number;
}

export interface ExotelHttpResponse {
  readonly status: number;
  readonly body: string;
}

export interface ExotelHttpTransport {
  post(request: ExotelHttpRequest): Promise<ExotelHttpResponse>;
}

/** One HTTP attempt only. Retry decisions must stay outside this transport. */
@Injectable()
export class FetchExotelHttpTransport implements ExotelHttpTransport {
  public async post(request: ExotelHttpRequest): Promise<ExotelHttpResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, request.timeoutMs);
    timeout.unref();

    try {
      const response = await fetch(request.url, {
        method: "POST",
        headers: { ...request.headers },
        body: request.body,
        signal: controller.signal,
      });
      return {
        status: response.status,
        body: await response.text(),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
