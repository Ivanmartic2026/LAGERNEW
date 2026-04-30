import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Inbox, Pencil, Factory, Warehouse, Wrench, Truck,
  AlertTriangle, Clock, ArrowRight, CheckCircle2,
  User, Calendar, Package,
} from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';

const STAGE_CONFIG = {
  inkorg:       { label: 'Inkorg',       icon: Inbox,       color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20' },
  konstruktion: { label: 'Konstruktion', icon: Pencil,      color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20' },
  produktion:   { label: 'Produktion',   icon: Factory,     color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  lager:        { label: 'Lager',        icon: Warehouse,   color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
  montering:    { label: 'Montering',    icon: Wrench,      color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  leverans:     { label: 'Leverans',     icon: Truck,       color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

function TaskCard({ wo, role }) {
  const navigate = useNavigate();
  const stage = wo.current_stage;
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.inkorg;
  const Icon = cfg.icon;

  const isOverdue = wo.deliveryDate && isPast(new Date(wo.deliveryDate)) && wo.status !== 'klar';
  const daysLeft = wo.deliveryDate ? differenceInDays(new Date(wo.deliveryDate), new Date()) : null;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={() => navigate(`/WorkOrders/${wo.id}/${stage}`)}
      className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-[#1a1d24] hover:bg-[#1f222a] hover:border-white/15 cursor-pointer transition-all group"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg, cfg.border)}>
        <Icon size={18} className={cfg.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-white font-mono">{wo.orderNumber}</span>
          {isOverdue && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
              <AlertTriangle size={10} />
              Försenad
            </span>
          )}
          {daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && !isOverdue && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              <Clock size={10} />
              {daysLeft}d kvar
            </span>
          )}
        </div>
        <p className="text-sm text-white/70 truncate">{wo.name || '—'}</p>
        <p className="text-xs text-white/40">{wo.customerName || '—'}</p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded', cfg.bg, cfg.color)}>
          {cfg.label}
        </span>
        {wo.deliveryDate && (
          <span className="text-[11px] text-white/30 flex items-center gap-1">
            <Calendar size={10} />
            {format(new Date(wo.deliveryDate), 'd MMM', { locale: sv })}
          </span>
        )}
      </div>

      <ArrowRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
    </motion.div>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function MyWork() {
  const navigate = useNavigate();

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['board'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getBoard', { assignedTo: 'me' });
      return res?.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const columns = boardData?.columns || {};
  const myOrders = Object.values(columns).flat();
  const overdue = myOrders.filter((o) => o.isOverdue);
  const urgent = myOrders.filter((o) => {
    if (!o.deliveryDate || o.isOverdue) return false;
    const days = differenceInDays(new Date(o.deliveryDate), new Date());
    return days >= 0 && days <= 3;
  });
  const normal = myOrders.filter((o) => {
    if (!o.deliveryDate || o.isOverdue) return false;
    const days = differenceInDays(new Date(o.deliveryDate), new Date());
    return days > 3;
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Min dag</h1>
          <p className="text-sm text-white/40 mt-1">
            {myOrders.length === 0 ? 'Inga ordrar tilldelade dig just nu' : `${myOrders.length} order${myOrders.length > 1 ? 'r' : ''} på din lista`}
          </p>
        </div>
        <button
          onClick={() => navigate('/WorkOrders')}
          className="text-sm px-4 py-2 rounded-lg bg-[#ff6b35] text-white hover:bg-[#ff6b35]/90 transition-colors"
        >
          Se alla ordrar
        </button>
      </div>

      {/* Priority sections */}
      {overdue.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-400" />
            <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider">Försenade — kräver omedelbar åtgärd</h2>
            <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{overdue.length}</span>
          </div>
          <div className="space-y-2">
            {overdue.map((wo) => <TaskCard key={wo.id} wo={wo} />)}
          </div>
        </section>
      )}

      {urgent.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-400" />
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Brådskande — inom 3 dagar</h2>
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{urgent.length}</span>
          </div>
          <div className="space-y-2">
            {urgent.map((wo) => <TaskCard key={wo.id} wo={wo} />)}
          </div>
        </section>
      )}

      {normal.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-white/40" />
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider">Övriga</h2>
            <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded">{normal.length}</span>
          </div>
          <div className="space-y-2">
            {normal.map((wo) => <TaskCard key={wo.id} wo={wo} />)}
          </div>
        </section>
      )}

      {myOrders.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-white/20" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Allt klart!</h2>
          <p className="text-sm text-white/40">Du har inga tilldelade arbetsordrar just nu.</p>
          <button
            onClick={() => navigate('/WorkOrders')}
            className="mt-4 text-sm px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
          >
            Utforska alla ordrar
          </button>
        </div>
      )}
    </div>
  );
}
