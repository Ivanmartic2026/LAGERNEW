# Lager IM — Full UX Audit

> Genomförd: 2026-04-30  
> Scope: Hela applikationen (frontend + arbetsflöden)  
> Metod: Granskning av kod, komponenter, sidor och användarflöden

---

## Sammanfattning: Topp 10 problem

| # | Problem | Allvarlighet | Drabbar |
|---|---------|-------------|---------|
| 1 | **Ingen global sökning** — användare måste navigera till rätt sida först | 🔴 Kritisk | Alla |
| 2 | **Action overload** — 10+ knappar per rad på ordrar, inköp, lager | 🔴 Kritisk | Alla |
| 3 | **Monolitiska formulär** — OrderEdit har 30+ fält på en sida | 🔴 Kritisk | Sälj, konstruktör |
| 4 | **Ingen enhetlig dashboard** — Home.jsx är bara 3 widgets staplade | 🟡 Hög | Alla |
| 5 | **Tabeller på mobil** — horisontell scroll, små touchytor | 🟡 Hög | Lager, tekniker |
| 6 | **Ingen progressiv avslöjande** — allt visas alltid, oavsett status | 🟡 Hög | Alla |
| 7 | **Oenhetlig statusvisualisering** — olika färger/badges på olika sidor | 🟡 Hög | Alla |
| 8 | **Saknade tomma tillstånd** — blanka sidor utan vägledning | 🟢 Medel | Nya användare |
| 9 | **Inga tangentbordsgenvägar** — allt kräver mus/pekare | 🟢 Medel | Power users |
| 10 | **Laddning utan kontext** — spinners istället för skeletons | 🟢 Medel | Alla |

---

## 1. Navigation & Informationsarkitektur

### 1.1 Ingen global sökning (Kritisk)

**Nu:** Användare måste först gå till rätt sida (Ordrar, Lager, Batcher…) och sedan söka där.  
**Problem:** Med 1 885 poster fördelade på 46 entiteter är det omöjligt att hitta något snabbt.

**Förslag:** Implementera `Cmd+K` / `Ctrl+K` universal search (som Slack, Notion, GitHub):
- Sök i: Artiklar, Ordrar, Arbetsordrar, Kunder, Batcher, Inköpsordrar
- Visa resultat grupperat med ikoner och status
- Gå direkt till detaljvyn med Enter
- **Effort:** Medium. Kan byggas med `cmdk` (redan i projektets dependencies).

### 1.2 Home-sidan är meningslös

**Nu:** `Home.jsx` visar bara `RecentActivityWidget` + `MyTasksDashboard` + `PODashboard` staplat.  
**Problem:** Ingen får en överblick över vad som kräver deras uppmärksamhet just nu.

**Förslag:** Bygg en riktig **"Min dag"-dashboard** per roll:
- **Lager:** Utleveranser idag, lågt lager, godkännanden väntar
- **Sälj:** Ordrar utan offert, försenade leveranser, obetalda fakturor
- **Tekniker:** Kommande installationer, reparationer väntar på delar
- **Inköpare:** POs utan leveransdatum, försenade leveranser

### 1.3 Rollbaserad navigering är för fragmenterad

**Nu:** 7 olika `/home/{roll}`-sidor + en generisk Home. Vissa moduler döljs baserat på `allowed_modules`.  
**Problem:** Användare som har flera roller (t.ex. både tekniker och lager) får inte se allt de behöver.

**Förslag:** Ersätt rollbaserade startsidor med en **unifierad dashboard** där widgets visas baserat på användarens roller och behörigheter. En användare kan se både "Mina arbetsordrar" och "Lageruttag" på samma sida.

---

## 2. Listvyer & Datatäthet

### 2.1 Action overload på listor (Kritisk)

**Nu:** Orders.jsx visar upp till 10+ action-knappar per order-rad. PurchaseOrders.jsx har lika många.  
**Problem:** Cognitive overload — användare ser inte vilken åtgärd som är primär. Små touchytor på mobil.

**Förslag:** Progressiv avslöjande:
```
Primäråtgärd (alltid synlig)  [Öppna]
Sekundära (i ⋮-meny)          [Exportera, Skriv ut, Skapa WO, …]
Kontextberoende               Visa bara relevanta åtgärder baserat på status
```

### 2.2 Tabeller på mobil är obrukbara

**Nu:** Inventory.jsx växlar mellan bord och kort, men Orders.jsx och PurchaseOrders.jsx har fortfarande kompakta kort med för mycket text på mobil.  
**Problem:** Lagerpersonal på golvet med telefonen i handen kan inte läsa eller trycka på knapparna.

