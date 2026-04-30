import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Pencil, Package, Factory, Wrench, CheckCircle2, Inbox,
  PackageOpen, ChevronRight, CircleDot, Bell,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';

// ── Attention reasons ──────────────────────────────────────────
function getAttentionReasons(wo) {
  const reasons = [];
  const isOverdue = wo.deliveryDate && new Date(wo.deliveryDate) < new Date();
  if (isOverdue) reasons.push({ key: 'overdue', label: 'Försenad', color: 'red' });
  if (wo.isBlocked) reasons.push({ key: 'blocked', label: 'Blockerad', color: 'red' });
  if (!wo.currentResponsible) {
    reasons.push({ key: 'no_owner', label: 'Saknar ansvarig', color: 'amber' });
  }
  if (!wo.plannedDeadline) reasons.push({ key: 'no_date', label: 'Saknar planerat datum', color: 'amber' });
  if (wo.materialsMissing > 0) reasons.push({ key: 'missing', label: 'Material saknas', color: 'red' });
  return reasons;
}

function needsAttention(wo) {
  return getAttentionReasons(wo).length > 0;
}

// ── Process lane configuration ─────────────────────────────────
const PROCESS_LANES = [
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
    getOwner: (wo) => wo.currentResponsible?.userName,
    getRoleLabel: () => 'projektledare',
    getAction: (wo) => wo.currentResponsible ? 'Granska & tilldela' : 'Tilldela projektledare',
    emptyText: 'Inga nya ordrar i inkorgen',
  },
  {
    key: 'konstruktion',
    label: 'Konstruktion',
    shortLabel: 'Konstr.',
    icon: Pencil,
    accent: 'sky',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    text: 'text-sky-400',
    headerBg: 'bg-[#1a2f3f]',
    headerBorder: 'border-[#2a4f6f]',
    getOwner: (wo) => wo.currentResponsible?.userName,
    getRoleLabel: () => 'konstruktör',
    getAction: (wo) => wo.currentResponsible ? 'Fortsätt konstruktion' : 'Tilldela konstruktör',
    emptyText: 'Inga order att konstruera',
  },
  {
    key: 'produktion',
    label: 'Produktion',
    shortLabel: 'Prod.',
    icon: Factory,
    accent: 'blue',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    headerBg: 'bg-[#1a1f3f]',
    headerBorder: 'border-[#2a3f6f]',
    getOwner: (wo) => wo.currentResponsible?.userName,
    getRoleLabel: () => 'produktionsansvarig',
    getAction: (wo) => wo.currentResponsible ? 'Starta produktion' : 'Tilldela produktionsansvarig',
    emptyText: 'Inga order i produktion',
  },
  {
    key: 'lager',
    label: 'Lager / Material',
    shortLabel: 'Lager',
    icon: Package,
    accent: 'orange',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    headerBg: 'bg-[#3f2a1a]',
    headerBorder: 'border-[#6f4a2a]',
    getOwner: (wo) => wo.currentResponsible?.userName,
    getRoleLabel: () => 'lageransvarig',
    getAction: (wo) => wo.currentResponsible ? 'Kontrollera & plocka material' : 'Tilldela lageransvarig',
    emptyText: 'Inga order att plocka',
  },
  {
    key: 'montering',
    label: 'Installation / Montage',
    shortLabel: 'Montage',
    icon: Wrench,
    accent: 'purple',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    headerBg: 'bg-[#2a1a3f]',
    headerBorder: 'border-[#4a2a6f]',
    getOwner: (wo) => wo.currentResponsible?.userName,
    getRoleLabel: () => 'montör',
    getAction: (wo) => wo.currentResponsible ? 'Planera montage' : 'Tilldela montör',
    emptyText: 'Inga order att montera',
  },
  {
    key: 'leverans',
    label: 'Leverans / Klar',
    shortLabel: 'Leverans',
    icon: CheckCircle2,
    accent: 'emerald',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    headerBg: 'bg-[#1a3f2a]',
    headerBorder: 'border-[#2a6f4a]',
    getOwner: (wo) => wo.currentResponsible?.userName,
    getRoleLabel: () => 'leveransansvarig',
    getAction: () => 'Markera som levererad',
    emptyText: 'Inga order att leverera',
  },
];

