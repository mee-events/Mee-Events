"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  PaymentSummary,
  QuotationDetailResponse,
  QuotationItemInput,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  confirmAdvancePayment,
  EmployeeApiError,
  type EmployeeSession,
  getQuotation,
  listPendingPayments,
  readStoredSession,
  reviseQuotation,
  sendQuotation,
  updateQuotation,
} from "@/lib/employee-api";

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quotationId = params.id;
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [quote, setQuote] = useState<QuotationDetailResponse | null>(null);
  const [pendingPayments, setPendingPayments] = useState<
    readonly PaymentSummary[]
  >([]);
  const [items, setItems] = useState<QuotationItemInput[]>([]);
  const [gstPercent, setGstPercent] = useState(18);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [advancePercent, setAdvancePercent] = useState(30);
  const [terms, setTerms] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hydrate = useCallback((detail: QuotationDetailResponse) => {
    setQuote(detail);
    setItems(
      detail.items.map((item) => ({
        itemType: item.itemType,
        title: item.title,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        sortOrder: item.sortOrder,
        ...(item.description === undefined
          ? {}
          : { description: item.description }),
      })),
    );
    if (detail.revision !== undefined) {
      setGstPercent(Number(detail.revision.gstPercent));
      setDiscountAmount(Number(detail.revision.discountAmount));
      setAdvancePercent(Number(detail.revision.advancePercent));
      setTerms(detail.revision.terms ?? "");
      setCustomerNotes(detail.revision.customerNotes ?? "");
    }
  }, []);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const detail = await getQuotation(active, quotationId);
        hydrate(detail);
        if (detail.status === "approved") {
          const payments = await listPendingPayments(active, quotationId);
          setPendingPayments(payments.payments);
        } else {
          setPendingPayments([]);
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
            : "Could not load quotation.",
        );
      }
    },
    [hydrate, quotationId, router],
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

  async function handleSaveDraft() {
    if (session === null) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateQuotation(session, quotationId, {
        items,
        gstPercent,
        discountAmount,
        discountPercent: 0,
        advancePercent,
        terms: terms.length > 0 ? terms : null,
        customerNotes: customerNotes.length > 0 ? customerNotes : null,
      });
      hydrate(updated);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not update quotation.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (session === null) return;
    setBusy(true);
    setError(null);
    try {
      if (quote?.status === "draft") {
        await updateQuotation(session, quotationId, {
          items,
          gstPercent,
          discountAmount,
          discountPercent: 0,
          advancePercent,
          terms: terms.length > 0 ? terms : null,
          customerNotes: customerNotes.length > 0 ? customerNotes : null,
        });
      }
      const sent = await sendQuotation(session, quotationId);
      hydrate(sent);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not send quotation.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRevise() {
    if (session === null) return;
    setBusy(true);
    setError(null);
    try {
      const revised = await reviseQuotation(session, quotationId, {
        reason: "employee_revise",
        items,
        gstPercent,
        discountAmount,
        discountPercent: 0,
        advancePercent,
        terms: terms.length > 0 ? terms : null,
        customerNotes: customerNotes.length > 0 ? customerNotes : null,
      });
      hydrate(revised);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not revise quotation.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmPayment(paymentId: string) {
    if (session === null) return;
    setBusy(true);
    setError(null);
    try {
      const result = await confirmAdvancePayment(session, paymentId);
      router.push(`/events/${result.eventRecord.id}` as never);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not confirm payment.",
      );
      setBusy(false);
    }
  }

  function updateItem(index: number, patch: Partial<QuotationItemInput>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        itemType: "custom",
        title: "New line item",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  if (session === null || quote === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading quotation…"}</p>
      </main>
    );
  }

  const editable = quote.status === "draft";
  const revisable = ["sent", "revision_requested", "approved"].includes(
    quote.status,
  );

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href="/quotes">Quotations</Link>{" "}
            <span aria-hidden="true">/</span> {quote.referenceCode}
          </p>
          <h1>{quote.referenceCode}</h1>
          <p className="leads-subtitle">
            Status: {quote.status}
            {quote.enquiryReferenceCode !== undefined
              ? ` · Enquiry ${quote.enquiryReferenceCode}`
              : ""}
          </p>
        </div>
        <div className="quote-actions">
          <Link className="claim-button" href={`/leads/${quote.leadId}`}>
            Lead
          </Link>
          {quote.bookingId !== undefined ? (
            <Link className="claim-button" href={`/bookings/${quote.bookingId}`}>
              Booking
            </Link>
          ) : null}
        </div>
      </header>

      {error !== null ? (
        <div className="leads-error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="quote-panel">
        <div className="quote-panel-head">
          <h2>Line items</h2>
          {editable ? (
            <button className="claim-button" onClick={addItem} type="button">
              Add item
            </button>
          ) : null}
        </div>
        <div className="leads-table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Qty</th>
                <th scope="col">Unit price</th>
                <th scope="col">Line total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.title}-${index}`}>
                  <td>
                    {editable ? (
                      <input
                        value={item.title}
                        onChange={(event) =>
                          updateItem(index, { title: event.target.value })
                        }
                      />
                    ) : (
                      item.title
                    )}
                  </td>
                  <td>
                    {editable ? (
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, {
                            quantity: Number(event.target.value),
                          })
                        }
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td>
                    {editable ? (
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(index, {
                            unitPrice: Number(event.target.value),
                          })
                        }
                      />
                    ) : (
                      `₹${item.unitPrice.toLocaleString("en-IN")}`
                    )}
                  </td>
                  <td>
                    ₹
                    {(item.quantity * item.unitPrice).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="quote-panel quote-grid">
        <label className="quote-field">
          GST %
          <input
            type="number"
            disabled={!editable}
            value={gstPercent}
            onChange={(event) => setGstPercent(Number(event.target.value))}
          />
        </label>
        <label className="quote-field">
          Discount amount
          <input
            type="number"
            disabled={!editable}
            value={discountAmount}
            onChange={(event) => setDiscountAmount(Number(event.target.value))}
          />
        </label>
        <label className="quote-field">
          Advance %
          <input
            type="number"
            disabled={!editable}
            value={advancePercent}
            onChange={(event) => setAdvancePercent(Number(event.target.value))}
          />
        </label>
        <div className="quote-totals">
          <p>
            Final:{" "}
            <strong>
              ₹
              {Number(quote.revision?.finalAmount ?? quote.finalAmount ?? 0).toLocaleString(
                "en-IN",
              )}
            </strong>
          </p>
          <p>
            Advance:{" "}
            <strong>
              ₹
              {Number(
                quote.revision?.advanceAmount ?? quote.advanceAmount ?? 0,
              ).toLocaleString("en-IN")}
            </strong>
          </p>
        </div>
      </section>

      <section className="quote-panel">
        <label className="quote-field">
          Terms & conditions
          <textarea
            rows={3}
            disabled={!editable}
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
          />
        </label>
        <label className="quote-field">
          Customer notes
          <textarea
            rows={2}
            disabled={!editable}
            value={customerNotes}
            onChange={(event) => setCustomerNotes(event.target.value)}
          />
        </label>
        <div className="quote-actions">
          {editable ? (
            <>
              <button
                className="claim-button"
                disabled={busy}
                onClick={() => void handleSaveDraft()}
                type="button"
              >
                Save draft
              </button>
              <button
                className="claim-button"
                disabled={busy}
                onClick={() => void handleSend()}
                type="button"
              >
                Send to customer
              </button>
            </>
          ) : null}
          {revisable ? (
            <button
              className="claim-button"
              disabled={busy}
              onClick={() => void handleRevise()}
              type="button"
            >
              Create revision
            </button>
          ) : null}
        </div>
      </section>

      {pendingPayments.length > 0 ? (
        <section className="quote-panel">
          <h2>Pending advance payments</h2>
          <ul className="quote-payment-list">
            {pendingPayments.map((payment) => (
              <li key={payment.id}>
                <span>
                  {payment.referenceCode} · {payment.method} · ₹
                  {Number(payment.amount).toLocaleString("en-IN")}
                </span>
                <button
                  className="claim-button"
                  disabled={busy}
                  onClick={() => void handleConfirmPayment(payment.id)}
                  type="button"
                >
                  Confirm & create booking
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="quote-panel">
        <h2>Timeline</h2>
        <ul className="quote-timeline">
          {quote.activities.map((activity) => (
            <li key={activity.id}>
              <strong>{activity.activityType}</strong>
              <span>{activity.content ?? ""}</span>
              <small>{new Date(activity.occurredAt).toLocaleString("en-IN")}</small>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
