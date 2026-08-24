import type { LeadSource, LeadStatus } from "@me-event/api-contracts";

/** UI columns for the sales Kanban (maps from backend LeadStatus). */
export type PipelineColumnId =
  | "new_enquiry"
  | "contacted"
  | "qualified"
  | "lost";

export type LeadSourceFilter = "all" | LeadSource;

export type DateRangeFilter = "all" | "7d" | "30d" | "90d";

/**
 * Lightweight lead summary aligned with NestJS `LeadSummary`
 * (`packages/api-contracts`).
 */
export interface CrmLead {
  readonly id: string;
  readonly enquiryId?: string;
  readonly enquiryReferenceCode?: string;
  readonly customerMobile: string;
  readonly customerName?: string;
  readonly eventTypeName?: string;
  readonly eventDate?: string;
  readonly status: LeadStatus;
  readonly source: LeadSource;
  readonly ownerUserId?: string;
  readonly firstResponseDueAt?: string;
  readonly firstRespondedAt?: string;
  readonly createdAt: string;
}

export const PIPELINE_COLUMNS: readonly {
  readonly id: PipelineColumnId;
  readonly label: string;
  readonly statuses: readonly LeadStatus[];
}[] = [
  { id: "new_enquiry", label: "New Enquiry", statuses: ["new", "claimed"] },
  { id: "contacted", label: "Contacted", statuses: ["contacted"] },
  {
    id: "qualified",
    label: "Qualified",
    statuses: ["qualified", "quoted", "converted"],
  },
  { id: "lost", label: "Lost", statuses: ["lost", "closed"] },
] as const;

/** Statuses exposed in the slide-over dropdown (pipeline-facing). */
export const STATUS_OPTIONS: readonly {
  readonly id: LeadStatus;
  readonly label: string;
}[] = [
  { id: "new", label: "New Enquiry" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "lost", label: "Lost" },
] as const;

export function columnForStatus(status: LeadStatus): PipelineColumnId {
  for (const column of PIPELINE_COLUMNS) {
    if (column.statuses.includes(status)) {
      return column.id;
    }
  }
  return "new_enquiry";
}

export function statusesForColumn(
  column: PipelineColumnId | "all",
): readonly LeadStatus[] | null {
  if (column === "all") {
    return null;
  }
  return (
    PIPELINE_COLUMNS.find((entry) => entry.id === column)?.statuses ?? null
  );
}
