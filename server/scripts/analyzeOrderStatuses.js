#!/usr/bin/env node
/**
 * analyzeOrderStatuses — Local script
 *
 * Analyzes Order.status values to validate migration mapping
 * before adding `phase` and `fulfillment_status` fields.
 *
 * Usage:
 *   node scripts/analyzeOrderStatuses.js --data-dir=./data-export
 *
 * Expects JSON files in data-dir:
 *   - orders.json       (array of Order objects)
 *   - workOrders.json   (array of WorkOrder objects)
 *   - orderItems.json   (array of OrderItem objects)
 *
 * Or use --prisma to query the local database directly:
 *   node scripts/analyzeOrderStatuses.js --prisma
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Parse CLI args ──
const args = process.argv.slice(2);
const dataDirFlag = args.find(a => a.startsWith('--data-dir='));
const dataDir = dataDirFlag ? dataDirFlag.split('=')[1] : join(__dirname, '../data-export');
const usePrisma = args.includes('--prisma');

// ── Constants (same as Work Order redesign spec) ──
const STAGE_ORDER = ['konstruktion', 'produktion', 'lager', 'montering', 'leverans'];

// ── Load data from JSON export ──
function loadJson(filename) {
  const path = join(dataDir, filename);
  if (!existsSync(path)) {
    console.error(`❌ File not found: ${path}`);
    console.error(`   Run with --data-dir=/path/to/export or place files in ${dataDir}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

async function loadData() {
  if (usePrisma) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    console.log('📡 Loading data from local PostgreSQL database...\n');
    const [orders, workOrders, orderItems] = await Promise.all([
      prisma.order.findMany(),
      prisma.workOrder.findMany(),
      prisma.orderItem.findMany(),
    ]);
    await prisma.$disconnect();
    return { orders, workOrders, orderItems };
  }

  console.log(`📂 Loading data from ${dataDir}...\n`);
  const orders = loadJson('orders.json');
  const workOrders = loadJson('workOrders.json');
  const orderItems = loadJson('orderItems.json');
  return { orders, workOrders, orderItems };
}

// ── Analysis logic ──
function analyze({ orders, workOrders, orderItems }) {
  // Build lookup maps
  const woByOrderId = new Map();
  for (const wo of workOrders) {
    if (wo.order_id) woByOrderId.set(wo.order_id, wo);
  }

  const itemsByOrderId = new Map();
  for (const item of orderItems) {
    if (!itemsByOrderId.has(item.order_id)) {
      itemsByOrderId.set(item.order_id, []);
    }
    itemsByOrderId.get(item.order_id).push(item);
  }

  // Counters
  const currentStatusCounts = {};
  const proposedPhaseCounts = {};
  const proposedFulfillmentCounts = {};

  const mappingPreview = [];
  const ambiguous = [];
  const manualReview = [];
  const unexpectedStatuses = new Set();

  // Known statuses we have mapping logic for
  const knownStatuses = new Set([
    'SÄLJ', 'KONSTRUKTION', 'PRODUKTION', 'LAGER', 'MONTERING',
    'ready_to_pick', 'picking', 'picked', 'in_production',
    'production_completed', 'delivered', 'cancelled', 'shipped', 'draft',
  ]);

  for (const order of orders) {
    const status = order.status || '(null/undefined)';
    currentStatusCounts[status] = (currentStatusCounts[status] || 0) + 1;

    const wo = woByOrderId.get(order.id);
    const items = itemsByOrderId.get(order.id) || [];
    const totalItems = items.length;
    const pickedItems = items.filter(i => i.status === 'picked').length;
    const allItemsPicked = totalItems > 0 && pickedItems === totalItems;
    const someItemsPicked = pickedItems > 0 && pickedItems < totalItems;

    let proposedPhase = null;
    let proposedFulfillment = null;
    let ambiguity = null;
    let needsReview = false;

    switch (status) {
      case 'SÄLJ':
        proposedPhase = 'SÄLJ';
        proposedFulfillment = 'pending';
        break;

      case 'KONSTRUKTION':
        proposedPhase = 'KONSTRUKTION';
        proposedFulfillment = 'pending';
        break;

      case 'PRODUKTION':
        proposedPhase = 'AKTIV';
        proposedFulfillment = 'pending';
        break;

      case 'LAGER': {
        proposedPhase = 'AKTIV';
        if (wo && ['montering', 'leverans'].includes(wo.current_stage)) {
          proposedFulfillment = 'picked';
        } else if (allItemsPicked) {
          proposedFulfillment = 'picked';
        } else if (someItemsPicked) {
          proposedFulfillment = 'picking';
          ambiguity = `Partial pick: ${pickedItems}/${totalItems} items picked; no WO advancement detected`;
        } else {
          proposedFulfillment = 'picking';
          if (totalItems === 0) {
            ambiguity = 'No OrderItems found; assuming picking state';
          }
        }
        break;
      }

      case 'MONTERING': {
        if (wo && wo.status === 'klar') {
          proposedPhase = 'AVSLUTAD';
          proposedFulfillment = 'delivered';
        } else if (wo && wo.status === 'pågår' && wo.current_stage === 'montering') {
          proposedPhase = 'AKTIV';
          proposedFulfillment = 'in_transit';
          ambiguity = 'Order.status=MONTERING but WO still in progress (montering stage, not completed)';
        } else if (wo && wo.status === 'pågår') {
          proposedPhase = 'AKTIV';
          proposedFulfillment = 'in_transit';
          ambiguity = `Order.status=MONTERING but WO current_stage=${wo.current_stage} (unexpected)`;
          needsReview = true;
        } else {
          proposedPhase = 'AVSLUTAD';
          proposedFulfillment = 'delivered';
          ambiguity = 'Order.status=MONTERING but no linked WorkOrder found';
          needsReview = true;
        }
        break;
      }

      case 'ready_to_pick':
        proposedPhase = 'AKTIV';
        proposedFulfillment = 'ready_to_pick';
        break;

      case 'picking':
        proposedPhase = 'AKTIV';
        proposedFulfillment = 'picking';
        break;

      case 'picked':
        proposedPhase = 'AKTIV';
        proposedFulfillment = 'picked';
        break;

      case 'in_production':
        proposedPhase = 'AKTIV';
        proposedFulfillment = 'picked';
        break;

      case 'production_completed':
        proposedPhase = 'AKTIV';
        proposedFulfillment = 'picked';
        break;

      case 'delivered':
        proposedPhase = 'AVSLUTAD';
        proposedFulfillment = 'delivered';
        break;

      case 'cancelled':
        proposedPhase = 'AVBRUTEN';
        proposedFulfillment = 'pending';
        break;

      case 'shipped':
        proposedPhase = 'AKTIV';
        proposedFulfillment = 'in_transit';
        break;

      case 'draft':
        proposedPhase = 'SÄLJ';
        proposedFulfillment = 'pending';
        ambiguity = 'Draft status mapped to SÄLJ phase; confirm this is correct';
        break;

      default:
        proposedPhase = 'AKTIV';
        proposedFulfillment = 'pending';
        ambiguity = `Unknown/unexpected status value: "${status}"`;
        needsReview = true;
        unexpectedStatuses.add(status);
        break;
    }

    proposedPhaseCounts[proposedPhase] = (proposedPhaseCounts[proposedPhase] || 0) + 1;
    proposedFulfillmentCounts[proposedFulfillment] = (proposedFulfillmentCounts[proposedFulfillment] || 0) + 1;

    const entry = {
      order_id: order.id,
      order_number: order.order_number || '(no number)',
      customer_name: order.customer_name || '(no name)',
      current_status: status,
      proposed_phase: proposedPhase,
      proposed_fulfillment_status: proposedFulfillment,
      has_workorder: !!wo,
      workorder_id: wo?.id || null,
      workorder_status: wo?.status || null,
      workorder_stage: wo?.current_stage || null,
      total_items: totalItems,
      picked_items: pickedItems,
      all_items_picked: allItemsPicked,
      sales_completed: order.sales_completed || false,
      fortnox_invoiced: order.fortnox_invoiced || false,
      ambiguity,
      needs_review: needsReview,
    };

    mappingPreview.push(entry);
    if (ambiguity) ambiguous.push(entry);
    if (needsReview) manualReview.push(entry);
  }

  return {
    meta: {
      total_orders: orders.length,
      total_workorders: workOrders.length,
      total_order_items: orderItems.length,
      analysis_run_at: new Date().toISOString(),
    },
    current_status_distribution: currentStatusCounts,
    proposed_phase_distribution: proposedPhaseCounts,
    proposed_fulfillment_distribution: proposedFulfillmentCounts,
    counts: {
      ambiguous: ambiguous.length,
      manual_review: manualReview.length,
      unexpected_status_values: unexpectedStatuses.size,
      clean_mappings: mappingPreview.length - ambiguous.length,
    },
    detail: {
      ambiguous_preview: ambiguous.slice(0, 100),
      manual_review_preview: manualReview.slice(0, 100),
      unexpected_status_values: Array.from(unexpectedStatuses),
    },
  };
}

// ── Main ──
async function main() {
  try {
    const data = await loadData();
    const result = analyze(data);

    // Print summary to stdout
    console.log('='.repeat(70));
    console.log('  ORDER STATUS MIGRATION ANALYSIS REPORT');
    console.log('='.repeat(70));
    console.log('\n📊 META');
    console.log(`   Total Orders:      ${result.meta.total_orders}`);
    console.log(`   Total WorkOrders:  ${result.meta.total_workorders}`);
    console.log(`   Total OrderItems:  ${result.meta.total_order_items}`);
    console.log(`   Analysis Time:     ${result.meta.analysis_run_at}`);

    console.log('\n📈 CURRENT STATUS DISTRIBUTION');
    for (const [status, count] of Object.entries(result.current_status_distribution).sort((a, b) => b[1] - a[1])) {
      const pct = ((count / result.meta.total_orders) * 100).toFixed(1);
      console.log(`   ${status.padEnd(24)} ${String(count).padStart(6)} (${pct}%)`);
    }

    console.log('\n🎯 PROPOSED PHASE DISTRIBUTION');
    for (const [phase, count] of Object.entries(result.proposed_phase_distribution).sort((a, b) => b[1] - a[1])) {
      const pct = ((count / result.meta.total_orders) * 100).toFixed(1);
      console.log(`   ${phase.padEnd(24)} ${String(count).padStart(6)} (${pct}%)`);
    }

    console.log('\n📦 PROPOSED FULFILLMENT DISTRIBUTION');
    for (const [fulfillment, count] of Object.entries(result.proposed_fulfillment_distribution).sort((a, b) => b[1] - a[1])) {
      const pct = ((count / result.meta.total_orders) * 100).toFixed(1);
      console.log(`   ${fulfillment.padEnd(24)} ${String(count).padStart(6)} (${pct}%)`);
    }

    console.log('\n⚠️  MAPPING QUALITY');
    console.log(`   Clean mappings:      ${result.counts.clean_mappings}`);
    console.log(`   Ambiguous:           ${result.counts.ambiguous}`);
    console.log(`   Manual review:       ${result.counts.manual_review}`);
    console.log(`   Unexpected statuses: ${result.counts.unexpected_status_values}`);

    if (result.detail.unexpected_status_values.length > 0) {
      console.log('\n🚨 UNEXPECTED STATUS VALUES (need mapping rules):');
      for (const val of result.detail.unexpected_status_values) {
        console.log(`   - "${val}"`);
      }
    }

    if (result.detail.ambiguous_preview.length > 0) {
      console.log('\n🔍 AMBIGUOUS CASES (first 5):');
      for (const item of result.detail.ambiguous_preview.slice(0, 5)) {
        console.log(`   [${item.order_number}] ${item.customer_name}`);
        console.log(`      Status: ${item.current_status} → Phase: ${item.proposed_phase}, Fulfillment: ${item.proposed_fulfillment_status}`);
        console.log(`      ${item.ambiguity}`);
      }
    }

    if (result.detail.manual_review_preview.length > 0) {
      console.log('\n👀 MANUAL REVIEW CASES (first 5):');
      for (const item of result.detail.manual_review_preview.slice(0, 5)) {
        console.log(`   [${item.order_number}] ${item.customer_name}`);
        console.log(`      Status: ${item.current_status} → Phase: ${item.proposed_phase}, Fulfillment: ${item.proposed_fulfillment_status}`);
        console.log(`      ${item.ambiguity}`);
      }
    }

    console.log('\n' + '='.repeat(70));

    // Also write full JSON report
    const reportPath = join(dataDir, 'order-status-analysis-report.json');
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full report written to: ${reportPath}`);

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
