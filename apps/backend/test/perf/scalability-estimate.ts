/**
 * Lightweight query-cost model for list/dashboard endpoints.
 * Run: pnpm --filter @me-event/backend exec tsx test/perf/scalability-estimate.ts
 *
 * Measures algorithmic query counts (before/after hardening), not live RPS.
 * Live load tests require a seeded DB + k6/artillery against a running API.
 */

interface Scenario {
  readonly name: string;
  readonly entityCount: number;
  readonly beforeQueries: number;
  readonly afterQueries: number;
}

function nPlusOneList(entityCount: number, perEntityQueries: number): number {
  return 1 + entityCount * perEntityQueries;
}

function batchList(): number {
  return 2; // COUNT + page SELECT
}

const scenarios: Scenario[] = [
  {
    name: "CRM vendors list (200)",
    entityCount: 200,
    beforeQueries: nPlusOneList(200, 5),
    afterQueries: batchList(),
  },
  {
    name: "CRM workers list (200)",
    entityCount: 200,
    beforeQueries: nPlusOneList(200, 5),
    afterQueries: batchList(),
  },
  {
    name: "CRM inventory items (200)",
    entityCount: 200,
    beforeQueries: nPlusOneList(200, 1),
    afterQueries: batchList(),
  },
  {
    name: "Vendor CRM dashboard (200 vendors + 200 assignments)",
    entityCount: 400,
    beforeQueries:
      nPlusOneList(200, 5) + nPlusOneList(200, 1) /* assignments */,
    afterQueries: 4, // counts + limited lists
  },
  {
    name: "Auth guard per request (cold)",
    entityCount: 1,
    beforeQueries: 3,
    afterQueries: 3,
  },
  {
    name: "Auth guard per request (warm cache)",
    entityCount: 1,
    beforeQueries: 3,
    afterQueries: 0,
  },
];

function estimateCapacity(queriesPerRequest: number): {
  readonly users100: string;
  readonly users1k: string;
  readonly users10k: string;
  readonly users100k: string;
} {
  // Assume Postgres can sustain ~5k simple queries/sec on modest prod hardware.
  const qpsBudget = 5_000;
  const maxRps = Math.floor(qpsBudget / Math.max(queriesPerRequest, 1));
  const classify = (concurrentUsers: number): string => {
    // Assume each active user averages 0.2 RPS (think time).
    const needed = concurrentUsers * 0.2;
    if (needed <= maxRps * 0.5) return "comfortable";
    if (needed <= maxRps) return "tight";
    return "insufficient without horizontal scale / read replicas";
  };
  return {
    users100: classify(100),
    users1k: classify(1_000),
    users10k: classify(10_000),
    users100k: classify(100_000),
  };
}

function main(): void {
  console.log("Mee Events — Scalability estimate (query-count model)\n");
  for (const scenario of scenarios) {
    const reduction =
      scenario.beforeQueries === 0
        ? 0
        : Math.round(
            (1 - scenario.afterQueries / scenario.beforeQueries) * 100,
          );
    console.log(`• ${scenario.name}`);
    console.log(
      `  before=${scenario.beforeQueries} queries  after=${scenario.afterQueries} queries  (−${reduction}%)`,
    );
  }

  const typicalAfter =
    scenarios.find((s) => s.name.includes("vendors list"))?.afterQueries ?? 2;
  const authWarm = 0;
  const blended = typicalAfter + authWarm;
  const capacity = estimateCapacity(blended);
  console.log("\nCapacity (blended list + warm auth):");
  console.log(`  queries/request ≈ ${blended}`);
  console.log(`  100 users:     ${capacity.users100}`);
  console.log(`  1,000 users:   ${capacity.users1k}`);
  console.log(`  10,000 users:  ${capacity.users10k}`);
  console.log(`  100,000 users: ${capacity.users100k}`);
  console.log(
    "\nNote: 10k–100k concurrent users need connection pooling, read replicas,",
  );
  console.log(
    "and horizontal API replicas even with O(1) query lists. Redis session",
  );
  console.log(
    "cache is optional until multi-instance auth cache miss rate rises.",
  );
}

main();
