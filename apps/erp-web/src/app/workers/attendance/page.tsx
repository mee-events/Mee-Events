"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { WorkerAttendanceSummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listWorkerAttendance,
  readStoredSession,
} from "@/lib/employee-api";

export default function WorkerAttendancePage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [attendance, setAttendance] = useState<
    readonly WorkerAttendanceSummary[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const response = await listWorkerAttendance(active);
        setAttendance(response.attendance);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load attendance.",
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

  if (session === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading attendance…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/workers" as never}>Workers</Link>{" "}
            <span aria-hidden="true">/</span> Attendance
          </p>
          <h1>Worker attendance</h1>
          <p className="leads-subtitle">{attendance.length} records</p>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        {attendance.length === 0 ? (
          <p>No attendance records yet. Check-ins create them.</p>
        ) : (
          <ul className="leads-list">
            {attendance.map((row) => (
              <li key={row.id}>
                <strong>{row.workerDisplayName ?? row.workerId}</strong> —{" "}
                {row.attendanceDate} · {row.status}
                {row.notes !== undefined ? ` · ${row.notes}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
