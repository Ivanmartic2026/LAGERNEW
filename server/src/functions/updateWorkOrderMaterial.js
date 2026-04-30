import { prisma } from '../lib/db.js';
import { checkAutoTransition } from '../services/autoTransitionService.js';

/**
 * Update a WorkOrderMaterial row (quantity_picked, status, etc.)
 * After update, checks if auto-transition Lager → Montering should trigger.
 */
export async function updateWorkOrderMaterial(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, quantity_picked, status, notes } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Material id is required' });
    }

    const material = await prisma.workOrderMaterial.findUnique({
      where: { id },
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const updateData = {};
    if (quantity_picked !== undefined) updateData.quantity_picked = quantity_picked;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const updatedMaterial = await prisma.workOrderMaterial.update({
      where: { id },
      data: updateData,
    });

    // Check auto-transition
    let autoTransition = null;
    const workOrder = await prisma.workOrder.findUnique({ where: { id: material.work_order_id } });
    if (workOrder && workOrder.current_stage === 'lager') {
      autoTransition = await checkAutoTransition(material.work_order_id);
    }

    return res.json({
      success: true,
      material: updatedMaterial,
      autoTransition: autoTransition
        ? {
            triggered: true,
            from_phase: 'lager',
            to_phase: 'montering',
            order_number: autoTransition.updatedWorkOrder.order_number,
          }
        : { triggered: false },
    });
  } catch (error) {
    console.error('updateWorkOrderMaterial error:', error);
    next(error);
  }
}
