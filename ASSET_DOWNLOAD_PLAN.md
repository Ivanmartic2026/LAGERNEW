# Asset Download Plan — Base44 Export → Local Storage

> Generated: 2026-04-30  
> Status: PLANNING — no downloads, DB changes, or code modifications made.

---

## 1. Executive Summary

| Metric | Count |
|--------|-------|
| **Total unique URLs found in export** | **517** |
| Hosted on Base44 (`base44.app` / `base44.com`) | 403 |
| External links (supplier sites, manuals, etc.) | 114 |
| External files worth downloading | 14 |
| **Files already stored locally** | **0** |
| Duplicate URLs | 0 |

**Critical finding:** 403 files are hosted on Base44 infrastructure. If the Base44 app is decommissioned or files are purged, these assets will become unreachable. **These must be downloaded and self-hosted.**

---

## 2. Base44-Hosted Files (403 files) — PRIORITY 1

All Base44 URLs use **public endpoints** — no authentication token required for download.

### URL Patterns

```
https://base44.app/api/apps/69455d52c9eab36b7d26cc74/files/mp/public/69455d52c9eab36b7d26cc74/<filename>
https://base44.app/api/apps/69455d52c9eab36b7d26cc74/files/public/69455d52c9eab36b7d26cc74/<filename>
https://media.base44.com/images/public/69455d52c9eab36b7d26cc74/<filename>
```

### Breakdown by File Type

| Extension | Count | Description |
|-----------|-------|-------------|
| `.jpg` | 365 | Product images, article photos, scans |
| `.pdf` | 21 | Invoices, quotations, proformas, work orders, purchase orders |
| `.png` | 6 | Screenshots, invoice scans, product images |
| `.jpeg` | 4 | Product images |
| `.rcfgx` | 2 | Novastar receiver card configuration files |
| `.zip` | 2 | Archives (likely project files or datasheets) |
| `.rar` | 1 | Archive |
| `.dwg` | 1 | AutoCAD drawing |
| *(unknown)* | 1 | Extension parsed as "1" — needs manual review |

### Classification by Business Purpose

| Category | Count | Source Fields | Notes |
|----------|-------|---------------|-------|
| **Article / Product Images** | 384 | `Article.image_urls[]`, `Article.source_invoice_url` (image files) | Primary visual assets for inventory |
| **Site Report Images** | 1 | `SiteReportImage.image_url` | Field documentation photos |
| **Invoice PDFs** | 2 | `Article.source_invoice_url` | Supplier invoices |
| **Quotation PDFs** | 2 | `Order.source_document_url` | Customer quotations |
| **Work Order PDFs** | 1 | `Order.source_document_url` | Work order documents |
| **Proforma Invoice PDFs** | 7 | `Article.source_invoice_url`, `PurchaseOrder.invoice_file_url` | PI / advance payment docs |
| **Purchase Order PDFs** | 2 | `Order.source_document_url` | PO documents |
| **Other PDFs** | 4 | `Article.source_invoice_url` | Mixed (order confirmations, screenshots) |

### Sample Filenames

```
2cad0144b_image.jpg                    # Article product image
562ab7336_faktura.pdf                  # Invoice
04f6acce8_arbetsorder-2026-04-01-...   # Work order
07c7db070_QuotationLST6W672xH384m...   # Quotation
bb6ac79b0_PIofModulereceivingcard...   # Proforma invoice
685afa61c_PIAPP2G0564LST10-V4Upd...   # Proforma invoice (alt path)
ec4112f16_IMG_9504.jpg                 # media.base44.com image
```

---

## 3. External Links (114 URLs) — PRIORITY 2

### Links that are NOT files (100 URLs)
These are supplier product pages, manufacturer websites, and manual pages. They do not need downloading — they are reference links stored in `ai_extracted_data.product_url` and similar metadata fields.

**Examples:**
- `https://se.farnell.com/finder-emc-modul-led-diode-6-24vdc-8012823115597`
- `https://www.jasionled.com/sv/led-module/p4-outdoor-led-module/`
- `https://manuals.plus/sv/kubler/521-electronic-display-counter-manual`

### External Files Worth Downloading (14 URLs)
These are actual files hosted outside Base44 that may have value.

