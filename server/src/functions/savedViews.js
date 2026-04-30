import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listSavedViews(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const views = await prisma.savedBoardView.findMany({
      where: { user_id: userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, views });
  } catch (err) {
    console.error('listSavedViews error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createSavedView(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { name, filters } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });

    const view = await prisma.savedBoardView.create({
      data: {
        user_id: userId,
        name: name.trim(),
        filters: filters || {},
      },
    });

    return res.status(201).json({ success: true, view });
  } catch (err) {
    console.error('createSavedView error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function deleteSavedView(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await prisma.savedBoardView.deleteMany({
      where: { id, user_id: userId },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('deleteSavedView error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
