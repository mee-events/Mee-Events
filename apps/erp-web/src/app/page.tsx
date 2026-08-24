import Link from "next/link";
import { employeeBootstrapConnection } from "@/lib/platform-bootstrap";

const navigation = [
  {
    label: "CRM",
    items: [
      { short: "DB", label: "Dashboard", href: "#overview", active: true },
      { short: "LE", label: "Leads & enquiries", href: "/leads" },
      { short: "CU", label: "Customers", href: "#system-map" },
      { short: "QT", label: "Requirements & quotes", href: "/quotes" },
    ],
  },
  {
    label: "ERP",
    items: [
      { short: "EV", label: "Event records", href: "/events" as const },
      { short: "OP", label: "Event operations", href: "/operations" as const },
      { short: "MG", label: "Manager ops", href: "/manager" as const },
      { short: "VN", label: "Vendors", href: "/vendors" as const },
      { short: "WK", label: "Workers", href: "/workers" as const },
      { short: "WH", label: "Warehouse", href: "/warehouse" as const },
      { short: "IN", label: "Inventory", href: "/inventory" as const },
      { short: "FN", label: "Finance", href: "/finance" as const },
      { short: "RP", label: "Reports", href: "#team" },
      { short: "CT", label: "Catalog Taxonomy", href: "/catalog" as const },
    ],
  },
];

const metrics = [
  {
    label: "Customer enquiries",
    value: "10,000+",
    detail: "every month",
    tone: "green",
  },
  {
    label: "Events completed",
    value: "500",
    detail: "every month",
    tone: "gold",
  },
  {
    label: "Active vendors",
    value: "3,000",
    detail: "Hyderabad network",
    tone: "blue",
  },
  {
    label: "Field workers",
    value: "100",
    detail: "assignment ready",
    tone: "violet",
  },
];

const pipeline = [
  { number: "01", label: "Enquiry", owner: "Marketing", status: "CRM starts" },
  {
    number: "02",
    label: "Requirements",
    owner: "Marketing",
    status: "Needs captured",
  },
  {
    number: "03",
    label: "Quotation",
    owner: "Manager",
    status: "Sent for approval",
  },
  {
    number: "04",
    label: "Advance",
    owner: "Finance",
    status: "Payment verified",
  },
  {
    number: "05",
    label: "Booking",
    owner: "Marketing",
    status: "Deal confirmed",
  },
  {
    number: "06",
    label: "Event record",
    owner: "Event manager",
    status: "ERP starts",
  },
];

const approvals = [
  {
    type: "Customer payment",
    reference: "ME-2607-1842 · Wedding",
    requestedBy: "Marketing Manager",
    action: "Review schedule",
    priority: "Today",
    tone: "amber",
  },
  {
    type: "Vendor price",
    reference: "ME-2607-1816 · Decor",
    requestedBy: "Event Manager",
    action: "Approve proposal",
    priority: "2h left",
    tone: "red",
  },
  {
    type: "Worker payout",
    reference: "ME-2607-1774 · 12 shifts",
    requestedBy: "Supervisor",
    action: "Verify attendance",
    priority: "Tomorrow",
    tone: "green",
  },
  {
    type: "Warehouse damage",
    reference: "ME-2607-1729 · 4 chairs",
    requestedBy: "Warehouse Manager",
    action: "Review charge",
    priority: "Open",
    tone: "gray",
  },
];

const modules = [
  {
    short: "C",
    title: "Customer app",
    description:
      "Enquiries, quotations, bookings, payments and event tracking.",
    access: "Customer",
    tone: "green",
  },
  {
    short: "V",
    title: "Vendor app",
    description:
      "Requirements, price proposals, work orders and payment status.",
    access: "Approved vendors",
    tone: "gold",
  },
  {
    short: "W",
    title: "Worker app",
    description: "Assignments, attendance, daily work and payout status.",
    access: "Assigned workers",
    tone: "blue",
  },
  {
    short: "E",
    title: "Employee CRM + ERP",
    description:
      "Leads before booking; operations, stock and finance after booking.",
    access: "Permission-based",
    tone: "violet",
    current: true,
  },
];

const roles = [
  { name: "Owner / ERP Admin", count: "Full oversight" },
  { name: "Marketing Managers", count: "Lead → deal" },
  { name: "Event Managers", count: "5 managers" },
  { name: "Supervisors", count: "10 supervisors" },
  { name: "Finance", count: "Payments" },
  { name: "Warehouse", count: "Stock control" },
  { name: "Support", count: "Customer care" },
];

