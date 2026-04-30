import React from 'react';
import { Package, CheckSquare } from 'lucide-react';
import GateChecklist from '@/components/workorders/GateChecklist';
import WorkOrderMaterialBoard from '@/components/workorders/WorkOrderMaterialBoard';

export default function LagerTab({ workOrder, workOrderId }) {
  const pickingNotes = workOrder?.picking_notes || '';

  return (
    <div className="space-y-5">
      <GateChecklist workOrderId={workOrderId} phase="lager" />

      {/* Ansvarig */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Ansvarig lager</h3>
        <p className="text-sm text-white/70">
          {workOrder?.assigned_to_lager_name || workOrder?.assigned_to_lager || 'Ej tilldelad'}
        </p>
      </div>

      {/* Plocklista / Materialboard */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Plocklista
        </h3>
        <WorkOrderMaterialBoard workOrderId={workOrderId} />
      </div>

      {/* Paketering */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5" /> Paketering
        </h3>
        <div className="space-y-2">
          {['Material packat', 'Etikett tryckt', 'Leveransdokument bifogade'].map((item, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-white/20 bg-white/5 w-5 h-5" />
              <span className="text-sm text-white/60">{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Plockanteckningar */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Plockanteckningar</h3>
        <textarea
          defaultValue={pickingNotes}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/80 placeholder:text-white/20 min-h-[80px] focus:outline-none focus:border-white/30"
          placeholder="Anteckningar om plock, avvikelser..."
        />
      </div>
    </div>
  );
}
