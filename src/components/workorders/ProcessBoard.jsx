import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Pencil, Package, Factory, Wrench, CheckCircle2,
  PackageOpen, MessageSquare, ChevronRight,
  CircleDot, Bell,
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/empty-state';

// ── Attention reasons ──────────────────────────────────────────
function getAttentionReasons(wo) {
  const reasons = [];
  const isOverdue = wo.delivery_date && new Date(wo.delivery_date) < new Date();
  if (isOverdue) reasons.push({ key: 'overdue', label: 'Försenad', color: 'red' });
  if (wo.is_blocked) reasons.push({ key: 'blocked', label: 'Blockerad', color: 'red' });

  const stageOwnerMap = {
    konstruktion: wo.assigned_to_konstruktion,
    produktion: wo.assigned_to_produktion,
    lager: wo.assigned_to_lager,
    montering: wo.assigned_to_montering,
    leverans: wo.assigned_to_leverans,
  };
  if (!stageOwnerMap[wo.current_stage]) {
    reasons.push({ key: 'no_owner', label: 'Saknar ansvarig', color: 'amber' });
  }
  if (!wo.planned_deadline) reasons.push({ key: 'no_date', label: 'Saknar planerat datum', color: 'amber' });
  if (wo.needs_procurement) reasons.push({ key: 'procurement', label: 'Inköp kräver beslut', color: 'amber' });
  if (wo.materials_missing_count > 0) reasons.push({ key: 'missing', label: 'Material saknas', color: 'red' });
  if (wo.materials_missing_count > 0 && wo.materials_ordered_count > 0) {
    reasons.push({ key: 'delivery_delay', label: 'Försenad leverans', color: 'red' });
  }
  return reasons;
}

function needsAttention(wo) {
  return getAttentionReasons(wo).length > 0;
}

