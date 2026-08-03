"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventFinanceDetailResponse,
  EventFinancialSummary,
  EventRecordSummary,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  createFinanceExpense,
  EmployeeApiError,
  type EmployeeSession,
  ensureEventFinance,
  getEventFinance,
  listEventFinance,
  listEvents,
  readStoredSession,
  recordFinancePayment,
} from "@/lib/employee-api";

export function FinanceEventsClient() {
  const router = useRouter();
  const search = useSearchParams();
  const focusId = search.get("id");
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [summaries, setSummaries] = useState<readonly EventFinancialSummary[]>(
    [],
  );
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [detail, setDetail] = useState<EventFinanceDetailResponse | null>(null);
  const [eventRecordId, setEventRecordId] = useState(focusId ?? "");
  const [amount, setAmount] = useState("10000");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        const [finance, eventList] = await Promise.all([
          listEventFinance(active),
          listEvents(active),
        ]);
        setSummaries(finance.summaries);
        setEvents(eventList.events);
        const selected =
          eventRecordId ||
          focusId ||
          finance.summaries[0]?.eventRecordId ||
          eventList.events[0]?.id ||
          "";
        if (selected !== "") {
          setEventRecordId(selected);
          try {
            setDetail(await getEventFinance(active, selected));
          } catch {
            setDetail(null);
          }
        }
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load event finance.",
        );
      }
    },
    [router, eventRecordId, focusId],
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

  async function handleEnsure() {
    if (session === null || eventRecordId === "") return;
    await ensureEventFinance(session, eventRecordId);
    await load(session);
  }

  async function handlePayment() {
    if (session === null || eventRecordId === "") return;
    await recordFinancePayment(session, {
      eventRecordId,
      amount: Number(amount),
      paymentKind: "advance",
      methodCode: "upi",
      issueReceipt: true,
    });
    await load(session);
  }

  async function handleExpense() {
    if (session === null || eventRecordId === "") return;
    await createFinanceExpense(session, {
      eventRecordId,
      expenseType: "other",
      amount: 1000,
      description: "Ops expense",
    });
    await load(session);
  }

  if (session === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/finance" as never}>Finance</Link> / Events
          </p>
          <h1>Event finance</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        <label className="quote-field">
          Event
          <select
            value={eventRecordId}
            onChange={(e) => setEventRecordId(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.eventNumber} — {e.eventName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          onClick={() => void handleEnsure()}
        >
          Ensure summary
        </button>
        <label className="quote-field">
          Payment amount
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button
          type="button"
          className="claim-button"
          onClick={() => void handlePayment()}
        >
          Record payment
        </button>
        <button
          type="button"
          className="claim-button"
          onClick={() => void handleExpense()}
        >
          Add ₹1000 expense
        </button>
      </section>
      {detail !== null ? (
        <section className="quote-panel">
          <h2>
            {detail.eventNumber} · {detail.settlementStatus}
          </h2>
          <p>
            Advance ₹{detail.advanceReceived} · Balance ₹{detail.balancePending}{" "}
            · Expenses ₹{detail.totalExpense} · Profit ₹{detail.profitAmount}
          </p>
          <p>
            Vendor ₹{detail.vendorCost} · Worker ₹{detail.workerCost} ·
            Inventory ₹{detail.inventoryCost} · Other ₹{detail.otherExpenses}
          </p>
        </section>
      ) : null}
      <section className="quote-panel">
        <h2>All summaries ({summaries.length})</h2>
        <ul className="leads-list">
          {summaries.map((s) => (
            <li key={s.id}>
              {s.eventNumber ?? s.eventRecordId} — profit ₹{s.profitAmount}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
