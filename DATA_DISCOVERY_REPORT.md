# Data Discovery Report — Lager IM Migration

**Date:** 2026-04-30
**Scope:** Read-only inventory of all data and file assets
**Status:** Complete — zero modifications made

---

## 1. Executive Summary

| Category | Finding | Risk Level |
|----------|---------|------------|
| **Business data location** | 100% in Base44 cloud (NoSQL) | 🔴 Critical — must export before leaving |
| **File/image storage** | Supabase Storage (via Base44 integration) | 🔴 Critical — separate from Base44 DB |
| **Local data files** | None in project directory | 🟡 None to preserve locally |
| **Local database** | Empty PostgreSQL (just schema, no data) | 🟢 Safe — nothing to lose |
| **External data files** | `Lagerlista.csv` (555 rows, old inventory) | 🟡 Review if still relevant |
| **Code references to files** | ~50+ URL fields across 13 entities | 🟡 Must map during migration |

---

## 2. Where All Business Data Currently Lives

### 2.1 Base44 Cloud (Primary Source of Truth)

**ALL business data lives in Base44's managed NoSQL database.** There is no local copy.

| Data Type | Location | Access Method |
|-----------|----------|---------------|
| Orders, WorkOrders, Articles | Base44 entities | `base44.entities.*` API |
| Users, Suppliers, PurchaseOrders | Base44 entities | `base44.entities.*` API |
| Batches, LabelScans, SiteReports | Base44 entities | `base44.entities.*` API |
| Notifications, ChatMessages | Base44 entities | `base44.entities.*` API |
| Settings, Configurations | Base44 entities | `base44.entities.*` API |
| File uploads | Supabase Storage (via Base44) | Stored URLs in entity records |

**Record counts:** Unknown — requires API export to determine. The `exportBase44Data.js` script can fetch all counts.

### 2.2 Local Files in Project Directory

**Zero local data exports found.**

Searched for: `.json`, `.csv`, `.db`, `.sql`, `.dump`, `.backup`, `.tsv`, `.xlsx`, `.xls`

**Only found:**
- `package.json`, `package-lock.json` (dependency manifests)
- `jsconfig.json`, `components.json` (config files)
- `server/prisma/migrations/20260430000531_init/migration.sql` (schema creation script, empty data)
- `public/manifest.json` (PWA manifest)

**Conclusion:** No business data exists in the local project files.

### 2.3 External Data Files (Downloads Folder)

Found outside the project:

| File | Location | Description | Relevance |
|------|----------|-------------|-----------|
| `Lagerlista.csv` | `~/Downloads/` | 555 rows, Swedish inventory list | 🟡 Possibly legacy data — review |
| `Lagerlista 231231.xlsx` | `~/Downloads/IMPROD AB/` | Excel inventory | 🟡 Possibly legacy data — review |
| `Lager157.pdf` | `~/Downloads/` | PDF document | 🟡 Unknown relevance |
| `Lagervärde 2025-12-31.pdf` | `~/Downloads/` | Inventory valuation | 🟡 Unknown relevance |
| `lager-ai-dokumentation.md` | `~/Downloads/` | Documentation file | 🟢 Reference only |

### 2.4 Older Project Copies

Multiple older source code copies exist in `~/Downloads/`:
- `lager-ai-7d26cc74` (and `(1)`, `(2)`) — older Base44 app exports
- `LAGER_IM-main`, `LAGER_IM-main 2` — older project copies
- `LAGER_IM-main 3-backup-20260429-184112` — manual backup before our changes

**All are source code only — no data exports.**

### 2.5 GitHub Repository

- **URL:** `https://github.com/Ivanmartic2026/LAGERNEW`
- **Content:** Source code only (584 files, 125K lines)
- **No data:** Entity schemas are structural definitions only — no actual records

### 2.6 Local PostgreSQL (New, Empty)

- **Database:** `lager_im` on localhost:5432
- **Tables:** 47 tables created from Prisma schema
- **Records:** 0 (empty database)
- **Status:** Schema-only, no data imported

