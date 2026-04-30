/**
 * Function routes — migrated from base44/functions/*
 * Pattern: /api/v1/functions/:functionName
 *
 * Each Base44 function becomes an Express POST handler.
 * This file is a registry; individual functions are imported from src/functions/.
 */

import { Router } from 'express';

const router = Router();

// ── Function registry ──
// TODO: Import and register all 173 migrated functions here
// Example:
// import { createWorkOrder } from '../functions/createWorkOrder.js';
// router.post('/createWorkOrder', createWorkOrder);

// Placeholder: return 501 Not Implemented for unregistered functions
router.post('/:functionName', (req, res) => {
  const { functionName } = req.params;
  res.status(501).json({
    error: `Function "${functionName}" not yet migrated`,
    note: 'Functions are being migrated from base44/functions/ to server/src/functions/',
  });
});

export { router as functionsRouter };
