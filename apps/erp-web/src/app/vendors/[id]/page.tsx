"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  VendorAssignmentSummary,
  VendorDetailResponse,
} from "@me-event/api-contracts";
import {
  addVendorNote,
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getVendor,
  listVendorAssignments,
  readStoredSession,
} from "@/lib/employee-api";

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const vendorId = params.id;
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [vendor, setVendor] = useState<VendorDetailResponse | null>(null);
  const [assignments, setAssignments] = useState<
    readonly VendorAssignmentSummary[]
  >([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const [detail, assignmentList] = await Promise.all([
          getVendor(active, vendorId),
          listVendorAssignments(active, { vendorId }),
        ]);
        setVendor(detail);
        setAssignments(assignmentList.assignments);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load vendor.",
        );
      }
    },
    [router, vendorId],
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
    setBusy(true);
    try {
      await addVendorNote(session, vendorId, {
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
    } finally {
      setBusy(false);
    }
  }

  if (session === null || vendor === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading vendor…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/vendors" as never}>Vendors</Link>{" "}
            <span aria-hidden="true">/</span> {vendor.vendorCode}
          </p>
          <h1>{vendor.businessName}</h1>
          <p className="leads-subtitle">
            {vendor.ownerName} · {vendor.phoneE164} · {vendor.city}
          </p>
        </div>
        <div className="leads-session">
          <Link
            className="claim-button"
            href={`/vendors/assignments?vendorId=${vendor.id}` as never}
          >
            Assign to event
          </Link>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Profile</h2>
        <dl className="quote-meta">
          <div>
            <dt>Verification</dt>
            <dd>{vendor.verificationStatus}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{vendor.activeStatus}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>
              {vendor.ratingAverage} ({vendor.ratingCount})
            </dd>
          </div>
          <div>
            <dt>Categories</dt>
            <dd>
              {vendor.categories.map((c) => c.displayName).join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt>GST</dt>
            <dd>{vendor.gstNumber ?? "—"}</dd>
          </div>
          <div>
            <dt>UPI</dt>
            <dd>{vendor.upiId ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="quote-panel">
        <h2>Bank accounts</h2>
        <ul className="quote-timeline">
          {vendor.bankAccounts.map((account) => (
            <li key={account.id}>
              <strong>{account.bankName}</strong>
              <span>
                {account.accountHolderName} · {account.accountNumberMasked} ·{" "}
                {account.ifscCode}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>Assignments</h2>
        <ul className="quote-timeline">
          {assignments.map((item) => (
            <li key={item.id}>
              <strong>
                <Link href={`/vendors/assignments/${item.id}` as never}>
                  {item.eventNumber ?? item.eventRecordId}
                </Link>
              </strong>
              <span>{item.status.replaceAll("_", " ")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>Vendor notes</h2>
        <label className="quote-field">
          Note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || note.trim().length === 0}
          onClick={() => void handleNote()}
        >
          Add note
        </button>
      </section>
    </main>
  );
}
