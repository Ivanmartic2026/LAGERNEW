# Implementationsplan — Fas 0–2
## ProcessBoard & Arbetsorder — omarbetning
**Dokument:** CRM-SPEC-2026-004  
**Omfattning:** Fas 0 (grund) + Fas 1 (ProcessBoard) + Fas 2 (Order-flikar)  
**Stack:** Vite + React, Express, Prisma, PostgreSQL  
**Status:** Utkast v1.0  

---

## Sammanfattning av nuläge

| Komponent | Nuvarande läge |
|---|---|
| **ProcessBoard** | 5 process-lanes + attention-lane. Saknar Inkorg, gate-progress, watch/favorit, sparade vyer |
| **WorkOrder-detail** | `WorkOrderView.jsx` + `OrderEdit.jsx`. Monolitisk vy med info/material/other-flikar. Inte fas-baserade flikar |
| **Datamodell** | Roller ligger som fält på `WorkOrder`. `stage_statuses` och `checklist` är JSON. `current_stage` har 5 värden (saknar `inkborg`) |
| **Fas-övergångar** | `updateWorkOrderStage.js` har hårdkodade gates (`STAGE_GATES`) men ingen `PhaseTransition`-logg, inga röda flaggor |
| **Aktivitetslogg** | `WorkOrderActivity` finns. Troligt "Invalid Date"-problem i frontend-parsning |
| **Auth** | JWT-cookie + DEV-mode (`dev-token-admin`). `req.user` har `id`, `email`, `role`, `full_name`, `allowed_modules` |
| **API** | `/api/v1/entities/*` (auto-CRUD), `/api/v1/functions/*` (custom), `/api/v1/auth/*` |

---

## Arkitektur-översikt

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Vite + React + React Router + TanStack Query)    │
│  src/                                                       │
│  ├── pages/WorkOrders.jsx           → ProcessBoard-sida     │
│  ├── pages/WorkOrderView.jsx        → Order-detail (byggs om)│
│  ├── components/workorders/                                 │
│  │   ├── ProcessBoard.jsx           → Kanban-board          │
│  │   ├── BoardCard.jsx              → Kort-komponent        │
│  │   ├── BoardFilters.jsx           → Filter & sök          │
│  │   ├── WorkOrderHeader.jsx        → Order-header (fast)   │
│  │   ├── PhaseTabs.jsx              → Flik-rad              │
│  │   ├── tabs/                                              │
│  │   │   ├── OverviewTab.jsx        → Översikt              │
│  │   │   ├── KonstruktionTab.jsx    → Konstruktion          │
│  │   │   ├── ProduktionTab.jsx      → Produktion            │
│  │   │   ├── LagerTab.jsx           → Lager / Plocklista    │
│  │   │   ├── MonteringTab.jsx       → Montering             │
│  │   │   └── LeveransTab.jsx        → Leverans              │
│  │   ├── GateChecklist.jsx          → Gate-checklista       │
│  │   ├── RoleAssignmentBar.jsx      → Roll-rad i header     │
│  │   └── ActivityLogPanel.jsx       → Utfällbar panel       │
│  ├── lib/permissions.js            → Delad permissions      │
│  └── hooks/                                                 │
│      ├── useBoard.js               → TanStack Query         │
│      ├── useWorkOrder.js           → Order-data             │
│      └── useTransition.js          → Fas-flytt              │
├─────────────────────────────────────────────────────────────┤
│  BACKEND (Express + Prisma + PostgreSQL)                    │
│  server/                                                    │
│  ├── prisma/schema.prisma          → Datamodell             │
│  ├── src/                                                   │
│  │   ├── routes/                                            │
│  │   │   ├── entities.js           → Auto-CRUD (befintlig)  │
│  │   │   ├── functions.js          → Custom functions       │
│  │   │   └── board.js              → NY: Board-endpoints    │
│  │   ├── functions/                                         │
│  │   │   ├── updateWorkOrderStage.js  → Uppdatera          │
│  │   │   ├── logWorkOrderActivity.js  → Fixa datum         │
│  │   │   ├── transitionPhase.js       → NY: Gates + logg   │
│  │   │   └── getBoard.js              → NY: Board-data     │
│  │   ├── services/                                          │
│  │   │   ├── gateService.js        → NY: Gate-evaluering   │
│  │   │   └── permissionService.js  → NY: Behörigheter      │
│  │   └── middleware/auth.js        → DEV + JWT             │
│  └── migrations/                                            │
│      └── ...                     → Prisma-migreringar      │
└─────────────────────────────────────────────────────────────┘
```

---

## FAS 0 — Grund & buggfix (1 vecka)

### Mål
- Fixa "Invalid Date"-buggen
- Lägg till nya kolumner på `WorkOrder` (additivt)
- Skapa nya tabeller: `WorkOrderRole`, `SavedBoardView`
- Lägg till `inkorg` i `WorkOrderCurrent_stage`
- Sätt upp feature flag `ENABLE_PROCESS_BOARD`
- Backfill `WorkOrderRole` från befintliga fält

---

### Uppgift F0.1 — Prisma-schema: nya kolumner & tabeller

**Fil:** `server/prisma/schema.prisma`

#### 1a. Uppdatera `WorkOrderCurrent_stage` enum
```prisma
enum WorkOrderCurrent_stage {
  inkorg        // NY
  konstruktion
  produktion
  lager
  montering
  leverans
}
```

> ⚠️ **OBS:** `inkorg` måste läggas till. Prisma enum-additioner är additiva men kräver migrering.

#### 1b. Nya kolumner på `WorkOrder`
Lägg till i slutet av `model WorkOrder` (före sista `}`):

```prisma
  // ── Phase tracking ──
  red_flag_active               Boolean  @default(false)
  red_flag_reasons              String[]
  back_forth_count              Int      @default(0)
  last_phase_changed_at         DateTime?

  // ── Pause / Cancel ──
  paused_at                     DateTime?
  pause_reason                  String?
  cancelled_at                  DateTime?
  cancel_reason                 String?

  // ── Soft delete ──
  deleted_at                    DateTime?

  // ── Relations (nya) ──
  roles                         WorkOrderRole[]
  saved_views                   SavedBoardView[]   // ej direkt relation, men för tydlighet