**Förslag:** Alla listor på mobil ska använda **full-width cards** med:
- Stor rubrik och tydlig status-badge
- Max 3 metadata-rader (övrigt i expanderat läge)
- En primär CTA-knapp och en "Mer"-knapp
- Swipe-gester för snabbåtgärder (t.ex. swipe höger = "Öppna")

### 2.3 Filter och sortering är inkonsekventa

**Nu:** Vissa sidor har filter i sidopanel, andra i toppen. Sortering finns på vissa ställen men inte alla.  
**Problem:** Användare måste lära om mönstret på varje sida.

**Förslag:** Standardisera ett filter/sort-mönster:
```
[Global sök]  [Filter ▼]  [Sortera ▼]  [+ Ny]
```
Filter sparas i URL (`?status=draft&sort=date_desc`) så att man kan dela länkar.

---

## 3. Formulär & Datainmatning

### 3.1 OrderEdit — monolitiskt monster (Kritisk)

**Nu:** `OrderEdit.jsx` har ~30 fält på EN sida. Alla fält är lika synliga och viktiga.  
**Problem:** Kognitiv överbelastning. Säljare skrollar i evigheter. Risk att missa obligatoriska fält.

**Förslag:** Dela upp i **stegvisa sektioner** med tabs eller accordion:
```
[ Kundinfo ] [ Leverans ] [ Material ] [ Ekonomi ] [ Bilagor ]
```
- Validér varje sektion innan nästa
- Obligatoriska fält markeras tydligt (röd asterisk + felmeddelande)
- Spara utkast automatiskt (localStorage) så inget försvinner

### 3.2 Fortnox-fält är störande för icke-ekonomi-användare

**Nu:** Fält som `fortnox_project_number`, `fortnox_po_id`, `fortnox_document_number` visas för alla roller.  
**Problem:** Säljare och tekniker bryr sig inte om Fortnox-nummer. Det skapar brus.

**Förslag:** Dölj Fortnox-fält som standard. Visa dem endast:
- Om användaren har rollen `admin` eller `inkopare`
- Eller om fälten redan har värden (dvs. redan synkade)
- Med en tydlig "Fortnox-sektion" som kan kollapsas

### 3.3 Ingen fältvalidering i realtid

**Nu:** Formulär verkar validera först vid submit (eller inte alls).  
**Problem:** Användaren får reda på att något är fel först efter att de tryckt "Spara".

**Förslag:** Inline-validering:
- Röd border + felmeddelande direkt när man lämnar ett obligatoriskt fält tomt
- Datumvalidering (t.ex. leveransdatum kan inte vara i det förflutna)
- Numerisk validering (t.ex. antal > 0)

---

## 4. Detaljsidor

### 4.1 OrderDetail & WorkOrderView — vägg av information

**Nu:** Detaljsidor visar all information samtidigt: metadata, aktivitetsflöde, material, checklistor, filer.  
**Problem:** Användaren ser 5 skärmars information på en sida. Scrollar i evigheter.

**Förslag:** **Sticky tab-navigering** på detaljsidor:
```
[ Översikt ] [ Material ] [ Aktivitet ] [ Filer ] [ Checklista ]
```
- "Översikt" visar bara det viktigaste (kund, status, deadline)
- Övrigt i tabbar som laddas lazy

### 4.2 Work Order-steg-förflyttning är otydlig

**Nu:** `updateWorkOrderStage` har validering (korrekt ordning, gates), men i UI:t visas detta som en rad av små cirklar.  
**Problem:** Användaren förstår inte vad som krävs för att gå vidare.

**Förslag:** Tydlig stegindikator:
```
Konstruktion  →  Produktion  →  Lager  →  Montering  →  Leverans
   [✅]            [▶️]          [⬜]       [⬜]          [⬜]
```
- Aktuellt steg markeras tydligt
- Blockerade steg visas med en 🔒-ikon + tooltip: "Kräver: plockat"
- Nästa steg-knappen är tydlig och stor

---

## 5. Mobilupplevelse

### 5.1 Lagerpersonalen har den sämsta upplevelsen

**Nu:** Lagerpersonalen behöver:
- Se vad som ska plockas (plocklistor)
- Scanna artiklar vid in/ut-leverans
- Flytta artiklar mellan hyllor
- Allt detta görs på en telefon med mörkt tema i ett upplyst lager

**Problem:**
- Mörkt tema har låg kontrast i starkt ljus
- Små knappar är svåra att träffa med handskar
- Tabeller är obrukbara
- Plocklistor visas som vanliga listor, inte som uppgiftslistor att bocka av

