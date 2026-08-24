"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type {
  CatalogMediaCoverage,
  CatalogMediaReviewStatus,
  CatalogMediaSourceKind,
  CatalogReviewMedia,
  CatalogReviewProduct,
  UpdateCatalogContentStatusRequest,
  UpsertCatalogMediaRequest,
} from "@me-event/api-contracts";
import {
  listCatalogMediaCoverage,
  listCatalogReviewMedia,
  listCatalogReviewProducts,
  readStoredSession,
  updateCatalogMedia,
  updateCatalogProductContent,
  upsertCatalogMedia,
  type EmployeeSession,
} from "../../lib/employee-api";

function coverageLine(
  label: string,
  total: number,
  direct: number,
  inherited?: number,
): string {
  const remaining = Math.max(0, total - direct - (inherited ?? 0));
  const inherit = inherited === undefined ? "" : `, inherited ${inherited}`;
  return `${label}: ${direct}/${total} approved covers${inherit}; ${remaining} still need media`;
}

function canApproveProvenance(
  sourceKind: CatalogMediaSourceKind,
  sourceRef: string,
  licenceNote: string,
): boolean {
  if (sourceKind === "unspecified") {
    return false;
  }
  if (sourceKind === "licensed") {
    return sourceRef.trim().length >= 3 && licenceNote.trim().length >= 3;
  }
  return true;
}

export interface CatalogMediaFormState {
  readonly selectedId: string | null;
  readonly entityType: UpsertCatalogMediaRequest["entityType"];
  readonly entityCode: string;
  readonly mediaUrl: string;
  readonly thumbnailUrl: string;
  readonly altText: string;
  readonly reviewStatus: CatalogMediaReviewStatus;
  readonly sourceKind: CatalogMediaSourceKind;
  readonly sourceRef: string;
  readonly licenceNote: string;
  readonly previewOk: boolean;
}

export function blankCatalogMediaForm(): CatalogMediaFormState {
  return {
    selectedId: null,
    entityType: "occasion",
    entityCode: "",
    mediaUrl: "",
    thumbnailUrl: "",
    altText: "",
    reviewStatus: "draft",
    sourceKind: "unspecified",
    sourceRef: "",
    licenceNote: "",
    previewOk: false,
  };
}