| # | URL | Source Field | Type | Priority |
|---|-----|--------------|------|----------|
| 1 | `https://storage.rm.otter.productions/imvision/files/1775042677733_billbord.png` | `Article.image_urls[0]` | Image | **High** — IM Vision asset |
| 2 | `https://media.base44.com/images/public/.../ec4112f16_IMG_9504.jpg` | *(already counted in Base44)* | Image | Already in Base44 list |
| 3–7 | `https://oss.novastar.tech/uploads/.../A5s-Plus-Receiving-Card-Specifications-V1.x.x.pdf` (×5) | `Article.ai_extracted_data.product_url` | PDF spec sheet | Medium |
| 8 | `https://novastarled.com/PDF/Receiving%20Cards/A5s-Plus-Receiving-Card-Specifications-V1.4.1.pdf` | `Article.ai_extracted_data.product_url` | PDF spec sheet | Medium |
| 9 | `https://www.invacare.fr/sites/fr/files/.../DTEC011620_UM_RS300_Multi-EU_-_Rev_07.pdf` | `Article.ai_extracted_data.product_url` | PDF manual | Low |
| 10 | `https://finnhjelpemiddel.nav.no/imageproxy/file/brugsvejl/66167.pdf` | `Article.ai_extracted_data.product_url` | PDF manual | Low |
| 11 | `https://www.idisplayled.com/wp-content/uploads/.../PixelPro箱体更新.pdf` | `Article.ai_extracted_data.product_url` | PDF datasheet | Low |
| 12 | `https://upload.wikimedia.org/.../PNG_transparency_demonstration_1.png` (240px) | `LabelScan.image_url` | Test/placeholder image | Very Low |
| 13 | `https://upload.wikimedia.org/.../PNG_transparency_demonstration_1.png` (280px) | `LabelScan.image_url` | Test/placeholder image | Very Low |
| 14 | `https://upload.wikimedia.org/.../Felis_silvestris_silvestris_small_gradual_decrease.png` | `LabelScan.error_message` | Test/placeholder image | Very Low |
| 15 | `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400` | `LabelScan.image_url` | Stock photo | Very Low |

> **Note:** The Wikimedia and Unsplash images appear to be test/placeholder data from LabelScan records and are likely not business-critical.

---

## 4. Local File Status

**Zero (0) files from the export are stored locally.**

Checked directories:
- `server/uploads/` — empty
- `public/` — contains only `manifest.json`, `sw.js`, `order-dashboard.html`, and `docs/*.md`
- `public/docs/` — markdown documentation only
- Project root / `src/` — no image or PDF assets

---

## 5. Proposed Directory Structure

```
server/uploads/
├── articles/
│   ├── images/          # Article.product_image files (384)
│   ├── invoices/        # Article.source_invoice_url PDFs (18)
│   └── documents/       # Article cfg files, archives, DWGs (7)
├── orders/
│   └── documents/       # Order.source_document_url PDFs (5)
├── purchase-orders/
│   └── documents/       # PurchaseOrder.invoice_file_url PDFs (2)
├── site-reports/
│   └── images/          # SiteReportImage.image_url (1)
├── label-scans/
│   └── images/          # LabelScan.image_url (if any base44 hosted)
└── external/
    └── im-vision/       # storage.rm.otter.productions asset (1)
```

**Alternative flat structure** (simpler, filename-hash based):
```
server/uploads/
├── base44/
│   └── <filename>       # All 403 Base44 files downloaded as-is
└── external/
    └── <filename>       # 14 external files
```

---

## 6. Download Strategy

### Base44 Files
- **Method:** Direct HTTP GET — no auth required.
- **Rate limit:** Add 100–200 ms delay between requests to avoid throttling.
- **Validation:** Verify HTTP 200 and Content-Type matches extension.
- **Naming:** Preserve original filenames to maintain traceability.
- **Retry:** 3 retries with exponential backoff for transient failures.

### External Files
- **Method:** Direct HTTP GET.
- **Risk:** Some external hosts may block automated requests (403/503). May need User-Agent header.
- **Priority:** Download the `storage.rm.otter.productions` image first (high priority). Novastar spec sheets second. Skip Wikimedia/Unsplash placeholders unless explicitly requested.

---

## 7. Database Impact

**No DB changes required for downloading.**

After download is complete, a **separate migration** will be needed to:
1. Update URL fields in PostgreSQL to point to local paths (e.g., `/uploads/articles/images/2cad0144b_image.jpg`).
2. Or keep original URLs and serve local files via proxy/redirect logic.

This is out of scope for the download phase.

---

## 8. Risks & Considerations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Base44 app shutdown | Medium | **Critical** — 403 files lost | Download ASAP |
| Base44 rate limiting | Low | Minor delays | Add delays, retry logic |
| External file 404s | Medium | Low — mostly non-critical docs | Log failures, skip gracefully |
| Filename collisions | Very Low | Data overwrite | Use original names (already unique hashes) |
| Large file sizes | Low | Storage cost | Monitor disk usage; current estimate < 500 MB |

---

## 9. Next Steps (Pending Your Approval)

1. **Approve download plan** → proceed to downloading all 403 Base44 files + 1 high-priority external file.
2. **Choose directory structure** → flat (`server/uploads/base44/`) or categorized (`server/uploads/articles/images/` etc.).
3. **Execute download** → create a Node.js script with retry logic and progress logging.
4. **Verify downloads** — check file integrity, size, and count.
5. **Plan DB migration** — decide how to update URLs in PostgreSQL to point to local storage.

---

## Appendix A: Complete URL List

- Full list: `/tmp/all_urls.json` (517 URLs with entity/field context)
- Classified list: `/tmp/url_classification.json` (grouped by category)
