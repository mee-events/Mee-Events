"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  VendorAssignmentDetailResponse,
  VendorAssignmentStatus,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getVendorAssignment,
  readStoredSession,
  updateVendorAssignment,
} from "@/lib/employee-api";

export default function VendorAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assignmentId = params.id;
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [assignment, setAssignment] =
    useState<VendorAssignmentDetailResponse | null>(null);
  const [status, setStatus] = useState<VendorAssignmentStatus>("assigned");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const detail = await getVendorAssignment(active, assignmentId);
        setAssignment(detail);
        setStatus(detail.status);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load assignment.",
        );
      }
    },
    [assignmentId, router],
  );

  useEffect(() => {
    const stored = readStoredSession();
    if (stored === null) {
      router.replace("/login");
      return;
    }
    setSession(stored);
    void load(stored);
  }, [router, load]);

  async function handleStatus() {
    if (session === null || assignment === null) return;
    setBusy(true);
    try {
      await updateVendorAssignment(session, assignment.id, { status });
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not update assignment.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (session === null || assignment === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading assignment…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/vendors/assignments" as never}>Assignments</Link>{" "}
            <span aria-hidden="true">/</span> Detail
          </p>
          <h1>{assignment.vendorBusinessName ?? "Vendor assignment"}</h1>
          <p className="leads-subtitle">
            {assignment.eventNumber ?? assignment.eventRecordId} ·{" "}
            {assignment.status.replaceAll("_", " ")}
          </p>
        </div>
        <div className="leads-session">
          <Link
            className="claim-button"
            href={`/vendors/${assignment.vendorId}` as never}
          >
            Vendor
          </Link>
          <Link
            className="claim-button"
            href={`/events/${assignment.eventRecordId}` as never}
          >
            Event record
          </Link>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Assignment</h2>
        <p>{assignment.assignmentNotes ?? "No assignment notes."}</p>
        <p className="leads-subtitle">
          Progress: {assignment.latestProgressSummary ?? "—"}
        </p>
        <label className="quote-field">
          Status
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as VendorAssignmentStatus)
            }
          >
            {(
              [
                "invited",
                "assigned",
                "accepted",
                "rejected",
                "planning",
                "travelling",
                "on_site",
                "working",
                "completed",
                "cancelled",
              ] as const
            ).map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || status === assignment.status}
          onClick={() => void handleStatus()}
        >
          Update status
        </button>
      </section>

      <section className="quote-panel">
        <h2>Assignment timeline / history</h2>
        <ul className="quote-timeline">
          {assignment.history.map((item) => (
            <li key={item.id}>
              <strong>{item.changeType}</strong>
              <span>{item.summary}</span>
              <small>{new Date(item.occurredAt).toLocaleString("en-IN")}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>Event timeline</h2>
        <ul className="quote-timeline">
          {assignment.timeline.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.title}</strong>
              <span>{entry.content ?? entry.entryType}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>Notes</h2>
        <ul className="quote-timeline">
          {assignment.notes.map((item) => (
            <li key={item.id}>
              <strong>{item.noteType}</strong>
              <span>{item.content}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
