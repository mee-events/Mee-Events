"use client";

import type { LeadStatus } from "@me-event/api-contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { DUMMY_LEADS } from "@/components/leads/dummy-leads";
import { LeadDetailPanel } from "@/components/leads/lead-detail-panel";
import { LeadKanbanBoard } from "@/components/leads/lead-kanban-board";
import { LeadsToolbar } from "@/components/leads/leads-toolbar";
import type {
  CrmLead,
  DateRangeFilter,
  LeadSourceFilter,
  PipelineColumnId,
} from "@/components/leads/types";
import { statusesForColumn } from "@/components/leads/types";
import {
  type EmployeeSession,
  logout,
  readStoredSession,
} from "@/lib/employee-api";

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <main className="leads-shell leads-shell-wide">
          <p className="leads-loading">Loading leads…</p>
        </main>
      }
    >
      <LeadsPageContent />
    </Suspense>
  );
}

function LeadsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [leads, setLeads] = useState<CrmLead[]>(() => [...DUMMY_LEADS]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PipelineColumnId | "all">("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [source, setSource] = useState<LeadSourceFilter>("all");

  const selectedLeadId = searchParams.get("leadId");

  useEffect(() => {
    const stored = readStoredSession();
    if (stored === null) {
      router.replace("/login");
      return;
    }
    setSession(stored);
  }, [router]);

  const filteredLeads = useMemo(
    () =>
      filterLeads(leads, {
        search,
        status,
        dateRange,
        source,
      }),
    [leads, search, status, dateRange, source],
  );

  const selectedLead =
    selectedLeadId === null
      ? null
      : (leads.find((lead) => lead.id === selectedLeadId) ?? null);

  function buildLeadsHref(mutator: (params: URLSearchParams) => void): string {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    const query = params.toString();
    return query.length > 0 ? `/leads?${query}` : "/leads";
  }

  function handleSelectLead(lead: CrmLead) {
    router.push(
      buildLeadsHref((params) => {
        params.set("leadId", lead.id);
      }) as never,
    );
  }

  function handleClosePanel() {
    router.push(
      buildLeadsHref((params) => {
        params.delete("leadId");
      }) as never,
    );
  }

  function handleStatusChange(leadId: string, nextStatus: LeadStatus) {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, status: nextStatus } : lead,
      ),
    );
  }

  function handleMarkAsLost(leadId: string) {
    handleStatusChange(leadId, "lost");
  }

  function handleConvertToQuotation(lead: CrmLead) {
    router.push(`/quotes?fromLead=${encodeURIComponent(lead.id)}`);
  }

  async function handleLogout() {
    if (session !== null) {
      try {
        await logout(session);
      } catch {
        // Local session is already cleared by logout().
      }
    }
    router.replace("/login");
  }

  if (session === null) {
    return (
      <main className="leads-shell leads-shell-wide">
        <p className="leads-loading">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="leads-shell leads-shell-wide">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href="/">Employee portal</Link>{" "}
            <span aria-hidden="true">/</span> Enquiries &amp; Leads
          </p>
          <h1>Enquiries &amp; Leads</h1>
          <p className="leads-subtitle">
            Sales pipeline for customer enquiries from the Mee Events app.
          </p>
        </div>
        <div className="leads-topbar-actions">
          <button className="claim-button" type="button">
            New Lead
          </button>
          <div className="leads-session">
            <span>
              <strong>{session.mobileNumber}</strong>
              <small>{session.lastActiveRole.replaceAll("_", " ")}</small>
            </span>
            <button onClick={() => void handleLogout()} type="button">
              Log out
            </button>
          </div>
        </div>
      </header>

      <LeadsToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onSearchChange={setSearch}
        onSourceChange={setSource}
        onStatusChange={setStatus}
        search={search}
        source={source}
        status={status}
      />

      {filteredLeads.length === 0 ? (
        <div className="leads-empty">
          <strong>No leads match these filters.</strong>
          <p>Try clearing search or widening the date range.</p>
        </div>
      ) : (
        <LeadKanbanBoard
          leads={filteredLeads}
          onSelectLead={handleSelectLead}
        />
      )}

      <LeadDetailPanel
        lead={selectedLead}
        onClose={handleClosePanel}
        onConvertToQuotation={handleConvertToQuotation}
        onMarkAsLost={handleMarkAsLost}
        onStatusChange={handleStatusChange}
      />
    </main>
  );
}

function filterLeads(
  leads: readonly CrmLead[],
  filters: {
    search: string;
    status: PipelineColumnId | "all";
    dateRange: DateRangeFilter;
    source: LeadSourceFilter;
  },
): CrmLead[] {
  const query = filters.search.trim().toLowerCase();
  const now = Date.now();
  const rangeMs =
    filters.dateRange === "7d"
      ? 7 * 24 * 60 * 60 * 1000
      : filters.dateRange === "30d"
        ? 30 * 24 * 60 * 60 * 1000
        : filters.dateRange === "90d"
          ? 90 * 24 * 60 * 60 * 1000
          : null;
  const allowedStatuses = statusesForColumn(filters.status);

  return leads.filter((lead) => {
    if (allowedStatuses !== null && !allowedStatuses.includes(lead.status)) {
      return false;
    }
    if (filters.source !== "all" && lead.source !== filters.source) {
      return false;
    }
    if (rangeMs !== null) {
      const created = new Date(lead.createdAt).getTime();
      if (Number.isNaN(created) || now - created > rangeMs) {
        return false;
      }
    }
    if (query.length === 0) {
      return true;
    }
    const haystack = [
      lead.customerName ?? "",
      lead.eventTypeName ?? "",
      lead.enquiryReferenceCode ?? "",
      lead.customerMobile,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}
