import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import {
  ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
  ChevronRight, X, Lock, Unlock,
} from 'lucide-react';

const STAGE_LABELS = {
  inkorg: 'Inkorg',
  konstruktion: 'Konstruktion',
  produktion: 'Produktion',
  lager: 'Lager',
  montering: 'Montering',
  leverans: 'Leverans',
};

const STAGE_ORDER = ['inkorg', 'konstruktion', 'produktion', 'lager', 'montering', 'leverans'];

export default function PhaseTransitionCTA({ workOrder, currentPhase, onTransition }) {
  const [showDialog, setShowDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [confirmBack, setConfirmBack] = useState(false);
  const queryClient = useQueryClient();

  const currentIdx = STAGE_ORDER.indexOf(currentPhase);
  const nextPhase = STAGE_ORDER[currentIdx + 1];
  const prevPhase = STAGE_ORDER[currentIdx - 1];

  const transitionMutation = useMutation({
    mutationFn: async ({ target, comment, force }) => {
      const res = await base44.functions.invoke('updateWorkOrderStage', {
        work_order_id: workOrder.id,
        target_stage: target,
        comment: comment || undefined,
        force: force || false,
      });
      return res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrder', workOrder.id] });
      queryClient.invalidateQueries({ queryKey: ['gateChecklist', workOrder.id] });
      queryClient.invalidateQueries({ queryKey: ['board'] });
      setShowDialog(false);
      setComment('');
      setConfirmBack(false);
      onTransition?.();
    },
  });

  // Don't show if at edges
  if (currentIdx === -1) return null;

  const isLast = currentIdx === STAGE_ORDER.length - 1;
  const isFirst = currentIdx === 0;

  return (
    <div className="flex items-center gap-3">
      {/* Back button */}
      {!isFirst && (
        <button
          onClick={() => { setConfirmBack(true); setShowDialog(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors"
        >
          <ArrowLeft size={14} />
          Tillbaka
        </button>
      )}

      {/* Forward CTA */}
      {!isLast && (
        <button
          onClick={() => { setConfirmBack(false); setShowDialog(true); }}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all',
            'bg-[#ff6b35] text-white hover:bg-[#ff6b35]/90 shadow-lg shadow-[#ff6b35]/20'
          )}
        >
          <CheckCircle2 size={16} />
          Markera klar — flytta till {STAGE_LABELS[nextPhase]}
          <ChevronRight size={16} />
        </button>
      )}

      {/* Complete button */}
      {isLast && (
        <button
          onClick={() => transitionMutation.mutate({ target: 'completed' })}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all',
            'bg-emerald-500 text-white hover:bg-emerald-500/90 shadow-lg shadow-emerald-500/20'
          )}
        >
          <CheckCircle2 size={16} />
          Markera order som slutförd
        </button>
      )}

      {/* Dialog */}
      {showDialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
          onClick={(e) => e.target === e.currentTarget && setShowDialog(false)}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1d24] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {confirmBack ? 'Skicka tillbaka order?' : 'Flytta order vidare?'}
              </h3>
              <button
                onClick={() => setShowDialog(false)}
                className="text-white/40 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-white/60 mb-1">Order</p>
              <p className="text-base font-bold text-white">{workOrder.order_number}</p>
              <p className="text-sm text-white/40">{workOrder.name}</p>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 text-center p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/40 uppercase mb-1">Nuvarande</p>
                <p className="text-sm font-bold text-white">{STAGE_LABELS[currentPhase]}</p>
              </div>
              <ArrowRight size={20} className="text-white/30" />
              <div className="flex-1 text-center p-3 rounded-xl bg-[#ff6b35]/10 border border-[#ff6b35]/20">
                <p className="text-xs text-[#ff6b35]/60 uppercase mb-1">Nästa</p>
                <p className="text-sm font-bold text-[#ff6b35]">
                  {confirmBack ? STAGE_LABELS[prevPhase] : STAGE_LABELS[nextPhase]}
                </p>
              </div>
            </div>

            {confirmBack && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Att skicka tillbaka en order är ovanligt och bör dokumenteras. Varför skickar du tillbaka?
                </p>
              </div>
            )}

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={confirmBack ? 'Anledning till att skicka tillbaka... *' : 'Valfri kommentar...'}
              className="w-full mb-4 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-[#ff6b35] focus:outline-none resize-none"
              rows={3}
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 text-sm font-medium transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => transitionMutation.mutate({
                  target: confirmBack ? prevPhase : nextPhase,
                  comment,
                })}
                disabled={transitionMutation.isPending || (confirmBack && !comment.trim())}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all',
                  confirmBack
                    ? 'bg-amber-500 text-white hover:bg-amber-500/90'
                    : 'bg-[#ff6b35] text-white hover:bg-[#ff6b35]/90',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {transitionMutation.isPending ? 'Flyttar...' : confirmBack ? 'Skicka tillbaka' : 'Bekräfta flytt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
