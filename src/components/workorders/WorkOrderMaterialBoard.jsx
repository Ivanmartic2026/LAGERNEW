import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Package,
  ShoppingCart,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Ban,
  ClipboardList,
  Quote,
  CalendarClock,
  Tag,
  Building2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Status config ──────────────────────────────────────────────
const STATUS_CONFIG = {
  not_needed: {
    label: 'Behövs ej',
    color: 'bg-white/5 text-white/30',
    borderColor: 'border-white/5',
    icon: Ban,
    group: 'ready',
  },
  purchase_needed: {
    label: 'Saknas — behöver beställas',
    color: 'bg-red-500/15 text-red-400',
    borderColor: 'border-red-500/20',
    icon: AlertTriangle,
    group: 'missing',
  },
  quote_requested: {
    label: 'Offert begärd',
    color: 'bg-amber-500/15 text-amber-400',
    borderColor: 'border-amber-500/20',
    icon: Quote,
    group: 'waiting',
  },
  quote_received: {
    label: 'Offert mottagen',
    color: 'bg-yellow-500/15 text-yellow-400',
    borderColor: 'border-yellow-500/20',
    icon: ClipboardList,
    group: 'waiting',
  },
  ordered: {
    label: 'Beställd',
    color: 'bg-sky-500/15 text-sky-400',
    borderColor: 'border-sky-500/20',
    icon: ShoppingCart,
    group: 'ordered',
  },
  partially_received: {
    label: 'Delvis mottagen',
    color: 'bg-purple-500/15 text-purple-400',
    borderColor: 'border-purple-500/20',
    icon: Truck,
    group: 'partial',
  },
  received: {
    label: 'Mottagen / klar',
    color: 'bg-emerald-500/15 text-emerald-400',
    borderColor: 'border-emerald-500/20',
    icon: CheckCircle2,
    group: 'ready',
  },
  delayed: {
    label: 'Försenad',
    color: 'bg-orange-500/15 text-orange-400',
    borderColor: 'border-orange-500/20',
    icon: CalendarClock,
    group: 'delayed',
  },
  cancelled: {
    label: 'Avbeställd',
    color: 'bg-white/5 text-white/30',
    borderColor: 'border-white/5',
    icon: XCircle,
    group: 'ready',
  },
};

const GROUP_ORDER = [
  { key: 'missing', label: '🔴 Saknas — kräver åtgärd' },
  { key: 'delayed', label: '⚠️ Försenat' },
  { key: 'waiting', label: '⏳ Väntar på offert' },
  { key: 'ordered', label: '🛒 Beställt — väntar på leverans' },
  { key: 'partial', label: '📦 Delvis mottagen' },
  { key: 'ready', label: '✅ Klar' },
];

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.purchase_needed;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.color
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, value, colorClass }) {
  return (
    <div className={cn('p-3 rounded-xl border border-white/10', colorClass)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 opacity-60" />
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold">{value ?? 0}</p>
    </div>
  );
}

// ── Stock availability bar ─────────────────────────────────────
function StockBar({ needed, inStock, received, missing }) {
  const available = inStock + received;
  const pct = needed > 0 ? Math.min(100, (available / needed) * 100) : 100;
  const isShort = available < needed;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-white/40">Tillgängligt</span>
        <span className={cn(isShort ? 'text-red-400 font-semibold' : 'text-emerald-400')}>
          {available} / {needed} st
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isShort ? 'bg-red-500/60' : 'bg-emerald-500/60'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isShort && (
        <p className="text-[11px] text-red-400/70 mt-1">
          Saknas {missing} st för att täcka behovet
        </p>
      )}
    </div>
  );
}

