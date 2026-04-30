# QuickWithdrawalModal — UX Improvement Proposal

> Status: PROPOSAL — awaiting approval before implementation  
> Constraint: No schema changes. No test data mutations. Frontend-only changes.

---

## Current Problems (from warehouse staff perspective)

| # | Problem | Impact |
|---|---------|--------|
| 1 | **Search is tiny and slow** | Typing article names among 1000+ items is error-prone and frustrating |
| 2 | **No barcode scan support** | Staff scan barcodes/SKU physically — the UI doesn't optimize for this |
| 3 | **All fields visible at once** | Overwhelming; easy to mis-enter data and accidentally submit |
| 4 | **Reason is a dropdown** | Hard to tap on mobile; requires precision; slow |
| 5 | **No confirmation gate** | One click deducts stock — scary and risky |
| 6 | **Stock info is tiny text** | "Tillgängligt: 3 st" is easy to miss; no visual urgency |
| 7 | **No article image** | Physical verification is harder without visual reference |
| 8 | **Success feedback is a toast** | Easy to miss when holding a scanner or wearing gloves |
| 9 | **Mobile dropdowns get cut off** | Touch targets too small; keyboard covers inputs |
| 10 | **No keyboard/scanning workflow** | USB barcode scanners send keystrokes — Enter should trigger search |

---

## Proposed New UX Flow (3-step wizard)

```
┌─────────────────────────────────────┐
│  STEG 1: Hitta artikel              │
│  [🔍 Sök eller scanna...    ]       │
│                                     │
│  [📷 Scanna streckkod]              │
│                                     │
│  Senaste: [Artikel A] [Artikel B]   │
└─────────────────────────────────────┘
              ↓ (article selected)
┌─────────────────────────────────────┐
│  STEG 2: Ange uppgifter             │
│  ┌─────────────────────────────┐    │
│  │  [BILD]  LED-modul P2.6     │    │
│  │          📍 Hylla A-12      │    │
│  │          💚 Tillgängligt:   │    │
│  │            45 st            │    │
│  └─────────────────────────────┘    │
│                                     │
│  Antal:  [−]  [  3  ]  [+]         │
│                                     │
│  Orsak:                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ │
│  │ 🔧     │ │ ⚙️     │ │ 💥     │ │
│  │Internt │ │Reserv- │ │Skadad  │ │
│  │ bruk   │ │ del    │ │        │ │
│  └────────┘ └────────┘ └────────┘ │
│  ┌────────┐ ┌────────┐ ┌────────┐ │
│  │ 🗑️     │ │ 📊     │ │ 🏭     │ │
│  │Skrot   │ │Juster- │ │Produk- │ │
│  │        │ │ ing    │ │ tion   │ │
│  └────────┘ └────────┘ └────────┘ │
│                                     │
│  Anteckningar (valfritt)            │
│  [________________________]         │
│                                     │
│           [Fortsätt →]              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  STEG 3: Bekräfta                   │
│                                     │
│  Du är på väg att dra:              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  LED-modul P2.6             │    │
│  │  −3 st                      │    │
│  │  Orsak: Internt bruk        │    │
│  │  Nytt saldo: 42 st          │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ ← Tillbaka ]  [ ✅ Bekräfta ]    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  ✅ Uttag klart!                    │
│                                     │
│  3 st LED-modul P2.6                │
│  har dragits från lager.            │
│                                     │
│  Nytt saldo: 42 st                  │
│                                     │
│  [ 📷 Scanna nästa ]                │
│  [ ❌ Stäng ]                       │
└─────────────────────────────────────┘
```

---

## Exact Changes Proposed

### 1. Barcode-first input (Step 1)

**Current:** Plain text input with autocomplete dropdown.

**Proposed:**
- Large, prominent search field with 🔍 icon and placeholder: **"Sök namn, SKU eller scanna streckkod..."**
- **Auto-focus on open** — USB barcode scanners can immediately send keystrokes
- **Enter key triggers search** — barcode scanners typically append Enter/Return
- **"Scanna streckkod" button** — opens camera scanner (uses existing `@zxing/library` already in project)
- **Recent withdrawals** — show last 5 withdrawn articles as quick-tap chips (fetched from `StockWithdrawal` history)
- **Search results as cards**, not a cramped dropdown:
  ```
  ┌────────────────────────┐
  │ [BILD]  LED-modul P2.6 │
  │         SKU: 12345     │
  │         Lager: 45 st   │
  └────────────────────────┘
  ```

### 2. Article review card (Step 2)

**Current:** Small info box with tiny text.

**Proposed:**
- **Large article card** at top:
  - Image (if `article.image_urls[0]` exists) or placeholder icon
  - Article name in **bold, 18px**
  - Shelf location with 📍 icon: **"Hylla A-12"**
  - Stock level with color coding:
    - 🟢 **Grön** (> 10 st): "Tillgängligt: 45 st"
    - 🟡 **Gul** (1–10 st): "Tillgängligt: 3 st — Lågt lager!"
    - 🔴 **Röd** (0 st): "Slut i lager — Endast justering möjlig"
