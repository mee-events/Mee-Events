"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AttendanceLogSummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listOperationsAttendance,
  readStoredSession,
} from "@/lib/employee-api";

export default function OperationsAttendancePage() {
  const router = useRouter();
  const [rows, setRows] = useState<readonly AttendanceLogSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        setRows((await listOperationsAttendance(active)).logs);
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
    void load(stored);
  }, [router, load]);

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/operations" as never}>Operations</Link> / Attendance
          </p>
          <h1>Operations attendance</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        {rows.length === 0 ? (
          <p>No attendance logs yet.</p>
        ) : (
          <ul className="leads-list">
            {rows.map((row) => (
              <li key={row.id}>
                {row.workerName ?? row.workerId} ·{" "}
                {row.eventNumber ?? row.eventRecordId} — {row.status}
                {row.checkInAt !== undefined ? ` · in ${row.checkInAt}` : ""}
                {row.checkOutAt !== undefined ? ` · out ${row.checkOutAt}` : ""}
                {row.workingMinutes !== undefined
                  ? ` · ${row.workingMinutes} min`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
