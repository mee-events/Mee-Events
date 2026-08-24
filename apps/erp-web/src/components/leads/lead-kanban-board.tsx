"use client";

import { LeadCard } from "./lead-card";
import { PIPELINE_COLUMNS, type CrmLead } from "./types";

export function LeadKanbanBoard({
  leads,
  onSelectLead,
}: {
  leads: readonly CrmLead[];
  onSelectLead: (lead: CrmLead) => void;
}) {
  return (
    <div className="leads-kanban" role="region" aria-label="Leads pipeline">
      {PIPELINE_COLUMNS.map((column) => {
        const columnLeads = leads.filter((lead) =>
          column.statuses.includes(lead.status),
        );
        return (
          <section
            className="leads-kanban-column"
            key={column.id}
            aria-labelledby={`kanban-${column.id}`}
          >
            <header className="leads-kanban-column-head">
              <h2 id={`kanban-${column.id}`}>{column.label}</h2>
              <span>{columnLeads.length}</span>
            </header>
            <div className="leads-kanban-column-body">
              {columnLeads.length === 0 ? (
                <p className="leads-kanban-empty">No leads</p>
              ) : (
                columnLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onSelect={onSelectLead} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
