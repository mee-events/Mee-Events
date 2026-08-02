import type { PlatformBootstrapResponse } from "@me-event/api-contracts";
import type { PlatformRole, RoleAssignment } from "@me-event/shared-types";

export const HYDERABAD_BRANCH = Object.freeze({
  id: "00000000-0000-4000-8000-000000000001",
  code: "HYD",
  name: "Hyderabad",
  city: "Hyderabad",
  state: "Telangana",
  countryCode: "IN",
  timezone: "Asia/Kolkata",
  currencyCode: "INR",
  status: "active",
} as const);

export const capabilityIds = [
  "enquiry.create_own",
  "enquiry.read_own",
  "quotation.read_own",
  "quotation.approve_own",
  "quotation.reject_own",
  "quotation.request_revision_own",
  "booking.read_own",
  "payment.submit_own",
  "payment.read_own",
  "event.track_own",
  "change_request.create_own",
  "support.contact_assigned_manager",
  "vendor_profile.manage_own",
  "vendor_availability.manage_own",
  "vendor_proposal.submit_own",
  "vendor_work_order.read_assigned",
  "vendor_work_order.update_assigned",
  "vendor_evidence.submit_assigned",
  "vendor_invoice.submit_own",
  "vendor_payment.read_own",
  "worker_assignment.read_own",
  "worker_assignment.respond_own",
  "worker_attendance.check_in_own",
  "worker_duty.update_own",
  "worker_payment.read_own",
  "crm_lead.read",
  "crm_lead.update",
  "crm_lead.assign",
  "crm_customer.read",
  "crm_quotation.manage",
  "erp_event.read",
  "erp_event.manage",
  "erp_vendor.read",
  "erp_vendor.manage",
  "erp_vendor_price.approve",
  "erp_worker.read",
  "erp_worker.manage",
  "erp_warehouse.read",
  "erp_warehouse.manage",
  "erp_finance.read",
  "erp_finance.manage",
  "erp_payment.approve",
  "erp_refund.approve",
  "erp_approval.read",
  "erp_approval.decide",
  "report.operational.read",
  "report.financial.read",
  "platform_user.manage",
  "platform_policy.manage",
  "audit.read",
] as const;

export type CapabilityId = (typeof capabilityIds)[number];

export type ClientSurface =
  | "customer_mobile"
  | "vendor_mobile"
  | "worker_mobile"
  | "employee_web";

export type PlatformArea = "self_service" | "crm" | "erp" | "governance";

export const platformModuleIds = [
  "customer_home",
  "customer_enquiries",
  "customer_quotations",
  "customer_bookings",
  "customer_payments",
  "customer_event_tracking",
  "customer_changes",
  "customer_support",
  "vendor_home",
  "vendor_opportunities",
  "vendor_proposals",
  "vendor_work_orders",
  "vendor_availability",
  "vendor_documents",
  "vendor_payments",
  "worker_home",
  "worker_assignments",
  "worker_attendance",
  "worker_duties",
  "worker_payments",
  "employee_dashboard",
  "crm_leads",
  "crm_customers",
  "crm_quotations",
  "erp_events",
  "erp_vendors",
  "erp_workers",
  "erp_warehouse",
  "erp_finance",
  "erp_approvals",
  "erp_reports",
  "platform_administration",
  "audit_log",
] as const;

export type PlatformModuleId = (typeof platformModuleIds)[number];

export interface PlatformModuleDefinition {
  readonly id: PlatformModuleId;
  readonly label: string;
  readonly area: PlatformArea;
}

export interface AuthenticatedPrincipal {
  readonly userId: string;
  readonly sessionId: string;
  readonly activeRole: PlatformRole;
  readonly roleAssignments: readonly RoleAssignment[];
}

export type PlatformBootstrap = PlatformBootstrapResponse;

export const ROLE_SURFACES = {
  customer: "customer_mobile",
  vendor_owner: "vendor_mobile",
  vendor_member: "vendor_mobile",
  worker: "worker_mobile",
  employee: "employee_web",
  support: "employee_web",
  finance: "employee_web",
  manager: "employee_web",
  administrator: "employee_web",
  auditor: "employee_web",
} as const satisfies Readonly<Record<PlatformRole, ClientSurface>>;