export default function Home() {
  const environment = process.env.NEXT_PUBLIC_APP_ENV ?? "local";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#overview"
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

        <div className="branch-chip">
          <span aria-hidden="true">⌖</span>
          <span>
            <small>Operating branch</small>
            <strong>Hyderabad</strong>
          </span>
        </div>

        <nav className="primary-nav" aria-label="CRM and ERP modules">
          {navigation.map((section) => (
            <section className="nav-section" key={section.label}>
              <p>{section.label}</p>
              <div className="nav-items">
                {section.items.map((item) => (
                  <a
                    className={item.active ? "nav-link active" : "nav-link"}
                    href={item.href}
                    key={item.label}
                    aria-current={item.active ? "page" : undefined}
                  >
                    <span aria-hidden="true">{item.short}</span>
                    {item.label}
                    {item.label === "Finance & approvals" ? (
                      <small aria-label="7 pending approvals">7</small>
                    ) : null}
                  </a>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="profile-card">
          <span className="avatar" aria-hidden="true">
            VA
          </span>
          <span>
            <strong>Vishwa Admin</strong>
            <small>Owner access · Preview</small>
          </span>
          <button type="button" aria-label="Open account menu" disabled>
            ···
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Employee portal <span aria-hidden="true">/</span> Operations
              overview
            </p>
            <h1>Mee Events command centre</h1>
          </div>
          <div className="topbar-actions">
            <span className="connection-status">
              <i aria-hidden="true" />
              Foundation mode
            </span>
            <button
              className="icon-button"
              type="button"
              disabled
              aria-label="Notifications"
            >
              <span aria-hidden="true">●</span>
              <small>7</small>
            </button>
            <span className="date-chip">29 Jul 2026</span>
          </div>
        </header>

        <div className="content">
          <section
            className="foundation-banner"
            aria-label="Prototype status"
            data-bootstrap-endpoint={employeeBootstrapConnection.endpoint}
          >
            <div className="banner-icon" aria-hidden="true">
              i
            </div>
            <div>
              <strong>
                Overview metrics below are illustrative sample data.
              </strong>
              <p>
                Live work lives in the <Link href="/leads">leads inbox</Link>,{" "}
                <Link href="/quotes">quotes</Link>, and event modules —
                connected to the central database. Use{" "}
                <Link href="/login">employee login</Link> (
                <code>+919000000001</code>) for the sync demo.
              </p>
            </div>
            <span>
              {environment.toUpperCase()} DATA ·{" "}
              {employeeBootstrapConnection.connected ? "SYNC ON" : "SYNC OFF"}
            </span>
          </section>

          <section className="overview-heading" id="overview">
            <div>
              <p className="eyebrow">HYDERABAD OPERATIONS</p>
              <h2>Good morning, team.</h2>
              <p>
                See the whole business—from first enquiry to final settlement.
              </p>
            </div>
            <Link className="primary-action" href="/leads">
              Open live leads inbox <span aria-hidden="true">→</span>
            </Link>
          </section>

          <section
            className="metrics-grid"
            aria-label="Confirmed business scale"
          >
            {metrics.map((metric) => (
              <article
                className={`metric-card ${metric.tone}`}
                key={metric.label}
              >
                <div className="metric-head">
                  <span>{metric.label}</span>
                  <i aria-hidden="true" />
                </div>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </article>
            ))}
          </section>

          <section className="panel handoff-panel" id="handoff">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">ONE CONNECTED RECORD</p>
                <h2>Lead-to-event handoff</h2>
                <p>
                  CRM manages the customer before booking. Once the advance is
                  verified, ERP creates the event record—without entering
                  details again.
                </p>
              </div>
              <div className="legend" aria-label="Workflow legend">
                <span>
                  <i className="crm-dot" /> CRM
                </span>
                <span>
                  <i className="erp-dot" /> ERP
                </span>
              </div>
            </div>

            <ol className="pipeline">
              {pipeline.map((stage, index) => (
                <li
                  className={index < 5 ? "crm-stage" : "erp-stage"}
                  key={stage.number}
                >
                  <div className="stage-number">{stage.number}</div>
                  <div className="stage-copy">
                    <strong>{stage.label}</strong>
                    <small>{stage.owner}</small>
                    <span>{stage.status}</span>
                  </div>
                  {index < pipeline.length - 1 ? (
                    <i className="stage-arrow" aria-hidden="true">
                      →
                    </i>
                  ) : null}
                </li>
              ))}
            </ol>

            <div className="handoff-rule">
              <span aria-hidden="true">✓</span>
              <p>
                <strong>Automatic handoff rule:</strong> Quotation approved +
                flexible payment schedule approved + advance verified =
                confirmed booking and central ERP event record.
              </p>
            </div>
          </section>

          <div className="split-layout">
            <section className="panel approvals-panel" id="approvals">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">CONTROL DESK</p>
                  <h2>Approval queue</h2>
                </div>
                <span className="count-badge">7 pending</span>
              </div>

              <div className="approval-list" role="list">
                {approvals.map((approval) => (
                  <article
                    className="approval-row"
                    role="listitem"
                    key={approval.reference}
                  >
                    <span
                      className={`approval-mark ${approval.tone}`}
                      aria-hidden="true"
                    />
                    <div className="approval-copy">
                      <strong>{approval.type}</strong>
                      <span>{approval.reference}</span>
                      <small>Requested by {approval.requestedBy}</small>
                    </div>
                    <div className="approval-action">
                      <span className={`priority ${approval.tone}`}>
                        {approval.priority}
                      </span>
                      <button type="button" disabled>
                        {approval.action}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <p className="disabled-note">
                Actions unlock after authentication and database connection.
              </p>
            </section>

            <section className="panel operations-panel" id="operations">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">OPERATING TEAM</p>
                  <h2>Today’s control points</h2>
                </div>
                <span className="hyderabad-label">Hyderabad only</span>
              </div>

              <div className="control-list">
                <article>
                  <span className="control-code green">EV</span>
                  <div>
                    <strong>Event readiness</strong>
                    <p>
                      Manager checks vendor, workers, materials and payment.
                    </p>
                  </div>
                  <span>Manager</span>
                </article>
                <article>
                  <span className="control-code gold">WH</span>
                  <div>
                    <strong>Warehouse movement</strong>
                    <p>Reserve → dispatch → site receive → return → damage.</p>
                  </div>
                  <span>Warehouse</span>
                </article>
                <article>
                  <span className="control-code blue">AT</span>
                  <div>
                    <strong>Worker attendance</strong>
                    <p>GPS plus Supervisor QR/OTP before payout approval.</p>
                  </div>
                  <span>Supervisor</span>
                </article>
                <article>
                  <span className="control-code violet">FN</span>
                  <div>
                    <strong>Event settlement</strong>
                    <p>
                      Customer, vendor, worker, expenses and profit closure.
                    </p>
                  </div>
                  <span>Finance</span>
                </article>
              </div>
            </section>
          </div>

          <section className="panel system-panel" id="system-map">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SIMPLE SYSTEM MAP</p>
                <h2>One Mee Events system, four safe views</h2>
                <p>
                  Everyone uses the same central record, but each person sees
                  only what their role allows.
                </p>
              </div>
              <span className="scope-pill">21 events · 41 services</span>
            </div>

            <div className="system-map">
              <div className="module-grid">
                {modules.map((module) => (
                  <article
                    className={
                      module.current ? "module-card current" : "module-card"
                    }
                    key={module.title}
                  >
                    <span
                      className={`module-icon ${module.tone}`}
                      aria-hidden="true"
                    >
                      {module.short}
                    </span>
                    <div>
                      <strong>{module.title}</strong>
                      <p>{module.description}</p>
                      <small>{module.access}</small>
                    </div>
                    {module.current ? <b>YOU ARE HERE</b> : null}
                  </article>
                ))}
              </div>

              <div className="central-system">
                <span className="system-ring outer" aria-hidden="true" />
                <span className="system-ring inner" aria-hidden="true" />
                <div>
                  <span aria-hidden="true">ME</span>
                  <strong>Central backend</strong>
                  <small>One database · one audit trail</small>
                  <em>Not connected yet</em>
                </div>
              </div>
            </div>
          </section>

          <section className="panel team-panel" id="team">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">PERMISSION FIRST</p>
                <h2>Employee roles</h2>
              </div>
              <span className="team-total">
                50 office, sales & support employees
              </span>
            </div>

            <div className="roles-grid">
              {roles.map((role, index) => (
                <article key={role.name}>
                  <span aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{role.name}</strong>
                    <small>{role.count}</small>
                  </div>
                </article>
              ))}
            </div>
            <div className="permission-note">
              <strong>Rule:</strong> employees see only their work; approval
              rights stay with the assigned manager or ERP Admin; every
              important change enters the audit history.
            </div>
          </section>

          <footer className="workspace-footer">
            <span>Mee Events · Hyderabad operating foundation</span>
            <span>Sample local data · No live customer records</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
