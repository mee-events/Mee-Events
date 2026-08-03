"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  WorkerDetailResponse,
  WorkerTaskSummary,
} from "@me-event/api-contracts";
import {
  addWorkerNote,
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getWorker,
  listWorkerTasks,
  readStoredSession,
} from "@/lib/employee-api";

export default function WorkerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const workerId = params.id;
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [worker, setWorker] = useState<WorkerDetailResponse | null>(null);
  const [tasks, setTasks] = useState<readonly WorkerTaskSummary[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const [detail, taskList] = await Promise.all([
          getWorker(active, workerId),
          listWorkerTasks(active, { workerId }),
        ]);
        setWorker(detail);
        setTasks(taskList.tasks);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load worker.",
        );
      }
    },
    [router, workerId],
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

  async function handleNote() {
    if (session === null || note.trim().length === 0) return;
    try {
      await addWorkerNote(session, workerId, {
        content: note.trim(),
        noteType: "internal",
      });
      setNote("");
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not add note.",
      );
    }
  }

  if (session === null || worker === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading worker…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/workers" as never}>Workers</Link>{" "}
            <span aria-hidden="true">/</span> {worker.workerCode}
          </p>
          <h1>{worker.displayName}</h1>
          <p className="leads-subtitle">
            {worker.primaryVendorName ?? "No vendor"} · {worker.status} ·{" "}
            {worker.availabilityStatus}
          </p>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Profile</h2>
        <p>Phone: {worker.phoneE164}</p>
        <p>Email: {worker.email ?? "—"}</p>
        <p>Experience: {worker.experienceYears ?? "—"} years</p>
        <p>UPI: {worker.upiId ?? "—"}</p>
        <p>
          Skills: {worker.skills.map((s) => s.skillLabel).join(", ") || "None"}
        </p>
      </section>

      <section className="quote-panel">
        <h2>Tasks</h2>
        {tasks.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <ul className="leads-list">
            {tasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong> — {task.status} ·{" "}
                {task.eventNumber ?? task.eventRecordId}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="quote-panel">
        <h2>Add note</h2>
        <textarea
          className="quote-field"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          className="claim-button"
          onClick={() => void handleNote()}
        >
          Save note
        </button>
      </section>
    </main>
  );
}
