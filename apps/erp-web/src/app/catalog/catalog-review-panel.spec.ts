import { describe, expect, it } from "vitest";
import {
  blankCatalogMediaForm,
  type CatalogMediaFormState,
} from "./catalog-review-panel";

const filled: CatalogMediaFormState = {
  selectedId: "media-99",
  entityType: "product",
  entityCode: "cinematic_reel",
  mediaUrl: "https://cdn.example/live.jpg",
  thumbnailUrl: "https://cdn.example/live-thumb.jpg",
  altText: "Live cover",
  reviewStatus: "approved",
  sourceKind: "licensed",
  sourceRef: "licence-1",
  licenceNote: "Hyderabad catalogue licence",
  previewOk: true,
};

describe("blankCatalogMediaForm", () => {
  it("resets every New cover field instead of inheriting the selected record", () => {
    const blank = blankCatalogMediaForm();
    expect(blank.selectedId).toBeNull();
    expect(blank.entityType).toBe("occasion");
    expect(blank.entityCode).toBe("");
    expect(blank.mediaUrl).toBe("");
    expect(blank.thumbnailUrl).toBe("");
    expect(blank.altText).toBe("");
    expect(blank.reviewStatus).toBe("draft");
    expect(blank.sourceKind).toBe("unspecified");
    expect(blank.sourceRef).toBe("");
    expect(blank.licenceNote).toBe("");
    expect(blank.previewOk).toBe(false);
    for (const key of Object.keys(filled) as (keyof CatalogMediaFormState)[]) {
      expect(blank[key]).not.toEqual(filled[key]);
    }
  });
});
