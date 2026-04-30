import React from 'react';
import { Factory, FileText, CheckSquare } from 'lucide-react';

export default function ProduktionTab({ workOrder }) {
  const productionNotes = workOrder?.production_notes || '';
  const productionStatus = workOrder?.production_status;

  return (
    <div className="space-y-5">
      {/* Ansvarig */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Ansvarig produktion</h3>
        <p className="text-sm text-white/70">
          {workOrder?.assigned_to_produktion_name || workOrder?.assigned_to_produktion || 'Ej tilldelad'}
        </p>
      </div>

      {/* Produktionsstatus */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Factory className="w-3.5 h-3.5" /> Produktionsstatus
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/70 capitalize">{productionStatus || 'Ej påbörjad'}</span>
        </div>
        {workOrder?.production_started_date && (
          <p className="text-xs text-white/30 mt-2">Startad: {new Date(workOrder.production_started_date).toLocaleDateString('sv-SE')}</p>
        )}
        {workOrder?.production_completed_date && (
          <p className="text-xs text-white/30">Avslutad: {new Date(workOrder.production_completed_date).toLocaleDateString('sv-SE')}</p>
        )}
      </div>

      {/* Konfigurationsanteckningar */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Anteckningar
        </h3>
        <textarea
          defaultValue={productionNotes}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/80 placeholder:text-white/20 min-h-[100px] focus:outline-none focus:border-white/30"
          placeholder="Dokumentera konfiguration, mjukvaruversioner, kalibrering..."
        />
      </div>

      {/* Testresultat placeholder */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5" /> Testresultat
        </h3>
        <div className="space-y-2">
          {['Strömpåslag OK', 'Signalmottagning verifierad', 'Bildkvalitet godkänd'].map((item, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-white/20 bg-white/5" />
              <span className="text-sm text-white/60">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
