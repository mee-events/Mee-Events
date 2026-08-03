import { Suspense } from "react";
import { FinanceEventsClient } from "./finance-events-client";

export default function FinanceEventsPage() {
  return (
    <Suspense
      fallback={
        <main className="leads-shell">
          <p className="leads-loading">Loading…</p>
        </main>
      }
    >
      <FinanceEventsClient />
    </Suspense>
  );
}
