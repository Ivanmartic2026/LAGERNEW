import React, { useState } from 'react';
import { MapPin, CheckSquare, Camera, PenLine } from 'lucide-react';
import GateChecklist from '@/components/workorders/GateChecklist';
import CustomerSignature from '@/components/workorders/CustomerSignature';

export default function MonteringTab({ workOrder, workOrderId }) {
  const [signing, setSigning] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(workOrder?.signed_off_by ? 'saved' : null);

  const handleSaveSignature = (url) => {
    setSignatureUrl(url);
    setSigning(false);
    // TODO: save to backend
  };
  const installationDate = workOrder?.installation_date;
  const technicianName = workOrder?.technician_name;

  return (
    <div className="space-y-5">
      <GateChecklist workOrderId={workOrderId} phase="montering" />

      {/* Ansvarig */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Ansvarig tekniker</h3>
        <p className="text-sm text-white/70">
          {workOrder?.assigned_to_montering_name || workOrder?.assigned_to_montering || technicianName || 'Ej tilldelad'}
        </p>
      </div>

      {/* Installationsöversikt */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> Installationsplats
        </h3>
        <div className="space-y-1 text-sm">
          <p className="text-white/70">{workOrder?.delivery_address || '—'}</p>
          {installationDate && (
            <p className="text-white/40">Planerat: {new Date(installationDate).toLocaleDateString('sv-SE')}</p>
          )}
          {workOrder?.delivery_contact_phone && (
            <p className="text-white/40">Tel: {workOrder.delivery_contact_phone}</p>
          )}
        </div>
      </div>

      {/* Installationschecklista */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5" /> Installationschecklista
        </h3>
        <div className="space-y-2">
          {[
            'Gods mottaget och kontrollerat',
            'Monteringsplats förberedd',
            'LED-paneler monterade',
            'Strömanslutning',
            'Signalanslutning',
            'Mjukvarukonfiguration',
            'Provkörning',
          ].map((item, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-white/20 bg-white/5 w-5 h-5" />
              <span className="text-sm text-white/60">{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Kundsignering */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
            <PenLine className="w-3.5 h-3.5" /> Kundsignering
          </h3>
          <button
            onClick={() => setSigning(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/20 hover:bg-purple-500/25 text-xs font-medium transition-colors"
          >
            <PenLine className="w-3.5 h-3.5" />
            {signatureUrl ? 'Ändra' : 'Signera'}
          </button>
        </div>
        {signatureUrl && signatureUrl !== 'saved' ? (
          <img src={signatureUrl} alt="Kundsignatur" className="w-full h-24 object-contain bg-white/5 rounded-lg" />
        ) : signatureUrl === 'saved' ? (
          <p className="text-sm text-emerald-400">✓ Signatur inhämtad</p>
        ) : (
          <p className="text-sm text-white/30">Ingen signatur inhämtad än</p>
        )}
      </div>

      {signing && <CustomerSignature onSave={handleSaveSignature} onClose={() => setSigning(false)} />}

      {/* Bilder från installationen */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" /> Bilder från installationen
        </h3>
        {workOrder?.assembly_images && workOrder.assembly_images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {workOrder.assembly_images.map((url, i) => (
              <img key={i} src={url} alt={`Installation ${i + 1}`} className="rounded-lg w-full h-24 object-cover" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/30">Inga bilder uppladdade än</p>
        )}
      </div>
    </div>
  );
}