export function CatalogReviewPanel() {
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [products, setProducts] = useState<readonly CatalogReviewProduct[]>([]);
  const [coverage, setCoverage] = useState<CatalogMediaCoverage | null>(null);
  const [media, setMedia] = useState<readonly CatalogReviewMedia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entityType, setEntityType] =
    useState<UpsertCatalogMediaRequest["entityType"]>("occasion");
  const [entityCode, setEntityCode] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [reviewStatus, setReviewStatus] =
    useState<CatalogMediaReviewStatus>("draft");
  const [sourceKind, setSourceKind] =
    useState<CatalogMediaSourceKind>("unspecified");
  const [sourceRef, setSourceRef] = useState("");
  const [licenceNote, setLicenceNote] = useState("");
  const [previewOk, setPreviewOk] = useState(false);

  useEffect(() => {
    const stored = readStoredSession();
    setSession(stored);
    if (stored === null) {
      return;
    }
    void Promise.all([
      listCatalogReviewProducts(stored),
      listCatalogMediaCoverage(stored),
      listCatalogReviewMedia(stored),
    ])
      .then(([payload, mediaCoverage, mediaPayload]) => {
        setProducts(payload.products);
        setCoverage(mediaCoverage);
        setMedia(mediaPayload.media);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Could not load review queue",
        );
      });
  }, []);

  useEffect(() => {
    setPreviewOk(false);
  }, [mediaUrl]);

  async function refreshMedia(stored: EmployeeSession): Promise<void> {
    const [mediaCoverage, mediaPayload] = await Promise.all([
      listCatalogMediaCoverage(stored),
      listCatalogReviewMedia(stored),
    ]);
    setCoverage(mediaCoverage);
    setMedia(mediaPayload.media);
  }

  async function patch(
    code: string,
    body: UpdateCatalogContentStatusRequest,
  ): Promise<void> {
    if (session === null) {
      return;
    }
    setBusyCode(code);
    try {
      const updated = await updateCatalogProductContent(session, code, body);
      setProducts((current) =>
        current.map((product) => (product.code === code ? updated : product)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyCode(null);
    }
  }

  function applyBlankMediaForm(): void {
    const blank = blankCatalogMediaForm();
    setSelectedId(blank.selectedId);
    setEntityType(blank.entityType);
    setEntityCode(blank.entityCode);
    setMediaUrl(blank.mediaUrl);
    setThumbnailUrl(blank.thumbnailUrl);
    setAltText(blank.altText);
    setReviewStatus(blank.reviewStatus);
    setSourceKind(blank.sourceKind);
    setSourceRef(blank.sourceRef);
    setLicenceNote(blank.licenceNote);
    setPreviewOk(blank.previewOk);
    setError(null);
  }

  function loadRecord(record: CatalogReviewMedia): void {
    setSelectedId(record.id);
    setEntityType(record.entityType);
    setEntityCode(record.entityCode);
    setMediaUrl(record.mediaUrl);
    setThumbnailUrl(record.thumbnailUrl ?? "");
    setAltText(record.altText);
    setReviewStatus(record.reviewStatus);
    setSourceKind(record.sourceKind);
    setSourceRef(record.sourceRef ?? "");
    setLicenceNote(record.licenceNote ?? "");
    setPreviewOk(false);
  }

  async function saveMedia(): Promise<void> {
    if (session === null) {
      return;
    }
    if (reviewStatus === "approved" && !previewOk) {
      setError("Approval is disabled until the preview image loads");
      return;
    }
    if (
      reviewStatus === "approved" &&
      !canApproveProvenance(sourceKind, sourceRef, licenceNote)
    ) {
      setError("Approval requires a valid source kind and licence details");
      return;
    }
    setMediaBusy(true);
    try {
      const thumbnail = thumbnailUrl.trim() === "" ? null : thumbnailUrl.trim();
      if (selectedId) {
        await updateCatalogMedia(session, selectedId, {
          mediaUrl: mediaUrl.trim(),
          thumbnailUrl: thumbnail,
          altText: altText.trim(),
          reviewStatus,
          sourceKind,
          sourceRef: sourceRef.trim() === "" ? null : sourceRef.trim(),
          licenceNote: licenceNote.trim() === "" ? null : licenceNote.trim(),
          reason: "ERP catalogue media review",
        });
      } else {
        await upsertCatalogMedia(session, {
          entityType,
          entityCode: entityCode.trim(),
          mediaUrl: mediaUrl.trim(),
          ...(thumbnail === null ? {} : { thumbnailUrl: thumbnail }),
          mediaRole: "cover",
          altText: altText.trim(),
          reviewStatus,
          sourceKind,
          ...(sourceRef.trim() === "" ? {} : { sourceRef: sourceRef.trim() }),
          ...(licenceNote.trim() === ""
            ? {}
            : { licenceNote: licenceNote.trim() }),
          reason: "ERP catalogue media review",
        });
      }
      await refreshMedia(session);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Media update failed");
    } finally {
      setMediaBusy(false);
    }
  }

  if (session === null) {
    return (
      <p className="leads-error">
        Sign in to review product copy. Public taxonomy above does not require a
        session.
      </p>
    );
  }

  const approvalBlocked =
    reviewStatus === "approved" &&
    (!previewOk || !canApproveProvenance(sourceKind, sourceRef, licenceNote));

  return (
    <>
      <section className="panel" style={{ marginTop: "2rem" }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">MEDIA REVIEW</p>
            <h2>Catalogue media coverage</h2>
            <p>
              New covers default to draft. Licensed rows need a source reference
              and licence note before approval. Unspecified source cannot be
              approved. Public customers never receive provenance.
            </p>
          </div>
        </div>
        {coverage ? (
          <ul style={{ margin: "1rem", lineHeight: 1.7 }}>
            <li>
              {coverageLine(
                "Occasions",
                coverage.occasions.total,
                coverage.occasions.withApprovedCover,
              )}
            </li>
            <li>
              {coverageLine(
                "Services",
                coverage.services.total,
                coverage.services.withApprovedCover,
              )}
            </li>
            <li>
              {coverageLine(
                "Subcategories",
                coverage.subcategories.total,
                coverage.subcategories.withApprovedCover,
                coverage.subcategories.withInheritedCover,
              )}
            </li>
            <li>
              {coverageLine(
                "Products",
                coverage.products.total,
                coverage.products.withApprovedCover,
                coverage.products.withInheritedCover,
              )}
            </li>
          </ul>
        ) : null}
        <form
          style={{
            display: "grid",
            gap: "0.75rem",
            padding: "1rem",
            maxWidth: "40rem",
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void saveMedia();
          }}
        >
          <label>
            Entity type
            <select
              value={entityType}
              onChange={(event) =>
                setEntityType(
                  event.target.value as UpsertCatalogMediaRequest["entityType"],
                )
              }
              disabled={selectedId !== null}
            >
              <option value="occasion">occasion</option>
              <option value="service">service</option>
              <option value="subcategory">subcategory</option>
              <option value="product">product</option>
            </select>
          </label>
          <label>
            Stable entity code
            <input
              value={entityCode}
              onChange={(event) => setEntityCode(event.target.value)}
              required
              disabled={selectedId !== null}
            />
          </label>
          <label>
            Cover URL (https)
            <input
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              required
            />
          </label>
          {mediaUrl.trim() ? (
            <div>
              <p>Preview</p>
              {/* Operator-supplied metadata URL only; no new hotlinked catalogue photos. */}
              <Image
                src={mediaUrl.trim()}
                alt={altText.trim() || "Catalogue media preview"}
                width={240}
                height={160}
                unoptimized
                style={{ objectFit: "cover", background: "#f1f5f9" }}
                onLoad={() => setPreviewOk(true)}
                onError={() => setPreviewOk(false)}
              />
              <p>
                {previewOk
                  ? "Preview loaded"
                  : "Preview failed or pending — approval stays disabled"}
              </p>
            </div>
          ) : null}
          <label>
            Thumbnail URL (optional, empty clears on update)
            <input
              value={thumbnailUrl}
              onChange={(event) => setThumbnailUrl(event.target.value)}
            />
          </label>
          <label>
            Alt text
            <input
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              required
            />
          </label>
          <label>
            Review status
            <select
              value={reviewStatus}
              onChange={(event) =>
                setReviewStatus(event.target.value as CatalogMediaReviewStatus)
              }
            >
              <option value="draft">draft</option>
              <option value="in_review">in_review</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <label>
            Source kind
            <select
              value={sourceKind}
              onChange={(event) =>
                setSourceKind(event.target.value as CatalogMediaSourceKind)
              }
            >
              <option value="unspecified">unspecified</option>
              <option value="internal">internal</option>
              <option value="licensed">licensed</option>
              <option value="bundle_asset">bundle_asset</option>
            </select>
          </label>
          <label>
            Source reference
            <input
              value={sourceRef}
              onChange={(event) => setSourceRef(event.target.value)}
            />
          </label>
          <label>
            Licence note
            <input
              value={licenceNote}
              onChange={(event) => setLicenceNote(event.target.value)}
            />
          </label>
          <button type="submit" disabled={mediaBusy || approvalBlocked}>
            {selectedId
              ? "Update media metadata"
              : "Save cover metadata as draft unless status changed"}
          </button>
          {selectedId ? (
            <button type="button" onClick={() => applyBlankMediaForm()}>
              New cover
            </button>
          ) : null}
        </form>
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
                <th style={{ padding: "0.75rem" }}>Entity</th>
                <th style={{ padding: "0.75rem" }}>URL</th>
                <th style={{ padding: "0.75rem" }}>Thumbnail</th>
                <th style={{ padding: "0.75rem" }}>Alt</th>
                <th style={{ padding: "0.75rem" }}>Source</th>
                <th style={{ padding: "0.75rem" }}>Status</th>
                <th style={{ padding: "0.75rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {media.map((record) => (
                <tr
                  key={record.id}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  <td style={{ padding: "0.75rem" }}>
                    {record.entityType}/{record.entityCode}
                  </td>
                  <td style={{ padding: "0.75rem" }}>{record.mediaUrl}</td>
                  <td style={{ padding: "0.75rem" }}>
                    {record.thumbnailUrl ?? "—"}
                  </td>
                  <td style={{ padding: "0.75rem" }}>{record.altText}</td>
                  <td style={{ padding: "0.75rem" }}>
                    {record.sourceKind}
                    {record.sourceRef ? ` · ${record.sourceRef}` : ""}
                  </td>
                  <td style={{ padding: "0.75rem" }}>{record.reviewStatus}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <button type="button" onClick={() => loadRecord(record)}>
                      Edit
                    </button>
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
            <p className="eyebrow">CONTENT REVIEW</p>
            <h2>Product copy queue</h2>
            <p>
              Approve customer-visible names. Placeholders and restricted rows
              stay hidden until approved and selectable.
            </p>
          </div>
          <span className="count-badge">{products.length} products</span>
        </div>
        {error ? (
          <p className="leads-error" style={{ margin: "1rem" }}>
            {error}
          </p>
        ) : null}
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
                <th style={{ padding: "1rem" }}>Display name</th>
                <th style={{ padding: "1rem" }}>Status</th>
                <th style={{ padding: "1rem" }}>Flags</th>
                <th style={{ padding: "1rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 80).map((product) => (
                <tr
                  key={product.code}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  <td style={{ padding: "1rem" }}>
                    <code>{product.code}</code>
                  </td>
                  <td style={{ padding: "1rem", fontWeight: 500 }}>
                    {product.displayName}
                  </td>
                  <td style={{ padding: "1rem" }}>{product.contentStatus}</td>
                  <td style={{ padding: "1rem", color: "#64748b" }}>
                    {product.placeholder ? "placeholder " : ""}
                    {product.customerSelectable ? "selectable " : "hidden "}
                    {product.eligibilityFlags.join(", ")}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <button
                      type="button"
                      disabled={busyCode === product.code}
                      onClick={() =>
                        void patch(product.code, { contentStatus: "approved" })
                      }
                    >
                      Approve
                    </button>{" "}
                    <button
                      type="button"
                      disabled={busyCode === product.code}
                      onClick={() =>
                        void patch(product.code, { contentStatus: "rejected" })
                      }
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
