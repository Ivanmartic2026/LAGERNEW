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
  'PurchaseOrderItem', 'ReceivingRecord', 'RepairLog', 'ScanMatchAudit',
  'ServiceLog', 'SiteReport', 'SiteReportImage', 'StockAdjustment',
  'Supplier', 'SupplierLabelPattern', 'SyncLog', 'SystemAutomation',
  'Task', 'TaskTemplate', 'User', 'Warehouse', 'WorkOrder', 'WorkOrderActivity',
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
    const { sort = '-createdAt', limit = '100', skip = '0', ...filters } = req.query;

    const model = prisma[entityName.charAt(0).toLowerCase() + entityName.slice(1)];
    if (!model) {
      return res.status(404).json({ error: `Entity model not found: ${entityName}` });
    }

    // Parse sort: '-createdAt' → { createdAt: 'desc' }
    const orderBy = {};
    const sortField = sort.replace(/^-/, '');
    const sortDir = sort.startsWith('-') ? 'desc' : 'asc';
    orderBy[sortField] = sortDir;

    // Build where clause from filters (simple equality for now)
    const where = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') {
        where[key] = value;
      }
    }

    const [items, total] = await Promise.all([
      model.findMany({
        where,
        orderBy,
        take: parseInt(limit, 10),
        skip: parseInt(skip, 10),
      }),
      model.count({ where }),
    ]);

    res.json({ items, total, limit: parseInt(limit, 10), skip: parseInt(skip, 10) });
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
