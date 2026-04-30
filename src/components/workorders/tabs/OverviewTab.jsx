import React from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Building2, MapPin, Truck, Phone, Calendar,
  Package, AlertTriangle,
} from 'lucide-react';

export default function OverviewTab({ workOrder, order, roles = [] }) {
  const deliveryDate = workOrder?.delivery_date || order?.delivery_date;
  const isOverdue = deliveryDate && new Date(deliveryDate) < new Date() && workOrder?.status !== 'klar';

  const STAGES = [
    { key: 'konstruktion', label: 'Konstruktion', role: 'konstruktor' },
    { key: 'produktion', label: 'Produktion', role: 'produktion' },
    { key: 'lager', label: 'Lager', role: 'lager' },
    { key: 'montering', label: 'Montering', role: 'tekniker' },
    { key: 'leverans', label: 'Leverans', role: 'projektledare' },
  ];

  return (
    <div className="space-y-5">
      {/* Kundinformation */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" /> Kundinformation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-white/30 uppercase">Kund</p>
            <p className="text-sm text-white/80">{workOrder?.customer_name || order?.customer_name || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase">Kundreferens</p>
            <p className="text-sm text-white/80">{workOrder?.customer_reference || '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] text-white/30 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Leveransadress</p>
            <p className="text-sm text-white/80">{workOrder?.delivery_address || order?.delivery_address || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase flex items-center gap-1"><Truck className="w-3 h-3" /> Leveranssätt</p>
            <p className="text-sm text-white/80">{workOrder?.delivery_method || order?.delivery_method || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase flex items-center gap-1"><Phone className="w-3 h-3" /> Kontakt</p>
            <p className="text-sm text-white/80">{workOrder?.delivery_contact_name || '—'}{workOrder?.delivery_contact_phone ? ` · ${workOrder.delivery_contact_phone}` : ''}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Deadline</p>
            <p className={cn('text-sm font-medium', isOverdue ? 'text-red-400' : 'text-white/80')}>
              {deliveryDate ? format(new Date(deliveryDate), 'd MMM yyyy', { locale: sv }) : '—'}
              {isOverdue && ' (försenad)'}
            </p>
          </div>
        </div>
      </div>

      {/* Mini-status per fas */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Status per fas</h3>
        <div className="space-y-2">
          {STAGES.map((stage) => {
            const role = roles.find((r) => r.role === stage.role);
            const isActive = workOrder?.current_stage === stage.key;
            return (
              <div key={stage.key} className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg border',
                isActive ? 'bg-white/5 border-white/15' : 'border-transparent'
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', isActive ? 'bg-emerald-400' : 'bg-white/20')} />
                  <span className={cn('text-sm', isActive ? 'text-white font-medium' : 'text-white/50')}>
                    {stage.label}
                  </span>
                </div>
                <span className="text-xs text-white/40">
                  {role ? role.user_name || role.user_id : 'Ej tilldelad'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Materialöversikt */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Material
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{workOrder?.materials_total_count || 0}</p>
            <p className="text-[10px] text-white/30">Totalt</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-400">{workOrder?.materials_ready_count || 0}</p>
            <p className="text-[10px] text-white/30">Klara</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-400">{workOrder?.materials_missing_count || 0}</p>
            <p className="text-[10px] text-white/30">Saknas</p>
          </div>
        </div>
      </div>

      {/* Kritisk info */}
      {workOrder?.critical_notes && (
        <div className="bg-amber-500/10 rounded-xl border border-amber-500/20 p-4">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Kritisk information
          </h3>
          <p className="text-sm text-amber-200/80 whitespace-pre-wrap">{workOrder.critical_notes}</p>
        </div>
      )}
    </div>
  );
}
