import { Suspense } from "react";
import { VendorAssignmentsClient } from "./vendor-assignments-client";

export default function VendorAssignmentsPage() {
  return (
    <Suspense
      fallback={
        <main className="leads-shell">
          <p className="leads-loading">Loading assignments…</p>
        </main>
      }
    >
      <VendorAssignmentsClient />
    </Suspense>
  );
}