### 2.7 Browser localStorage (Per-User, Per-Device)

The frontend stores limited data in browser localStorage:

| Key | Purpose | Data Type |
|-----|---------|-----------|
| `base44_app_id` | Base44 app identifier | String |
| `base44_access_token` | Auth token | String |
| `base44_functions_version` | Functions version | String |
| `offline_articles` | Cached article data | JSON (cached entity data) |
| `offline_orders` | Cached order data | JSON (cached entity data) |
| `offline_warehouses` | Cached warehouse data | JSON (cached entity data) |
| `offline_suppliers` | Cached supplier data | JSON (cached entity data) |
| `offline_last_sync` | Sync timestamps | JSON |
| `sync_queue` | Pending offline operations | JSON (mutations queue) |
| `app_language` | UI language preference | String (`sv` or `en`) |
| `nav_collapsed` | Navigation state | Boolean |
| `nav_stacks` | Navigation history | JSON |
| `pwa-install-dismissed` | PWA prompt state | Timestamp |

**Important:** localStorage cache is per-browser, per-user, and incomplete. It contains only data that the user has loaded in their session. **Do not rely on this for migration.**

---

## 3. All Image/File Assets

### 3.1 File Storage Infrastructure

**Critical Finding:** Base44 does NOT store uploaded files in its own infrastructure. Files are stored in **Supabase Storage** via the `base44.integrations.Core.UploadFile()` integration.

**Supabase Storage Details:**
- **Bucket:** `base44-prod`
- **Public URL pattern:** `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/{app_id}/{file_id}_{filename}`
- **App ID in URLs:** `69455d52c9eab36b7d26cc74`

**Implication:** When you leave Base44, the Supabase bucket may remain accessible for some time, but it's tied to the Base44 account. **Files must be downloaded/exported separately from the database records.**

### 3.2 Entities with File/Image Fields (13 entities)

| Entity | File/Image Fields | Field Type | Description |
|--------|-------------------|------------|-------------|
| **Article** | `image_urls` | `String[]` | Article/product images |
| **Article** | `cfg_file_url` | `String` | CFG configuration file |
| **Article** | `source_invoice_url` | `String` | Original invoice PDF |
| **BatchAnalysis** | `image_urls` | `String[]` | Analysis photos |
| **DeliveryRecord** | `signature_image_url` | `String` | Delivery signature image |
| **LabelScan** | `image_url` | `String` | Scanned label image |
| **Order** | `source_document_url` | `String` | Customer PO/offert PDF |
| **Order** | `uploaded_files` | `Object[]` | Array of `{url, name, type}` — drawings, site images |
| **POActivity** | `file_url` | `String` | Uploaded file attachment |
| **ProductionActivity** | `file_url` | `String` | Uploaded file attachment |
| **ProductionRecord** | `assembly_images` | `String[]` | Assembly photos |
| **ProductionRecord** | `serial_number_images` | `String[]` | Serial number photos (legacy) |
| **PurchaseOrder** | `invoice_file_url` | `String` | Supplier invoice PDF |
| **ReceivingRecord** | `image_urls` | `String[]` | Receiving photos (legacy) |
| **SiteReportImage** | `image_url` | `String` | Site report photo |
| **WorkOrder** | `source_document_url` | `String` | Source document PDF |
| **WorkOrder** | `assembly_images` | `String[]` | Assembly photos |
| **WorkOrder** | `uploaded_files` | `Object[]` | Array of `{url, name, type}` |
| **WorkOrder** | `drawing_url` | `String` | Drawing file |
| **WorkOrder** | `bill_of_materials_url` | `String` | BOM file |
| **WorkOrder** | `quality_report_url` | `String` | Quality report |
| **WorkOrder** | `test_protocol_url` | `String` | Test protocol |
| **WorkOrderActivity** | `file_url` | `String` | Activity attachment |

### 3.3 Static Assets (Logo)

| Asset | URL | Usage |
|-------|-----|-------|
| IM Vision Logo | `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png` | PDF prints, PWA icons, email templates, Layout header, labels |