**Förslag:** Bygg en **dedikerad Lager-PWA-vy**:
- Ljust tema (ljus bakgrund, mörk text) för lagerarbete
- Stora bockrutor för plockning
- Streckkodsscanning i fokus
- Offline-stöd för plockning (synka när tillbaka på wifi)
- Haptisk feedback (vibration vid scan/beroende på plattform)

### 5.2 Tekniker på fältet

**Nu:** Tekniker använder SiteReports och arbetsordrar. Ute på fältet är mobilen primär.  
**Problem:** Formulär för site reports kräver mycket textinmatning på telefon.

**Förslag:**
- Snabbvalsknappar för vanliga observationer ("Allt OK", "Behöver byte", etc.)
- Foto som primär input — tal-till-text för anteckningar
- Offline-first: spara rapport lokalt, synka vid uppkoppling

---

## 6. Visuell design & Läsbarhet

### 6.1 Glas/transparent UI är för svårt att läsa

**Nu:** Mycket `bg-white/5`, `border-white/10`, `text-white/40`.  
**Problem:** Låg kontrast. Särskilt i lager med stark belysning eller utomhus.

**Förslag:**
- Öka kontrasten på kritisk text till minst WCAG AA (4.5:1)
- Använd solida bakgrunder istället för genomskinliga på viktiga komponenter
- Lager-PWA bör ha ljust tema

### 6.2 Status-färger är oenhetliga

**Nu:** `SÄLJ` = en färg på Orders, en annan på WorkOrders. `pågår` har olika badges.  
**Problem:** Användaren kan inte lära sig mönstret.

**Förslag:** Definiera ett **design system** för status:
```
🟢 Klar / Godkänd / Levererad    → emerald
🟡 Väntar / Pågår / Granskas    → amber
🔴 Kritisk / Försenad / Stoppad  → red
🔵 Info / Ny / Utkast            → blue
⚪ Arkiverad / Avbruten          → gray
```

### 6.3 Emoji-blandning

**Nu:** Vissa ställen använder emoji (t.ex. `🔧`), andra använder Lucide-ikoner.  
**Problem:** Ser amatörmässigt ut. Emojis renderas olika på olika enheter.

**Förslag:** Ersätt alla emojis med Lucide-ikoner för konsekvens.

---

## 7. Återkoppling & Systemstatus

### 7.1 Toast-notiser är lätta att missa

**Nu:** `sonner` används för alla notiser.  
**Problem:** Viktiga felmeddelanden försvinner efter några sekunder. Användaren hinner inte läsa.

**Förslag:**
- **Fel:** Stanna kvar tills användaren stänger. Röd, tydlig.
- **Framgång:** Auto-stäng efter 3 sekunder. Grön.
- **Viktiga fel:** Inline i formuläret, inte bara toast.
- **Synk-fel:** Persistent banner överst på sidan tills åtgärdas.

### 7.2 Ingen åtgärdskö

**Nu:** Om man startar en synk eller ett långt jobb ser man bara en spinner.  
**Problem:** Användaren vet inte om jobbet fortfarande pågår eller misslyckades.

**Förslag:** Implementera en **global åtgärdskö** (som Dropbox/Linear):
- Synkronisering pågår → 45% → Klar
- Bakgrundsjobb visas i en panel
- Fel visas med "Försök igen"

### 7.3 Skeletons saknas nästan överallt

**Nu:** Spinners eller tomma skärmar under laddning.  
**Problem:** Användaren vet inte om sidan är tom eller bara laddar.

**Förslag:** Byt alla list-laddningar till skeleton screens (shadcn har `Skeleton`).

---

## 8. Rollspecifika arbetsflöden

### 8.1 Säljare: Orderflödet är för komplext

**Nu:** Säljare skapar order i OrderEdit (30+ fält), sedan måste de skapa arbetsorder separat, sedan plocklista, sedan produktion…  
**Problem:** Ingen tydlig väg från "ny order" till "levererad".

**Förslag:** **Guidad order-wizard** för säljare:
```
Steg 1: Kundinfo       →  Steg 2: Produkter  →  Steg 3: Leverans
       →  Steg 4: Bekräfta  →  (Auto-skapa WO + plocklista)
```

### 8.2 Inköpare: PO-flödet är spretigt

**Nu:** PurchaseOrders → FortnoxSync → ReceivePurchaseOrder → Inventory. 4 olika sidor för ett flöde.  
**Problem:** Inköpare glömmer bort var de är i processen.

**Förslag:** **PO-livscykel-vy** som visar hela kedjan:
```
[ Utkast ] → [ Skickad ] → [ Bekräftad ] → [ Skeppad ] → [ Mottagen ]
     ↑            ↑              ↑               ↑              ↑
  skapa       maila till      bekräfta       spåra         mottag
  offert      leverantör       ETA            frakt         & boka in
```

