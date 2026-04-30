import React from 'react';
import { Pencil, FileUp, ClipboardList } from 'lucide-react';
import GateChecklist from '@/components/workorders/GateChecklist';

export default function KonstruktionTab({ workOrder, workOrderId, onSaveNotes }) {
  const notes = workOrder?.workorder_notes || '';
  const drawingUrl = workOrder?.drawing_url;
  const bomUrl = workOrder?.bill_of_materials_url;

  return (
    <div className="space-y-5">
      <GateChecklist workOrderId={workOrderId} phase="konstruktion" />

      {/* Ansvarig */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Ansvarig konstruktör</h3>
        <p className="text-sm text-white/70">
          {workOrder?.assigned_to_konstruktion_name || workOrder?.assigned_to_konstruktion || 'Ej tilldelad'}
        </p>
      </div>

      {/* Konstruktionsanteckningar */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> Konstruktionsanteckningar
        </h3>
        <textarea
          defaultValue={notes}
          onBlur={(e) => onSaveNotes?.('workorder_notes', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/80 placeholder:text-white/20 min-h-[120px] focus:outline-none focus:border-white/30"
          placeholder="Skriv tekniska anteckningar, mått, specialkrav..."
        />
      </div>

      {/* Ritningar & BOM */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <FileUp className="w-3.5 h-3.5" /> Ritningar & BOM
        </h3>
        <div className="space-y-2">
          {drawingUrl ? (
            <a href={drawingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300">
              <ClipboardList className="w-4 h-4" /> Visa ritning
            </a>
          ) : (
            <p className="text-sm text-white/30">Ingen ritning uppladdad</p>
          )}
          {bomUrl ? (
            <a href={bomUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300">
              <ClipboardList className="w-4 h-4" /> Visa BOM
            </a>
          ) : (
            <p className="text-sm text-white/30">Ingen BOM uppladdad</p>
          )}
        </div>
      </div>

      {/* Teknisk info */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Teknisk information</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-white/30">Produkt:</span> <span className="text-white/70">{workOrder?.product_name || '—'}</span></div>
          <div><span className="text-white/30">Pixel pitch:</span> <span className="text-white/70">{workOrder?.pixel_pitch || '—'}</span></div>
          <div><span className="text-white/30">Dimensioner:</span> <span className="text-white/70">{workOrder?.screen_dimensions || '—'}</span></div>
          <div><span className="text-white/30">Moduler:</span> <span className="text-white/70">{workOrder?.module_count || '—'}</span></div>
          <div><span className="text-white/30">Konfiguration:</span> <span className="text-white/70">{workOrder?.config_cols}x{workOrder?.config_rows}</span></div>
        </div>
      </div>
    </div>
  );
}
