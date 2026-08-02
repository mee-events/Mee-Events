"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { LeadSummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  claimLead,
  listLeads,
  logout,
  readStoredSession,
} from "@/lib/employee-api";

const statusLabels: Record<string, string> = {
  new: "New",
  claimed: "Claimed",
  contacted: "Contacted",
  qualified: "Qualified",
  quoted: "Quoted",
  converted: "Converted",
  lost: "Lost",
  closed: "Closed",
};

export default function LeadsPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [leads, setLeads] = useState<readonly LeadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadLeads = useCallback(
    async (activeSession: EmployeeSession) => {
      setError(null);
      try {
        const response = await listLeads(activeSession);
        setLeads(response.leads);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load leads. Is the backend running?",
        );
      }
    },
    [router],
  );

  useEffect(() => {
    const stored = readStoredSession();
    if (stored === null) {
      router.replace("/login");
      return;
    }
    setSession(stored);
    void loadLeads(stored);
  }, [router, loadLeads]);

  async function handleClaim(leadId: string) {
    if (session === null) {
      return;
    }
    setClaimingId(leadId);
    setError(null);
    try {
      await claimLead(session, leadId);
      await loadLeads(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not claim the lead.",
      );
    } finally {
      setClaimingId(null);
    }
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
      <main className="leads-shell">
        <p className="leads-loading">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href="/">Employee portal</Link>{" "}
            <span aria-hidden="true">/</span> Leads inbox
          </p>
          <h1>Leads inbox</h1>
          <p className="leads-subtitle">
            Live enquiries from the customer app. Claim a lead to own the first
            response.
          </p>
        </div>
        <div className="leads-session">
          <span>
            <strong>{session.mobileNumber}</strong>
            <small>{session.lastActiveRole.replaceAll("_", " ")}</small>
          </span>
          <button onClick={() => void handleLogout()} type="button">
            Log out
          </button>
        </div>
      </header>

      {error !== null ? (
        <div className="leads-error" role="alert">
          {error}
          <button onClick={() => void loadLeads(session)} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {leads === null ? (
        <p className="leads-loading">Loading leads…</p>
      ) : leads.length === 0 ? (
        <div className="leads-empty">
          <strong>No leads yet.</strong>
          <p>
            When a customer submits an enquiry from the mobile app, it appears
            here immediately with its first-response deadline.
          </p>
        </div>
      ) : (
        <div className="leads-table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th scope="col">Enquiry</th>
                <th scope="col">Customer</th>
                <th scope="col">Event</th>
                <th scope="col">Event date</th>
                <th scope="col">Status</th>
                <th scope="col">First response due</th>
                <th scope="col">Owner</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadRow
                  claiming={claimingId === lead.id}
                  key={lead.id}
                  lead={lead}
                  onClaim={() => void handleClaim(lead.id)}
                  sessionUserId={session.userId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function LeadRow({
  lead,
  sessionUserId,
  claiming,
  onClaim,
}: {
  lead: LeadSummary;
  sessionUserId: string;
  claiming: boolean;
  onClaim: () => void;
}) {
  const unowned = lead.ownerUserId === undefined || lead.ownerUserId === null;
  const ownedByMe = lead.ownerUserId === sessionUserId;
  const overdue =
    unowned &&
    lead.firstRespondedAt === undefined &&
    lead.firstResponseDueAt !== undefined &&
    new Date(lead.firstResponseDueAt).getTime() < Date.now();

  return (
    <tr className={overdue ? "lead-overdue" : undefined}>
      <td>
        <Link href={`/leads/${lead.id}`}>
          <strong>{lead.enquiryReferenceCode ?? "—"}</strong>
        </Link>
        <small>{formatTimestamp(lead.createdAt)}</small>
      </td>
      <td>
        <strong>{lead.customerName ?? "Customer"}</strong>
        <small>{lead.customerMobile}</small>
      </td>
      <td>{lead.eventTypeName ?? "—"}</td>
      <td>{lead.eventDate ?? "To be decided"}</td>
      <td>
        <span className={`lead-status lead-status-${lead.status}`}>
          {statusLabels[lead.status] ?? lead.status}
        </span>
      </td>
      <td>
        {lead.firstResponseDueAt === undefined
          ? "—"
          : formatTimestamp(lead.firstResponseDueAt)}
        {overdue ? <small className="overdue-flag">Overdue</small> : null}
      </td>
      <td>{ownedByMe ? "You" : unowned ? "Unclaimed" : "Teammate"}</td>
      <td>
        {unowned ? (
          <button
            className="claim-button"
            disabled={claiming}
            onClick={onClaim}
            type="button"
          >
            {claiming ? "Claiming…" : "Claim lead"}
          </button>
        ) : (
          <Link className="claim-button" href={`/leads/${lead.id}`}>
            Open
          </Link>
        )}
      </td>
    </tr>
  );
}

function formatTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
