import React, { useState } from 'react';
import { Package, CheckSquare, ScanBarcode } from 'lucide-react';
import GateChecklist from '@/components/workorders/GateChecklist';
import BarcodeScanner from '@/components/workorders/BarcodeScanner';
import WorkOrderMaterialBoard from '@/components/workorders/WorkOrderMaterialBoard';

export default function LagerTab({ workOrder, workOrderId }) {
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  const handleScan = (code) => {
    setLastScan(code);
    setScanning(false);
    // TODO: match against BOM and mark as picked
  };
  const pickingNotes = workOrder?.picking_notes || '';

  return (
    <div className="space-y-5">
      <GateChecklist workOrderId={workOrderId} phase="lager" />

      {/* Streckkodsskanning */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Streckkodsskanning</h3>
          <button
            onClick={() => setScanning(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 text-xs font-medium transition-colors"
          >
            <ScanBarcode className="w-3.5 h-3.5" />
            Skanna
          </button>
        </div>
        {lastScan ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/40">Senast skannad:</span>
            <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">{lastScan}</span>
          </div>
        ) : (
          <p className="text-sm text-white/30">Inget skannat än</p>
        )}
      </div>

      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}

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
