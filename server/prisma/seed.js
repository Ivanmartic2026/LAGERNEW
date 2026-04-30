import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STAGE_ORDER = ['inkorg', 'konstruktion', 'produktion', 'lager', 'montering', 'leverans'];

async function main() {
  console.log('🌱 Starting seed...');

  // ── 1. Users ────────────────────────────────────────────────
  const userData = [
    { email: 'admin@lagerai.se', full_name: 'Admin', role: 'admin', woRole: 'projektledare', password_hash: '$2b$10$hashedplaceholder' },
    { email: 'lars@lagerai.se', full_name: 'Lars Lindqvist', role: 'admin', woRole: 'projektledare' },
    { email: 'anna@lagerai.se', full_name: 'Anna Karlsson', role: 'konstruktor', woRole: 'konstruktor' },
    { email: 'mikael@lagerai.se', full_name: 'Mikael Svensson', role: 'produktion', woRole: 'produktion' },
    { email: 'sofia@lagerai.se', full_name: 'Sofia Johansson', role: 'lager', woRole: 'lager' },
    { email: 'erik@lagerai.se', full_name: 'Erik Andersson', role: 'tekniker', woRole: 'tekniker' },
    { email: 'maria@lagerai.se', full_name: 'Maria Eriksson', role: 's_ljare', woRole: 'saljare' },
  ];

  const usersByWoRole = {};
  for (const u of userData) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      usersByWoRole[u.woRole] = existing;
    } else {
      const created = await prisma.user.create({
        data: { email: u.email, full_name: u.full_name, role: u.role, password_hash: u.password_hash, createdAt: new Date(), updatedAt: new Date() },
      });
      usersByWoRole[u.woRole] = created;
      console.log(`  Created user: ${u.full_name} (${u.role})`);
    }
  }

  // ── 2. WorkOrders ───────────────────────────────────────────
  const workOrdersData = [
    {
      order_number: 'ORD-2026-002',
      name: 'Stureplan LED-fasad',
      customer_name: 'Scandinavian Properties AB',
      current_stage: 'inkorg',
      priority: 'h_g',
      delivery_date: new Date('2026-05-15'),
      delivery_address: 'Stureplan 4, 114 35 Stockholm',
      shipping_company: 'DHL Freight',
      product_name: 'P3.9 Outdoor LED',
      screen_dimensions: '5x3 meter',
      pixel_pitch: '3.9mm',
      module_count: 120,
      config_cols: 10,
      config_rows: 6,
      status: 'p_g_r',
      workorder_notes: 'Kunden önskar vitkalibrering. Kontakta Anders på plats.',
      workorder_title: 'Stureplan LED-fasad',
      workorder_description: 'Komplett LED-fasad med vitkalibrering',
    },
    {
      order_number: 'ORD-2026-003',
      name: 'Malmö Arena skärm',
      customer_name: 'Eventum AB',
      current_stage: 'produktion',
      priority: 'normal',
      delivery_date: new Date('2026-06-01'),
      delivery_address: 'Hyllie Boulevard 12, 215 32 Malmö',
      shipping_company: 'Schenker',
      product_name: 'P4.8 Indoor LED',
      screen_dimensions: '8x4 meter',
      pixel_pitch: '4.8mm',
      module_count: 200,
      config_cols: 16,
      config_rows: 8,
      status: 'p_g_r',
      production_status: 'p_g_r',
      workorder_notes: 'Fördröjd pga. leverans av IC-chips. Nytt datum 28 maj.',
      workorder_title: 'Malmö Arena skärm',
      workorder_description: 'Stor inomhusskärm för konserter',
    },
    {
      order_number: 'ORD-2026-004',
      name: 'Göteborg kontor lobby',
      customer_name: 'Volvo Group',
      current_stage: 'lager',
      priority: 'l_g',
      delivery_date: new Date('2026-04-20'),
      delivery_address: 'Volvovägen 1, 405 08 Göteborg',
      shipping_company: 'Bring',
      product_name: 'P2.5 Indoor LED',
      screen_dimensions: '3x2 meter',
      pixel_pitch: '2.5mm',
      module_count: 48,
      config_cols: 6,
      config_rows: 4,
      status: 'p_g_r',
      workorder_notes: 'Redo för plockning. Alla rader i BOM godkända.',
      workorder_title: 'Göteborg kontor lobby',
      workorder_description: 'Lobbyvägg med finpixel',
    },
    {
      order_number: 'ORD-2026-005',
      name: 'Uppsala Universitet auditorium',
      customer_name: 'Uppsala Universitet',
      current_stage: 'montering',
      priority: 'h_g',
      delivery_date: new Date('2026-04-10'),
      delivery_address: 'Universitetsvägen 1, 752 36 Uppsala',
      shipping_company: 'DHL Freight',
      product_name: 'P3.0 Indoor LED',
      screen_dimensions: '6x3.5 meter',
      pixel_pitch: '3.0mm',
      module_count: 140,
      config_cols: 12,
      config_rows: 7,
      status: 'p_g_r',
      workorder_notes: 'Tekniker på plats tisdag. Kundsignering krävs.',
      workorder_title: 'Uppsala Universitet auditorium',
      workorder_description: 'Komplett auditoriumskärm',
    },
    {
      order_number: 'ORD-2026-006',
      name: 'Örebro köpcenter reklam',
      customer_name: 'Fastighets AB Marieberg',
      current_stage: 'leverans',
      priority: 'normal',
      delivery_date: new Date('2026-04-05'),
      delivery_address: 'Marieberg Galleria, 703 69 Örebro',
      shipping_company: 'PostNord',
      product_name: 'P5.0 Outdoor LED',
      screen_dimensions: '4x2.5 meter',
      pixel_pitch: '5.0mm',
      module_count: 80,
      config_cols: 8,
      config_rows: 5,
      status: 'p_g_r',
      workorder_notes: 'POD saknas. Fakturasignal ej skickad.',
      workorder_title: 'Örebro köpcenter reklam',
      workorder_description: 'Utomhusreklamskärm med hög ljusstyrka',
    },
  ];

  const wos = [];
  for (const woData of workOrdersData) {
    const existing = await prisma.workOrder.findFirst({ where: { order_number: woData.order_number } });
    if (existing) {
      wos.push(existing);
    } else {
      const created = await prisma.workOrder.create({
        data: { ...woData, order_id: `order-${woData.order_number}`, createdAt: new Date(), updatedAt: new Date() },
      });
      wos.push(created);
      console.log(`  Created WO: ${woData.order_number} (${woData.current_stage})`);
    }
  }

  // ── 3. WorkOrderRoles ───────────────────────────────────────
  const roleAssignments = [
    { woIndex: 0, role: 'projektledare', userKey: 'projektledare' },
    { woIndex: 0, role: 'konstruktor', userKey: 'konstruktor' },
    { woIndex: 1, role: 'projektledare', userKey: 'projektledare' },
    { woIndex: 1, role: 'produktion', userKey: 'produktion' },
    { woIndex: 2, role: 'projektledare', userKey: 'projektledare' },
    { woIndex: 2, role: 'lager', userKey: 'lager' },
    { woIndex: 3, role: 'projektledare', userKey: 'projektledare' },
    { woIndex: 3, role: 'tekniker', userKey: 'tekniker' },
    { woIndex: 4, role: 'projektledare', userKey: 'projektledare' },
    { woIndex: 4, role: 'saljare', userKey: 'saljare' },
  ];

  for (const ra of roleAssignments) {
    const wo = wos[ra.woIndex];
    const user = usersByWoRole[ra.userKey];
    if (!wo || !user) continue;
    const existing = await prisma.workOrderRole.findUnique({
      where: { work_order_id_role_user_id: { work_order_id: wo.id, role: ra.role, user_id: user.id } },
    });
    if (!existing) {
      await prisma.workOrderRole.create({ data: { work_order_id: wo.id, role: ra.role, user_id: user.id } });
      console.log(`  Assigned ${ra.role} → ${user.full_name} on ${wo.order_number}`);
    }
  }

  // ── 4. PhaseTransitions ─────────────────────────────────────
  for (const wo of wos) {
    const idx = STAGE_ORDER.indexOf(wo.current_stage);
    if (idx <= 0) continue;
    const existing = await prisma.phaseTransition.findFirst({ where: { work_order_id: wo.id } });
    if (existing) continue;
    for (let i = 1; i <= idx; i++) {
      await prisma.phaseTransition.create({
        data: {
          work_order_id: wo.id,
          from_phase: STAGE_ORDER[i - 1],
          to_phase: STAGE_ORDER[i],
          triggered_by: usersByWoRole['projektledare']?.id || 'dev-admin-1',
          trigger_type: 'manual',
          comment: i === 1 ? 'Order granskad och tilldelad' : undefined,
          createdAt: new Date(Date.now() - (idx - i) * 86400000),
        },
      });
    }
    console.log(`  Created ${idx} phase transitions for ${wo.order_number}`);
  }

  // ── 5. ChatMessages ─────────────────────────────────────────
  const chatData = [
    { woIndex: 0, author: 'lars@lagerai.se', name: 'Lars Lindqvist', body: 'Hej! Jag har granskat offerten. Ser bra ut, men vi behöver bekräfta leveransdatumet med kunden.' },
    { woIndex: 0, author: 'anna@lagerai.se', name: 'Anna Karlsson', body: '@Lars Lindqvist Absolut, jag kollar ritningsunderlaget och återkommer innan lunch.' },
    { woIndex: 1, author: 'mikael@lagerai.se', name: 'Mikael Svensson', body: 'Produktionen är igång. IC-chipsen är fördröjda 3 dagar — jag uppdaterade deadline.' },
    { woIndex: 2, author: 'sofia@lagerai.se', name: 'Sofia Johansson', body: 'Alla rader plockade och klara för paketering. Etiketter skrivs ut imorgon bitti.' },
    { woIndex: 3, author: 'erik@lagerai.se', name: 'Erik Andersson', body: 'Installation på tisdag kl 08:00 bekräftad. Kund kontaktad.' },
    { woIndex: 3, author: 'lars@lagerai.se', name: 'Lars Lindqvist', body: '@Erik Andersson Perfekt, kom ihåg att ta med extra strömkablar. 👍', parent: 4 },
    { woIndex: 4, author: 'maria@lagerai.se', name: 'Maria Eriksson', body: 'Fakturan är skickad till Fortnox. Väntar på POD från speditören.' },
  ];

  const messages = [];
  for (const cd of chatData) {
    const wo = wos[cd.woIndex];
    if (!wo) continue;
    const existing = await prisma.chatMessage.findFirst({ where: { work_order_id: wo.id, author_email: cd.author, body: cd.body } });
    if (existing) { messages.push(existing); continue; }
    const msg = await prisma.chatMessage.create({
      data: {
        work_order_id: wo.id,
        author_email: cd.author,
        author_name: cd.name,
        author_role: cd.author.split('@')[0],
        body: cd.body,
        mentions: cd.body.includes('@') ? extractMentions(cd.body) : [],
        reactions: {},
        createdAt: new Date(Date.now() - Math.random() * 7 * 86400000),
      },
    });
    messages.push(msg);
    console.log(`  Chat msg on ${wo.order_number}: ${cd.body.slice(0, 50)}...`);
  }

  // Link replies
  const replyPairs = chatData.filter(cd => cd.parent !== undefined);
  for (const rp of replyPairs) {
    const parentMsg = messages[rp.parent];
    const childIdx = chatData.indexOf(rp);
    const childMsg = messages[childIdx];
    if (parentMsg && childMsg && !childMsg.parent_id) {
      await prisma.chatMessage.update({ where: { id: childMsg.id }, data: { parent_id: parentMsg.id } });
      console.log(`  Linked reply → parent on ${wos[rp.woIndex].order_number}`);
    }
  }

  // ── 6. GateChecklistItems ───────────────────────────────────
  const templates = await prisma.gateChecklistTemplate.findMany();
  for (const wo of wos) {
    const phaseIdx = STAGE_ORDER.indexOf(wo.current_stage);
    for (let i = 0; i <= phaseIdx; i++) {
      const phase = STAGE_ORDER[i];
      const phaseTemplates = templates.filter(t => t.phase === phase);
      for (const t of phaseTemplates) {
        const existing = await prisma.gateChecklistItem.findUnique({
          where: { work_order_id_phase_key: { work_order_id: wo.id, phase: t.phase, key: t.key } },
        });
        if (!existing) {
          await prisma.gateChecklistItem.create({
            data: {
              work_order_id: wo.id,
              phase: t.phase,
              key: t.key,
              label: t.label,
              status: i < phaseIdx ? 'auto_ok' : 'auto_pending',
              severity: t.severity,
              auto_evaluated: t.auto_evaluated,
              completed_at: i < phaseIdx ? new Date() : null,
              completed_by: i < phaseIdx ? usersByWoRole['projektledare']?.id : null,
            },
          });
        }
      }
    }
    console.log(`  Seeded gate items for ${wo.order_number}`);
  }

  console.log('\n✅ Seed complete!');
}

function extractMentions(body) {
  const matches = body.match(/@([\w\s.]+?)(?= |$|@)/g) || [];
  return matches.map(m => m.slice(1).trim().toLowerCase());
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
