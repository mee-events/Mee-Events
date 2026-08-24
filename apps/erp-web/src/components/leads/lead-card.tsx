"use client";

import type { CrmLead } from "./types";

export function LeadCard({
  lead,
  onSelect,
}: {
  lead: CrmLead;
  onSelect: (lead: CrmLead) => void;
}) {
  return (
    <button className="lead-card" onClick={() => onSelect(lead)} type="button">
      <div className="lead-card-top">
        <strong>{lead.customerName ?? "Customer"}</strong>
        <span>{formatRelativeTime(lead.createdAt)}</span>
      </div>
      {lead.eventTypeName ? (
        <span className="lead-card-badge">{lead.eventTypeName}</span>
      ) : null}
      <div className="lead-card-meta">
        <span>
          {lead.eventDate ? formatEventDate(lead.eventDate) : "Date TBD"}
        </span>
        {lead.enquiryReferenceCode ? (
          <span>{lead.enquiryReferenceCode}</span>
        ) : null}
      </div>
    </button>
  );
}

function formatRelativeTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  const diffMs = Date.now() - parsed.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatEventDate(isoDate: string): string {
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
