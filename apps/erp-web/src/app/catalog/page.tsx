import Link from "next/link";
import type { Route } from "next";
import { CatalogReviewPanel } from "./catalog-review-panel";

/**
 * Catalog endpoints are public and live under NEXT_PUBLIC_API_BASE_URL
 * (same base as platform-bootstrap — not the bootstrap path itself).
 */
const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002/api/v1"
).replace(/\/+$/, "");

interface CatalogEventType {
  readonly code: string;
  readonly displayName: string;
  readonly displayOrder: number;
}

interface CatalogServiceCategory {
  readonly code: string;
  readonly displayName: string;
  readonly displayOrder: number;
}

interface CatalogService {
  readonly code: string;
  readonly displayName: string;
  readonly departmentCode: string;
  readonly entityKind: string;
  readonly displayOrder: number;
}

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default async function CatalogPage() {
  const [eventTypesPayload, serviceCategoriesPayload, servicesPayload] =
    await Promise.all([
      loadJson<{ eventTypes: CatalogEventType[] }>("/catalog/event-types"),
      loadJson<{ serviceCategories: CatalogServiceCategory[] }>(
        "/catalog/service-categories",
      ),
      loadJson<{ services: CatalogService[] }>("/catalog/services"),
    ]);

  const eventTypes = eventTypesPayload?.eventTypes ?? [];
  const serviceCategories = serviceCategoriesPayload?.serviceCategories ?? [];
  const services = servicesPayload?.services ?? [];
  const fetchFailed =
    eventTypesPayload === null ||
    serviceCategoriesPayload === null ||
    servicesPayload === null;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href={"/" as Route}
          aria-label="Mee Events dashboard home"
        >
          <span className="brand-mark" aria-hidden="true">
            ME
          </span>
          <span>
            <strong>Mee Events</strong>
            <small>Employee portal</small>
          </span>
        </a>
        <nav className="primary-nav" style={{ marginTop: "2rem" }}>
          <section className="nav-section">
            <div className="nav-items">
              <Link className="nav-link" href={"/" as Route}>
                <span aria-hidden="true">←</span>Back to Dashboard
              </Link>
              <Link className="nav-link active" href={"/catalog" as Route}>
                <span aria-hidden="true">CT</span>Catalog Taxonomy
              </Link>
            </div>
          </section>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Employee portal <span aria-hidden="true">/</span> ERP{" "}
              <span aria-hidden="true">/</span> Catalog
            </p>
            <h1>Master Catalog Taxonomy</h1>
          </div>
        </header>

        <div className="content">
          {fetchFailed ? (
            <p className="leads-error" style={{ marginBottom: "1.5rem" }}>
              Could not reach the catalog API at{" "}
              <code>{apiBaseUrl}/catalog/*</code>. Confirm the backend is
              running.
            </p>
          ) : null}

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SOURCE OF TRUTH</p>
                <h2>Event Types (Occasions)</h2>
                <p>The top-level occasions recognized by the platform.</p>
              </div>
              <span className="count-badge">{eventTypes.length} events</span>
            </div>

            <div style={{ overflowX: "auto", padding: "1rem" }}>
              <table
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "1rem" }}>Code</th>
                    <th style={{ padding: "1rem" }}>Display Name</th>
                    <th style={{ padding: "1rem" }}>Order</th>
                  </tr>
                </thead>
                <tbody>
                  {eventTypes.map((type) => (
                    <tr
                      key={type.code}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "1rem" }}>
                        <code
                          style={{
                            background: "#f1f5f9",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                          }}
                        >
                          {type.code}
                        </code>
                      </td>
                      <td style={{ padding: "1rem", fontWeight: 500 }}>
                        {type.displayName}
                      </td>
                      <td style={{ padding: "1rem", color: "#64748b" }}>
                        {type.displayOrder}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel" style={{ marginTop: "2rem" }}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SOURCE OF TRUTH</p>
                <h2>Service Categories (Departments)</h2>
                <p>
                  High-level departments used by enquiries and vendor routing.
                </p>
              </div>
              <span className="count-badge">
                {serviceCategories.length} departments
              </span>
            </div>

            <div style={{ overflowX: "auto", padding: "1rem" }}>
              <table
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "1rem" }}>Code</th>
                    <th style={{ padding: "1rem" }}>Display Name</th>
                    <th style={{ padding: "1rem" }}>Order</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceCategories.map((category) => (
                    <tr
                      key={category.code}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "1rem" }}>
                        <code
                          style={{
                            background: "#f1f5f9",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                          }}
                        >
                          {category.code}
                        </code>
                      </td>
                      <td style={{ padding: "1rem", fontWeight: 500 }}>
                        {category.displayName}
                      </td>
                      <td style={{ padding: "1rem", color: "#64748b" }}>
                        {category.displayOrder}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel" style={{ marginTop: "2rem" }}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">TAXONOMY V2</p>
                <h2>Granular Services</h2>
                <p>Shared service catalog including festival service #33.</p>
              </div>
              <span className="count-badge">{services.length} services</span>
            </div>

            <div style={{ overflowX: "auto", padding: "1rem" }}>
              <table
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "1rem" }}>Code</th>
                    <th style={{ padding: "1rem" }}>Display Name</th>
                    <th style={{ padding: "1rem" }}>Department</th>
                    <th style={{ padding: "1rem" }}>Kind</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr
                      key={service.code}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "1rem" }}>
                        <code
                          style={{
                            background: "#f1f5f9",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                          }}
                        >
                          {service.code}
                        </code>
                      </td>
                      <td style={{ padding: "1rem", fontWeight: 500 }}>
                        {service.displayName}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span
                          style={{
                            background: "#e0f2fe",
                            color: "#0369a1",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "999px",
                            fontSize: "0.875rem",
                          }}
                        >
                          {service.departmentCode}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", color: "#64748b" }}>
                        {service.entityKind}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <CatalogReviewPanel />
        </div>
      </section>
    </main>
  );
}
