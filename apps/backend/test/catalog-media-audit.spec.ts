import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "../..");
const MIGRATION = join(
  ROOT,
  "infrastructure/postgres/migrations/0020_catalog_media.sql",
);
const META = join(
  ROOT,
  "infrastructure/postgres/seeds/catalog-taxonomy-v3.meta.json",
);
const IMAGES = join(ROOT, "apps/mobile/assets/images");

const HTML_MASQUERADE_PATHS = [
  "apps/mobile/assets/images/home/banners/concert.jpg",
  "apps/mobile/assets/images/subcategory/engagement/dj_lighting/dj_lighting.jpg",
  "apps/mobile/assets/images/subcategory/engagement/entertainment/entertainment.jpg",
  "apps/mobile/assets/images/subcategory/engagement/flower_garlands/flower_garlands.jpg",
  "apps/mobile/assets/images/subcategory/engagement/mehndi_makeup/mehndi_makeup.jpg",
  "apps/mobile/assets/images/subcategory/mehndi/dj_lighting/dj_lighting.jpg",
  "apps/mobile/assets/images/subcategory/mehndi/entertainment/entertainment.jpg",
  "apps/mobile/assets/images/subcategory/mehndi/mehndi_makeup/mehndi_makeup.jpg",
  "apps/mobile/assets/images/subcategory/pre_wedding/bachelor_party/bachelor_party.jpg",
  "apps/mobile/assets/images/subcategory/pre_wedding/flower_garlands/flower_garlands.jpg",
  "apps/mobile/assets/images/subcategory/pre_wedding/haldi/haldi.jpg",
  "apps/mobile/assets/images/subcategory/pre_wedding/mangalasnanam/mangalasnanam.jpg",
  "apps/mobile/assets/images/subcategory/pre_wedding/mehndi_makeup/mehndi_makeup.jpg",
  "apps/mobile/assets/images/subcategory/sangeet/band_bharat/band_bharat.jpg",
  "apps/mobile/assets/images/subcategory/sangeet/dj_lighting/dj_lighting.jpg",
  "apps/mobile/assets/images/subcategory/sangeet/entertainment/entertainment.jpg",
  "apps/mobile/assets/images/subcategory/sangeet/flower_garlands/flower_garlands.jpg",
  "apps/mobile/assets/images/subcategory/sangeet/mehndi_makeup/mehndi_makeup.jpg",
  "apps/mobile/assets/images/subcategory/wedding/band_bharat/band_bharat.jpg",
  "apps/mobile/assets/images/subcategory/wedding/dj_lighting/dj_lighting.jpg",
  "apps/mobile/assets/images/subcategory/wedding/entertainment/entertainment.jpg",
  "apps/mobile/assets/images/subcategory/wedding/flower_garlands/flower_garlands.jpg",
  "apps/mobile/assets/images/subcategory/wedding/mandapam/mandapam.jpg",
  "apps/mobile/assets/images/subcategory/wedding/mehndi_makeup/mehndi_makeup.jpg",
] as const;

interface TaxonomyMeta {
  readonly eventCategories: number;
  readonly serviceCategories: number;
  readonly subcategories: number;
  readonly products: number;
}

function walkImageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkImageFiles(full));
      continue;
    }
    if (/\.(?:jpg|jpeg|png|webp|gif)$/iu.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function looksLikeHtml(bytes: Uint8Array): boolean {
  const head = Buffer.from(bytes.subarray(0, 80))
    .toString("utf8")
    .toLowerCase();
  return (
    head.includes("<html") || head.includes("<!doctype") || head.includes("404")
  );
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! * 0x1000000 +
      ((bytes[offset + 1]! << 16) |
        (bytes[offset + 2]! << 8) |
        bytes[offset + 3]!)) >>>
    0
  );
}

