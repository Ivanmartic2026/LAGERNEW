import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Inbox, Pencil, Factory, Warehouse, Wrench, Truck,
  AlertTriangle, CheckCircle2, Clock, Users, TrendingUp,
  Package, Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STAGE_CONFIG = {
  inkborg: { label: 'Inkorg', icon: Inbox, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  konstruktion: { label: 'Konstruktion', icon: Pencil, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  produktion: { label: 'Produktion', icon: Factory, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  lager: { label: 'Lager', icon: Warehouse, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  montering: { label: 'Montering', icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  leverans: { label: 'Leverans', icon: Truck, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

function KpiCard({ icon: Icon, label, value, subvalue, color, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`rounded-xl border p-4 cursor-pointer transition-colors ${color?.bg || 'bg-white/5'} ${color?.border || 'border-white/10'} hover:bg-white/8`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</span>
        <Icon size={18} className={color?.color || 'text-white/40'} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subvalue && <div className="text-xs text-white/40 mt-1">{subvalue}</div>}
    </motion.div>
  );
}

function StageBar({ stage, stats }) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.inkborg;
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${config.bg} ${config.border}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/5`}>
        <Icon size={16} className={config.color} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{config.label}</div>
        <div className="text-xs text-white/40">{stats.count} aktiva</div>
      </div>
      {stats.overdue > 0 && (
        <div className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md">
          <AlertTriangle size={12} />
          {stats.overdue}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await base44.post('/api/v1/functions/getDashboard', {});
      return res.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const s = data?.summary || {};
  const stages = data?.stageStats || {};

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Översikt</h1>
          <p className="text-sm text-white/40 mt-1">Real-tids KPI:er och processstatus</p>
        </div>
        <button
          onClick={() => navigate('/WorkOrders')}
          className="text-sm px-4 py-2 rounded-lg bg-[#ff6b35] text-white hover:bg-[#ff6b35]/90 transition-colors"
        >
          Gå till ProcessBoard
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={Package}
          label="Aktiva ordrar"
          value={s.totalActive}
          subvalue={`${s.totalOverdue} försenade`}
          color={{ bg: 'bg-white/5', border: 'border-white/10', color: 'text-white' }}
          onClick={() => navigate('/WorkOrders')}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Försenade"
          value={s.totalOverdue}
          subvalue={s.totalOverdue > 0 ? 'Kräver åtgärd' : 'Alla i tid'}
          color={{ bg: 'bg-red-500/10', border: 'border-red-500/20', color: 'text-red-400' }}
          onClick={() => navigate('/WorkOrders')}
        />
        <KpiCard
          icon={Bell}
          label="Röda flaggor"
          value={s.totalRedFlags}
          color={{ bg: 'bg-amber-500/10', border: 'border-amber-500/20', color: 'text-amber-400' }}
        />
        <KpiCard
          icon={Users}
          label="Mina ordrar"
          value={s.myAssignments}
          subvalue={`${s.myOverdue} försenade`}
          color={{ bg: 'bg-sky-500/10', border: 'border-sky-500/20', color: 'text-sky-400' }}
          onClick={() => navigate('/WorkOrders')}
        />
      </div>

      {/* Stage breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 bg-[#1a1d24] p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#ff6b35]" />
            Order per fas
          </h2>
          <div className="space-y-2">
            {Object.entries(stages).map(([stage, stats]) => (
              <StageBar key={stage} stage={stage} stats={stats} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#1a1d24] p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock size={16} className="text-[#ff6b35]" />
              Aktivitet (senaste 7 dagarna)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-white">{s.recentTransitions}</div>
                <div className="text-xs text-white/40 mt-1">Fasövergångar</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-white">{s.recentActivity}</div>
                <div className="text-xs text-white/40 mt-1">Aktiviteter</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1a1d24] p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-[#ff6b35]" />
              Behöver uppmärksamhet
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Saknar ansvarig</span>
                <span className="font-mono text-white">{s.noOwner}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Saknar leveransdatum</span>
                <span className="font-mono text-white">{s.noDate}</span>
              </div>
            </div>
          </div>

          {data?.topCustomers?.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-[#1a1d24] p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Top-kunder</h2>
              <div className="space-y-2">
                {data.topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-white/60 truncate">{c.customer}</span>
                    <span className="font-mono text-white">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
