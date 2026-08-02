"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { QuotationSummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listQuotations,
  readStoredSession,
} from "@/lib/employee-api";

export default function QuotesPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [quotes, setQuotes] = useState<readonly QuotationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const response = await listQuotations(active);
        setQuotes(response.quotations);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load quotations.",
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
            <span aria-hidden="true">/</span> Quotations
          </p>
          <h1>Quotations</h1>
          <p className="leads-subtitle">
            Draft, send, revise, and convert approved quotations after advance
            payment.
          </p>
        </div>
        <Link className="claim-button" href="/leads">
          Open leads
        </Link>
      </header>

      {error !== null ? (
        <div className="leads-error" role="alert">
          {error}
        </div>
      ) : null}

      {quotes === null ? (
        <p className="leads-loading">Loading quotations…</p>
      ) : quotes.length === 0 ? (
        <div className="leads-empty">
          <strong>No quotations yet.</strong>
          <p>Open a claimed lead and create a draft quotation.</p>
        </div>
      ) : (
        <div className="leads-table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th scope="col">Quote</th>
                <th scope="col">Enquiry</th>
                <th scope="col">Status</th>
                <th scope="col">Final amount</th>
                <th scope="col">Advance</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td>
                    <Link href={`/quotes/${quote.id}`}>
                      <strong>{quote.referenceCode}</strong>
                    </Link>
                  </td>
                  <td>{quote.enquiryReferenceCode ?? "—"}</td>
                  <td>
                    <span className={`lead-status lead-status-${quote.status}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td>
                    {quote.finalAmount === undefined
                      ? "—"
                      : `₹${Number(quote.finalAmount).toLocaleString("en-IN")}`}
                  </td>
                  <td>
                    {quote.advanceAmount === undefined
                      ? "—"
                      : `₹${Number(quote.advanceAmount).toLocaleString("en-IN")}`}
                  </td>
                  <td>{new Date(quote.updatedAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
