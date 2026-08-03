"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ServiceCategorySummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  createVendor,
  EmployeeApiError,
  type EmployeeSession,
  listServiceCategories,
  readStoredSession,
} from "@/lib/employee-api";

export default function NewVendorPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [categories, setCategories] = useState<
    readonly ServiceCategorySummary[]
  >([]);
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("+91");
  const [categoryCode, setCategoryCode] = useState("decoration");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = readStoredSession();
    if (stored === null) {
      router.replace("/login");
      return;
    }
    setSession(stored);
    void listServiceCategories(stored)
      .then((response) => {
        setCategories(response.serviceCategories);
        if (response.serviceCategories[0] !== undefined) {
          setCategoryCode(response.serviceCategories[0].code);
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
    if (session === null) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createVendor(session, {
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        phoneE164: phone.trim(),
        categoryCodes: [categoryCode],
        city: "Hyderabad",
        state: "Telangana",
      });
      router.push(`/vendors/${created.id}` as never);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not create vendor.",
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
            <Link href={"/vendors" as never}>Vendors</Link>{" "}
            <span aria-hidden="true">/</span> New
          </p>
          <h1>Create vendor</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        <label className="quote-field">
          Business name
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>
        <label className="quote-field">
          Owner name
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </label>
        <label className="quote-field">
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="quote-field">
          Primary category
          <select
            value={categoryCode}
            onChange={(e) => setCategoryCode(e.target.value)}
          >
            {categories.map((category) => (
              <option key={category.code} value={category.code}>
                {category.displayName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={
            busy ||
            businessName.trim().length === 0 ||
            ownerName.trim().length === 0
          }
          onClick={() => void handleCreate()}
        >
          Create vendor
        </button>
      </section>
    </main>
  );
}