const PRIORITY_DOT = {
  low: 'bg-white/20',
  normal: 'bg-white/20',
  high: 'bg-orange-400',
  urgent: 'bg-red-400',
};

// ── Avatar initials ────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Reason badge ─────────────────────────────────────────────
function ReasonBadge({ reason }) {
  const styles = {
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border', styles[reason.color] || styles.amber)}>
      {reason.label}
    </span>
  );
}

// ─── Primary action button ─────────────────────────────────────
function ActionButton({ action, accent, onClick }) {
  const accentMap = {
    sky: 'bg-sky-500/20 text-sky-300 border-sky-500/30 hover:bg-sky-500/30',
    slate: 'bg-slate-500/20 text-slate-300 border-slate-500/30 hover:bg-slate-500/30',
    violet: 'bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30',
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors',
        accentMap[accent] || accentMap.sky
      )}
    >
      <ChevronRight className="w-4 h-4" />
      {action}
    </button>
  );
}

// ─── Attention card ───────────────────────────────────────────
function AttentionCard({ wo }) {
  const navigate = useNavigate();
  const reasons = getAttentionReasons(wo);
  const isUrgent = wo.priority === 'urgent' || wo.priority === 'high';

  const deadlineText = wo.deliveryDate
    ? format(new Date(wo.deliveryDate), 'd MMM', { locale: sv })
    : null;
  const daysToDeadline = wo.deliveryDate
    ? Math.ceil((new Date(wo.deliveryDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = daysToDeadline < 0 && wo.status !== 'completed';

  const handleAction = (e) => {
    e.stopPropagation();
    navigate(`/WorkOrders/${wo.id}`);
  };

  const action = wo.isBlocked ? 'Granska blockerare'
    : 'Granska & åtgärda';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-3.5 cursor-pointer transition-all',
        isUrgent || isOverdue || wo.isBlocked
          ? 'bg-white/8 border-red-500/20 hover:border-red-500/40'
          : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10',
        isOverdue && 'border-l-[3px] border-l-red-500',
        wo.isBlocked && 'border-l-[3px] border-l-red-500'
      )}
      onClick={() => navigate(`/WorkOrders/${wo.id}`)}
    >
      {/* ── Reason badges ── */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {reasons.map((r) => (
          <ReasonBadge key={r.key} reason={r} />
        ))}
      </div>

      {/* ── Header: name + priority ── */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-white truncate leading-tight">
          {wo.name || wo.orderNumber || `AO-${wo.id.slice(0, 6)}`}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <div className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[wo.priority] || PRIORITY_DOT.normal)} />
        </div>
      </div>

      {/* ── Customer + deadline ── */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-white/50 truncate">{wo.customerName}</span>
        {deadlineText && (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
            isOverdue ? 'bg-red-500/15 text-red-400 font-bold' : daysToDeadline <= 3 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-white/30'
          )}>
            {isOverdue ? `${Math.abs(daysToDeadline)}d sen` : daysToDeadline <= 3 ? `${daysToDeadline}d kvar` : deadlineText}
          </span>
        )}
      </div>

      {/* ── Current stage indicator ── */}
      <div className="mb-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-md">
          <CircleDot className="w-3 h-3" />
          Nu i: {wo.phase}
        </span>
      </div>

      {/* ── Primary action ── */}
      <ActionButton action={action} accent="violet" onClick={handleAction} />
    </motion.div>
  );
}

