"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { VendorDashboardResponse } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getVendorDashboard,
  readStoredSession,
} from "@/lib/employee-api";

export default function VendorsPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [dashboard, setDashboard] = useState<VendorDashboardResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        setDashboard(await getVendorDashboard(active));
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load vendors.",
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
        <p className="leads-loading">{error ?? "Loading vendors…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/" as never}>Home</Link>{" "}
            <span aria-hidden="true">/</span> Vendors
          </p>
          <h1>Vendor management</h1>
          <p className="leads-subtitle">
            {dashboard.totalVendors} vendors · {dashboard.activeAssignments}{" "}
            active assignments
          </p>
        </div>
        <div className="leads-session">
          <Link className="claim-button" href={"/vendors/assignments" as never}>
            Assignments
          </Link>
          <Link className="claim-button" href={"/vendors/new" as never}>
            New vendor
          </Link>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Snapshot</h2>
        <dl className="quote-meta">
          <div>
            <dt>Pending acceptances</dt>
            <dd>{dashboard.pendingAcceptances}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{dashboard.completedAssignments}</dd>
          </div>
        </dl>
      </section>

      <section className="quote-panel">
        <h2>Vendors</h2>
        <ul className="quote-timeline">
          {dashboard.vendors.map((vendor) => (
            <li key={vendor.id}>
              <strong>
                <Link href={`/vendors/${vendor.id}` as never}>
                  {vendor.businessName}
                </Link>
              </strong>
              <span>
                {vendor.vendorCode} · {vendor.verificationStatus} ·{" "}
                {vendor.categories.map((c) => c.displayName).join(", ") ||
                  "No categories"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>Open assignments</h2>
        <ul className="quote-timeline">
          {dashboard.openAssignments.map((item) => (
            <li key={item.id}>
              <strong>
                <Link href={`/vendors/assignments/${item.id}` as never}>
                  {item.vendorBusinessName ?? item.vendorId}
                </Link>
              </strong>
              <span>
                {item.eventNumber ?? item.eventRecordId} ·{" "}
                {item.status.replaceAll("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