// ── Process lane configuration ─────────────────────────────────
const PROCESS_LANES = [
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
    getOwner: (wo) => wo.assigned_to_konstruktion_name,
    getRoleLabel: () => 'konstruktör',
    getAction: (wo) => wo.assigned_to_konstruktion ? 'Fortsätt konstruktion' : 'Tilldela konstruktör',
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
    getOwner: (wo) => wo.assigned_to_produktion_name,
    getRoleLabel: () => 'produktionsansvarig',
    getAction: (wo) => wo.assigned_to_produktion ? 'Starta produktion' : 'Tilldela produktionsansvarig',
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
    getOwner: (wo) => wo.assigned_to_lager_name,
    getRoleLabel: () => 'lageransvarig',
    getAction: (wo) => wo.assigned_to_lager ? 'Kontrollera & plocka material' : 'Tilldela lageransvarig',
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
    getOwner: (wo) => wo.assigned_to_montering_name || wo.technician_name,
    getRoleLabel: () => 'montör',
    getAction: (wo) => wo.assigned_to_montering ? 'Planera montage' : 'Tilldela montör',
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
    getOwner: (wo) => wo.assigned_to_leverans_name,
    getRoleLabel: () => 'leveransansvarig',
    getAction: () => 'Markera som levererad',
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
  const unreadCount = wo._unreadCount || 0;

  const deadlineText = wo.delivery_date
    ? format(new Date(wo.delivery_date), 'd MMM', { locale: sv })
    : null;
  const daysToDeadline = wo.delivery_date
    ? Math.ceil((new Date(wo.delivery_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = daysToDeadline < 0 && wo.status !== 'completed';

  const handleAction = (e) => {
    e.stopPropagation();
    navigate(`/WorkOrders/${wo.id}`);
  };

  // Primary action for attention lane: always "Granska" since something needs attention
  const action = wo.is_blocked ? 'Granska blockerare'
    : wo.needs_procurement ? 'Godkänn inköp'
    : 'Granska & åtgärda';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-3.5 cursor-pointer transition-all',
        isUrgent || isOverdue || wo.is_blocking
          ? 'bg-white/8 border-red-500/20 hover:border-red-500/40'
          : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10',
        isOverdue && 'border-l-[3px] border-l-red-500',
        wo.is_blocking && 'border-l-[3px] border-l-red-500'
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
          {wo.name || wo.order_number || `AO-${wo.id.slice(0, 6)}`}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {unreadCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-white/40">
              <MessageSquare className="w-3 h-3" />
              {unreadCount}
            </span>
          )}
          <div className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[wo.priority] || PRIORITY_DOT.normal)} />
        </div>
      </div>

      {/* ── Customer + deadline ── */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-white/50 truncate">{wo.customer_name}</span>
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
          Nu i: {wo.current_stage}
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
  const unreadCount = wo._unreadCount || 0;

  const deadlineText = wo.delivery_date
    ? format(new Date(wo.delivery_date), 'd MMM', { locale: sv })
    : null;
  const daysToDeadline = wo.delivery_date
    ? Math.ceil((new Date(wo.delivery_date) - new Date()) / (1000 * 60 * 60 * 24))
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
        isOverdue && 'border-l-[3px] border-l-red-500'
      )}
      onClick={() => navigate(`/WorkOrders/${wo.id}`)}
    >
      {/* ── Header: name + priority ── */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-white truncate leading-tight">
          {wo.name || wo.order_number || `AO-${wo.id.slice(0, 6)}`}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {unreadCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-white/40">
              <MessageSquare className="w-3 h-3" />
              {unreadCount}
            </span>
          )}
          <div className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[wo.priority] || PRIORITY_DOT.normal)} />
        </div>
      </div>

      {/* ── Customer + deadline ── */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-white/50 truncate">{wo.customer_name}</span>
        {deadlineText && (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
            isOverdue ? 'bg-red-500/15 text-red-400 font-bold' : daysToDeadline <= 3 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-white/30'
          )}>
            {isOverdue ? `${Math.abs(daysToDeadline)}d sen` : daysToDeadline <= 3 ? `${daysToDeadline}d kvar` : deadlineText}
          </span>
        )}
      </div>

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

      {/* ── Primary action button ── */}
      {action && (
        <div className="mb-3">
          <ActionButton action={action} accent={lane.accent} onClick={handleAction} />
        </div>
      )}

      {/* ── Material status (always shown) ── */}
      <div className="pt-2 border-t border-white/5">
        {wo.materials_total_count > 0 ? (
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-white/40 flex items-center gap-1">
                <PackageOpen className="w-3 h-3" />
                Material
              </span>
              <span className={cn(
                'font-bold',
                wo.materials_missing_count > 0 ? 'text-red-400' : 'text-emerald-400'
              )}>
                {wo.materials_ready_count || 0}/{wo.materials_total_count} klart
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-1.5">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  wo.materials_missing_count > 0 ? 'bg-red-500/60' : 'bg-emerald-500/60'
                )}
                style={{
                  width: `${wo.materials_total_count > 0 ? Math.min(100, ((wo.materials_ready_count || 0) / wo.materials_total_count) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {wo.materials_missing_count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">
                  {wo.materials_missing_count} saknas
                </span>
              )}
              {wo.materials_ordered_count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 font-medium">
                  {wo.materials_ordered_count} beställda
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
          <p className="text-[11px] text-white/15 mt-1">
            {lane.key === 'lager' && 'Inga order att plocka'}
            {lane.key === 'produktion' && 'Inga order i produktion'}
            {lane.key === 'montering' && 'Inga order att montera'}
            {lane.key === 'leverans' && 'Inga order att leverera'}
            {lane.key === 'konstruktion' && 'Inga order att konstruera'}
          </p>
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
export default function ProcessBoard({ workOrders, searchQuery, unreadByWO }) {
  const { attentionOrders, processLanes } = useMemo(() => {
    const filtered = workOrders.filter((wo) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        wo.order_number?.toLowerCase().includes(q) ||
        wo.customer_name?.toLowerCase().includes(q) ||
        wo.name?.toLowerCase().includes(q)
      );
    });

    const enriched = filtered.map((wo) => ({ ...wo, _unreadCount: unreadByWO[wo.id] || 0 }));

    const attention = enriched.filter(needsAttention);

    const lanes = PROCESS_LANES.map((lane) => ({
      ...lane,
      orders: enriched.filter((wo) => wo.current_stage === lane.key),
    }));

    return { attentionOrders: attention, processLanes: lanes };
  }, [workOrders, searchQuery, unreadByWO]);

  const totalInProcess = useMemo(
    () => processLanes.reduce((sum, lane) => sum + lane.orders.length, 0),
    [processLanes]
  );

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
            {processLanes.map((lane) => (
              <LaneColumn key={lane.key} lane={lane} orders={lane.orders} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
