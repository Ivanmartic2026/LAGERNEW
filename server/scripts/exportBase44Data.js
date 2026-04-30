#!/usr/bin/env node
/**
 * Export all Base44 entity data to local JSON files
 *
 * Usage:
 *   export BASE44_APP_ID="your-app-id"
 *   export BASE44_API_TOKEN="your-api-token"
 *   node scripts/exportBase44Data.js
 *
 * Or pass as arguments:
 *   node scripts/exportBase44Data.js --app-id=xxx --token=yyy
 *
 * Output:
 *   data-export/Article.json
 *   data-export/Order.json
 *   data-export/WorkOrder.json
 *   ... (all 47 entities)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Parse args ──
const args = process.argv.slice(2);
const appIdFlag = args.find(a => a.startsWith('--app-id='));
const tokenFlag = args.find(a => a.startsWith('--token='));

const APP_ID = appIdFlag?.split('=')[1] || process.env.BASE44_APP_ID;
const API_TOKEN = tokenFlag?.split('=')[1] || process.env.BASE44_API_TOKEN;
const OUTPUT_DIR = join(__dirname, '../data-export');

if (!APP_ID || !API_TOKEN) {
  console.error('❌ Missing Base44 credentials');
  console.error('');
  console.error('Set environment variables:');
  console.error('  export BASE44_APP_ID="your-app-id"');
  console.error('  export BASE44_API_TOKEN="your-api-token"');
  console.error('');
  console.error('Or pass as arguments:');
  console.error('  node scripts/exportBase44Data.js --app-id=xxx --token=yyy');
  console.error('');
  console.error('To get your credentials:');
  console.error('  1. Log into Base44 dashboard');
  console.error('  2. Go to App Settings → API');
  console.error('  3. Copy App ID and generate an API token');
  process.exit(1);
}

// ── Entity list (same as generated Prisma models) ──
const ENTITIES = [
  'Article', 'Batch', 'BatchActivity', 'BatchAnalysis', 'BatchPatternRule',
  'BatchSuggestion', 'DeliveryRecord', 'DrivingJournalEntry', 'FortnoxConfig',
  'FortnoxCustomer', 'InternalWithdrawal', 'InventoryCount', 'KimiConfig',
  'LabelScan', 'MergeApprovalQueue', 'MigrationRun', 'Notification',
  'NotificationSettings', 'Order', 'OrderItem', 'OrderPickList',
  'PatternInferenceLog', 'POActivity', 'ProductionActivity', 'ProductionRecord',
  'ProjectExpense', 'ProjectLink', 'ProjectTime', 'PurchaseOrder',
  'PurchaseOrderItem', 'ReceivingRecord', 'RepairLog', 'ScanMatchAudit',
  'ServiceLog', 'SiteReport', 'SiteReportImage', 'StockAdjustment',
  'Supplier', 'SupplierLabelPattern', 'SyncLog', 'SystemAutomation',
  'Task', 'TaskTemplate', 'User', 'Warehouse', 'WorkOrder', 'WorkOrderActivity',
];

// ── Fetch all records for an entity ──
async function fetchEntity(entityName) {
  const baseUrl = `https://base44.app/api/apps/${APP_ID}/entities/${entityName}`;
  const allRecords = [];
  let page = 1;
  const limit = 1000;

  console.log(`  Fetching ${entityName}...`);

  while (true) {
    const skip = (page - 1) * limit;
    const url = `${baseUrl}?limit=${limit}&skip=${skip}&sort=-created_date`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
        'X-App-Id': APP_ID,
      },
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error(`    ❌ HTTP ${resp.status}: ${text.slice(0, 200)}`);
      return { entity: entityName, error: `HTTP ${resp.status}`, records: [] };
    }

    const data = await resp.json();
    const records = Array.isArray(data) ? data : (data.items || data.records || data.data || []);

    if (records.length === 0) break;

    allRecords.push(...records);
    console.log(`    Page ${page}: +${records.length} records (total: ${allRecords.length})`);

    if (records.length < limit) break;
    page++;

    // Rate limit protection
    if (page % 5 === 0) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { entity: entityName, records: allRecords };
}

// ── Main ──
async function main() {
  console.log('📥 Base44 Data Export');
  console.log(`   App ID: ${APP_ID}`);
  console.log(`   Output: ${OUTPUT_DIR}\n`);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results = [];

  for (const entity of ENTITIES) {
    const result = await fetchEntity(entity);
    results.push(result);

    if (!result.error) {
      const filePath = join(OUTPUT_DIR, `${entity}.json`);
      writeFileSync(filePath, JSON.stringify(result.records, null, 2));
      console.log(`    💾 Saved ${result.records.length} records to ${entity}.json`);
    }
    console.log('');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('EXPORT SUMMARY');
  console.log('='.repeat(60));
  let totalRecords = 0;
  for (const r of results) {
    const status = r.error ? `❌ ${r.error}` : `✅ ${r.records.length} records`;
    console.log(`  ${r.entity.padEnd(24)} ${status}`);
    if (!r.error) totalRecords += r.records.length;
  }
  console.log('');
  console.log(`  Total entities: ${results.length}`);
  console.log(`  Total records:  ${totalRecords}`);
  console.log(`  Output directory: ${OUTPUT_DIR}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review exported data for completeness');
  console.log('  2. Run: node scripts/analyzeOrderStatuses.js');
  console.log('  3. Begin PostgreSQL migration with the exported JSON files');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