```

#### 1c. Ny modell: `WorkOrderRole`
```prisma
enum WorkOrderRoleType {
  projektledare
  konstruktor
  produktion
  lager
  tekniker
  saljare
}

model WorkOrderRole {
  id              String           @id @default(uuid())
  createdAt       DateTime         @default(now()) @map("created_date")
  updatedAt       DateTime         @updatedAt @map("updated_date")

  work_order_id   String
  role            WorkOrderRoleType
  user_id         String           // FK till User (mejladress-sträng i nuläget)
  user_name       String?
  assigned_at     DateTime         @default(now())
  assigned_by     String?          // vem som tilldelade

  workOrder       WorkOrder        @relation(fields: [work_order_id], references: [id])

  @@unique([work_order_id, role, user_id])
  @@index([work_order_id, role])
  @@index([user_id, role])
}
```

#### 1d. Ny modell: `SavedBoardView`
```prisma
model SavedBoardView {
  id          String   @id @default(uuid())
  createdAt   DateTime @default(now()) @map("created_date")
  updatedAt   DateTime @updatedAt @map("updated_date")

  user_id     String
  name        String
  filters     Json     // { assignedTo, overdue, priority, customer, etc. }
  is_default  Boolean  @default(false)
}
```

#### 1e. Index på `WorkOrder`
Lägg till i slutet av `model WorkOrder`:
```prisma
  @@index([current_stage])
  @@index([delivery_date])
  @@index([status])
  @@index([deleted_at])
```

---

### Uppgift F0.2 — Generera & kör migrering

```bash
cd server
npx prisma migrate dev --name add_processboard_phase0
npx prisma generate
```

Verifiera:
```bash
npx prisma migrate status
npx prisma db pull --print | grep -E "inkorg|WorkOrderRole|SavedBoardView|red_flag"
```

---

### Uppgift F0.3 — Backfill-skript: `WorkOrderRole`

**Ny fil:** `server/scripts/backfill-roles.js`

Syfte: Migrera befintliga rollfält från `WorkOrder` till `WorkOrderRole`.

```javascript
import { prisma } from '../src/index.js';

