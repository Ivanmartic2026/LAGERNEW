import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, ShoppingCart, Truck, CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  not_checked:        { label: 'Ej kontrollerad',   color: 'bg-white/10 text-white/50',     icon: Clock },
  in_stock:           { label: 'I lager',           color: 'bg-green-500/15 text-green-400', icon: CheckCircle2 },
  partially_picked:   { label: 'Delvis plockad',    color: 'bg-amber-500/15 text-amber-400', icon: Package },
  picked:             { label: 'Plockad',           color: 'bg-blue-500/15 text-blue-400',   icon: CheckCircle2 },
  not_ordered:        { label: 'Ej beställd',       color: 'bg-red-500/15 text-red-400',     icon: XCircle },
  purchase_needed:    { label: 'Behöver beställas', color: 'bg-orange-500/15 text-orange-400', icon: AlertTriangle },
  ordered:            { label: 'Beställd',          color: 'bg-sky-500/15 text-sky-400',     icon: ShoppingCart },
  partially_received: { label: 'Delvis mottagen',   color: 'bg-purple-500/15 text-purple-400', icon: Truck },
  received:           { label: 'Mottagen',          color: 'bg-emerald-500/15 text-emerald-400', icon: CheckCircle2 },
  cancelled:          { label: 'Avbeställd',        color: 'bg-red-500/15 text-red-400',     icon: XCircle },
  not_needed:         { label: 'Behövs ej',         color: 'bg-white/5 text-white/30',       icon: XCircle },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_checked;
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function WorkOrderMaterialBoard({ workOrderId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['workOrderMaterials', workOrderId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getWorkOrderMaterials', { work_order_id: workOrderId });
      return res.data || { materials: [], summary: {} };
    },
    enabled: !!workOrderId,
    staleTime: 30000,
  });

  const materials = data?.materials || [];
  const summary = data?.summary || {};

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/50 text-sm">Inga material registrerade för denna arbetsorder</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={Package} label="Totalt" value={summary.total} color="white" />
        <SummaryCard icon={CheckCircle2} label="Klara" value={summary.ready} color="green" />
        <SummaryCard icon={ShoppingCart} label="Beställda" value={summary.ordered} color="sky" />
        <SummaryCard icon={AlertTriangle} label="Saknas" value={summary.missing} color="red" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-white/5 text-xs font-semibold text-white/40 uppercase tracking-wider">
          <div className="col-span-3">Artikel</div>
          <div className="col-span-2">Behov / Lager</div>
          <div className="col-span-2">Plockat / Mottaget</div>
          <div className="col-span-2">Inköpsorder</div>
          <div className="col-span-3">Status</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/5">
          {materials.map((m) => (
            <div
              key={m.id}
              className={cn(
                "grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 transition-colors",
                m.status === 'not_ordered' || m.status === 'purchase_needed'
                  ? "bg-red-500/5"
                  : "hover:bg-white/[0.02]"
              )}
            >
              {/* Article name */}
              <div className="md:col-span-3">
                <p className="text-sm font-medium text-white">{m.article_name}</p>
                {m.article_sku && <p className="text-xs text-white/30 font-mono">{m.article_sku}</p>}
              </div>

              {/* Needed / Stock */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">Behov: <span className="text-white font-medium">{m.quantity_needed}</span></span>
                </div>
                {m.stock_qty !== null && (
                  <p className={cn(
                    "text-xs",
                    m.stock_qty >= m.quantity_needed ? "text-green-400/70" : "text-red-400/70"
                  )}>
                    Lager: {m.stock_qty}
                  </p>
                )}
              </div>

              {/* Picked / Received */}
              <div className="md:col-span-2">
                <div className="text-xs text-white/50 space-y-0.5">
                  {m.quantity_picked > 0 && <p>Plockat: {m.quantity_picked}</p>}
                  {m.quantity_received > 0 && <p>Mottaget: {m.quantity_received}</p>}
                  {m.quantity_picked === 0 && m.quantity_received === 0 && <p className="text-white/20">—</p>}
                </div>
              </div>

              {/* Purchase Order */}
              <div className="md:col-span-2">
                {m.purchase_order_number ? (
                  <div className="text-xs">
                    <p className="text-white/60">{m.purchase_order_number}</p>
                    {m.purchase_order_expected_delivery && (
                      <p className="text-white/30">
                        Lev: {new Date(m.purchase_order_expected_delivery).toLocaleDateString('sv-SE')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-white/20">—</p>
                )}
              </div>

              {/* Status */}
              <div className="md:col-span-3 flex items-center">
                <StatusBadge status={m.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    white:  'bg-white/5 text-white/70',
    green:  'bg-green-500/10 text-green-400',
    sky:    'bg-sky-500/10 text-sky-400',
    red:    'bg-red-500/10 text-red-400',
  };
  return (
    <div className={cn("p-3 rounded-xl border border-white/10", colorMap[color])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 opacity-60" />
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</span>
      </div>
      <p className="text-xl font-bold">{value ?? 0}</p>
    </div>
  );
}
