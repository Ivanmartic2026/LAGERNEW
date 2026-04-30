import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ROLE_FIELDS = [
  { field: 'assigned_to_konstruktion', nameField: 'assigned_to_konstruktion_name', role: 'konstruktor' },
  { field: 'assigned_to_produktion',  nameField: 'assigned_to_produktion_name',  role: 'produktion' },
  { field: 'assigned_to_lager',       nameField: 'assigned_to_lager_name',       role: 'lager' },
  { field: 'assigned_to_montering',   nameField: 'assigned_to_montering_name',   role: 'tekniker' },
  { field: 'assigned_to_leverans',    nameField: 'assigned_to_leverans_name',    role: 'projektledare' },
];

async function backfill() {
  const orders = await prisma.workOrder.findMany();
  let created = 0;
  let skipped = 0;

  for (const order of orders) {
    for (const { field, nameField, role } of ROLE_FIELDS) {
      const userId = order[field];
      if (!userId) { skipped++; continue; }

      await prisma.workOrderRole.upsert({
        where: {
          work_order_id_role_user_id: {
            work_order_id: order.id,
            role,
            user_id: userId,
          }
        },
        update: {},
        create: {
          work_order_id: order.id,
          role,
          user_id: userId,
          user_name: order[nameField] || null,
          assigned_at: order.createdAt,
          assigned_by: null,
        }
      });
      created++;
    }
  }

  console.log(`Backfill complete: ${created} roles created, ${skipped} skipped`);
}

backfill()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