const ROLE_FIELDS = [
  { field: 'assigned_to_konstruktion', nameField: 'assigned_to_konstruktion_name', role: 'konstruktor' },
  { field: 'assigned_to_produktion',  nameField: 'assigned_to_produktion_name',  role: 'produktion' },
  { field: 'assigned_to_lager',       nameField: 'assigned_to_lager_name',       role: 'lager' },
  { field: 'assigned_to_montering',   nameField: 'assigned_to_montering_name',   role: 'tekniker' },
  { field: 'assigned_to_leverans',    nameField: 'assigned_to_leverans_name',    role: 'projektledare' }, // eller egen roll?
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
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Kör:
```bash
cd server
node scripts/backfill-roles.js
```

---

### Uppgift F0.4 — Fixa "Invalid Date"-buggen

#### Root cause analys
`WorkOrderActivity` lagrar `createdAt` som `DateTime @default(now())`. Problemet är troligen att frontend tar emot ISO-strängar och parsar felaktigt, eller att vissa poster saknar `createdAt`.

#### Backend: validering & migration
**Fil:** `server/src/functions/logWorkOrderActivity.js`

Lägg till validering i början:
```javascript
// Validera att createdAt blir giltigt
if (req.body.created_at && isNaN(new Date(req.body.created_at))) {
  return res.status(400).json({ error: 'Invalid created_at date format' });
}
```

**Fil:** `server/prisma/schema.prisma` — `WorkOrderActivity`
```prisma
model WorkOrderActivity {
  // ... befintliga fält ...
  createdAt       DateTime  @default(now()) @map("created_date")
  // Se till att createdAt alltid har default
}
```

#### Frontend: säker parsning
**Sök efter:** Alla ställen där `new Date()` används på aktivitetsdata.

Skapa helper:
**Ny fil:** `src/lib/dateUtils.js`
```javascript
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

export function safeParseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function formatActivityDate(dateValue) {
  const date = safeParseDate(dateValue);
  if (!date) return 'Okänt datum';
  const hoursAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 24) {
    return formatDistanceToNow(date, { addSuffix: true, locale: sv });
  }
  return format(date, 'd MMM yyyy HH:mm', { locale: sv });
}
```

Byt ut alla `new Date(activity.createdAt)` i komponenter som visar aktivitetslogg till `safeParseDate()`.

#### Migration av befintliga NULL-poster
```bash
# Kör i psql eller via prisma.$executeRaw
UPDATE "WorkOrderActivity"
SET "created_date" = NOW()
WHERE "created_date" IS NULL;
```

---

### Uppgift F0.5 — Feature flag

**Ny fil:** `src/lib/featureFlags.js`
```javascript
const FLAGS = {
  ENABLE_PROCESS_BOARD: import.meta.env.VITE_ENABLE_PROCESS_BOARD === 'true',
};

export function isEnabled(flag) {
  return FLAGS[flag] ?? false;
}
```

**Fil:** `.env` (frontend root)
```
VITE_ENABLE_PROCESS_BOARD=true
```

Använd i `WorkOrders.jsx`:
```javascript
import { isEnabled } from '@/lib/featureFlags';
// Om false → visa gamla listan som default
```

---

### Uppgift F0.6 — Seed default-sparad vy

**Ny fil:** `server/scripts/seed-default-views.js`
```javascript
import { prisma } from '../src/index.js';

async function seed() {
  // Seed för en admin-användare (anpassa user_id)
  await prisma.savedBoardView.createMany({
    data: [
      { user_id: 'dev-admin-1', name: 'Alla ordrar', filters: { assignedTo: 'all' }, is_default: true },
      { user_id: 'dev-admin-1', name: 'Mina ordrar', filters: { assignedTo: 'me' } },
      { user_id: 'dev-admin-1', name: 'Försenade', filters: { overdue: true } },
    ],
    skipDuplicates: true,
  });
}

seed().finally(() => prisma.$disconnect());
```

---

### Fas 0 — Leveranskriterier (Definition of Done)
- [ ] `npx prisma migrate dev` körs utan fel
- [ ] `WorkOrderRole`-tabellen innehåller minst 1 rad per befintlig roll på WorkOrder
- [ ] `SavedBoardView`-tabellen finns och har seed-data
- [ ] `inkorg` finns i `WorkOrderCurrent_stage`-enum
- [ ] Ingen "Invalid Date" visas i aktivitetslogg (manuell test)
- [ ] `deleted_at` finns på `WorkOrder`
- [ ] Feature flag kan toggla mellan gammal och ny vy

---

## FAS 1 — ProcessBoard MVP (2–3 veckor)

### Mål
- Lägg till **Inkorg-kolumn** före Konstruktion
- Förbättra kortdesign med gate-progress, pendling, watch
- Implementera filter & sök
- Sparade vyer
- Uppdaterad backend för board-data

---

### Uppgift F1.1 — Backend: `getBoard` endpoint

**Ny fil:** `server/src/functions/getBoard.js`

```javascript
import { prisma } from '../index.js';

export async function getBoard(req, res, next) {
  try {
    const user = req.user;
    const { assignedTo = 'all', overdue, priority, customer, search, savedViewId } = req.body;

    // Bygg WHERE-clause
    const where = {
      deleted_at: null,
      status: { notIn: ['klar', 'avbruten'] }, // ej avslutade
    };

    // Sökfilter
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        { customer_name: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (customer) where.customer_name = { contains: customer, mode: 'insensitive' };
    if (priority) where.priority = priority;
    if (overdue === true) {
      where.delivery_date = { lt: new Date() };
      where.status = { not: 'klar' };
    }

    // "Mina ordrar" — filtrera på WorkOrderRole
    if (assignedTo === 'me' && user?.id) {
      where.roles = {
        some: { user_id: user.id }
      };
    }

    // Hämta ordrar med roller
    const orders = await prisma.workOrder.findMany({
      where,
      include: {
        roles: true,
        _count: { select: { materials: true } }
      },
      orderBy: { delivery_date: 'asc' },
    });

    // Gruppera per fas
    const columns = {
      inkorg: [],
      konstruktion: [],
      produktion: [],
      lager: [],
      montering: [],
      leverans: [],
    };

    const now = new Date();
    const enriched = orders.map((wo) => {
      const isOverdue = wo.delivery_date && wo.delivery_date < now && wo.status !== 'klar';
      const daysOverdue = isOverdue ? Math.floor((now - wo.delivery_date) / (1000 * 60 * 60 * 24)) : null;
      const currentRole = wo.roles.find(r => {
        const stageRoleMap = { konstruktion: 'konstruktor', produktion: 'produktion', lager: 'lager', montering: 'tekniker', leverans: 'projektledare' };
        return stageRoleMap[wo.current_stage] === r.role;
      });

      return {
        id: wo.id,
        orderNumber: wo.order_number,
        customerName: wo.customer_name,
        name: wo.name,
        deliveryDate: wo.delivery_date,
        isOverdue,
        daysOverdue,
        priority: wo.priority,
        phase: wo.current_stage,
        status: wo.status,
        redFlagActive: wo.red_flag_active,
        backForthCount: wo.back_forth_count,
        isPendling: wo.back_forth_count > 2,
        currentResponsible: currentRole ? { role: currentRole.role, userId: currentRole.user_id, userName: currentRole.user_name } : null,
        gateProgress: { completed: 0, total: 0 }, // Fas 3
        materialsTotal: wo.materials_total_count,
        materialsReady: wo.materials_ready_count,
        materialsMissing: wo.materials_missing_count,
      };
    });

    for (const wo of enriched) {
      if (columns[wo.phase]) columns[wo.phase].push(wo);
    }

    const totals = {
      all: enriched.length,
      overdue: enriched.filter(o => o.isOverdue).length,
    };

    return res.json({ success: true, columns, totals });
  } catch (err) {
    next(err);
  }
}
```

Registrera i `server/src/routes/functions.js`:
```javascript
import { getBoard } from '../functions/getBoard.js';
const handlers = {
  // ... befintliga
  getBoard,
};
```

---

### Uppgift F1.2 — Frontend: uppdatera `ProcessBoard.jsx`

#### 2a. Lägg till Inkorg-kolumn
I `PROCESS_LANES`-arrayen, lägg till först:
```javascript
{
  key: 'inkorg',
  label: 'Inkorg',
  shortLabel: 'Inkorg',
  icon: Inbox,
  accent: 'slate',
  bg: 'bg-slate-500/10',
  border: 'border-slate-500/20',
  text: 'text-slate-400',
  headerBg: 'bg-[#1f1f1f]',
  headerBorder: 'border-[#3f3f3f]',
  getOwner: () => null,
  getRoleLabel: () => 'projektledare',
  getAction: () => 'Tilldela projektledare',
}
```

> Importera `Inbox` från `lucide-react`.

#### 2b. Uppdatera kortdesign
- Lägg till `gateProgress` prop (visas som liten progressbar)
- Lägg till `isPendling` → visar "🔄 Pendling" badge
- Lägg till `isWatched` → stjärna (placeholder för favorit-funktion)
- Leveransort + speditör från `delivery_address` / `shipping_company`

#### 2c. Filter & sök
**Ny fil:** `src/components/workorders/BoardFilters.jsx`

Komponenter:
- Sökfält (orderNr, kundnamn)
- Toggle: "Mina ordrar" / "Alla ordrar"
- Chips: "🔴 Försenade", "⏰ Denna vecka", "⭐ Mina favoriter"
- Dropdown: Per kund, Per prioritet

---

### Uppgift F1.3 — Frontend: `useBoard` hook

**Ny fil:** `src/hooks/useBoard.js`
```javascript
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useBoard(filters = {}) {
  return useQuery({
    queryKey: ['board', filters],
    queryFn: async () => {
      const res = await base44.functions.invoke('getBoard', filters);
      return res;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
```

---

### Uppgift F1.4 — Sparade vyer

**Backend — ny funktion:** `server/src/functions/saveBoardView.js`
```javascript
export async function saveBoardView(req, res, next) {
  const { name, filters, is_default } = req.body;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Auth required' });

  if (is_default) {
    // Avaktivera tidigare default
    await prisma.savedBoardView.updateMany({
      where: { user_id: userId, is_default: true },
      data: { is_default: false },
    });
  }

  const view = await prisma.savedBoardView.create({
    data: { user_id: userId, name, filters, is_default: is_default || false },
  });
  return res.json({ success: true, view });
}
```

**Frontend:** Lägg till spara-vy-knapp i `BoardFilters.jsx`. Sparade vyer visas som tabbar överst på boarden.

---

### Fas 1 — Leveranskriterier
- [ ] Inkorg-kolumn syns och visar ordrar med `current_stage = 'inkorg'`
- [ ] Kort visar gate-progress (placeholder OK), pendling-badge, deadline
- [ ] Filter "Mina ordrar" fungerar (filtrerar på `WorkOrderRole`)
- [ ] Sök på ordernr/kundnamn fungerar
- [ ] Sparade vyer kan skapas och laddas
- [ ] Board uppdateras automatiskt var 30e sekund
- [ ] Mobil: kolumn-i-taget med swipe (om möjligt, annars scroll)

---

## FAS 2 — Arbetsorder-flikar (3–4 veckor)

### Mål
- Bygg om `WorkOrderView.jsx` till flikbaserad vy
- Header med roll-rad (alla roller synliga)
- 6 flikar: Översikt, Konstruktion, Produktion, Lager, Montering, Leverans
- Varje flik har: Ansvarig, Gate-checklista (placeholder), fas-specifikt innehåll, dialog
- Aktivitetslogg som utfällbar panel

---

### Uppgift F2.1 — Refaktorera `WorkOrderView.jsx` — Header + flikar

#### Aktuell struktur
`WorkOrderView.jsx` (541 rader) har:
- ProcessFlow (fas-steg)
- StageContent (fas-specifikt)
- Olika sektioner (Material, Dialog, etc.)

#### Ny struktur
```
WorkOrderView.jsx
├── WorkOrderHeader        (fast, alltid synlig)
│   ├── Ordernr + kund + status
│   ├── Deadline
│   ├── RoleAssignmentBar  (alla 6 roller)
│   └── Snabbåtgärder (PDF, Pausa, etc.)
├── PhaseTabs              (flik-rad)
│   ├── OverviewTab        (Översikt)
│   ├── KonstruktionTab
│   ├── ProduktionTab
│   ├── LagerTab
│   ├── MonteringTab
│   └── LeveransTab
└── ActivityLogPanel       (utfällbar från höger)
```

#### 2.1a `WorkOrderHeader.jsx`
**Ny fil:** `src/components/workorders/WorkOrderHeader.jsx`

```jsx
function RoleAssignmentBar({ workOrderId, roles }) {
  const ROLE_CONFIG = [
    { key: 'projektledare', label: 'PL', color: 'bg-blue-500' },
    { key: 'konstruktor', label: 'K', color: 'bg-sky-500' },
    { key: 'produktion', label: 'P', color: 'bg-indigo-500' },
    { key: 'lager', label: 'L', color: 'bg-amber-500' },
    { key: 'tekniker', label: 'T', color: 'bg-purple-500' },
    { key: 'saljare', label: 'S', color: 'bg-emerald-500' },
  ];

  return (
    <div className="flex items-center gap-2">
      {ROLE_CONFIG.map((cfg) => {
        const assigned = roles.find(r => r.role === cfg.key);
        return (
          <div key={cfg.key} className="flex items-center gap-1.5">
            {assigned ? (
              <div className={`w-7 h-7 rounded-full ${cfg.color} flex items-center justify-center text-white text-xs font-bold`}
                   title={`${cfg.key}: ${assigned.user_name || assigned.user_id}`}>
                {assigned.user_name?.slice(0,2).toUpperCase() || cfg.label}
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 text-xs cursor-pointer hover:border-white/40"
                   title={`${cfg.key}: ej tilldelad`}>
                +
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

#### 2.1b `PhaseTabs.jsx`
**Ny fil:** `src/components/workorders/PhaseTabs.jsx`

Använder `Tabs` från shadcn/ui. Flikar:
```javascript
const TABS = [
  { key: 'overview', label: 'Översikt', icon: LayoutDashboard },
  { key: 'konstruktion', label: 'Konstruktion', icon: Pencil },
  { key: 'produktion', label: 'Produktion', icon: Factory },
  { key: 'lager', label: 'Lager', icon: Package },
  { key: 'montering', label: 'Montering', icon: Wrench },
  { key: 'leverans', label: 'Leverans', icon: Truck },
];
```

> URL: `/WorkOrders/:id/:tab?` — sticky tab sparas i localStorage per order.

---

### Uppgift F2.2 — Bygg varje flik-komponent

#### `OverviewTab.jsx`
**Ny fil:** `src/components/workorders/tabs/OverviewTab.jsx`

Innehåll:
- Kundinformation (kundnamn, leveransadress, kontakt)
- Mini-status per fas (6 rader)
  - Ansvarig per fas
  - % klart (placeholder tills gates finns)
  - Eventuella röda flaggor
- Senaste 3 aktiviteter (från aktivitetslogg)
- Senaste 3 kommentarer (globala)
- Snabbgenvägar: PDF, Kommentar

Read-only förutom kommentar.

#### `KonstruktionTab.jsx`
**Ny fil:** `src/components/workorders/tabs/KonstruktionTab.jsx`

Innehåll (top-down):
1. **Ansvarig** — visar tilldelad konstruktör eller "Ta denna uppgift"-knapp
2. **Gate-checklista** (placeholder för Fas 3)
3. **Konstruktionsanteckningar** — fritext, auto-save
4. **Ritningar** — filuppladdning med kategori `ritning`
5. **BOM / Stycklista** — tabell med artikelnr, beskrivning, antal, status
6. **Teknisk info** — strukturerade fält (processor, controller, etc.)
7. **Uppgifter** — checkbox-lista
8. **Filer** — generell filuppladdning
9. **Dialog (Konstruktion)** — kommentarer märkta `phaseTag: 'konstruktion'`
10. **Frigör-knapp** — "✓ Frigör till Produktion"

#### `ProduktionTab.jsx`
**Ny fil:** `src/components/workorders/tabs/ProduktionTab.jsx`

Innehåll:
1. Ansvarig
2. Gate-checklista (placeholder)
3. Produktionsplan (read-only från Konstruktion)
4. Konfigurationsanteckningar (fritext)
5. Testresultat — checklista med checkboxes
6. Produktionsuppgifter
7. Filer (bilder på konfigurerad enhet)
8. Dialog (Produktion)
9. Frigör-knapp — "✓ Frigör till Lager"

#### `LagerTab.jsx`
**Ny fil:** `src/components/workorders/tabs/LagerTab.jsx`

Innehåll (mobile-first design):
1. Ansvarig
2. Gate-checklista (placeholder)
3. **Plocklista** — central komponent
   - Lista/kort av alla `WorkOrderMaterial`-rader
   - Stor checkbox per rad (44x44px touch-target)
   - Artikelnamn, antal, lagerplats
   - Status: Ej plockat (orange) / Plockat (grön) / Saknas (röd)
   - Tap för att expandera (foto, detaljer)
4. Material & Inköp — status på saknade artiklar
5. Paketering — checklista
6. Dialog (Lager)
7. Frigör-knapp — "✓ Markera plock klart"

> Plocklista använder befintlig `WorkOrderMaterial` med `quantity_picked`, `picked_by`, `picked_at`.

#### `MonteringTab.jsx`
**Ny fil:** `src/components/workorders/tabs/MonteringTab.jsx`

Innehåll:
1. Ansvarig (tekniker)
2. Gate-checklista (placeholder)
3. Installationsöversikt — leveransadress, karta-länk, kontakt
4. Installationschecklista — mall-baserad
5. Testprotokoll — strukturerade fält
6. Kvalitetsrapport — bilder + kommentarer
7. Tidrapport — start/slut
8. Filer (installationsbilder)
9. Kundsignering — digital signatur (placeholder för Fas 5)
10. Dialog (Montering)
11. Frigör-knapp — "✓ Skicka till Leveransbekräftelse"

#### `LeveransTab.jsx`
**Ny fil:** `src/components/workorders/tabs/LeveransTab.jsx`

Innehåll:
1. Ansvarig (projektledare)
2. Gate-checklista (placeholder)
3. Leveransbekräftelse (POD) — filuppladdning
4. Fakturasignal — knapp "✓ Klar att fakturera" (triggar Fortnox-synk)
5. Slutdokumentation — paket till kund
6. Eftermarknadsanteckningar
7. Dialog (Leverans)
8. Stäng-knapp — "✓ Stäng order"

---

### Uppgift F2.3 — Kommentarer med fas-taggning

#### Backend: uppdatera `logWorkOrderActivity` eller skapa separat comment-endpoint

Befintlig `WorkOrderActivity` kan användas för kommentarer med `type: 'comment'`. Lägg till `phase_tag`:

**Fil:** `server/prisma/schema.prisma` — `WorkOrderActivity`
```prisma
  phase_tag     String?   // 'konstruktion', 'produktion', etc. eller null för global
```

> Kräver ny migrering.

**Uppdatera** `logWorkOrderActivity.js`:
```javascript
const { work_order_id, message, type = 'comment', phase_tag } = req.body;
// ...
const activity = await prisma.workOrderActivity.create({
  data: {
    work_order_id,
    type,
    message,
    phase_tag: phase_tag || null,
    actor_email: user.email,
    actor_name: user.full_name || user.email,
    // ...
  }
});
```

#### Frontend: fas-filtrerad dialog
Varje flik hämtar kommentarer med `phase_tag`:
```javascript
const { data: comments } = useQuery({
  queryKey: ['comments', workOrderId, phaseTag],
  queryFn: () => base44.entities.list('WorkOrderActivity', {
    work_order_id: workOrderId,
    type: 'comment',
    phase_tag: phaseTag || null,
    __order_by: '-created_date',
  }),
});
```

---

### Uppgift F2.4 — Aktivitetslogg-panel

**Ny fil:** `src/components/workorders/ActivityLogPanel.jsx`

Utfällbar panel (Sheet från shadcn/ui) från höger:
- Kronologisk lista över `WorkOrderActivity` med `type != 'comment'`
- Filter: per användare, per typ, per fas, per datum
- Export-knapp (placeholder för Fas 6)

```jsx
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="right" className="w-[400px] sm:w-[540px]">
    <SheetHeader>
      <SheetTitle>Aktivitetslogg</SheetTitle>
    </SheetHeader>
    <div className="space-y-3 mt-4">
      {activities.map((a) => (
        <div key={a.id} className="text-sm border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-white/60">{a.actor_name}</span>
            <span className="text-white/30 text-xs">{formatActivityDate(a.createdAt)}</span>
          </div>
          <p className="text-white/80 mt-0.5">{a.message}</p>
        </div>
      ))}
    </div>
  </SheetContent>
</Sheet>
```

---

### Uppgift F2.5 — Routing för flikar

**Fil:** `src/App.jsx`

Lägg till routes:
```jsx
<Route path="/WorkOrders/:id" element={<WorkOrderViewPage />} />
<Route path="/WorkOrders/:id/:tab" element={<WorkOrderViewPage />} />
```

**Fil:** `src/pages/WorkOrderView.jsx`

```javascript
import { useParams, useNavigate } from 'react-router-dom';

export default function WorkOrderView() {
  const { id, tab } = useParams();
  const navigate = useNavigate();

  // Sticky tab per order
  const storageKey = `wo-tab-${id}`;
  const defaultTab = tab || localStorage.getItem(storageKey) || 'overview';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    localStorage.setItem(storageKey, newTab);
    navigate(`/WorkOrders/${id}/${newTab}`, { replace: true });
  };

  // ...
}
```

---

### Uppgift F2.6 — Backend: hämta order med roller

**Uppdatera** `server/src/routes/entities.js` eller skapa custom endpoint:

Använd befintlig `GET /api/v1/entities/WorkOrder/:id` men se till att `__include=roles` fungerar.

Eller bättre: uppdatera auto-CRUD i `entities.js` att stödja relationer:
```javascript
// I entities.js GET by ID
const include = {};
if (req.query.__include === 'roles') {
  include.roles = true;
}
const item = await model.findUnique({ where: { id }, include });
```

> ⚠️ Nuvarande `entities.js` stödjer troligen inte `include`. Behöver utökas.

---

### Fas 2 — Leveranskriterier
- [ ] Header visar ordernr, kund, deadline, alla 6 roller som avatarer
- [ ] 6 flikar renderas korrekt (Översikt + 5 faser)
- [ ] URL uppdateras vid flikbyte (`/WorkOrders/:id/:tab`)
- [ ] Sticky tab fungerar (localStorage per order)
- [ ] Översikt visar kundinfo, mini-status per fas, senaste aktivitet/dialog
- [ ] Konstruktion-flik har anteckningar, ritningar, BOM, teknisk info, uppgifter
- [ ] Lager-flik visar plocklista med checkboxes, stora touch-targets
- [ ] Montering-flik har installationschecklista, testprotokoll, kvalitetsrapport
- [ ] Leverans-flik har POD, fakturasignal, stäng-knapp
- [ ] Dialog är fas-filtrerad (kommentarer märkta per fas)
- [ ] Aktivitetslogg-panel öppnas från header, visar kronologisk logg
- [ ] Ingen regression i befintlig funktionalitet

---

## Fil-katalog — alla filer som skapas/modifieras

### Nya filer
```
server/scripts/backfill-roles.js
server/scripts/seed-default-views.js
server/src/functions/getBoard.js
server/src/functions/saveBoardView.js
server/src/functions/transitionPhase.js
server/src/services/gateService.js
server/src/services/permissionService.js
server/src/lib/dateUtils.js          (backend date helpers)

