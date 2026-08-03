"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventTaskDetailResponse,
  EventTaskStatus,
} from "@me-event/api-contracts";
import {
  addEventTaskComment,
  clearStoredSession,
  completeEventTask,
  EmployeeApiError,
  type EmployeeSession,
  getEventTask,
  readStoredSession,
  updateEventTask,
} from "@/lib/employee-api";

export default function ManagerTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const taskId = params.id;
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [task, setTask] = useState<EventTaskDetailResponse | null>(null);
  const [status, setStatus] = useState<EventTaskStatus>("pending");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const detail = await getEventTask(active, taskId);
        setTask(detail);
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
            : "Could not load task.",
        );
      }
    },
    [router, taskId],
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
    if (session === null || task === null) return;
    setBusy(true);
    try {
      await updateEventTask(session, task.id, { status });
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not update task.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (session === null || task === null) return;
    setBusy(true);
    try {
      await completeEventTask(session, task.id, {});
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not complete task.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleComment() {
    if (session === null || task === null || comment.trim().length === 0)
      return;
    setBusy(true);
    try {
      await addEventTaskComment(session, task.id, {
        content: comment.trim(),
      });
      setComment("");
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not add comment.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (session === null || task === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading task…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={`/manager/events/${task.eventRecordId}` as never}>
              Event ops
            </Link>{" "}
            <span aria-hidden="true">/</span> Task
          </p>
          <h1>{task.title}</h1>
          <p className="leads-subtitle">
            {task.eventNumber ?? task.eventRecordId} · {task.priority}
          </p>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Task detail</h2>
        <p>{task.description ?? "No description."}</p>
        <dl className="quote-meta">
          <div>
            <dt>Status</dt>
            <dd>{task.status.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Due</dt>
            <dd>
              {task.dueAt ? new Date(task.dueAt).toLocaleString("en-IN") : "—"}
            </dd>
          </div>
          <div>
            <dt>Overdue</dt>
            <dd>{task.overdue ? "Yes" : "No"}</dd>
          </div>
        </dl>
        <label className="quote-field">
          Update status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as EventTaskStatus)}
          >
            {(
              [
                "pending",
                "planning",
                "assigned",
                "in_progress",
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
          disabled={busy || status === task.status}
          onClick={() => void handleStatus()}
        >
          Save status
        </button>{" "}
        <button
          type="button"
          className="claim-button"
          disabled={busy || task.status === "completed"}
          onClick={() => void handleComplete()}
        >
          Complete task
        </button>
      </section>

      <section className="quote-panel">
        <h2>Comments</h2>
        <label className="quote-field">
          Add comment
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || comment.trim().length === 0}
          onClick={() => void handleComment()}
        >
          Add comment
        </button>
        <ul className="quote-timeline">
          {task.comments.map((item) => (
            <li key={item.id}>
              <strong>Comment</strong>
              <span>{item.content}</span>
              <small>{new Date(item.createdAt).toLocaleString("en-IN")}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>History</h2>
        <ul className="quote-timeline">
          {task.history.map((item) => (
            <li key={item.id}>
              <strong>{item.changeType}</strong>
              <span>{item.summary}</span>
              <small>{new Date(item.occurredAt).toLocaleString("en-IN")}</small>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
