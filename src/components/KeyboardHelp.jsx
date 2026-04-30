import { Keyboard, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const SHORTCUTS = [
  { keys: ['?'], desc: 'Visa denna hjälp' },
  { keys: ['b'], desc: 'Gå till ProcessBoard' },
  { keys: ['n'], desc: 'Ny kommentar / fokus chat' },
  { keys: ['g', 'o'], desc: 'Gå till Översikt (i ordervy)' },
  { keys: ['g', 'k'], desc: 'Gå till Konstruktion' },
  { keys: ['g', 'p'], desc: 'Gå till Produktion' },
  { keys: ['g', 'l'], desc: 'Gå till Lager' },
  { keys: ['g', 'm'], desc: 'Gå till Montering' },
  { keys: ['g', 'v'], desc: 'Gå till Leverans' },
  { keys: ['Esc'], desc: 'Stäng panel / avbryt' },
];

export default function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onShow = () => setOpen(true);
    window.addEventListener('show-keyboard-help', onShow);
    return () => window.removeEventListener('show-keyboard-help', onShow);
  }, []);

  useEffect(() => {
    const onClose = () => setOpen(false);
    window.addEventListener('close-modals', onClose);
    return () => window.removeEventListener('close-modals', onClose);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Tangentbordsgenvägar"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#1a1d24] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Keyboard size={20} className="text-[#ff6b35]" />
            <h2 className="text-lg font-semibold">Tangentbordsgenvägar</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
            aria-label="Stäng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys.join('+')} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5">
              <span className="text-sm text-gray-300">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-white/10 bg-[#0e1117] px-2 py-0.5 text-xs font-mono text-gray-300 shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Tryck <kbd className="rounded border border-white/10 bg-[#0e1117] px-1.5 py-0.5 text-xs font-mono">?</kbd> när som helst för att visa denna dialog.
        </p>
      </div>
    </div>
  );
}
