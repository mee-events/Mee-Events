import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { DomainError } from "../../../common/errors/domain.error";
import {
  AUTH_IP_RATE_LIMIT_CODE,
  MemoryWindowCounter,
  requestIp,
} from "../../../common/http/memory-window-counter";

@Injectable()
export class AuthIpRateLimitGuard implements CanActivate {
  public constructor(
    @Inject(MemoryWindowCounter)
    private readonly counter: MemoryWindowCounter,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = requestIp(request);
    if (!this.counter.allow(ip)) {
      throw new DomainError(
        AUTH_IP_RATE_LIMIT_CODE,
        "Too many requests. Try again later",
        429,
      );
    }
    return true;
  }
}
