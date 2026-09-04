import type {
  VendorDetailResponse,
  VendorSummary,
} from "@me-event/api-contracts";

/**
 * Runtime allowlist for vendor list/dashboard responses.
 *
 * TypeScript types do not remove detail-only fields from JavaScript objects, so
 * every VendorSummary boundary must construct the public shape explicitly.
 */
export function toVendorSummary(detail: VendorDetailResponse): VendorSummary {
  return {
    id: detail.id,
    vendorCode: detail.vendorCode,
    businessName: detail.businessName,
    ownerName: detail.ownerName,
    phoneE164: detail.phoneE164,
    city: detail.city,
    state: detail.state,
    verificationStatus: detail.verificationStatus,
    activeStatus: detail.activeStatus,
    ratingAverage: detail.ratingAverage,
    ratingCount: detail.ratingCount,
    categories: detail.categories,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    ...(detail.email === undefined ? {} : { email: detail.email }),
  };
}
