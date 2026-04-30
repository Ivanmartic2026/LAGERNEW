#!/usr/bin/env node
/**
 * Add proper @relation fields to the generated Prisma schema
 *
 * Rebuilds the schema from parsed models to ensure consistency.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '../prisma/schema.prisma');

const ID_SUFFIX_MAP = {
  'order_id': 'Order',
  'article_id': 'Article',
  'supplier_id': 'Supplier',
  'purchase_order_id': 'PurchaseOrder',
  'batch_id': 'Batch',
  'work_order_id': 'WorkOrder',
  'warehouse_id': 'Warehouse',
  'user_id': 'User',
  'site_report_id': 'SiteReport',
  'production_record_id': 'ProductionRecord',
  'notification_id': 'Notification',
  'task_id': 'Task',
  'task_template_id': 'TaskTemplate',
  'label_scan_id': 'LabelScan',
  'inventory_count_id': 'InventoryCount',
  'driving_journal_entry_id': 'DrivingJournalEntry',
  'fortnox_config_id': 'FortnoxConfig',
  'receiving_record_id': 'ReceivingRecord',
  'repair_log_id': 'RepairLog',
  'stock_adjustment_id': 'StockAdjustment',
  'project_link_id': 'ProjectLink',
  'project_time_id': 'ProjectTime',
  'project_expense_id': 'ProjectExpense',
  'service_log_id': 'ServiceLog',
  'internal_withdrawal_id': 'InternalWithdrawal',
  'po_activity_id': 'POActivity',
  'delivery_record_id': 'DeliveryRecord',
  'batch_analysis_id': 'BatchAnalysis',
  'batch_activity_id': 'BatchActivity',
  'batch_suggestion_id': 'BatchSuggestion',
  'batch_pattern_rule_id': 'BatchPatternRule',
  'scan_match_audit_id': 'ScanMatchAudit',
  'merge_approval_queue_id': 'MergeApprovalQueue',
  'pattern_inference_log_id': 'PatternInferenceLog',
  'sync_log_id': 'SyncLog',
  'system_automation_id': 'SystemAutomation',
  'supplier_label_pattern_id': 'SupplierLabelPattern',
  'fortnox_customer_id': 'FortnoxCustomer',
  'kimi_config_id': 'KimiConfig',
  'site_report_image_id': 'SiteReportImage',
  'notification_settings_id': 'NotificationSettings',
  'migration_run_id': 'MigrationRun',
  'related_order_id': 'Order',
  'linked_order_id': 'Order',
  'source_purchase_order_id': 'PurchaseOrder',
  'primary_batch_id': 'Batch',
};

function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/_id$/, '');
}

function pluralize(str) {
  // Simple pluralization
  if (str.endsWith('s')) return str + 'es';
  if (str.endsWith('y')) return str.slice(0, -1) + 'ies';
  return str + 's';
}

function main() {
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');

  // Split into header (generator + datasource) and body
  const headerMatch = schema.match(/^(.*?)(?=enum \w+ \{)/s);
  const header = headerMatch ? headerMatch[1] : '';

  // Parse all enums
  const enums = [];
  const enumRegex = /enum (\w+) \{([\s\S]*?)\n\}/g;
  let em;
  while ((em = enumRegex.exec(schema)) !== null) {
    enums.push({ name: em[1], body: em[2] });
  }

  // Parse all models
  const models = [];
  const modelRegex = /model (\w+) \{([\s\S]*?)\n\}/g;
  let mm;
  while ((mm = modelRegex.exec(schema)) !== null) {
    models.push({ name: mm[1], body: mm[2] });
  }

  const modelMap = new Map(models.map(m => [m.name, m]));

  // ── Build relation mappings ──
  // fkMap: modelName → [{ fkField, relatedModel, relationFieldName }]
  const fkMap = new Map();

  for (const model of models) {
    const lines = model.body.split('\n');
    const fks = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^(\w+_id)\s+(String)\??/);
      if (!match) continue;

      const fieldName = match[1];
      const relatedModel = ID_SUFFIX_MAP[fieldName];
      if (!relatedModel) continue;
      if (relatedModel === model.name) continue;

      fks.push({
        fkField: fieldName,
        relatedModel,
        relationFieldName: toCamelCase(fieldName),
        isOptional: trimmed.includes('?'),
      });
    }

    if (fks.length > 0) {
      fkMap.set(model.name, fks);
    }
  }

  // ── Rebuild models with relations ──
  const rebuiltModels = models.map(model => {
    const fks = fkMap.get(model.name) || [];
    const lines = model.body.split('\n');

    // Add forward relation fields
    for (const fk of fks) {
      const type = `${fk.relatedModel}${fk.isOptional ? '?' : ''}`;
      const attr = `@relation(fields: [${fk.fkField}], references: [id])`;
      lines.push(`  ${fk.relationFieldName} ${type} ${attr}`);
    }

    return { ...model, body: lines.join('\n') };
  });

  // ── Add reverse relations ──
  for (const [sourceModelName, fks] of fkMap) {
    for (const fk of fks) {
      const targetModel = modelMap.get(fk.relatedModel);
      if (!targetModel) continue;

      // Find the rebuilt target model
      const rebuiltTarget = rebuiltModels.find(m => m.name === fk.relatedModel);
      if (!rebuiltTarget) continue;

      const reverseName = pluralize(sourceModelName.charAt(0).toLowerCase() + sourceModelName.slice(1));
      const relationName = `${sourceModelName}${fk.relatedModel}`;

      // Check if already exists
      if (rebuiltTarget.body.includes(` ${reverseName} `)) continue;

      rebuiltTarget.body += `\n  ${reverseName} ${sourceModelName}[] @relation("${relationName}")`;
    }
  }

  // ── Rebuild schema ──
  let output = header;

  for (const en of enums) {
    output += `enum ${en.name} {${en.body}\n}\n\n`;
  }

  for (const model of rebuiltModels) {
    output += `model ${model.name} {${model.body}\n}\n\n`;
  }

  writeFileSync(SCHEMA_PATH, output);

  // Stats
  let forwardCount = 0;
  let reverseCount = 0;
  for (const [_, fks] of fkMap) {
    forwardCount += fks.length;
    reverseCount += fks.length;
  }

  console.log('✅ Added proper @relation fields to Prisma schema');
  console.log(`   Forward relations: ${forwardCount}`);
  console.log(`   Reverse relations: ${reverseCount}`);
  console.log('');
  console.log('⚠️  Please review and fix:');
  console.log('   - Self-references (e.g., Task → Task)');
  console.log('   - Many-to-many relations');
  console.log('   - Cascade delete rules (@relation(onDelete: ...))');
}

main();
