#!/usr/bin/env node
/**
 * Import Base44 exported JSON files into local PostgreSQL via Prisma
 * Filters fields to only those that exist in the Prisma schema.
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const EXPORT_DIR = '/Users/ivanmartic/Documents/Claude/Projects/LAGER AI GIT/export_base44';
const prisma = new PrismaClient();

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

const FIELD_MAP = {
  created_date: 'createdAt',
  updated_date: 'updatedAt',
};

// --- Explicit enum value mappings (Base44 value → Prisma enum value) ---
const ENUM_MAPS = {
  Order: {
    status: {
      'SÄLJ': 'S_LJ',
      'KONSTRUKTION': 'KONSTRUKTION',
      'PRODUKTION': 'PRODUKTION',
      'LAGER': 'LAGER',
      'MONTERING': 'MONTERING',
      'Fakturerat': 'Fakturerat',
      'Färdig': 'Fardig',
      'Påbörjad': 'Paborjad',
    },
    financial_status: {
      // default fallback handled in transformRecord for missing values
    },
  },
  PurchaseOrder: {
    cost_center: {
      '10_support_service': 'v10_support_service',
      '20_rental': 'v20_rental',
      '30_sales': 'v30_sales',
      '99_generell': 'v99_generell',
    },
    status: {
      'draft': 'draft',
      'ordered': 'sent',
      'sent': 'sent',
      'partially_received': 'received',
      'received': 'received',
      'confirmed': 'confirmed',
      'cancelled': 'cancelled',
    },
    payment_terms: {
      '30_dagar_netto': 'v30_dagar_netto',
      '10_dagar_2_procent': 'v10_dagar_2_procent',
      '60_dagar_netto': 'v60_dagar_netto',
      '100_procent_forskott': 'v100_procent_forskott',
      'omedelbar_betalning': 'omedelbar_betalning',
    },
  },
  Notification: {
    type: {
      'order_status': 'order_status',
      'low_stock': 'low_stock',
      'stock_alert': 'stock_alert',
      'repair_update': 'repair_update',
      'purchase_order': 'purchase_order',
      'system': 'system',
      'chat_mention': 'chat_mention',
      'chat_dm': 'chat_dm',
      'chat_new_message': 'chat_new_message',
      'warning': 'system',
      'scan_result': 'system',
      'assignment': 'system',
      'error': 'system',
    },
  },
  Article: {
    category: {
      'LED module': 'LED_Module',
      'LED Module': 'LED_Module',
      'Power Supply': 'Power_Supply',
      'Receiving Card': 'Receiving_Card',
      'Control Processor': 'Control_Processor',
    },
    series: {
      'indoor': 'Indoor',
      'outdoor': 'Outdoor',
      'ultrabright': 'UltraBright',
      'UltraBright': 'UltraBright',
      'qp4': 'QP4',
      'QP4': 'QP4',
    },
  },
};

function sanitizeEnum(value) {
  if (typeof value !== 'string') return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (/^\d{4}[-_]\d{2}[-_]\d{2}/.test(value)) return value;
  if (!/[äåöÄÅÖéÉüÜðÐþÞæÆøØ]/.test(value)) return value;
  if (value.length > 80) return value;
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}

function cleanDate(value) {
  if (!value || typeof value !== 'string') return null;
  // Normalize common non-ISO date formats
  const normalized = value
    .replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, '$1-$2-$3')           // 2020/02/22
    .replace(/^(\d{4}) (\d{2}) (\d{2})$/, '$1-$2-$3')             // 2019 02 21
    .replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, '$3-$2-$1')           // 03.03.2021
    .replace(/^(\d{4})-(\d{2})$/, '$1-$2-01');                     // 2021-03
  const ts = Date.parse(normalized);
  if (isNaN(ts)) return null;
  return new Date(ts).toISOString();
}

function extractRecords(filepath) {
  const raw = JSON.parse(readFileSync(filepath, 'utf-8'));
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray(raw.entities)) return raw.entities;
  return [];
}

function buildEnumMaps(runtimeModel) {
  const validValues = {};
  const lowerMap = {};
  for (const [enumName, enumDef] of Object.entries(runtimeModel.enums)) {
    const values = enumDef.values.map(v => v.name);
    validValues[enumName] = new Set(values);
    lowerMap[enumName] = new Map();
    for (const v of values) {
      lowerMap[enumName].set(v.toLowerCase(), v);
    }
  }
  return { validValues, lowerMap };
}

function transformRecord(record, fieldMap, entity, enumMaps) {
  const out = {};
  const enumMap = ENUM_MAPS[entity] || {};
  for (const [key, val] of Object.entries(record)) {
    if (key === '__v' || key === '_class') continue;
    const prismaKey = FIELD_MAP[key] || key;
    const fieldDef = fieldMap.get(prismaKey);
    if (!fieldDef) continue;

    if (val === null || val === undefined || val === '') {
      // Required enum fallback
      if (fieldDef.kind === 'enum' && fieldDef.isRequired) {
        const explicit = enumMap[prismaKey];
        if (explicit && explicit['__DEFAULT__']) {
          out[prismaKey] = explicit['__DEFAULT__'];
        } else {
          // pick first valid enum value as safe fallback
          const first = Array.from(enumMaps.validValues[fieldDef.type])[0];
          out[prismaKey] = first;
        }
      } else {
        out[prismaKey] = null;
      }
      continue;
    }

    // DateTime fields
    if (fieldDef.type === 'DateTime') {
      out[prismaKey] = cleanDate(val);
      continue;
    }

    // Enum fields
    if (fieldDef.kind === 'enum' && typeof val === 'string') {
      // 1. explicit mapping
      const explicit = enumMap[prismaKey]?.[val];
      if (explicit !== undefined) {
        out[prismaKey] = explicit;
        continue;
      }
      // 2. exact match
      if (enumMaps.validValues[fieldDef.type].has(val)) {
        out[prismaKey] = val;
        continue;
      }
      // 3. case-insensitive match
      const lowerMatch = enumMaps.lowerMap[fieldDef.type].get(val.toLowerCase());
      if (lowerMatch !== undefined) {
        out[prismaKey] = lowerMatch;
        continue;
      }
      // 4. sanitize then exact match
      const sanitized = sanitizeEnum(val);
      if (enumMaps.validValues[fieldDef.type].has(sanitized)) {
        out[prismaKey] = sanitized;
        continue;
      }
      // 5. fallback for required enums
      if (fieldDef.isRequired) {
        const first = Array.from(enumMaps.validValues[fieldDef.type])[0];
        out[prismaKey] = first;
        continue;
      }
      // optional → null
      out[prismaKey] = null;
      continue;
    }

    // Strings: generic sanitize (preserves URLs, dates, non-Swedish)
    if (typeof val === 'string') {
      out[prismaKey] = sanitizeEnum(val);
      continue;
    }

    out[prismaKey] = val;
  }
  return out;
}

async function main() {
  console.log('📥 Base44 → PostgreSQL Import');
  console.log(`   Source: ${EXPORT_DIR}\n`);

  // Build field metadata map per model
  const prismaFieldMaps = {};
  for (const [name, model] of Object.entries(prisma._runtimeDataModel.models)) {
    prismaFieldMaps[name] = new Map(model.fields.map(f => [f.name, f]));
  }

  const enumMaps = buildEnumMaps(prisma._runtimeDataModel);

  let grandTotal = 0;
  const results = [];

  for (const entity of ENTITIES) {
    const filepath = join(EXPORT_DIR, `${entity}.json`);
    let records;
    try {
      records = extractRecords(filepath);
    } catch {
      results.push({ entity, count: 0, error: 'File missing' });
      continue;
    }
    if (records.length === 0) {
      results.push({ entity, count: 0 });
      continue;
    }

    const modelName = entity.charAt(0).toLowerCase() + entity.slice(1);
    const model = prisma[modelName];
    const fieldMap = prismaFieldMaps[entity];
    if (!model || !fieldMap) {
      results.push({ entity, count: 0, error: `Model ${entity} not found` });
      continue;
    }

    let inserted = 0;
    let failed = 0;
    const errors = [];

    for (const rec of records) {
      const data = transformRecord(rec, fieldMap, entity, enumMaps);
      try {
        await model.create({ data });
        inserted++;
      } catch (err) {
        failed++;
        if (errors.length < 3) {
          errors.push(`${data.id || 'no-id'}: ${err.message.slice(0, 140)}`);
        }
      }
    }

    const status = failed === 0
      ? `✅ ${inserted}`
      : `⚠️  ${inserted} inserted, ${failed} failed`;
    console.log(`  ${entity.padEnd(24)} ${status}`);
    if (errors.length > 0) errors.forEach(e => console.log(`     ${e}`));

    results.push({ entity, count: inserted, failed, error: failed > 0 ? `${failed} failed` : null });
    grandTotal += inserted;
  }

  console.log('\n' + '='.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(60));
  for (const r of results) {
    const s = r.error ? `⚠️  ${r.count} (${r.error})` : `✅ ${r.count}`;
    console.log(`  ${r.entity.padEnd(24)} ${s}`);
  }
  console.log(`\n  Total imported: ${grandTotal}`);
}

main()
  .catch(err => { console.error('Fatal:', err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
