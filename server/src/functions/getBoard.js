import { prisma } from '../index.js';
import { evaluateGates } from '../services/gateService.js';

/**
 * getBoard — Hämta alla arbetsordrar grupperade per fas för ProcessBoard
 * Body: { assignedTo?, overdue?, priority?, customer?, search?, savedViewId? }
 */
export async function getBoard(req, res, next) {
  try {
    const user = req.user;
    const {
      assignedTo = 'all',
      overdue,
      priority,
      customer,
      search,
      savedViewId,
    } = req.body || {};

    // ── Build WHERE clause ──
    const where = {
      deleted_at: null,
      status: { notIn: ['klar', 'avbruten'] },
      cancelled_at: null,
    };

    if (search) {
      const q = search.trim();
      where.OR = [
        { order_number: { contains: q, mode: 'insensitive' } },
        { customer_name: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (customer) {
      where.customer_name = { contains: customer, mode: 'insensitive' };
    }

    if (priority) {
      where.priority = priority;
    }

    if (overdue === true) {
      where.delivery_date = { lt: new Date() };
      where.status = { not: 'klar' };
    }

    // "Mina ordrar" — filter via WorkOrderRole
    if (assignedTo === 'me' && user?.id) {
      where.roles = {
        some: { user_id: user.id },
      };
    }

    // ── Fetch orders with roles ──
    const orders = await prisma.workOrder.findMany({
      where,
      include: {
        roles: true,
      },
      orderBy: { delivery_date: 'asc' },
    });

    const now = new Date();

    // ── Map role per stage ──
    const STAGE_ROLE_MAP = {
      inkorg: 'projektledare',
      konstruktion: 'konstruktor',
      produktion: 'produktion',
      lager: 'lager',
      montering: 'tekniker',
      leverans: 'projektledare',
    };

    // ── Enrich each order ──
    const enriched = orders.map((wo) => {
      const isOverdue = wo.delivery_date && wo.delivery_date < now && wo.status !== 'klar';
      const daysOverdue = isOverdue
        ? Math.floor((now - wo.delivery_date) / (1000 * 60 * 60 * 24))
        : null;

      const expectedRole = STAGE_ROLE_MAP[wo.current_stage];
      const currentRole = wo.roles.find((r) => r.role === expectedRole);

      return {
        id: wo.id,
        orderNumber: wo.order_number,
        customerName: wo.customer_name,
        name: wo.name,
        deliveryDate: wo.delivery_date,
        deliveryAddress: wo.delivery_address,
        shippingCarrier: wo.shipping_company,
        plannedDeadline: wo.planned_deadline,
        isOverdue,
        daysOverdue,
        priority: wo.priority,
        phase: wo.current_stage,
        status: wo.status,
        redFlagActive: wo.red_flag_active,
        backForthCount: wo.back_forth_count,
        isPendling: wo.back_forth_count > 2,
        isBlocked: wo.is_blocked,
        blockerReason: wo.blocker_reason,
        currentResponsible: currentRole
          ? {
              role: currentRole.role,
              userId: currentRole.user_id,
              userName: currentRole.user_name,
            }
          : null,
        gateProgress: { completed: 0, total: 0 }, // placeholder until gates implemented
        materialsTotal: wo.materials_total_count,
        materialsReady: wo.materials_ready_count,
        materialsMissing: wo.materials_missing_count,
        materialsOrdered: wo.materials_ordered_count,
      };
    });

    // ── Group by phase ──
    const columns = {
      inkorg: [],
      konstruktion: [],
      produktion: [],
      lager: [],
      montering: [],
      leverans: [],
    };

    for (const wo of enriched) {
      const phase = wo.phase || 'inkorg';
      if (columns[phase]) columns[phase].push(wo);
    }

    const totals = {
      all: enriched.length,
      overdue: enriched.filter((o) => o.isOverdue).length,
      inkorg: columns.inkorg.length,
      konstruktion: columns.konstruktion.length,
      produktion: columns.produktion.length,
      lager: columns.lager.length,
      montering: columns.montering.length,
      leverans: columns.leverans.length,
    };

    return res.json({ success: true, columns, totals });
  } catch (err) {
    next(err);
  }
}