export const ROLE_CAPABILITIES = {
  customer: [
    "enquiry.create_own",
    "enquiry.read_own",
    "quotation.read_own",
    "quotation.approve_own",
    "quotation.reject_own",
    "quotation.request_revision_own",
    "booking.read_own",
    "payment.submit_own",
    "payment.read_own",
    "event.track_own",
    "change_request.create_own",
    "support.contact_assigned_manager",
  ],
  vendor_owner: [
    "vendor_profile.manage_own",
    "vendor_availability.manage_own",
    "vendor_proposal.submit_own",
    "vendor_work_order.read_assigned",
    "vendor_work_order.update_assigned",
    "vendor_evidence.submit_assigned",
    "vendor_invoice.submit_own",
    "vendor_payment.read_own",
  ],
  vendor_member: [
    "vendor_availability.manage_own",
    "vendor_work_order.read_assigned",
    "vendor_work_order.update_assigned",
    "vendor_evidence.submit_assigned",
  ],
  worker: [
    "worker_assignment.read_own",
    "worker_assignment.respond_own",
    "worker_attendance.check_in_own",
    "worker_duty.update_own",
    "worker_payment.read_own",
  ],
  employee: [
    "crm_lead.read",
    "crm_lead.update",
    "crm_customer.read",
    "crm_quotation.manage",
    "erp_event.read",
  ],
  support: [
    "crm_lead.read",
    "crm_lead.update",
    "crm_customer.read",
    "erp_event.read",
  ],
  finance: [
    "crm_customer.read",
    "erp_event.read",
    "erp_vendor.read",
    "erp_worker.read",
    "erp_finance.read",
    "erp_finance.manage",
    "erp_payment.approve",
    "erp_refund.approve",
    "erp_approval.read",
    "erp_approval.decide",
    "report.financial.read",
  ],
  manager: [
    "crm_lead.read",
    "crm_lead.update",
    "crm_lead.assign",
    "crm_customer.read",
    "crm_quotation.manage",
    "erp_event.read",
    "erp_event.manage",
    "erp_vendor.read",
    "erp_vendor.manage",
    "erp_worker.read",
    "erp_worker.manage",
    "erp_warehouse.read",
    "erp_warehouse.manage",
    "erp_approval.read",
    "report.operational.read",
  ],
  administrator: capabilityIds,
  auditor: [
    "crm_lead.read",
    "crm_customer.read",
    "erp_event.read",
    "erp_vendor.read",
    "erp_worker.read",
    "erp_warehouse.read",
    "erp_finance.read",
    "erp_approval.read",
    "report.operational.read",
    "report.financial.read",
    "audit.read",
  ],
} as const satisfies Readonly<Record<PlatformRole, readonly CapabilityId[]>>;

