"use client";

import type { LeadStatus } from "@me-event/api-contracts";
import { useEffect } from "react";
import { STATUS_OPTIONS, type CrmLead } from "./types";

export function LeadDetailPanel({
  lead,
  onClose,
  onStatusChange,
  onConvertToQuotation,
  onMarkAsLost,
}: {
  lead: CrmLead | null;
  onClose: () => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onConvertToQuotation: (lead: CrmLead) => void;
  onMarkAsLost: (leadId: string) => void;
}) {
  const open = lead !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const statusValue =
    lead === null
      ? "new"
      : (STATUS_OPTIONS.find((option) => option.id === lead.status)?.id ??
        mapStatusToOption(lead.status));

  return (
    <div
      aria-hidden={!open}
      className={`lead-panel-root${open ? " is-open" : ""}`}
    >
      <button
        aria-label="Close lead details"
        className="lead-panel-backdrop"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="lead-panel-title"
        aria-modal="true"
        className="lead-panel"
        role="dialog"
      >
        {lead === null ? null : (
          <>
            <header className="lead-panel-header">
              <div>
                <p className="lead-panel-eyebrow">Lead details</p>
                <h2 id="lead-panel-title">{lead.customerName ?? "Customer"}</h2>
                <p className="lead-panel-contact">
                  <span>{maskPhone(lead.customerMobile)}</span>
                  {lead.enquiryReferenceCode ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{lead.enquiryReferenceCode}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="lead-panel-header-actions">
                <label className="leads-filter lead-panel-status">
                  <span className="visually-hidden">Lead status</span>
                  <select
                    onChange={(event) =>
                      onStatusChange(lead.id, event.target.value as LeadStatus)
                    }
                    value={statusValue}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  aria-label="Close"
                  className="lead-panel-close"
                  onClick={onClose}
                  type="button"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="lead-panel-body">
              <section className="lead-panel-section">
                <h3>Event Details</h3>
                <dl className="lead-panel-meta">
                  <div>
                    <dt>Event type</dt>
                    <dd>{lead.eventTypeName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Event date</dt>
                    <dd>
                      {lead.eventDate
                        ? formatDate(lead.eventDate)
                        : "To be decided"}
                    </dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{formatSource(lead.source)}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <footer className="lead-panel-actions">
              <button
                className="claim-button"
                onClick={() => onConvertToQuotation(lead)}
                type="button"
              >
                Convert to Quotation
              </button>
              <button
                className="lead-panel-secondary"
                onClick={() => onMarkAsLost(lead.id)}
                type="button"
              >
                Mark as Lost
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

function mapStatusToOption(status: LeadStatus): LeadStatus {
  if (status === "claimed") return "new";
  if (status === "quoted" || status === "converted") return "qualified";
  if (status === "closed") return "lost";
  if (
    status === "new" ||
    status === "contacted" ||
    status === "qualified" ||
    status === "lost"
  ) {
    return status;
  }
  return "new";
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) {
    return "••••";
  }
  return `+91 •••• ••${digits.slice(-4)}`;
}

function formatSource(source: string): string {
  return source.replaceAll("_", " ");
}

function formatDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
