import React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

const ROLE_CONFIG = [
  { key: 'projektledare', label: 'PL', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30', name: 'Projektledare' },
  { key: 'konstruktor',   label: 'K',  color: 'bg-sky-500',  text: 'text-sky-400',  border: 'border-sky-500/30',  name: 'Konstruktör' },
  { key: 'produktion',    label: 'P',  color: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-500/30', name: 'Produktion' },
  { key: 'lager',         label: 'L',  color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', name: 'Lager' },
  { key: 'tekniker',      label: 'T',  color: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/30', name: 'Tekniker' },
  { key: 'saljare',       label: 'S',  color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', name: 'Säljare' },
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function RoleAssignmentBar({ roles = [], onAssign }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {ROLE_CONFIG.map((cfg) => {
        const assigned = roles.find((r) => r.role === cfg.key);
        return (
          <div key={cfg.key} className="flex items-center gap-2">
            {assigned ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                <div
                  className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white', cfg.color)}
                  title={`${cfg.name}: ${assigned.user_name || assigned.user_id}`}
                >
                  {getInitials(assigned.user_name || assigned.user_id)}
                </div>
                <span className="text-[11px] text-white/70 truncate max-w-[100px]">
                  {assigned.user_name || assigned.user_id}
                </span>
              </div>
            ) : (
              <button
                onClick={() => onAssign?.(cfg.key)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed transition-colors',
                  'border-white/15 text-white/30 hover:border-white/30 hover:text-white/50 hover:bg-white/5'
                )}
                title={`${cfg.name}: ej tilldelad`}
              >
                <div className="w-5 h-5 rounded-full border border-dashed border-white/20 flex items-center justify-center text-[10px]">
                  <Plus className="w-3 h-3" />
                </div>
                <span className="text-[10px]">{cfg.label}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
