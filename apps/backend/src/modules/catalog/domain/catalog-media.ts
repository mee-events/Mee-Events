export const catalogMediaEntityTypes = [
  "occasion",
  "service",
  "subcategory",
  "product",
] as const;
export type CatalogMediaEntityType = (typeof catalogMediaEntityTypes)[number];

export const catalogMediaRoles = ["cover", "gallery", "icon"] as const;
export type CatalogMediaRole = (typeof catalogMediaRoles)[number];

export const catalogMediaReviewStatuses = [
  "draft",
  "in_review",
  "approved",
  "rejected",
] as const;
export type CatalogMediaReviewStatus =
  (typeof catalogMediaReviewStatuses)[number];

export const catalogMediaSourceKinds = [
  "internal",
  "licensed",
  "bundle_asset",
  "unspecified",
] as const;
export type CatalogMediaSourceKind = (typeof catalogMediaSourceKinds)[number];

export interface PublicCatalogMediaItem {
  readonly url: string;
  readonly thumbnailUrl: string | null;
  readonly altText: string;
}

export function isSafeCatalogMediaUrl(raw: string): boolean {
  const url = raw.trim();
  if (url.length === 0 || url.length > 2000) {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol === "https:") {
    return parsed.hostname.length > 0;
  }
  if (parsed.protocol === "http:") {
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  }
  return false;
}

export function firstSafeMediaUrl(
  candidates: readonly (string | null | undefined)[],
): string | null {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }
    const trimmed = candidate.trim();
    if (isSafeCatalogMediaUrl(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

export function resolveOccasionCover(input: {
  readonly occasionCover?: string | null;
}): string | null {
  return firstSafeMediaUrl([input.occasionCover]);
}

export function resolveServiceCover(input: {
  readonly serviceCover?: string | null;
  readonly serviceIcon?: string | null;
}): string | null {
  return firstSafeMediaUrl([input.serviceCover, input.serviceIcon]);
}

export function resolveSubcategoryCover(input: {
  readonly subcategoryCover?: string | null;
  readonly parentServiceCover?: string | null;
  readonly parentServiceIcon?: string | null;
}): string | null {
  return firstSafeMediaUrl([
    input.subcategoryCover,
    input.parentServiceCover,
    input.parentServiceIcon,
  ]);
}

export function resolveProductCover(input: {
  readonly productCover?: string | null;
  readonly productGallery?: readonly string[];
  readonly parentSubcategoryCover?: string | null;
  readonly parentServiceCover?: string | null;
  readonly parentServiceIcon?: string | null;
}): string | null {
  return firstSafeMediaUrl([
    input.productCover,
    ...(input.productGallery ?? []),
    input.parentSubcategoryCover,
    input.parentServiceCover,
    input.parentServiceIcon,
  ]);
}

export function orderedGalleryUrls(
  items: readonly { readonly url: string; readonly displayOrder: number }[],
): readonly string[] {
  return [...items]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((item) => item.url.trim())
    .filter((url) => isSafeCatalogMediaUrl(url));
}

export function isPublicCustomerMedia(row: {
  readonly active: boolean;
  readonly hyderabadCustomerVisible: boolean;
  readonly reviewStatus: string;
  readonly mediaUrl: string;
}): boolean {
  return (
    row.active &&
    row.hyderabadCustomerVisible &&
    row.reviewStatus === "approved" &&
    isSafeCatalogMediaUrl(row.mediaUrl)
  );
}

export class CatalogMediaValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CatalogMediaValidationError";
  }
}