src/lib/dateUtils.js
src/lib/featureFlags.js
src/lib/permissions.js

src/hooks/useBoard.js
src/hooks/useWorkOrder.js
src/hooks/useTransition.js

src/components/workorders/BoardFilters.jsx
src/components/workorders/BoardCard.jsx
src/components/workorders/WorkOrderHeader.jsx
src/components/workorders/PhaseTabs.jsx
src/components/workorders/GateChecklist.jsx
src/components/workorders/RoleAssignmentBar.jsx
src/components/workorders/ActivityLogPanel.jsx

src/components/workorders/tabs/OverviewTab.jsx
src/components/workorders/tabs/KonstruktionTab.jsx
src/components/workorders/tabs/ProduktionTab.jsx
src/components/workorders/tabs/LagerTab.jsx
src/components/workorders/tabs/MonteringTab.jsx
src/components/workorders/tabs/LeveransTab.jsx
```

### Modifierade filer
```
server/prisma/schema.prisma
server/src/routes/functions.js
server/src/routes/entities.js          (include-support)
server/src/functions/logWorkOrderActivity.js
server/src/functions/updateWorkOrderStage.js
server/src/middleware/auth.js          (om behörigheter läggs till)

src/App.jsx                            (nya routes)
src/pages/WorkOrders.jsx               (ProcessBoard-integration)
src/pages/WorkOrderView.jsx            (ombyggnad till flikar)
src/components/workorders/ProcessBoard.jsx

