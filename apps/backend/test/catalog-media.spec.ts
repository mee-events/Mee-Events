import { describe, expect, it } from "vitest";
import {
  firstSafeMediaUrl,
  isPublicCustomerMedia,
  isSafeCatalogMediaUrl,
  orderedGalleryUrls,
  resolveOccasionCover,
  resolveProductCover,
  resolveServiceCover,
  resolveSubcategoryCover,
} from "../src/modules/catalog/domain/catalog-media";
import { planCoverLifecycle } from "../src/modules/catalog/adapters/postgres-catalog.repository";

describe("catalogue media resolution", () => {
  it("rejects empty, javascript, and remote http URLs", () => {
    expect(isSafeCatalogMediaUrl("")).toBe(false);
    expect(isSafeCatalogMediaUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeCatalogMediaUrl("ftp://files.example/a.jpg")).toBe(false);
    expect(isSafeCatalogMediaUrl("http://evil.example/a.jpg")).toBe(false);
    expect(isSafeCatalogMediaUrl("https://cdn.example/w.jpg")).toBe(true);
    expect(isSafeCatalogMediaUrl("http://localhost:3000/w.jpg")).toBe(true);
  });

  it("uses approved product cover then gallery then parents, never an occasion", () => {
    expect(
      resolveProductCover({
        productCover: "https://cdn.example/p-cover.jpg",
        productGallery: ["https://cdn.example/p-g1.jpg"],
        parentSubcategoryCover: "https://cdn.example/sub.jpg",
        parentServiceCover: "https://cdn.example/svc.jpg",
      }),
    ).toBe("https://cdn.example/p-cover.jpg");
    expect(
      resolveProductCover({
        productGallery: ["https://cdn.example/p-g1.jpg"],
        parentSubcategoryCover: "https://cdn.example/sub.jpg",
      }),
    ).toBe("https://cdn.example/p-g1.jpg");
    expect(
      resolveProductCover({
        parentSubcategoryCover: "https://cdn.example/sub.jpg",
        parentServiceCover: "https://cdn.example/svc.jpg",
      }),
    ).toBe("https://cdn.example/sub.jpg");
    expect(
      resolveProductCover({
        parentServiceCover: "https://cdn.example/svc.jpg",
      }),
    ).toBe("https://cdn.example/svc.jpg");
    expect(
      firstSafeMediaUrl([
        "https://cdn.example/svc.jpg",
        "https://cdn.example/wedding.jpg",
      ]),
    ).toBe("https://cdn.example/svc.jpg");
    expect(resolveProductCover({})).toBeNull();
  });

  it("does not inherit occasion photography onto services", () => {
    expect(
      resolveServiceCover({
        serviceCover: null,
        serviceIcon: null,
      }),
    ).toBeNull();
    expect(
      resolveOccasionCover({
        occasionCover: "https://cdn.example/wedding.jpg",
      }),
    ).toBe("https://cdn.example/wedding.jpg");
  });

  it("inherits subcategory cover from the parent service only", () => {
    expect(
      resolveSubcategoryCover({
        parentServiceCover: "https://cdn.example/svc.jpg",
      }),
    ).toBe("https://cdn.example/svc.jpg");
  });

  it("orders gallery by display order and drops unsafe URLs", () => {
    expect(
      orderedGalleryUrls([
        { url: "javascript:x", displayOrder: 0 },
        { url: "https://cdn.example/b.jpg", displayOrder: 2 },
        { url: "https://cdn.example/a.jpg", displayOrder: 1 },
      ]),
    ).toEqual(["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"]);
  });

  it("hides draft or non-Hyderabad media from customers", () => {
    expect(
      isPublicCustomerMedia({
        active: true,
        hyderabadCustomerVisible: true,
        reviewStatus: "draft",
        mediaUrl: "https://cdn.example/a.jpg",
      }),
    ).toBe(false);
    expect(
      isPublicCustomerMedia({
        active: true,
        hyderabadCustomerVisible: false,
        reviewStatus: "approved",
        mediaUrl: "https://cdn.example/a.jpg",
      }),
    ).toBe(false);
    expect(
      isPublicCustomerMedia({
        active: true,
        hyderabadCustomerVisible: true,
        reviewStatus: "approved",
        mediaUrl: "https://cdn.example/a.jpg",
      }),
    ).toBe(true);
  });

  it("plans cover promotion only for explicit lifecycle transitions", () => {
    expect(
      planCoverLifecycle({
        mediaRole: "cover",
        existingActive: false,
        existingReviewStatus: "approved",
        nextReviewStatus: "approved",
      }),
    ).toEqual({ active: false, promote: false });
    expect(
      planCoverLifecycle({
        mediaRole: "cover",
        existingActive: true,
        existingReviewStatus: "approved",
        nextReviewStatus: "approved",
        requestedActive: false,
      }),
    ).toEqual({ active: false, promote: false });
    expect(
      planCoverLifecycle({
        mediaRole: "cover",
        existingActive: false,
        existingReviewStatus: "draft",
        nextReviewStatus: "approved",
      }),
    ).toEqual({ active: true, promote: true });
    expect(
      planCoverLifecycle({
        mediaRole: "cover",
        existingActive: false,
        existingReviewStatus: "draft",
        nextReviewStatus: "approved",
        requestedActive: false,
      }),
    ).toEqual({ active: false, promote: false });
    expect(
      planCoverLifecycle({
        mediaRole: "cover",
        existingActive: false,
        existingReviewStatus: "approved",
        nextReviewStatus: "approved",
        requestedActive: true,
      }),
    ).toEqual({ active: true, promote: true });
    expect(
      planCoverLifecycle({
        mediaRole: "cover",
        existingActive: false,
        existingReviewStatus: "rejected",
        nextReviewStatus: "rejected",
      }).promote,
    ).toBe(false);
  });
});