export const MODULE_DEFINITIONS = {
  customer_home: {
    id: "customer_home",
    label: "Home",
    area: "self_service",
  },
  customer_enquiries: {
    id: "customer_enquiries",
    label: "Enquiries",
    area: "self_service",
  },
  customer_quotations: {
    id: "customer_quotations",
    label: "Quotations",
    area: "self_service",
  },
  customer_bookings: {
    id: "customer_bookings",
    label: "Bookings",
    area: "self_service",
  },
  customer_payments: {
    id: "customer_payments",
    label: "Payments",
    area: "self_service",
  },
  customer_event_tracking: {
    id: "customer_event_tracking",
    label: "Event tracking",
    area: "self_service",
  },
  customer_changes: {
    id: "customer_changes",
    label: "Changes",
    area: "self_service",
  },
  customer_support: {
    id: "customer_support",
    label: "Manager support",
    area: "self_service",
  },
  vendor_home: {
    id: "vendor_home",
    label: "Home",
    area: "self_service",
  },
  vendor_opportunities: {
    id: "vendor_opportunities",
    label: "Opportunities",
    area: "self_service",
  },
  vendor_proposals: {
    id: "vendor_proposals",
    label: "Price proposals",
    area: "self_service",
  },
  vendor_work_orders: {
    id: "vendor_work_orders",
    label: "Work orders",
    area: "self_service",
  },
  vendor_availability: {
    id: "vendor_availability",
    label: "Availability",
    area: "self_service",
  },
  vendor_documents: {
    id: "vendor_documents",
    label: "Documents",
    area: "self_service",
  },
  vendor_payments: {
    id: "vendor_payments",
    label: "Payments",
    area: "self_service",
  },
  worker_home: {
    id: "worker_home",
    label: "Home",
    area: "self_service",
  },
  worker_assignments: {
    id: "worker_assignments",
    label: "Assignments",
    area: "self_service",
  },
  worker_attendance: {
    id: "worker_attendance",
    label: "Attendance",
    area: "self_service",
  },
  worker_duties: {
    id: "worker_duties",
    label: "Duties",
    area: "self_service",
  },
  worker_payments: {
    id: "worker_payments",
    label: "Payments",
    area: "self_service",
  },
  employee_dashboard: {
    id: "employee_dashboard",
    label: "Dashboard",
    area: "governance",
  },
  crm_leads: { id: "crm_leads", label: "Leads", area: "crm" },
  crm_customers: { id: "crm_customers", label: "Customers", area: "crm" },
  crm_quotations: { id: "crm_quotations", label: "Quotations", area: "crm" },
  erp_events: { id: "erp_events", label: "Events", area: "erp" },
  erp_vendors: { id: "erp_vendors", label: "Vendors", area: "erp" },
  erp_workers: { id: "erp_workers", label: "Workers", area: "erp" },
  erp_warehouse: { id: "erp_warehouse", label: "Warehouse", area: "erp" },
  erp_finance: { id: "erp_finance", label: "Finance", area: "erp" },
  erp_approvals: { id: "erp_approvals", label: "Approvals", area: "erp" },
  erp_reports: { id: "erp_reports", label: "Reports", area: "erp" },
  platform_administration: {
    id: "platform_administration",
    label: "Administration",
    area: "governance",
  },
  audit_log: {
    id: "audit_log",
    label: "Audit log",
    area: "governance",
  },
} as const satisfies Readonly<
  Record<PlatformModuleId, PlatformModuleDefinition>
>;

export const ROLE_MODULES = {
  customer: [
    "customer_home",
    "customer_enquiries",
    "customer_quotations",
    "customer_bookings",
    "customer_payments",
    "customer_event_tracking",
    "customer_changes",
    "customer_support",
  ],
  vendor_owner: [
    "vendor_home",
    "vendor_opportunities",
    "vendor_proposals",
    "vendor_work_orders",
    "vendor_availability",
    "vendor_documents",
    "vendor_payments",
  ],
  vendor_member: [
    "vendor_home",
    "vendor_work_orders",
    "vendor_availability",
    "vendor_documents",
  ],
  worker: [
    "worker_home",
    "worker_assignments",
    "worker_attendance",
    "worker_duties",
    "worker_payments",
  ],
  employee: [
    "employee_dashboard",
    "crm_leads",
    "crm_customers",
    "crm_quotations",
    "erp_events",
  ],
  support: ["employee_dashboard", "crm_leads", "crm_customers", "erp_events"],
  finance: [
    "employee_dashboard",
    "erp_events",
    "erp_finance",
    "erp_approvals",
    "erp_reports",
  ],
  manager: [
    "employee_dashboard",
    "crm_leads",
    "crm_customers",
    "crm_quotations",
    "erp_events",
    "erp_vendors",
    "erp_workers",
    "erp_warehouse",
    "erp_approvals",
    "erp_reports",
  ],
  administrator: [
    "employee_dashboard",
    "crm_leads",
    "crm_customers",
    "crm_quotations",
    "erp_events",
    "erp_vendors",
    "erp_workers",
    "erp_warehouse",
    "erp_finance",
    "erp_approvals",
    "erp_reports",
    "platform_administration",
    "audit_log",
  ],
  auditor: [
    "employee_dashboard",
    "crm_leads",
    "crm_customers",
    "erp_events",
    "erp_vendors",
    "erp_workers",
    "erp_warehouse",
    "erp_finance",
    "erp_approvals",
    "erp_reports",
    "audit_log",
  ],
} as const satisfies Readonly<
  Record<PlatformRole, readonly PlatformModuleId[]>
>;

export const ROLE_LANDING_MODULES = {
  customer: "customer_home",
  vendor_owner: "vendor_home",
  vendor_member: "vendor_home",
  worker: "worker_home",
  employee: "employee_dashboard",
  support: "employee_dashboard",
  finance: "employee_dashboard",
  manager: "employee_dashboard",
  administrator: "employee_dashboard",
  auditor: "employee_dashboard",
} as const satisfies Readonly<Record<PlatformRole, PlatformModuleId>>;
