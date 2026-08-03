"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { WorkerDashboardResponse } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getWorkerDashboard,
  readStoredSession,
} from "@/lib/employee-api";

export default function WorkersPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [dashboard, setDashboard] = useState<WorkerDashboardResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        setDashboard(await getWorkerDashboard(active));
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load workers.",
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
    void load(stored);
  }, [router, load]);

  if (session === null || dashboard === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading workers…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/" as never}>Home</Link>{" "}
            <span aria-hidden="true">/</span> Workers
          </p>
          <h1>Worker management</h1>
          <p className="leads-subtitle">
            {dashboard.totalWorkers} workers · {dashboard.activeTasks} active
            tasks · {dashboard.checkedInToday} checked in today
          </p>
        </div>
        <div className="leads-session">
          <Link className="claim-button" href={"/workers/tasks" as never}>
            Tasks
          </Link>
          <Link className="claim-button" href={"/workers/attendance" as never}>
            Attendance
          </Link>
          <Link className="claim-button" href={"/workers/new" as never}>
            New worker
          </Link>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="leads-grid">
        {dashboard.workers.map((worker) => (
          <Link
            key={worker.id}
            className="lead-card"
            href={`/workers/${worker.id}` as never}
          >
            <p className="lead-card-eyebrow">{worker.workerCode}</p>
            <h2>{worker.displayName}</h2>
            <p>
              {worker.primaryVendorName ?? "No vendor"} · {worker.status} ·{" "}
              {worker.availabilityStatus}
            </p>
            <p className="lead-card-meta">{worker.phoneE164}</p>
          </Link>
        ))}
      </section>

      <section className="quote-panel" style={{ marginTop: "1.5rem" }}>
        <h2>Open tasks</h2>
        {dashboard.openTasks.length === 0 ? (
          <p>No open worker tasks.</p>
        ) : (
          <ul className="leads-list">
            {dashboard.openTasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong> — {task.workerDisplayName} ·{" "}
                {task.status} · {task.eventNumber ?? task.eventRecordId}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