### 8.3 Konstruktör: Saknar ritnings- och material-vy

**Nu:** Ritningar, CFG-filer och material-listor är utspridda på olika ställen.  
**Problem:** Konstruktörer behöver se ritning + material + mått på ett ställe.

**Förslag:** Bygg en **"Konstruktionsvy"** per arbetsorder:
- Ritning (stor bild/PDF)
- Material-lista med lagersaldo
- Dimensioner och specifikationer
- Kommentarer tråd

---

## 9. Tillgänglighet (Accessibility)

### 9.1 Färgblindhet

**Nu:** Status skiljs bara på färg (röd/gul/grön).  
**Problem:** ~8% av män och ~0.5% av kvinnor har färgblindhet.

**Förslag:** Kombinera färg + ikon + text:
```
🟢 Klar     →  [✅] Klar
🟡 Väntar   →  [⏳] Väntar
🔴 Försenad →  [⚠️] Försenad
```

### 9.2 Tangentbordsnavigering

**Nu:** Ingen synlig focus-ring. Tab-ordning kan vara felaktig i modaler.  
**Problem:** Power users och användare med motoriska svårigheter.

**Förslag:**
- Tydlig focus-ring på alla interaktiva element
- `Tab` / `Shift+Tab` ska fungera logiskt
- `Esc` stänger modaler
- `Enter` aktiverar primär åtgärd

---

## 10. Prestanda & Upplevd hastighet

### 10.1 Stora listor laddas inte paginerat

**Nu:** `base44.entities.Article.list()` hämtar alla 1 885 poster på en gång.  
**Problem:** Långsam initial laddning. Minnesanvändning i browsern.

**Förslag:** Implementera **virtuell scrollning** eller **paginering**:
- Första laddning: 50 poster
- Scrolla ner → ladda nästa 50
- Eller: virtuell lista med `react-window` / `@tanstack/react-virtual`

### 10.2 Bilder laddas långsamt

**Nu:** Artikelbilder pekar på `base44.app` (externa URLs).  
**Problem:** Långsamma laddningstider. Risk för brutna bilder.

**Förslag:**
- Ladda bilder lazy (`loading="lazy"`)
- Visa blurhash/platshållare medan bilden laddar
- Överväg att byta till lokala bilder (redan nedladdade i `uploads/`)

---

## Prioriterad förbättringsplan

### Fas 1: Snabba vinster (1–2 veckor)
1. ✅ **Stock Withdrawal-modal** — redan gjort
2. **Global sökning (Cmd+K)** — `cmdk` finns redan i dependencies
3. **Action overload-fix** — ⋮-meny på listor, bara primär + 2 sekundära synliga
4. **Skeleton screens** — ersätt spinners i listor
5. **Tomma tillstånd** — lägg till illustrations + CTA på blanka sidor
6. **Toast-fel fix** — fel ska inte auto-stängas

### Fas 2: Medium (2–4 veckor)
7. **Status-design system** — enhetliga färger + ikoner överallt
8. **OrderEdit i tabs** — dela upp formuläret i sektioner
9. **Order-detalj i tabs** — Översikt / Material / Aktivitet / Filer
10. **Mobil-kort för alla listor** — tabeller → kort under 768px
11. **Filter/Sort-standardisering** — samma mönster på alla sidor
12. **Emoji → Lucide** — konsekvens

### Fas 3: Stora satsningar (1–2 månader)
13. **"Min dag"-dashboard** — per roll, med vad som kräver uppmärksamhet
14. **Lager-PWA med ljust tema** — dedikerad vy för lagerpersonal
15. **Guidad order-wizard** — steg-för-steg för säljare
16. **Offline-stöd** — plockning och site reports fungerar utan nät
17. **Virtuell scrollning** — hantera 1 885+ poster smidigt
18. **Tangentbordsgenvägar** — power-user-flöde

---

## Appendix: Konkreta kodmönster att ändra

| Mönster | Nu | Bör bli |
|---------|-----|---------|
| List-action buttons | 10 små knappar i rad | 1 primär + ⋮-meny |
| Modal-stängning | Klicka utanför → stäng | Klicka utanför → bekräfta om data ändrats |
| Form submit | Spara-knapp längst ner | Sekundär "Spara utkast" + primär "Nästa steg" |
| Datumväljare | Text-input typ "date" | Kalender-popup med snabbval (Idag, +1 vecka, +1 månad) |
| Filuppladdning | Standard file input | Drag-and-drop zone med preview |
| Sökresultat | Textlista | Kort med bild, status, snabbåtgärder |
| Status-badge | `bg-signal/10 text-signal` (subtil) | Solid färg + ikon + text |
