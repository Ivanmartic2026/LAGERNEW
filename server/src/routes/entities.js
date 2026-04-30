/**
 * Auto-generated CRUD routes for all 47 entities
 * Pattern: /api/v1/entities/<entityName>
 *
 * GET    /entities/:entityName          → list (with ?sort=, ?limit=, ?filter=)
 * GET    /entities/:entityName/:id      → get by id
 * POST   /entities/:entityName          → create
 * PUT    /entities/:entityName/:id      → update
 * DELETE /entities/:entityName/:id      → delete
 */

import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';

const router = Router();

// ── Valid entity names (matches Prisma model names) ──
const VALID_ENTITIES = new Set([
  'Article', 'Batch', 'BatchActivity', 'BatchAnalysis', 'BatchPatternRule',
  'BatchSuggestion', 'DeliveryRecord', 'DrivingJournalEntry', 'FortnoxConfig',
  'FortnoxCustomer', 'InternalWithdrawal', 'InventoryCount', 'KimiConfig',
  'LabelScan', 'MergeApprovalQueue', 'MigrationRun', 'Notification',
  'NotificationSettings', 'Order', 'OrderItem', 'OrderPickList',
  'PatternInferenceLog', 'POActivity', 'ProductionActivity', 'ProductionRecord',
  'ProjectExpense', 'ProjectLink', 'ProjectTime', 'PurchaseOrder',
  'PurchaseOrderItem', 'PushSubscription', 'ReceivingRecord', 'RepairLog',
  'ScanMatchAudit', 'ServiceLog', 'SiteReport', 'SiteReportImage',
  'StockAdjustment', 'Supplier', 'SupplierLabelPattern', 'SyncLog',
  'SystemAutomation', 'Task', 'TaskTemplate', 'User', 'Warehouse',
  'WorkOrder', 'WorkOrderActivity', 'WorkOrderMaterial',
]);

function validateEntity(req, res, next) {
  const { entityName } = req.params;
  if (!VALID_ENTITIES.has(entityName)) {
    return res.status(404).json({ error: `Unknown entity: ${entityName}` });
  }
  next();
}

// ── GET /entities/:entityName ──
router.get('/:entityName', validateEntity, async (req, res, next) => {
  try {
    const { entityName } = req.params;
    // Base44 SDK uses __order_by, __page_size, __page — map to our params
    const rawQuery = req.query;
    const sortRaw = rawQuery.__order_by || rawQuery.sort || '-createdAt';
    const limitRaw = rawQuery.__page_size || rawQuery.limit || '9999';
    const pageRaw  = rawQuery.__page || '1';
    const skipRaw  = rawQuery.skip || String((parseInt(pageRaw, 10) - 1) * parseInt(limitRaw, 10));

    // Strip Base44 meta-params and pagination from filters
    const BASE44_META = new Set(['__order_by','__page_size','__page','sort','limit','skip','__include','__expand']);
    const filters = {};
    for (const [key, value] of Object.entries(rawQuery)) {
      if (!BASE44_META.has(key) && value !== undefined && value !== '') {
        filters[key] = value;
      }
    }

    const model = prisma[entityName.charAt(0).toLowerCase() + entityName.slice(1)];
    if (!model) {
      return res.status(404).json({ error: `Entity model not found: ${entityName}` });
    }

    // Parse sort: '-created_date' or '-createdAt' → { createdAt: 'desc' }
    const FIELD_MAP = {
      created_date: 'createdAt', updated_date: 'updatedAt',
      stock_qty: 'stock_qty', name: 'name',
    };
    const orderBy = {};
    const rawSort = String(sortRaw).replace(/^-/, '');
    const sortField = FIELD_MAP[rawSort] || rawSort;
    const sortDir = String(sortRaw).startsWith('-') ? 'desc' : 'asc';
    orderBy[sortField] = sortDir;

    // Build where clause — only known scalar fields (skip unknowns to avoid Prisma crash)
    const where = {};
    for (const [key, value] of Object.entries(filters)) {
      try {
        where[key] = value;
      } catch {}
    }

    const takeN = parseInt(limitRaw, 10) || 100;
    const skipN = parseInt(skipRaw, 10) || 0;

    let items, total;
    try {
      [items, total] = await Promise.all([
        model.findMany({ where, orderBy, take: takeN, skip: skipN }),
        model.count({ where }),
      ]);
    } catch (prismaErr) {
      // If where-clause has invalid fields, retry without filters
      console.warn(`[entities] Filter error for ${entityName}, retrying without filters:`, prismaErr.message?.split('\n')[0]);
      [items, total] = await Promise.all([
        model.findMany({ orderBy, take: takeN, skip: skipN }),
        model.count(),
      ]);
    }

    // Base44 SDK förväntar sig en ren array (inte { items, total })
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// ── GET /entities/:entityName/:id ──
router.get('/:entityName/:id', validateEntity, async (req, res, next) => {
  try {
    const { entityName, id } = req.params;
    const model = prisma[entityName.charAt(0).toLowerCase() + entityName.slice(1)];

    const item = await model.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// ── POST /entities/:entityName ──
router.post('/:entityName', validateEntity, async (req, res, next) => {
  try {
    const { entityName } = req.params;
    const model = prisma[entityName.charAt(0).toLowerCase() + entityName.slice(1)];

    const item = await model.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// ── PUT /entities/:entityName/:id ──
router.put('/:entityName/:id', validateEntity, async (req, res, next) => {
  try {
    const { entityName, id } = req.params;
    const model = prisma[entityName.charAt(0).toLowerCase() + entityName.slice(1)];

    const item = await model.update({
      where: { id },
      data: req.body,
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /entities/:entityName/:id ──
router.delete('/:entityName/:id', validateEntity, async (req, res, next) => {
  try {
    const { entityName, id } = req.params;
    const model = prisma[entityName.charAt(0).toLowerCase() + entityName.slice(1)];

    await model.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export { router as entitiesRouter };