**Referenced in:** 4 backend functions + 4 frontend components = **8 locations**

### 3.4 Local Image Files in Project

**Zero local images found** in the project directory.

Searched for: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.pdf`, `.mp4`, `.mov`

The project has no static image assets — all images are loaded from Supabase Storage URLs.

---

## 4. File/Image References in Code and Data

### 4.1 Base44 Integration Usage

| Integration | Backend Calls | Frontend Calls | Purpose |
|-------------|---------------|----------------|---------|
| `Core.UploadFile()` | 4 functions | 3 components | Upload files to Supabase |
| `Core.SendEmail()` | 10 functions | 0 | Send emails with attachments |
| `Core.InvokeLLM()` | 15 functions | 0 | AI image analysis |
| `Core.ExtractDataFromUploadedFile()` | 4 functions | 0 | PDF/document parsing |

### 4.2 Hardcoded URLs in Code

| URL | Count | Purpose |
|-----|-------|---------|
| `https://qtrypzzcjebvfcihiynt.supabase.co/...` | 11 | Logo image in prints/emails/PWA |
| `https://lager-ai-7d26cc74.base44.app/FortnoxSync` | 1 | Fortnox OAuth redirect |
| `https://medarbetarappen-7890a865.base44.app/functions/...` | 10 | Workspace integration API |
| `https://app.base44.com/WorkOrders/{id}` | 1 | Work order deep link |
| `https://api.base44.com/api/apps/{app_id}/entities/Order` | 1 | Public dashboard REST |

### 4.3 URL Fields in Entity Records

When data is exported from Base44, every record with file attachments will contain full Supabase Storage URLs like:

```json
{
  "image_urls": [
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/abc123_image.jpg"
  ],
  "uploaded_files": [
    { "url": "https://qtrypzzcjebvfcihiynt.supabase.co/...", "name": "drawing.pdf", "type": "drawing" }
  ]
}
```

---

## 5. Entity Inventory (47 Entities)

| # | Entity | Fields | Has Files | Has Relations |
|---|--------|--------|-----------|---------------|
| 1 | **WorkOrder** | 124 | ✅ images, files, docs | `order_id` |
| 2 | **Order** | 57 | ✅ files, docs | — |
| 3 | **PurchaseOrder** | 50 | ✅ invoice PDF | `supplier_id` |
| 4 | **Article** | 49 | ✅ images, CFG, invoice | `supplier_id`, `primary_batch_id` |
| 5 | **LabelScan** | 62 | ✅ image | `article_id` |
| 6 | **ProductionRecord** | 25 | ✅ images | `order_id` |
| 7 | **InventoryCount** | 24 | — | `warehouse_id` |
| 8 | **PurchaseOrderItem** | 23 | — | `purchase_order_id` |
| 9 | **ServiceLog** | 23 | — | — |
| 10 | **SiteReport** | 28 | — | `order_id` |
| 11 | **ReceivingRecord** | 19 | ✅ images (legacy) | `purchase_order_id` |
| 12 | **Batch** | 31 | — | `article_id`, `supplier_id` |
| 13 | **BatchAnalysis** | 21 | ✅ images | `batch_id` |
| 14 | **DrivingJournalEntry** | 19 | — | `user_id` |
| 15 | **DeliveryRecord** | 20 | ✅ signature | — |
| 16 | **OrderPickList** | 19 | — | `sales_order_id` |
| 17 | **ScanMatchAudit** | 18 | — | `label_scan_id` |
| 18 | **RepairLog** | 17 | — | `article_id` |
| 19 | **SiteReportImage** | 17 | ✅ image | `site_report_id` |
| 20 | **MergeApprovalQueue** | 17 | — | — |
| 21 | **POActivity** | 16 | ✅ file | `purchase_order_id` |
| 22 | **ProductionActivity** | 16 | ✅ file | `work_order_id` |
| 23 | **WorkOrderActivity** | 16 | ✅ file | `work_order_id`, `order_id` |
| 24 | **BatchPatternRule** | 19 | — | — |
| 25 | **BatchSuggestion** | 13 | — | `batch_id` |
| 26 | **StockAdjustment** | 13 | — | `article_id`, `warehouse_id` |
| 27 | **ProjectExpense** | 13 | — | `order_id` |
| 28 | **Task** | 13 | — | `order_id`, `work_order_id` |
| 29 | **TaskTemplate** | 14 | — | — |
| 30 | **SyncLog** | 15 | — | — |
| 31 | **NotificationSettings** | 15 | — | `user_id` |
| 32 | **KimiConfig** | 15 | — | — |
| 33 | **Notification** | 12 | — | `user_id` |
| 34 | **MigrationRun** | 12 | — | — |
| 35 | **BatchActivity** | 12 | — | `batch_id` |
| 36 | **Supplier** | 11 | — | — |
| 37 | **SupplierLabelPattern** | 11 | — | `supplier_id` |
| 38 | **InternalWithdrawal** | 11 | — | `linked_order_id` |
| 39 | **OrderItem** | 10 | — | `order_id`, `article_id` |
| 40 | **FortnoxCustomer** | 10 | — | — |
| 41 | **User** | 9 | — | — |
| 42 | **PatternInferenceLog** | 8 | — | — |
| 43 | **ProjectTime** | 8 | — | `order_id` |
| 44 | **Warehouse** | 8 | — | — |
| 45 | **SystemAutomation** | 7 | — | — |
| 46 | **ProjectLink** | 4 | — | `order_id` |
| 47 | **FortnoxConfig** | 4 | — | — |