- **Quantity stepper** (big +/- buttons, 48px touch targets):
  ```
  [ − ]  [   3   ]  [ + ]
  ```
  - Long-press on +/- for rapid increment
  - Max = available stock (unless correction reason selected)

### 3. Reason selection as big buttons (Step 2)

**Current:** `<Select>` dropdown with small items.

**Proposed:** 2 rows of 3 tappable cards (48px min height):

| | | |
|:--:|:--:|:--:|
| 🔧 **Internt bruk** | ⚙️ **Reservdel** | 💥 **Skadad** |
| 🗑️ **Skrot** | 📊 **Lagerjustering** | 🏭 **Produktion** |

- Selected state: blue border + blue background tint
- Single select (radio behavior)
- **Order by frequency** — most common reasons first

### 4. Confirmation gate (Step 3)

**Current:** None — "Bekräfta uttag" immediately deducts stock.

**Proposed:** Explicit summary screen:
- **Article name**
- **Quantity with minus sign**: "−3 st"
- **Reason**
- **New stock balance preview**: "Nytt saldo: 42 st"
- Two clear actions:
  - **"← Tillbaka"** (secondary, left) — go back to edit
  - **"✅ Bekräfta uttag"** (primary, right, green) — only then stock is deducted

### 5. Success screen ( replaces toast )

**Current:** `toast.success()` — easy to miss.

**Proposed:** Full-step success view inside the modal:
- Large ✅ green checkmark (animated scale-in)
- **"Uttag klart!"** heading
- Article name and quantity
- **New stock balance prominently displayed**
- Two actions:
  - **"📷 Scanna nästa"** — resets to Step 1, keeps modal open
  - **"Stäng"** — closes modal

### 6. Error handling

**Current:** Toast with error text.

**Proposed:** Inline error states on Step 2:
- **"Inte tillräckligt lager"** — red banner, quantity turns red, + button disabled
- **"Artikel hittades inte"** — shown in Step 1 search area
- **"Något gick fel"** — retry button on Step 3

### 7. Mobile-specific improvements

**Current:** Centered modal, dropdowns, small inputs.

**Proposed:**
- On **mobile (< 768px)**: use **bottom sheet** instead of centered modal
  - Slides up from bottom, takes 90% height
  - Swipe down to dismiss (with confirmation if data entered)
- All tap targets ≥ 48px
- Quantity stepper buttons are thumb-friendly
- Reason buttons are full-width on very small screens
- Keyboard should not push content off-screen (use `max-height` + scroll)

### 8. Safety / cancel behavior

**Current:** "Avbryt" button closes modal immediately.

**Proposed:**
- **If no data entered:** close immediately
- **If data entered (article selected, qty > 0):** show confirmation:
  > "Du har påbörjat ett uttag. Vill du verkligen avbryta?"
  > [Fortsätt] [Avbryt ändå]

### 9. Keyboard / accessibility

- **Auto-focus search on open**
- **Tab order** follows visual flow
- **Escape key** triggers cancel-with-confirmation
- **Enter** on Step 1 = search/select first result
- **Enter** on Step 2 = go to Step 3
- **Enter** on Step 3 = confirm (if valid)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/inventory/QuickWithdrawalModal.jsx` | Complete rewrite with 3-step wizard, bottom sheet mobile, stepper, reason buttons, confirmation gate, success screen |
| `src/Layout.jsx` | No changes needed (integration already done) |

**No new dependencies needed** — uses existing `@radix-ui/react-dialog`, `@zxing/library`, `lucide-react`, `framer-motion`.

**No backend changes** — same API contract:
```js
base44.functions.invoke('quickStockWithdrawal', {
  article_id,
  quantity,
  reason_code,
  notes
})
```

---

## Open Decisions (for you)

1. **Should the modal auto-reset for next item after success?**  
   → My recommendation: Yes, "Scanna nästa" resets to Step 1; warehouse staff often process multiple items in sequence.

2. **Should recent withdrawals be per-user or global?**  
   → My recommendation: Per-user (`requested_by`), so each warehouse worker sees their own recent items.

3. **Should we show article images?** Many imported articles may lack `image_urls`.  
   → My recommendation: Show image if available, otherwise a large article category icon (from lucide-react). Never show a broken image.

4. **Should Step 3 show who performed the withdrawal?**  
   → My recommendation: Yes, show "Utförd av: [user.email]" for accountability.

---

## What the code will look like (high-level)

```jsx
// State machine
const [step, setStep] = useState('search'); // 'search' | 'details' | 'confirm' | 'success'

// Step 1: Search
//   - Autofocus input
//   - Enter key → search
//   - Tap result → setSelectedArticle() → setStep('details')

// Step 2: Details
//   - Article card with image, stock, shelf
//   - Quantity stepper (+/-)
//   - Reason grid (6 buttons)
//   - Notes input
//   - "Fortsätt →" → setStep('confirm')

// Step 3: Confirm
//   - Summary card
//   - "← Tillbaka" | "✅ Bekräfta uttag"
   //   - On confirm → API call → setStep('success')

// Step 4: Success
//   - Animated checkmark
//   - "Scanna nästa" → reset to 'search'
   //   - "Stäng" → onOpenChange(false)
```

---

Approve this proposal and I'll implement the new `QuickWithdrawalModal.jsx`.
