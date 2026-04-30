import { prisma } from '../index.js';

/**
 * getDashboard — Rollbaserad översikt med KPI:er
 * Returns stats per stage, overdue count, my assignments, etc.
 */
export async function getDashboard(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();

    // Base filters
    const baseWhere = {
      deleted_at: null,
      status: { notIn: ['klar', 'avbruten'] },
      cancelled_at: null,
    };

    // ── Global stats ──
    const totalActive = await prisma.workOrder.count({ where: baseWhere });
    const totalOverdue = await prisma.workOrder.count({
      where: { ...baseWhere, delivery_date: { lt: now } },
    });
    const totalRedFlags = await prisma.workOrder.count({
      where: { ...baseWhere, red_flag_active: true },
    });

    // ── Stats per stage ──
    const stages = ['inkorg', 'konstruktion', 'produktion', 'lager', 'montering', 'leverans'];
    const stageStats = {};
    for (const stage of stages) {
      const count = await prisma.workOrder.count({
        where: { ...baseWhere, current_stage: stage },
      });
      const overdue = await prisma.workOrder.count({
        where: { ...baseWhere, current_stage: stage, delivery_date: { lt: now } },
      });
      stageStats[stage] = { count, overdue };
    }

    // ── My assignments (via WorkOrderRole) ──
    const myAssignments = user.id
      ? await prisma.workOrderRole.count({
          where: { user_id: user.id },
        })
      : 0;

    const myOverdue = user.id
      ? await prisma.workOrder.count({
          where: {
            ...baseWhere,
            delivery_date: { lt: now },
            roles: { some: { user_id: user.id } },
          },
        })
      : 0;

    // ── Recent activity (last 7 days) ──
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentTransitions = await prisma.phaseTransition.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const recentActivity = await prisma.workOrderActivity.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    // ── Needs attention (no owner, no date, blocked) ──
    const noOwner = await prisma.workOrder.count({
      where: { ...baseWhere, roles: { none: {} } },
    });

    const noDate = await prisma.workOrder.count({
      where: { ...baseWhere, delivery_date: null },
    });

    // ── Top customers by active orders ──
    const topCustomers = await prisma.workOrder.groupBy({
      by: ['customer_name'],
      where: baseWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    return res.json({
      success: true,
      summary: {
        totalActive,
        totalOverdue,
        totalRedFlags,
        myAssignments,
        myOverdue,
        recentTransitions,
        recentActivity,
        noOwner,
        noDate,
      },
      stageStats,
      topCustomers: topCustomers.map((c) => ({
        customer: c.customer_name || 'Okänd',
        count: c._count.id,
      })),
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    next(err);
  }
}
