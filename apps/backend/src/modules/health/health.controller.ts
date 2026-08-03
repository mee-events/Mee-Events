import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Pool } from "pg";
import { Public } from "../authorization/public.decorator";
import { PG_POOL } from "../../database/database.module";

interface ReadinessReport {
  readonly status: "ok" | "degraded";
  readonly checks: { readonly persistence: "postgresql" | "unreachable" };
}

@ApiTags("Health")
@Public()
@Controller("health")
export class HealthController {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get("live")
  public liveness(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  public async readiness(): Promise<ReadinessReport> {
    try {
      await this.pool.query("SELECT 1");
      return { status: "ok", checks: { persistence: "postgresql" } };
    } catch {
      return { status: "degraded", checks: { persistence: "unreachable" } };
    }
  }
}