**Total fields across all entities:** ~1,200+ fields

---

## 6. Local vs. Remote Data Classification

| Data | Location | Can Access Locally? | Must Export? |
|------|----------|---------------------|--------------|
| Entity records (Orders, Articles, etc.) | Base44 cloud | ❌ No — API only | ✅ Yes |
| Uploaded files/images | Supabase Storage | ❌ No — URL only | ✅ Yes |
| User auth tokens | Browser localStorage | ✅ Per device | ❌ No (will reset) |
| Offline cache | Browser localStorage | ✅ Per device | ❌ Incomplete |
| App settings | Browser localStorage | ✅ Per device | ⚠️ Optional |
| Prisma schema | Local `server/prisma/` | ✅ Yes | ❌ Already in repo |
| Source code | Local + GitHub | ✅ Yes | ❌ Already in repo |
| `Lagerlista.csv` | `~/Downloads/` | ✅ Yes | ⚠️ Review relevance |

---

## 7. Files/Images That MUST Be Downloaded Before Leaving Base44

### 7.1 Critical (Business Data)

These are stored as URLs in entity records. If the Supabase bucket becomes inaccessible, these files are lost.

| Entity | Field | File Types | Estimated Volume |
|--------|-------|------------|------------------|
| **Article** | `image_urls` | Product photos, label scans | High |
| **LabelScan** | `image_url` | Scanned label images | Very High |
| **SiteReportImage** | `image_url` | Site documentation photos | High |
| **WorkOrder** | `uploaded_files` | Drawings, site images, docs | High |
| **WorkOrder** | `assembly_images` | Assembly photos | Medium |
| **Order** | `uploaded_files` | Customer POs, drawings | Medium |
| **PurchaseOrder** | `invoice_file_url` | Supplier invoices | Medium |
| **ProductionRecord** | `assembly_images` | Production photos | Medium |
| **ReceivingRecord** | `image_urls` | Receiving photos (legacy) | Low |
| **BatchAnalysis** | `image_urls` | Analysis photos | Low |
| **WorkOrderActivity** | `file_url` | Activity attachments | Low |
| **POActivity** | `file_url` | PO activity attachments | Low |

### 7.2 Important (Static Assets)

| Asset | URL | Action |
|-------|-----|--------|
| IM Vision Logo | Supabase URL | Download and host locally or new R2/S3 bucket |

### 7.3 Not Required (Code-Generated)

