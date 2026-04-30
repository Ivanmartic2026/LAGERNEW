import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * analyzeOrderStatuses
 *
 * Dry-run analysis of Order.status values to validate migration mapping
 * before adding `phase` and `fulfillment_status` fields.
 *
 * This function is READ-ONLY. It does not modify any data.
 * Admin access required.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── Auth guard ──
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // ── Fetch all relevant data ──
    const [orders, workOrders, orderItems] = await Promise.all([
      base44.asServiceRole.entities.Order.list('-created_date'),
      base44.asServiceRole.entities.WorkOrder.list('-created_date'),
      base44.asServiceRole.entities.OrderItem.list('-created_date'),
    ]);

    // Build lookup maps for fast access
    const woByOrderId = new Map<string, any>();
    for (const wo of workOrders) {
      if (wo.order_id) woByOrderId.set(wo.order_id, wo);
    }

    const itemsByOrderId = new Map<string, any[]>();
    for (const item of orderItems) {
      if (!itemsByOrderId.has(item.order_id)) {
        itemsByOrderId.set(item.order_id, []);
      }
      itemsByOrderId.get(item.order_id)!.push(item);
    }

    // ── Counters ──
    const currentStatusCounts: Record<string, number> = {};
    const proposedPhaseCounts: Record<string, number> = {};
    const proposedFulfillmentCounts: Record<string, number> = {};

    const mappingPreview: any[] = [];
    const ambiguous: any[] = [];
    const manualReview: any[] = [];
    const unexpectedStatuses = new Set<string>();

    // ── Known statuses we have mapping logic for ──
    const knownStatuses = new Set([
      'SÄLJ',
      'KONSTRUKTION',
      'PRODUKTION',
      'LAGER',
      'MONTERING',
      'ready_to_pick',
      'picking',
      'picked',
      'in_production',
      'production_completed',
      'delivered',
      'cancelled',
      'shipped',
      'draft',
    ]);

    // ── Analyze each order ──
    for (const order of orders) {
      const status = order.status || '(null/undefined)';
      currentStatusCounts[status] = (currentStatusCounts[status] || 0) + 1;

      const wo = woByOrderId.get(order.id);
      const items = itemsByOrderId.get(order.id) || [];
      const totalItems = items.length;
      const pickedItems = items.filter((i: any) => i.status === 'picked').length;
      const allItemsPicked = totalItems > 0 && pickedItems === totalItems;
      const someItemsPicked = pickedItems > 0 && pickedItems < totalItems;

      let proposedPhase: string | null = null;
      let proposedFulfillment: string | null = null;
      let ambiguity: string | null = null;
      let needsReview = false;

      // ── Mapping logic ──
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

          // Decision: has WO advanced past lager stage?
          if (wo && ['montering', 'leverans'].includes(wo.current_stage)) {
            proposedFulfillment = 'picked';
          }
          // Decision: are all items physically picked?
          else if (allItemsPicked) {
            proposedFulfillment = 'picked';
          }
          // Decision: some items picked but not all
          else if (someItemsPicked) {
            proposedFulfillment = 'picking';
            ambiguity = `Partial pick: ${pickedItems}/${totalItems} items picked; no WO advancement detected`;
          }
          // Default: no pick data, assume picking
          else {
            proposedFulfillment = 'picking';
            if (totalItems === 0) {
              ambiguity = 'No OrderItems found; assuming picking state';
            }
          }
          break;
        }

        case 'MONTERING': {
          // Decision: is the linked WO actually completed?
          if (wo && wo.status === 'klar') {
            proposedPhase = 'AVSLUTAD';
            proposedFulfillment = 'delivered';
          }
          // Decision: WO still in progress at montering stage
          else if (wo && wo.status === 'pågår' && wo.current_stage === 'montering') {
            proposedPhase = 'AKTIV';
            proposedFulfillment = 'in_transit';
            ambiguity = 'Order.status=MONTERING but WO still in progress (montering stage, not completed)';
          }
          // Decision: WO exists but in an earlier stage (should not happen, but handle)
          else if (wo && wo.status === 'pågår') {
            proposedPhase = 'AKTIV';
            proposedFulfillment = 'in_transit';
            ambiguity = `Order.status=MONTERING but WO current_stage=${wo.current_stage} (unexpected)`;
            needsReview = true;
          }
          // Decision: no linked WO
          else {
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

      // ── Accumulate counts ──
      proposedPhaseCounts[proposedPhase] = (proposedPhaseCounts[proposedPhase] || 0) + 1;
      proposedFulfillmentCounts[proposedFulfillment] =
        (proposedFulfillmentCounts[proposedFulfillment] || 0) + 1;

      // ── Build detail entry ──
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

    // ── Build summary ──
    const summary = {
      success: true,
      meta: {
        total_orders: orders.length,
        total_workorders: workOrders.length,
        total_order_items: orderItems.length,
        analysis_run_at: new Date().toISOString(),
        analyzed_by: user.email,
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
    };

    // ── Return response (with detail slices) ──
    return Response.json({
      ...summary,
      detail: {
        ambiguous_preview: ambiguous.slice(0, 100),
        manual_review_preview: manualReview.slice(0, 100),
        unexpected_status_values: Array.from(unexpectedStatuses),
      },
    });

  } catch (error: any) {
    console.error(`[ERROR] analyzeOrderStatuses: ${error.message}`);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
