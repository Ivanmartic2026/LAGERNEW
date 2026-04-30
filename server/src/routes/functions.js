/**
 * Function routes — migrated from base44/functions/*
 * Pattern: /api/v1/functions/:functionName
 *
 * Each Base44 function becomes an Express POST handler.
 */

import { Router } from 'express';

import { updateWorkOrderStage } from '../functions/updateWorkOrderStage.js';
import { logWorkOrderActivity } from '../functions/logWorkOrderActivity.js';
import { createWorkOrder } from '../functions/createWorkOrder.js';
import { quickStockWithdrawal } from '../functions/quickStockWithdrawal.js';
import { createStockWithdrawal } from '../functions/createStockWithdrawal.js';
import { submitStockWithdrawal } from '../functions/submitStockWithdrawal.js';
import { approveStockWithdrawal } from '../functions/approveStockWithdrawal.js';
import { rejectStockWithdrawal } from '../functions/rejectStockWithdrawal.js';
import { cancelStockWithdrawal } from '../functions/cancelStockWithdrawal.js';
import { setupPushNotifications } from '../functions/setupPushNotifications.js';
import { sendPushNotification } from '../functions/sendPushNotification.js';
import { getWorkOrderMaterials } from '../functions/getWorkOrderMaterials.js';
import { getPurchaseNeeds } from '../functions/getPurchaseNeeds.js';
import { getBoard } from '../functions/getBoard.js';
import { getGateChecklist } from '../functions/getGateChecklist.js';
import { toggleGateItem } from '../functions/toggleGateItem.js';
import { listSavedViews, createSavedView, deleteSavedView } from '../functions/savedViews.js';
import { updateWorkOrderMaterial } from '../functions/updateWorkOrderMaterial.js';

const router = Router();

// ── Function registry ──
const handlers = {
  updateWorkOrderStage,
  logWorkOrderActivity,
  createWorkOrder,
  quickStockWithdrawal,
  createStockWithdrawal,
  submitStockWithdrawal,
  approveStockWithdrawal,
  rejectStockWithdrawal,
  cancelStockWithdrawal,
  setupPushNotifications,
  sendPushNotification,
  getWorkOrderMaterials,
  getPurchaseNeeds,
  getBoard,
  getGateChecklist,
  toggleGateItem,
  updateWorkOrderMaterial,
};

router.post('/:functionName', (req, res, next) => {
  const { functionName } = req.params;
  const handler = handlers[functionName];

  if (!handler) {
    return res.status(501).json({
      error: `Function "${functionName}" not yet migrated`,
      note: 'Functions are being migrated from base44/functions/ to server/src/functions/',
    });
  }

  return handler(req, res, next);
});

// ── Saved Board Views (REST-style) ──
router.get('/savedViews', listSavedViews);
router.post('/savedViews', createSavedView);
router.delete('/savedViews/:id', deleteSavedView);

export { router as functionsRouter };
