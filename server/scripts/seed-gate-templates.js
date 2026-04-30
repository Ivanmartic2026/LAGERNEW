import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TEMPLATES = [
  // Konstruktion → Produktion
  { phase: 'konstruktion', key: 'konstruktion.ritning_uppladdad', label: 'Ritning uppladdad', severity: 'soft', auto_evaluated: true, sort_order: 1 },
  { phase: 'konstruktion', key: 'konstruktion.bom_komplett', label: 'BOM ifylld med minst 1 rad', severity: 'soft', auto_evaluated: true, sort_order: 2 },
  { phase: 'konstruktion', key: 'konstruktion.anteckningar_ifyllda', label: 'Konstruktionsanteckningar ifyllda', severity: 'soft', auto_evaluated: true, sort_order: 3 },
  { phase: 'konstruktion', key: 'konstruktion.strom_klar', label: 'Strömberäkning klar', severity: 'soft', auto_evaluated: false, sort_order: 4 },

  // Produktion → Lager
  { phase: 'produktion', key: 'produktion.testresultat_godkanda', label: 'Testresultat godkända', severity: 'soft', auto_evaluated: false, sort_order: 1 },
  { phase: 'produktion', key: 'produktion.konfig_anteckningar', label: 'Konfigurationsanteckningar ifyllda', severity: 'soft', auto_evaluated: true, sort_order: 2 },
  { phase: 'produktion', key: 'produktion.bild_konfigurerad', label: 'Bild på konfigurerad enhet', severity: 'soft', auto_evaluated: true, sort_order: 3 },

  // Lager → Montering (hard gates, auto-evaluated)
  { phase: 'lager', key: 'lager.alla_rader_hanterade', label: 'Alla BOM-rader plockade eller markerade saknas', severity: 'hard', auto_evaluated: true, sort_order: 1 },
  { phase: 'lager', key: 'lager.paketering_klar', label: 'Paketeringschecklistan klar', severity: 'hard', auto_evaluated: false, sort_order: 2 },
  { phase: 'lager', key: 'lager.etikett_tryckt', label: 'Etikett tryckt', severity: 'hard', auto_evaluated: false, sort_order: 3 },

  // Montering → Leverans
  { phase: 'montering', key: 'montering.checklista_klar', label: 'Installationschecklistan 100% klar', severity: 'soft', auto_evaluated: true, sort_order: 1 },
  { phase: 'montering', key: 'montering.testprotokoll', label: 'Testprotokoll uppladdat', severity: 'soft', auto_evaluated: true, sort_order: 2 },
  { phase: 'montering', key: 'montering.kvalitetsrapport', label: 'Kvalitetsrapport uppladdad', severity: 'soft', auto_evaluated: true, sort_order: 3 },
  { phase: 'montering', key: 'montering.bilder_minst_3', label: 'Minst 3 bilder från installationen', severity: 'soft', auto_evaluated: true, sort_order: 4 },
  { phase: 'montering', key: 'montering.kundsignering', label: 'Kundsignering inhämtad', severity: 'soft', auto_evaluated: false, sort_order: 5 },

  // Leverans → Avslutad
  { phase: 'leverans', key: 'leverans.pod_uppladdad', label: 'POD uppladdad', severity: 'soft', auto_evaluated: true, sort_order: 1 },
  { phase: 'leverans', key: 'leverans.fakturasignal_skickad', label: 'Fakturasignal skickad till Fortnox', severity: 'soft', auto_evaluated: false, sort_order: 2 },
  { phase: 'leverans', key: 'leverans.slutdok_skickad', label: 'Slutdokumentation skickad till kund', severity: 'soft', auto_evaluated: false, sort_order: 3 },
];

async function seed() {
  let created = 0;
  for (const t of TEMPLATES) {
    await prisma.gateChecklistTemplate.upsert({
      where: { phase_key: { phase: t.phase, key: t.key } },
      update: {},
      create: t,
    });
    created++;
  }
  console.log(`Seeded ${created} gate checklist templates`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
