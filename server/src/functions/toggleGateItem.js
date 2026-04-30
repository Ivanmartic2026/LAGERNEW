import { toggleGateItem as toggleItem } from '../services/gateService.js';

/**
 * toggleGateItem — Toggle a manual gate checklist item
 * Body: { item_id }
 */
export async function toggleGateItem(req, res, next) {
  try {
    const user = req.user;
    const { item_id } = req.body;
    if (!item_id) {
      return res.status(400).json({ error: 'item_id required' });
    }

    const item = await toggleItem(item_id, user?.email || user?.id);
    return res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
}