// ─── Process card ─────────────────────────────────────────────
function ProcessCard({ wo, lane }) {
  const navigate = useNavigate();
  const owner = lane.getOwner(wo);
  const action = lane.getAction(wo);
  const isUrgent = wo.priority === 'urgent' || wo.priority === 'high';

  const deadlineText = wo.deliveryDate
    ? format(new Date(wo.deliveryDate), 'd MMM', { locale: sv })
    : null;
  const daysToDeadline = wo.deliveryDate
    ? Math.ceil((new Date(wo.deliveryDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = daysToDeadline < 0 && wo.status !== 'completed';

  const handleAction = (e) => {
    e.stopPropagation();
    navigate(`/WorkOrders/${wo.id}`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-3.5 cursor-pointer transition-all',
        isUrgent || isOverdue
          ? 'bg-white/8 border-orange-500/20 hover:border-orange-500/40'
          : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10',
        isOverdue && 'border-l-[3px] border-l-red-500',
        wo.redFlagActive && 'border-l-[3px] border-l-amber-500'
      )}
      onClick={() => navigate(`/WorkOrders/${wo.id}`)}
    >
      {/* ── Header: name + priority + watch + pendling ── */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-white truncate leading-tight">
          {wo.name || wo.orderNumber || `AO-${wo.id.slice(0, 6)}`}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {wo.isPendling && (
            <span className="text-[10px] text-amber-400 font-bold" title="Pendlad order">🔄</span>
          )}
          <div className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[wo.priority] || PRIORITY_DOT.normal)} />
        </div>
      </div>

      {/* ── Customer + deadline ── */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-white/50 truncate">{wo.customerName}</span>
        {deadlineText && (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
            isOverdue ? 'bg-red-500/15 text-red-400 font-bold' : daysToDeadline <= 3 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-white/30'
          )}>
            {isOverdue ? `${Math.abs(daysToDeadline)}d sen` : daysToDeadline <= 3 ? `${daysToDeadline}d kvar` : deadlineText}
          </span>
        )}
      </div>

      {/* ── Delivery address / carrier ── */}
      {(wo.deliveryAddress || wo.shippingCarrier) && (
        <div className="text-[11px] text-white/30 mb-2 truncate">
          {wo.deliveryAddress}{wo.shippingCarrier ? ` · ${wo.shippingCarrier}` : ''}
        </div>
      )}

      {/* ── Owner ── */}
      <div className="flex items-center gap-2 mb-3">
        {owner ? (
          <>
            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/70">
              {getInitials(owner)}
            </div>
            <span className="text-[11px] text-white/70 font-medium truncate">{owner}</span>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[9px] font-bold text-red-400">
              ?
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-md">
              Tilldela {lane.getRoleLabel()}
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>

      {/* ── Gate progress (placeholder) ── */}
      {wo.gateProgress && wo.gateProgress.total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-white/40">Gate-checklista</span>
            <span className="text-white/60">{wo.gateProgress.completed}/{wo.gateProgress.total}</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500/60 transition-all"
              style={{ width: `${wo.gateProgress.total > 0 ? (wo.gateProgress.completed / wo.gateProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Primary action button ── */}
      {action && (
        <div className="mb-3">
          <ActionButton action={action} accent={lane.accent} onClick={handleAction} />
        </div>
      )}

      {/* ── Material status ── */}
      <div className="pt-2 border-t border-white/5">
        {wo.materialsTotal > 0 ? (
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-white/40 flex items-center gap-1">
                <PackageOpen className="w-3 h-3" />
                Material
              </span>
              <span className={cn(
                'font-bold',
                wo.materialsMissing > 0 ? 'text-red-400' : 'text-emerald-400'
              )}>
                {wo.materialsReady}/{wo.materialsTotal} klart
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-1.5">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  wo.materialsMissing > 0 ? 'bg-red-500/60' : 'bg-emerald-500/60'
                )}
                style={{
                  width: `${wo.materialsTotal > 0 ? Math.min(100, (wo.materialsReady / wo.materialsTotal) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {wo.materialsMissing > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">
                  {wo.materialsMissing} saknas
                </span>
              )}
              {wo.materialsOrdered > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 font-medium">
                  {wo.materialsOrdered} beställda
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-white/30">
            <PackageOpen className="w-3 h-3" />
            <span>Inget materialbehov kopplat</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Lane column ────────────────────────────────────────────────
function LaneColumn({ lane, orders }) {
  const Icon = lane.icon;
  const count = orders.length;
  const isEmpty = count === 0;

  return (
    <div className="flex-shrink-0 w-[260px] sm:w-[280px]">
      {/* Lane header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-3 transition-colors',
          isEmpty
            ? 'bg-[#1a1a1a] border-[#2a2a2a]'
            : cn(lane.headerBg, lane.headerBorder)
        )}
      >
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', isEmpty ? 'bg-white/5' : `bg-${lane.accent}-500/15`)}>
          <Icon className={cn('w-3.5 h-3.5', isEmpty ? 'text-white/30' : lane.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn('text-xs font-bold uppercase tracking-wider', isEmpty ? 'text-white/30' : lane.text)}>
            {lane.label}
          </h3>
        </div>
        <span className={cn('text-xs font-mono font-bold', isEmpty ? 'text-white/20' : lane.text)}>
          {count}
        </span>
      </div>

      {/* Cards or empty state */}
      {isEmpty ? (
        <div className="text-center py-6 px-4">
          <Icon className="w-6 h-6 text-white/10 mx-auto mb-2" />
          <p className="text-xs text-white/25 font-medium">{lane.label}</p>
          <p className="text-[11px] text-white/15 mt-1">{lane.emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((wo) => (
            <ProcessCard key={`${lane.key}-${wo.id}`} wo={wo} lane={lane} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main board ─────────────────────────────────────────────────
export default function ProcessBoard({ columns = {}, totals = {}, isLoading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const allOrders = useMemo(() => {
    return Object.values(columns).flat();
  }, [columns]);

  const filteredColumns = useMemo(() => {
    const result = {};
    for (const [key, orders] of Object.entries(columns)) {
      result[key] = orders.filter((wo) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          wo.orderNumber?.toLowerCase().includes(q) ||
          wo.customerName?.toLowerCase().includes(q) ||
          wo.name?.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [columns, searchQuery]);

  const attentionOrders = useMemo(() => {
    return allOrders.filter(needsAttention);
  }, [allOrders]);

  const totalInProcess = useMemo(
    () => Object.values(filteredColumns).reduce((sum, arr) => sum + arr.length, 0),
    [filteredColumns]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (totalInProcess === 0 && attentionOrders.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Inga arbetsordrar"
        description="Alla arbetsordrar är klara eller matchar inte sökningen"
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Sök ordernr, kund..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg border transition-colors',
              activeFilter === 'all' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/50 hover:bg-white/5'
            )}
          >
            Alla ({totals.all})
          </button>
          <button
            onClick={() => setActiveFilter('overdue')}
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg border transition-colors',
              activeFilter === 'overdue' ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-transparent border-white/10 text-white/50 hover:bg-white/5'
            )}
          >
            🔴 Försenade ({totals.overdue})
          </button>
        </div>
      </div>

      {/* ── Section 1: Attention lane ── */}
      {attentionOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-red-500/15 flex items-center justify-center">
              <Bell className="w-3.5 h-3.5 text-red-400" />
            </div>
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">
              Kräver åtgärd
            </h3>
            <span className="text-xs font-mono font-bold text-red-400">
              {attentionOrders.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {attentionOrders.map((wo) => (
              <AttentionCard key={`attention-${wo.id}`} wo={wo} />
            ))}
          </div>
        </div>
      )}

      {/* ── Section 2: Process lanes ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center">
            <CircleDot className="w-3.5 h-3.5 text-white/40" />
          </div>
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">
            Process
          </h3>
        </div>
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-4 min-w-max">
            {PROCESS_LANES.map((lane) => (
              <LaneColumn key={lane.key} lane={lane} orders={filteredColumns[lane.key] || []} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