| Asset | Generation Method | Action |
|-------|-------------------|--------|
| Labels/print files | Generated on-the-fly via `generateLabelPDF`, `printWorkOrder` | ❌ No need to export — code regenerates |
| Reports | Generated via `generateReport` | ❌ No need to export — code regenerates |
| Email templates | Inline HTML in functions | ❌ Already in source code |

---

## 8. Safe Backup/Export Plan

### Phase A: Database Export (Read-Only)

**Tool:** `server/scripts/exportBase44Data.js`

```bash
export BASE44_APP_ID="your-app-id"
export BASE44_API_TOKEN="your-token"
cd server
node scripts/exportBase44Data.js
```

**Output:** `data-export/{EntityName}.json` — one file per entity

**This gives you:**
- All 47 entity types as JSON arrays
- All records with complete fields
- All file URLs embedded in records

### Phase B: File Asset Export

**After** database export, extract all unique file URLs and download them:

```bash
# Extract all unique Supabase URLs from exported JSON
# Download each file to local storage
# Replace URLs in exported JSON with new local/R2 URLs
```

**Recommended approach:**
1. Parse all `*.json` export files
2. Extract every `image_url`, `file_url`, `url` field value
3. Download each unique URL to `data-export/files/`
4. Preserve the mapping: `old_url → local_path`

### Phase C: Verify Completeness

| Check | Method |
|-------|--------|
| Record count matches Base44 dashboard | Compare `data-export/*.json` array lengths |
| All file URLs are accessible | HTTP HEAD request on each extracted URL |
| No orphaned files | Cross-reference file URLs with entity records |

### Phase D: Store Backups Safely

| Backup | Location | Retention |
|--------|----------|-----------|
| JSON data exports | `server/data-export/` (gitignored) | Permanent |
| Downloaded files | `server/data-export/files/` (gitignored) | Permanent |
| GitHub repo | `https://github.com/Ivanmartic2026/LAGERNEW` | Permanent |
| Manual backup | `~/Downloads/LAGER_IM-main 3-backup-20260429-184112` | Until migration complete |

---

## 9. Unknown / Missing Items

| Item | Status | Action Needed |
|------|--------|---------------|
| **Actual record counts** | Unknown | Run `exportBase44Data.js` to determine |
| **Actual file count** | Unknown | Extract URLs from export to count |
| **Total file storage size** | Unknown | Sum sizes during download |
| **Base44 API token** | Unknown | User must provide from dashboard |
| **Supabase bucket access** | Unknown after Base44 departure | Download files BEFORE canceling Base44 |
| **Fortnox OAuth tokens** | Stored in `FortnoxConfig` entity | Will need re-authorization on new domain |
| **Push notification subscriptions** | Stored in `PushSubscription` entity | Will need re-subscription on new domain |
| **User password hashes** | Unknown if Base44 exports them | Users will likely need password reset |

---

## 10. Migration Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Supabase bucket deleted when Base44 account closes | Medium | 🔴 Catastrophic | Download all files BEFORE leaving Base44 |
| Base44 API rate-limits export | High | 🟡 Delay | Export in batches with delays |
| File URLs break after migration | High | 🟡 Broken images | Maintain old URLs during transition, migrate incrementally |
| Some entities have more records than API limit | Medium | 🟡 Incomplete export | Use pagination in export script |
| Orphaned file records (URL in DB but file missing) | Low | 🟡 Missing images | Log 404s during file download |
| LocalStorage cache lost | Certain | 🟡 Re-login required | Expected — users re-authenticate |

---

## 11. Recommended Next Steps (Read-Only)

1. **Get Base44 API credentials** from dashboard (App ID + API token)
2. **Run `exportBase44Data.js`** to create JSON exports of all entities
3. **Extract and count all file URLs** from exported JSON
4. **Download all files** from Supabase Storage URLs
5. **Verify export completeness** (record counts, file accessibility)
6. **Store everything in `server/data-export/`** (gitignored, safe)
7. **Only then** proceed with database migration and schema changes

---

*This report was generated via read-only inspection. No data was modified, deleted, or migrated.*