/** Structural JPEG validation (markers, SOF dimensions, EOI). Not a decoder. */
function isStructurallyValidJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return false;
  }
  let offset = 2;
  let width = 0;
  let height = 0;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return false;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= bytes.length) {
      return false;
    }
    const marker = bytes[offset]!;
    offset += 1;
    if (marker === 0xd9) {
      return width > 0 && height > 0;
    }
    if (
      marker === 0xd8 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    ) {
      continue;
    }
    if (marker === 0xda) {
      if (offset + 2 > bytes.length) {
        return false;
      }
      const sosLength = readUint16(bytes, offset);
      offset += sosLength;
      while (offset + 1 < bytes.length) {
        if (bytes[offset] === 0xff && bytes[offset + 1] !== 0x00) {
          if (bytes[offset + 1] === 0xd9) {
            return width > 0 && height > 0;
          }
          offset += 1;
          continue;
        }
        offset += 1;
      }
      return false;
    }
    if (offset + 1 >= bytes.length) {
      return false;
    }
    const length = readUint16(bytes, offset);
    if (length < 2 || offset + length > bytes.length) {
      return false;
    }
    if (marker >= 0xc0 && marker <= 0xc3) {
      if (length < 7) {
        return false;
      }
      height = readUint16(bytes, offset + 3);
      width = readUint16(bytes, offset + 5);
    }
    offset += length;
  }
  return false;
}

/** Structural PNG validation (signature, IHDR dimensions, IEND). Not a decoder. */
function isStructurallyValidPng(bytes: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24) {
    return false;
  }
  if (!signature.every((value, index) => bytes[index] === value)) {
    return false;
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let sawIend = false;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = Buffer.from(bytes.subarray(offset + 4, offset + 8)).toString(
      "ascii",
    );
    if (offset + 12 + length > bytes.length) {
      return false;
    }
    if (type === "IHDR") {
      if (length !== 13) {
        return false;
      }
      width = readUint32(bytes, offset + 8);
      height = readUint32(bytes, offset + 12);
    }
    if (type === "IEND") {
      sawIend = length === 0;
      offset += 12 + length;
      break;
    }
    offset += 12 + length;
  }
  return sawIend && width > 0 && height > 0;
}

describe("catalogue media foundation audit", () => {
  const meta = JSON.parse(readFileSync(META, "utf8")) as TaxonomyMeta;
  const migration = readFileSync(MIGRATION, "utf8");
  const imageFiles = walkImageFiles(IMAGES);

  it("adds migration 0020 without media seeds and without changing 0018", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS catalog_media");
    expect(migration).not.toMatch(/INSERT INTO catalog_media/iu);
    const migration18 = readFileSync(
      join(
        ROOT,
        "infrastructure/postgres/migrations/0018_catalog_taxonomy_v3.sql",
      ),
      "utf8",
    );
    expect(migration18).not.toContain("catalog_media");
  });

  it("reconciles taxonomy counts 21/41/237/974 with zero seeded media", () => {
    expect(meta.eventCategories).toBe(21);
    expect(meta.serviceCategories).toBe(41);
    expect(meta.subcategories).toBe(237);
    expect(meta.products).toBe(974);
  });

  it("classifies the fixed bundled image inventory by structure, not decoding", () => {
    const htmlFiles: string[] = [];
    let valid = 0;
    let emptyOrCorrupt = 0;
    for (const file of imageFiles) {
      const bytes = new Uint8Array(readFileSync(file));
      const rel = relative(ROOT, file).replaceAll("\\", "/");
      if (statSync(file).size === 0) {
        emptyOrCorrupt += 1;
        continue;
      }
      if (looksLikeHtml(bytes)) {
        htmlFiles.push(rel);
        continue;
      }
      const ext = extname(file).toLowerCase();
      if (
        (ext === ".jpg" || ext === ".jpeg") &&
        isStructurallyValidJpeg(bytes)
      ) {
        valid += 1;
        continue;
      }
      if (ext === ".png" && isStructurallyValidPng(bytes)) {
        valid += 1;
        continue;
      }
      emptyOrCorrupt += 1;
    }
    expect(imageFiles.length).toBe(74);
    expect(valid).toBe(50);
    expect(htmlFiles.length).toBe(24);
    expect(emptyOrCorrupt).toBe(0);
    expect([...htmlFiles].sort()).toEqual([...HTML_MASQUERADE_PATHS].sort());
  });
});
