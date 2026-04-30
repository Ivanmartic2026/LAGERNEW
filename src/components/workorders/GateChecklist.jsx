import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Lock, Loader2 } from 'lucide-react';

const STATUS_CONFIG = {
  auto_ok: { label: 'Uppfyllt', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  manual_ok: { label: 'Bockad', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  auto_pending: { label: 'Ej uppfyllt', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  manual_pending: { label: 'Ej bockad', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  not_applicable: { label: 'Gäller ej', icon: Lock, color: 'text-white/30', bg: 'bg-white/5', border: 'border-white/10' },
};

export default function GateChecklist({ workOrderId, phase }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['gateChecklist', workOrderId, phase],
    queryFn: async () => {
      const res = await base44.functions.invoke('getGateChecklist', { work_order_id: workOrderId, phase });
      return res?.data;
    },
    enabled: !!workOrderId && !!phase,
  });

  const toggleMutation = useMutation({
    mutationFn: async (itemId) => {
      const res = await base44.functions.invoke('toggleGateItem', { item_id: itemId });
      return res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateChecklist', workOrderId, phase] });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 text-white/30">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Laddar gate-checklista...</span>
        </div>
      </div>
    );
  }

  const items = data?.items || [];
  const summary = data?.summary;

  if (items.length === 0) {
    return null;
  }

  const progressPct = summary?.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  return (
    <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">
          Gate-checklista — krävs för att gå vidare
        </h3>
        <span className="text-xs text-white/30">{summary?.completed || 0}/{summary?.total || 0}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-4">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            progressPct === 100 ? 'bg-emerald-500/60' : summary?.hardBlockers > 0 ? 'bg-red-500/60' : 'bg-amber-500/60'
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.auto_pending;
          const Icon = config.icon;
          const isHard = item.severity === 'hard';
          const isOk = item.status === 'auto_ok' || item.status === 'manual_ok';

          return (
            <div
              key={item.key}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors',
                isOk
                  ? 'bg-emerald-500/5 border-emerald-500/10'
                  : isHard
                    ? 'bg-red-500/5 border-red-500/10'
                    : 'bg-white/5 border-white/10'
              )}
            >
              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0', config.bg, config.border)}>
                <Icon className={cn('w-3 h-3', config.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm', isOk ? 'text-white/60 line-through' : 'text-white/80')}>
                    {item.label}
                  </span>
                  {isHard && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">
                      Hård
                    </span>
                  )}
                </div>
                <span className={cn('text-[11px]', config.color)}>{config.label}</span>
              </div>

              {/* Manual toggle */}
              {!item.autoEvaluated && (
                <button
                  onClick={() => toggleMutation.mutate(item.id)}
                  disabled={toggleMutation.isPending}
                  className={cn(
                    'w-6 h-6 rounded border flex items-center justify-center transition-colors',
                    isOk
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/5 border-white/20 text-white/30 hover:border-white/40'
                  )}
                >
                  {isOk ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-2 h-2 rounded-sm bg-white/20" />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