// ── Compact quantity display ───────────────────────────────────
function QuantityPill({ label, value, variant }) {
  const variants = {
    neutral: 'bg-white/5 text-white/60',
    success: 'bg-emerald-500/10 text-emerald-400',
    danger: 'bg-red-500/10 text-red-400',
    warning: 'bg-amber-500/10 text-amber-400',
    info: 'bg-sky-500/10 text-sky-400',
  };
  return (
    <div className={cn('px-2 py-1 rounded-lg text-[11px]', variants[variant] || variants.neutral)}>
      <span className="text-white/40">{label}</span>{' '}
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// ── Info row with icon ─────────────────────────────────────────
function InfoRow({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-white/50">
      <Icon className="w-3.5 h-3.5 text-white/30 shrink-0" />
      {children}
    </div>
  );
}

export default function WorkOrderMaterialBoard({ workOrderId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['purchaseNeeds', workOrderId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPurchaseNeeds', {
        work_order_id: workOrderId,
      });
      return res.data || { needs: [], summary: {}, blocking: { is_blocked: false } };
    },
    enabled: !!workOrderId,
    staleTime: 30000,
  });

  const needs = data?.needs || [];
  const summary = data?.summary || {};
  const blocking = data?.blocking || { is_blocked: false };

  const grouped = React.useMemo(() => {
    const map = { missing: [], waiting: [], ordered: [], partial: [], delayed: [], ready: [] };
    for (const n of needs) {
      const cfg = STATUS_CONFIG[n.status];
      const g = cfg?.group || 'ready';
      if (map[g]) map[g].push(n);
    }
    return map;
  }, [needs]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (needs.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/50 text-sm">
          Inga material registrerade för denna arbetsorder
        </p>
        <p className="text-white/30 text-xs mt-1">
          Lägg till material för att se inköpsstatus
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <SummaryCard icon={Package} label="Totalt" value={summary.total} colorClass="bg-white/5 text-white/70" />
        <SummaryCard icon={CheckCircle2} label="Klara" value={summary.ready} colorClass="bg-emerald-500/10 text-emerald-400" />
        <SummaryCard icon={ShoppingCart} label="Beställda" value={summary.ordered} colorClass="bg-sky-500/10 text-sky-400" />
        <SummaryCard icon={Clock} label="Väntar" value={summary.waiting} colorClass="bg-amber-500/10 text-amber-400" />
        <SummaryCard icon={AlertTriangle} label="Saknas" value={summary.missing} colorClass="bg-red-500/10 text-red-400" />
        <SummaryCard icon={CalendarClock} label="Försenat" value={summary.delayed} colorClass="bg-orange-500/10 text-orange-400" />
        <SummaryCard icon={Ban} label="Blockerar" value={summary.blocking} colorClass="bg-red-500/10 text-red-400" />
      </div>

      {/* ── Blocking banner ── */}
      {blocking.is_blocked && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">
              Projektet är blockerat av inköp
            </p>
            <p className="text-xs text-red-300/70 mt-0.5">{blocking.reason}</p>
            <p className="text-[11px] text-red-300/50 mt-1">
              {blocking.blocking_count} material saknas eller är försenat. Produktion / lager kan
              inte påbörjas förrän detta är löst.
            </p>
          </div>
        </div>
      )}

      {/* ── Grouped material rows ── */}
      <div className="space-y-4">
        {GROUP_ORDER.map(({ key, label }) => {
          const groupItems = grouped[key] || [];
          if (groupItems.length === 0) return null;

          return (
            <div key={key}>
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                {label}
                <span className="text-white/20 font-normal">({groupItems.length})</span>
              </h4>
              <div className="space-y-2.5">
                {groupItems.map((need) => (
                  <MaterialRow key={need.id} need={need} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MaterialRow({ need }) {
  const config = STATUS_CONFIG[need.status] || STATUS_CONFIG.purchase_needed;
  const isReady = need.status === 'received' || need.status === 'not_needed' || need.status === 'cancelled';
  const isMissing = need.status === 'purchase_needed';
  const isOrdered = need.status === 'ordered' || need.status === 'delayed';

  const etaText = need.expected_delivery_date
    ? new Date(need.expected_delivery_date).toLocaleDateString('sv-SE', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        config.borderColor,
        need.is_blocking ? 'bg-red-500/[0.03]' : 'bg-[#1a1a1a]'
      )}
    >
      {/* Header: name + status */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{need.article_name}</p>
          {need.article_sku && (
            <p className="text-[11px] text-white/30 font-mono mt-0.5">{need.article_sku}</p>
          )}
        </div>
        <div className="shrink-0">
          <StatusBadge status={need.status} />
        </div>
      </div>

      {/* ── Stock & availability ── */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-2 mb-2">
          <QuantityPill label="Behov" value={`${need.quantity_needed} st`} variant="neutral" />
          <QuantityPill
            label="Lager"
            value={`${need.quantity_in_stock ?? 0} st`}
            variant={(need.quantity_in_stock ?? 0) >= need.quantity_needed ? 'success' : 'danger'}
          />
          {need.quantity_missing > 0 && (
            <QuantityPill label="Saknas" value={`${need.quantity_missing} st`} variant="danger" />
          )}
          {need.quantity_ordered > 0 && (
            <QuantityPill label="Beställt" value={`${need.quantity_ordered} st`} variant="info" />
          )}
          {need.quantity_received > 0 && (
            <QuantityPill label="Mottaget" value={`${need.quantity_received} st`} variant="success" />
          )}
          {need.is_blocking ? (
            <QuantityPill label="Blockerar" value="Ja" variant="danger" />
          ) : (
            <QuantityPill label="Blockerar" value="Nej" variant="success" />
          )}
        </div>
        <StockBar
          needed={need.quantity_needed}
          inStock={need.quantity_in_stock ?? 0}
          received={need.quantity_received ?? 0}
          missing={need.quantity_missing}
        />
      </div>

      {/* ── Purchase / supplier info ── */}
      {(need.supplier_name || need.purchase_order_number || etaText || need.notes) && (
        <div className="space-y-1.5 pt-3 border-t border-white/5">
          {need.supplier_name && (
            <InfoRow icon={Building2}>
              <span className="truncate" title={need.supplier_name}>
                {need.supplier_name}
              </span>
            </InfoRow>
          )}
          {need.purchase_order_number && (
            <InfoRow icon={FileText}>
              PO: <span className="text-white/70 font-mono">{need.purchase_order_number}</span>
            </InfoRow>
          )}
          {etaText && (
            <InfoRow icon={CalendarClock}>
              <span className={cn(need.days_delayed > 0 && 'text-orange-400')}>
                ETA: {etaText}
                {need.days_delayed > 0 && ` (försenad ${need.days_delayed} dagar)`}
              </span>
            </InfoRow>
          )}
          {need.notes && (
            <InfoRow icon={Tag}>
              <span className="text-white/40">{need.notes}</span>
            </InfoRow>
          )}
        </div>
      )}

      {/* ── Phase 1: Action placeholders ── */}
      {!isReady && (
        <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-white/5">
          {isMissing && (
            <>
              <ActionButton disabled>Begär offert</ActionButton>
              <ActionButton disabled variant="primary">Skapa inköpsorder</ActionButton>
              <ActionButton disabled>Behövs ej</ActionButton>
            </>
          )}
          {isOrdered && (
            <>
              <ActionButton disabled>Uppdatera datum</ActionButton>
              <ActionButton disabled variant="primary">Markera mottagen</ActionButton>
              {need.status === 'delayed' && <ActionButton disabled>Avbeställ</ActionButton>}
            </>
          )}
          {need.status === 'partially_received' && (
            <ActionButton disabled variant="primary">Markera resten mottagen</ActionButton>
          )}
          {need.status === 'quote_requested' && (
            <ActionButton disabled variant="primary">Registrera offert</ActionButton>
          )}
          {need.status === 'quote_received' && (
            <>
              <ActionButton disabled>Se offert</ActionButton>
              <ActionButton disabled variant="primary">Godkänn offert</ActionButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({ children, disabled, variant = 'secondary' }) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
        variant === 'primary'
          ? 'bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed'
          : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}
