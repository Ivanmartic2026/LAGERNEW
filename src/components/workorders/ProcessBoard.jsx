import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Inbox, Pencil, Factory, Warehouse, Wrench, Truck,
  AlertTriangle, Clock, User, Search, Filter, LayoutDashboard,
  ChevronRight, Calendar,
} from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import SavedViewPicker from './SavedViewPicker';

// ── Stage configuration ──────────────────────────────────────
const STAGES = [
  { key: 'inkorg',       label: 'Inkorg',       short: 'In',  icon: Inbox,       color: 'bg-slate-500',  text: 'text-slate-400',  border: 'border-slate-500/30',  headerBg: 'bg-slate-500/10' },
  { key: 'konstruktion', label: 'Konstruktion', short: 'Ko',  icon: Pencil,      color: 'bg-sky-500',    text: 'text-sky-400',    border: 'border-sky-500/30',    headerBg: 'bg-sky-500/10' },
  { key: 'produktion',   label: 'Produktion',   short: 'Pr',  icon: Factory,     color: 'bg-blue-500',   text: 'text-blue-400',   border: 'border-blue-500/30',   headerBg: 'bg-blue-500/10' },
  { key: 'lager',        label: 'Lager',        short: 'La',  icon: Warehouse,   color: 'bg-emerald-500',text: 'text-emerald-400',border: 'border-emerald-500/30', headerBg: 'bg-emerald-500/10' },
  { key: 'montering',    label: 'Montering',    short: 'Mo',  icon: Wrench,      color: 'bg-amber-500',  text: 'text-amber-400',  border: 'border-amber-500/30',  headerBg: 'bg-amber-500/10' },
  { key: 'leverans',     label: 'Leverans',     short: 'Le',  icon: Truck,       color: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/30', headerBg: 'bg-purple-500/10' },
];

function getResponsibleName(wo) {
  if (!wo.currentResponsible) return '—';
  return wo.currentResponsible.userName || wo.currentResponsible.role;
}

function getDeadlineStatus(wo) {
  if (!wo.deliveryDate) return { text: 'Saknar datum', variant: 'muted' };
  const date = new Date(wo.deliveryDate);
  if (wo.status === 'klar') return { text: format(date, 'd MMM', { locale: sv }), variant: 'ok' };
  if (isPast(date)) {
    const days = Math.abs(differenceInDays(date, new Date()));
    return { text: `${days}d försenad`, variant: 'danger' };
  }
  const days = differenceInDays(date, new Date());
  if (days <= 3) return { text: `${days}d kvar`, variant: 'warning' };
  return { text: format(date, 'd MMM', { locale: sv }), variant: 'normal' };
}

// ── Card ─────────────────────────────────────────────────────
function WorkOrderCard({ wo, stage }) {
  const navigate = useNavigate();
  const deadline = getDeadlineStatus(wo);
  const isOverdue = deadline.variant === 'danger';
  const isUrgent = deadline.variant === 'warning';

  const stageCfg = STAGES.find(s => s.key === stage) || STAGES[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}
      onClick={() => navigate(`/WorkOrders/${wo.id}/${stage}`)}
      className={cn(
        'rounded-xl border p-3.5 cursor-pointer transition-all group',
        'bg-[#1a1d24] hover:bg-[#1f222a]',
        isOverdue ? 'border-red-500/50 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]' : 'border-white/8 hover:border-white/15',
      )}
    >
      {/* Top row: Order number + deadline */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {isOverdue && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
            <span className="text-sm font-bold text-white font-mono truncate">{wo.orderNumber}</span>
          </div>
        </div>
        <div className={cn(
          'flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0',
          isOverdue && 'bg-red-500/15 text-red-400',
          isUrgent && 'bg-amber-500/15 text-amber-400',
          deadline.variant === 'normal' && 'text-white/40',
          deadline.variant === 'muted' && 'text-white/25',
        )}>
          <Clock size={10} />
          {deadline.text}
        </div>
      </div>

      {/* Customer + name */}
      <p className="text-xs text-white/50 truncate mb-2">{wo.customerName || '—'}</p>
      <p className="text-[13px] text-white/80 font-medium truncate mb-3 leading-snug">{wo.name}</p>

      {/* Bottom row: Responsible + stage badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white/60 flex-shrink-0">
            <User size={10} />
          </div>
          <span className="text-[11px] text-white/40 truncate">{getResponsibleName(wo)}</span>
        </div>
        <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', stageCfg.headerBg, stageCfg.text)}>
          <stageCfg.icon size={10} />
          {stageCfg.short}
        </div>
      </div>

      {/* Optional: Material progress bar */}
      {wo.materialsTotal > 0 && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
            <span>Material</span>
            <span>{wo.materialsReady}/{wo.materialsTotal}</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className={cn('h-full rounded-full', wo.materialsReady === wo.materialsTotal ? 'bg-emerald-500' : 'bg-sky-500')}
              style={{ width: `${(wo.materialsReady / wo.materialsTotal) * 100}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Column ───────────────────────────────────────────────────
function KanbanColumn({ stage, orders }) {
  const Icon = stage.icon;
  return (
    <div className="flex flex-col h-full min-w-[260px] max-w-[320px] flex-1">
      {/* Column header */}
      <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-x border-t', stage.border, stage.headerBg)}>
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', stage.color)}>
          <Icon size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn('text-xs font-bold uppercase tracking-wider', stage.text)}>{stage.label}</span>
        </div>
        <span className="text-xs font-mono font-bold text-white/60 bg-white/5 px-2 py-0.5 rounded-md">
          {orders.length}
        </span>
      </div>

      {/* Cards area */}
      <div className={cn('flex-1 overflow-y-auto px-2 py-3 space-y-2.5 border-x border-b rounded-b-xl', stage.border, 'bg-[#0e1117]/50')}>
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <Icon size={20} className="text-white/10 mx-auto mb-2" />
            <p className="text-[11px] text-white/20">Inga ordrar</p>
          </div>
        ) : (
          orders.map((wo) => <WorkOrderCard key={wo.id} wo={wo} stage={stage.key} />)
        )}
      </div>
    </div>
  );
}

// ── Main board ───────────────────────────────────────────────
export default function ProcessBoard({ columns = {}, totals = {}, isLoading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const navigate = useNavigate();

  const allOrders = useMemo(() => Object.values(columns).flat(), [columns]);

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

  const overdueOrders = useMemo(() => allOrders.filter((wo) => wo.isOverdue), [allOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Sök ordernr, kund..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-[#ff6b35] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              'text-xs px-3 py-2 rounded-lg border transition-colors font-medium',
              activeFilter === 'all' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/40 hover:bg-white/5'
            )}
          >
            Alla ({totals.all})
          </button>
          <button
            onClick={() => setActiveFilter('overdue')}
            className={cn(
              'text-xs px-3 py-2 rounded-lg border transition-colors font-medium flex items-center gap-1.5',
              activeFilter === 'overdue' ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-transparent border-white/10 text-white/40 hover:bg-white/5'
            )}
          >
            <AlertTriangle size={12} />
            Försenade ({overdueOrders.length})
          </button>
        </div>

        <SavedViewPicker
          currentFilters={{ searchQuery, activeFilter }}
          onApplyView={(f) => { setSearchQuery(f.searchQuery || ''); setActiveFilter(f.activeFilter || 'all'); }}
        />

        <button
          onClick={() => navigate('/Dashboard')}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
        >
          <LayoutDashboard size={14} />
          Översikt
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4">
        <div className="flex gap-4 h-full min-w-max">
          {STAGES.map((stage) => {
            const orders = activeFilter === 'overdue'
              ? (filteredColumns[stage.key] || []).filter((wo) => wo.isOverdue)
              : (filteredColumns[stage.key] || []);
            return <KanbanColumn key={stage.key} stage={stage} orders={orders} />;
          })}
        </div>
      </div>
    </div>
  );
}
