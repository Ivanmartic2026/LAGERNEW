import { Bookmark, BookmarkPlus, Check, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useSavedViews } from '@/hooks/useSavedViews';

export default function SavedViewPicker({ currentFilters, onApplyView }) {
  const { views, isLoading, createView, deleteView, isCreating } = useSavedViews();
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    createView({ name: name.trim(), filters: currentFilters });
    setName('');
    setNaming(false);
    setOpen(false);
  };

  const activeViewId = (() => {
    // Heuristic: find a view whose filters match current
    const cf = JSON.stringify(currentFilters || {});
    return views.find((v) => JSON.stringify(v.filters || {}) === cf)?.id;
  })();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1a1d24] px-3 py-2 text-sm text-gray-300 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
        aria-haspopup="true"
        aria-expanded={open}
        title="Sparade vyer"
      >
        <Bookmark size={16} className={activeViewId ? 'text-[#ff6b35]' : 'text-gray-400'} />
        <span className="hidden sm:inline">Vyer</span>
        {activeViewId && <span className="ml-1 h-2 w-2 rounded-full bg-[#ff6b35]" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-[#1a1d24] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Sparade vyer</span>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          </div>

          {!naming ? (
            <button
              onClick={() => setNaming(true)}
              className="mb-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              <BookmarkPlus size={14} />
              Spara nuvarande filter…
            </button>
          ) : (
            <div className="mb-2 flex gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Namn på vy…"
                className="flex-1 rounded-lg border border-white/10 bg-[#0e1117] px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-[#ff6b35] focus:outline-none"
              />
              <button
                onClick={handleSave}
                disabled={isCreating || !name.trim()}
                className="rounded-lg bg-[#ff6b35] px-3 py-1.5 text-white disabled:opacity-50"
              >
                <Check size={14} />
              </button>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-1">
            {isLoading ? (
              <p className="py-2 text-center text-xs text-gray-500">Laddar…</p>
            ) : views.length === 0 ? (
              <p className="py-2 text-center text-xs text-gray-500">Inga sparade vyer än.</p>
            ) : (
              views.map((v) => (
                <div
                  key={v.id}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    activeViewId === v.id ? 'bg-[#ff6b35]/10 text-[#ff6b35]' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => {
                      onApplyView(v.filters);
                      setOpen(false);
                    }}
                  >
                    {v.name}
                  </button>
                  <button
                    onClick={() => deleteView(v.id)}
                    className="rounded p-1 text-gray-500 opacity-0 hover:text-red-400 group-hover:opacity-100"
                    title="Ta bort"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
