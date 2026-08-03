import { Suspense } from "react";
import { OperationsEventsClient } from "./operations-events-client";

export default function OperationsEventsPage() {
  return (
    <Suspense
      fallback={
        <main className="leads-shell">
          <p className="leads-loading">Loading…</p>
        </main>
      }
    >
      <OperationsEventsClient />
    </Suspense>
  );
}
