"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { VendorSummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  createWorker,
  EmployeeApiError,
  type EmployeeSession,
  listVendors,
  readStoredSession,
} from "@/lib/employee-api";

export default function NewWorkerPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [vendors, setVendors] = useState<readonly VendorSummary[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("+91");
  const [vendorId, setVendorId] = useState("");
  const [skillLabel, setSkillLabel] = useState("Decoration");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = readStoredSession();
    if (stored === null) {
      router.replace("/login");
      return;
    }
    setSession(stored);
    void listVendors(stored)
      .then((response) => {
        setVendors(response.vendors);
        if (response.vendors[0] !== undefined) {
          setVendorId(response.vendors[0].id);
        }
      })
      .catch((cause) => {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
        }
      });
  }, [router]);

  async function handleCreate() {
    if (session === null || vendorId.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const code = skillLabel.trim().toLowerCase().replace(/\s+/g, "_");
      const created = await createWorker(session, {
        displayName: displayName.trim(),
        phoneE164: phone.trim(),
        employmentType: "vendor",
        vendorId,
        skills: [
          {
            skillCode: code || "general",
            skillLabel: skillLabel.trim() || "General",
            proficiency: "standard",
          },
        ],
      });
      router.push(`/workers/${created.id}` as never);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not create worker.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (session === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">Loading…</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/workers" as never}>Workers</Link>{" "}
            <span aria-hidden="true">/</span> New
          </p>
          <h1>Create worker</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        <label className="quote-field">
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="quote-field">
          Phone (E.164)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="quote-field">
          Vendor
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.businessName}
              </option>
            ))}
          </select>
        </label>
        <label className="quote-field">
          Primary skill
          <input
            value={skillLabel}
            onChange={(e) => setSkillLabel(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || displayName.trim().length === 0 || vendorId === ""}
          onClick={() => void handleCreate()}
        >
          {busy ? "Creating…" : "Create worker"}
        </button>
      </section>
    </main>
  );
}
