import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import type {
  CatalogRepository,
  EventTypeRecord,
  ServiceCategoryRecord,
} from "../ports/catalog-repository";

interface CatalogRow {
  readonly id: string;
  readonly code: string;
  readonly display_name: string;
  readonly display_order: number;
  readonly active: boolean;
}

@Injectable()
export class PostgresCatalogRepository implements CatalogRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async listEventTypes(): Promise<readonly EventTypeRecord[]> {
    const result = await this.pool.query<CatalogRow>(
      `SELECT id, code, display_name, display_order, active
       FROM event_types
       WHERE active
       ORDER BY display_order, display_name`,
    );
    return result.rows.map(toRecord);
  }

  public async listServiceCategories(): Promise<
    readonly ServiceCategoryRecord[]
  > {
    const result = await this.pool.query<CatalogRow>(
      `SELECT id, code, display_name, display_order, active
       FROM service_categories
       WHERE active
       ORDER BY display_order, display_name`,
    );
    return result.rows.map(toRecord);
  }

  public async findEventTypeByCode(
    code: string,
  ): Promise<EventTypeRecord | undefined> {
    const result = await this.pool.query<CatalogRow>(
      `SELECT id, code, display_name, display_order, active
       FROM event_types
       WHERE code = $1 AND active`,
      [code],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toRecord(row);
  }
}

function toRecord(row: CatalogRow): EventTypeRecord {
  return {
    id: row.id,
    code: row.code,
    displayName: row.display_name,
    displayOrder: row.display_order,
    active: row.active,
  };
}
