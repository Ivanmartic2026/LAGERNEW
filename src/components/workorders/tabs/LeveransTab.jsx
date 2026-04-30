import React from 'react';
import { FileCheck, Send, MessageSquare } from 'lucide-react';

export default function LeveransTab({ workOrder }) {
  const signedOffBy = workOrder?.signed_off_by;
  const signedOffDate = workOrder?.signed_off_date;

  return (
    <div className="space-y-5">
      {/* Ansvarig */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Ansvarig leverans</h3>
        <p className="text-sm text-white/70">
          {workOrder?.assigned_to_leverans_name || workOrder?.assigned_to_leverans || 'Ej tilldelad'}
        </p>
      </div>

      {/* Leveransbekräftelse */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <FileCheck className="w-3.5 h-3.5" /> Leveransbekräftelse (POD)
        </h3>
        {signedOffBy ? (
          <div className="space-y-1 text-sm">
            <p className="text-white/70">Signerat av: <span className="text-white">{signedOffBy}</span></p>
            {signedOffDate && (
              <p className="text-white/40">Datum: {new Date(signedOffDate).toLocaleDateString('sv-SE')}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/30">Ingen POD uppladdad än</p>
        )}
      </div>

      {/* Fakturasignal */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5" /> Fakturering
        </h3>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors text-sm font-medium">
          <Send className="w-4 h-4" /> Klar att fakturera
        </button>
        <p className="text-xs text-white/30 mt-2">Skickar signal till Fortnox</p>
      </div>

      {/* Eftermarknad */}
      <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> Eftermarknadsanteckningar
        </h3>
        <textarea
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/80 placeholder:text-white/20 min-h-[80px] focus:outline-none focus:border-white/30"
          placeholder="Servicenoteringar, garantitid, nästa servicepunkt..."
        />
      </div>
    </div>
  );
}