.env                                 (feature flag)
```

---

## Beroendegraf

```
F0.1 Schema-migrering
  → F0.2 Generera Prisma-client
    → F0.3 Backfill roller
    → F0.4 Fixa Invalid Date
    → F0.5 Feature flag
      → F1.1 getBoard endpoint
        → F1.2 Uppdatera ProcessBoard
        → F1.3 useBoard hook
        → F1.4 Sparade vyer
          → F2.1 WorkOrderView refaktorering
            → F2.2 Alla flik-komponenter
            → F2.3 Kommentarer med phase_tag
            → F2.4 Aktivitetslogg-panel
            → F2.5 Routing
              → F2.6 Backend include-support
```

---

## Risker & mitigering

| Risk | Sannolikhet | Mitigering |
|---|---|---|
| Prisma enum-migrering krånglar | Medel | Testa i staging först, använd `prisma migrate dev` |
| Backfill-skript missar roller | Låg | Kör med `--dry-run` först, verifiera räkning |
| OrderEdit.jsx och WorkOrderView.jsx divergerar | Medel | Gör Fas 2 stegvis — behåll OrderEdit orörd tills WorkOrderView är klar |
| Frontend bundle blir för stor | Låg | Lazy-loada flik-komponenter med `React.lazy()` |
| TanStack Query cachning blir för aggressiv | Låg | Sätt `staleTime` explicit, invalidera vid mutationer |

---

## Nästa steg — vad vill du att jag börjar med?

Alternativ:

**A. Kör Fas 0 från början till slut** — schema-migrering, backfill, bugfix, feature flag. Leverans: stabil grund att bygga på.

**B. Hoppa direkt till F1.2** — Uppdatera ProcessBoard med Inkorg + förbättrade kort (förutsätter att F0.1 schema redan är på plats).

**C. Börja med F2.1** — Bygg om WorkOrderView med header + flikar (förutsätter att WorkOrderRole finns).

Jag rekommenderar **A** — utan stabil grund blir allt annat svårare. Men om du vill se snabb visuell progress kan vi köra **A + B parallellt** (schema + ProcessBoard samtidigt).
