/**
 * Browser Console Data Export Script for Base44
 * 
 * HOW TO USE:
 * 1. Make sure the Vite dev server is running (npm run dev)
 * 2. Open the app in your browser (where you're logged in)
 * 3. Open DevTools → Console
 * 4. Copy/paste this entire script and press Enter
 * 5. Wait for all downloads to complete
 * 6. Move downloaded JSON files from Downloads/ to server/data-export/
 */

(async () => {
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

  const results = [];

  function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  for (const entity of ENTITIES) {
    console.log(`📥 Fetching ${entity}...`);
    const allRecords = [];
    let page = 0;
    const limit = 1000;

    try {
      while (true) {
        const records = await window.base44.entities[entity].list('-created_date', limit, page * limit);
        if (!records || records.length === 0) break;
        allRecords.push(...records);
        console.log(`   Page ${page + 1}: +${records.length} records (total: ${allRecords.length})`);
        if (records.length < limit) break;
        page++;
        if (page % 5 === 0) await new Promise(r => setTimeout(r, 1000));
      }

      downloadJSON(`${entity}.json`, allRecords);
      console.log(`✅ ${entity}: ${allRecords.length} records downloaded`);
      results.push({ entity, count: allRecords.length, ok: true });
    } catch (err) {
      console.error(`❌ ${entity} failed:`, err.message || err);
      results.push({ entity, count: 0, ok: false, error: err.message || String(err) });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('EXPORT SUMMARY');
  console.log('='.repeat(50));
  let total = 0;
  for (const r of results) {
    const status = r.ok ? `✅ ${r.count}` : `❌ ${r.error}`;
    console.log(`  ${r.entity.padEnd(24)} ${status}`);
    if (r.ok) total += r.count;
  }
  console.log(`\nTotal records: ${total}`);
  console.log('Files downloaded to your Downloads folder');
  console.log('Move them to: server/data-export/');
})();
