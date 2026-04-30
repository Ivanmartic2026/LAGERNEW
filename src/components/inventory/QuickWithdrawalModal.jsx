import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Package,
  MapPin,
  ScanBarcode,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  ArrowLeft,
  Camera,
  Search,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';

// ───────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────

const REASONS = [
  { value: 'internal_use', label: 'Internt bruk', icon: '🔧', desc: 'Kontor, verktyg, förbrukning' },
  { value: 'spare_part', label: 'Reservdel', icon: '⚙️', desc: 'Reparation, service' },
  { value: 'damaged', label: 'Skadad', icon: '💥', desc: 'Skada vid hantering' },
  { value: 'scrap', label: 'Skrot', icon: '🗑️', desc: 'Kasserad, oanvändbar' },
  { value: 'correction', label: 'Lagerjustering', icon: '📊', desc: 'Rätta felaktigt saldo' },
  { value: 'production', label: 'Produktion', icon: '🏭', desc: 'Material till tillverkning' },
];

const STEPS = ['search', 'details', 'confirm', 'success'];

function getStockColor(stock) {
  if (stock === 0) return 'text-red-400';
  if (stock <= 10) return 'text-amber-400';
  return 'text-emerald-400';
}

function getStockBg(stock) {
  if (stock === 0) return 'bg-red-500/10 border-red-500/20';
  if (stock <= 10) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-emerald-500/10 border-emerald-500/20';
}

// ───────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────

export default function QuickWithdrawalModal({ open, onOpenChange, onSuccess }) {
  // ── Step state machine ──
  const [step, setStep] = useState('search');

  // ── Form state ──
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('internal_use');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  // ── UI state ──
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [result, setResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const searchInputRef = useRef(null);

  // ── Reset on open ──
  useEffect(() => {
    if (open) {
      resetAll();
      // Small delay ensures modal is rendered before focus
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [open]);

  const resetAll = () => {
    setStep('search');
    setSelectedArticle(null);
    setQuantity(1);
    setReason('internal_use');
    setNotes('');
    setSearch('');
    setResult(null);
    setScanError(null);
    setShowScanner(false);
  };

  const hasData = selectedArticle !== null;

  // ── Fetch articles ──
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ['articles-for-withdrawal'],
    queryFn: () => base44.entities.Article.list(),
    enabled: open,
  });

  const filteredArticles = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return articles
      .filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.sku?.toLowerCase().includes(q) ||
          a.batch_number?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [search, articles]);

  // ── Handlers ──

  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    setQuantity(1);
    setReason('internal_use');
    setStep('details');
  };

  const handleBarcodeDetected = (code) => {
    setShowScanner(false);
    setSearch(code);
    setScanError(null);

    const found = articles.find(
      (a) =>
        a.sku === code ||
        a.batch_number === code ||
        a.name?.toLowerCase() === code.toLowerCase()
    );

    if (found) {
      handleSelectArticle(found);
    } else {
      setScanError(`Hittade ingen artikel med kod: "${code}"`);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const currentStock = selectedArticle?.stock_qty ?? 0;
  const isCorrection = reason === 'correction';
  const canWithdraw = isCorrection || currentStock >= quantity;
  const stockAfter = currentStock - quantity;

  const handleNext = () => {
    if (step === 'details') {
      if (!canWithdraw) {
        toast.error(`Inte tillräckligt lager. Tillgängligt: ${currentStock} st`);
        return;
      }
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setSelectedArticle(null);
      setStep('search');
    } else if (step === 'confirm') {
      setStep('details');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('quickStockWithdrawal', {
        article_id: selectedArticle.id,
        quantity: parseFloat(quantity),
        reason_code: reason,
        notes: notes || undefined,
      });

      if (res.success) {
        setResult(res);
        setStep('success');
        onSuccess?.();
      } else {
        toast.error(res.error || 'Något gick fel');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      const msg = err?.response?.data?.error || err.message;
      if (msg.includes('Insufficient stock') || msg.includes('otillräckligt')) {
        toast.error('Inte tillräckligt lager');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAttempt = () => {
    if (hasData && step !== 'success') {
      setShowCancelConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmClose = () => {
    setShowCancelConfirm(false);
    onOpenChange(false);
  };

  const handleNextArticle = () => {
    setSelectedArticle(null);
    setQuantity(1);
    setReason('internal_use');
    setNotes('');
    setSearch('');
    setResult(null);
    setStep('search');
    setTimeout(() => searchInputRef.current?.focus(), 150);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && filteredArticles.length > 0) {
      handleSelectArticle(filteredArticles[0]);
    }
  };

  // ── Step index for progress bar ──
  const stepIndex = STEPS.indexOf(step);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleCloseAttempt();
          else onOpenChange(true);
        }}
      >
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[92vh] overflow-hidden p-0 gap-0 flex flex-col">
          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
            <DialogTitle className="text-white flex items-center gap-2.5 text-lg">
              {step === 'search' && (
                <>
                  <ScanBarcode className="w-5 h-5 text-blue-400 shrink-0" />
                  Snabbuttag från lager
                </>
              )}
              {step === 'details' && (
                <>
                  <Package className="w-5 h-5 text-blue-400 shrink-0" />
                  Granska artikel
                </>
              )}
              {step === 'confirm' && (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  Bekräfta uttag
                </>
              )}
              {step === 'success' && (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  Uttag klart!
                </>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Wizard för uttag från lager
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div className="px-5 pb-3 shrink-0">
            <div className="flex gap-1.5">
              {STEPS.map((s, i) => {
                const isActive = step === s;
                const isPast = stepIndex > i;
                return (
                  <div
                    key={s}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-colors duration-300',
                      isActive
                        ? 'bg-blue-500'
                        : isPast
                        ? 'bg-blue-500/40'
                        : 'bg-white/10'
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-2 min-h-0">
            <AnimatePresence mode="wait">
              {/* ═══════════════════════════════════════════════════
                  STEP 1: SEARCH
              ═══════════════════════════════════════════════════ */}
              {step === 'search' && (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Search field */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                    <Input
                      ref={searchInputRef}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setScanError(null);
                      }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Sök namn, SKU eller scanna..."
                      className="pl-10 bg-white/5 border-white/20 text-white h-12 text-base placeholder:text-white/30"
                      autoComplete="off"
                    />
                    {articlesLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-white/40" />
                    )}
                  </div>

                  {/* Scan button */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setScanError(null);
                      setShowScanner(true);
                    }}
                    className="w-full h-12 border-white/20 text-white bg-white/5 hover:bg-white/10 gap-2 text-sm"
                  >
                    <Camera className="w-4 h-4" />
                    Scanna streckkod
                  </Button>

                  {/* Scan error */}
                  {scanError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-red-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {scanError}
                    </div>
                  )}

                  {/* Results */}
                  {search.trim() && (
                    <div className="space-y-2">
                      {filteredArticles.length === 0 ? (
                        <div className="text-center py-10 text-white/30">
                          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                          <p className="text-sm">Inga artiklar hittades</p>
                          <p className="text-xs mt-1">Försök med annat sökord eller SKU</p>
                        </div>
                      ) : (
                        filteredArticles.map((article) => (
                          <button
                            key={article.id}
                            onClick={() => handleSelectArticle(article)}
                            className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center gap-3 transition-colors active:scale-[0.99]"
                          >
                            <div className="w-14 h-14 bg-black/20 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                              {article.image_urls?.[0] ? (
                                <img
                                  src={article.image_urls[0]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Package className="w-6 h-6 text-white/25" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-white truncate">
                                {article.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                <span className="text-xs text-white/40">
                                  SKU: {article.sku || '-'}
                                </span>
                                <span
                                  className={cn(
                                    'text-xs font-semibold',
                                    getStockColor(article.stock_qty ?? 0)
                                  )}
                                >
                                  {article.stock_qty ?? 0} st
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {!search.trim() && !scanError && (
                    <div className="text-center py-10 text-white/25 text-sm">
                      <ScanBarcode className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>Börja skriva eller scanna</p>
                      <p className="text-xs mt-1">för att hitta artikel</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════
                  STEP 2: DETAILS
              ═══════════════════════════════════════════════════ */}
              {step === 'details' && selectedArticle && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Article card */}
                  <div
                    className={cn(
                      'rounded-xl border p-4',
                      getStockBg(currentStock)
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-black/20 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {selectedArticle.image_urls?.[0] ? (
                          <img
                            src={selectedArticle.image_urls[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-7 h-7 text-white/25" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-white leading-tight">
                          {selectedArticle.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                          <span className="text-xs text-white/50 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {selectedArticle.shelf_address?.[0] || 'Ej angiven'}
                          </span>
                          <span className="text-xs text-white/50">
                            SKU: {selectedArticle.sku || '-'}
                          </span>
                        </div>
                        <div
                          className={cn(
                            'text-2xl font-bold mt-1.5',
                            getStockColor(currentStock)
                          )}
                        >
                          {currentStock} st
                          {currentStock === 0 && (
                            <span className="text-xs font-normal text-red-400 ml-2">
                              Slut i lager
                            </span>
                          )}
                          {currentStock > 0 && currentStock <= 10 && (
                            <span className="text-xs font-normal text-amber-400 ml-2">
                              Lågt lager
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantity stepper */}
                  <div>
                    <Label className="text-xs text-white/50 uppercase mb-2 block tracking-wide">
                      Antal
                    </Label>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="h-14 w-14 rounded-xl border-white/20 text-white bg-white/5 hover:bg-white/10 disabled:opacity-30"
                      >
                        <Minus className="w-5 h-5" />
                      </Button>
                      <div
                        className={cn(
                          'flex-1 h-14 rounded-xl border flex items-center justify-center text-xl font-bold',
                          !canWithdraw
                            ? 'border-red-500/50 text-red-400 bg-red-500/10'
                            : 'border-white/20 text-white bg-white/5'
                        )}
                      >
                        {quantity}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(1)}
                        disabled={!isCorrection && quantity >= currentStock}
                        className="h-14 w-14 rounded-xl border-white/20 text-white bg-white/5 hover:bg-white/10 disabled:opacity-30"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>

                    {!canWithdraw && (
                      <p className="text-sm text-red-400 mt-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Otillräckligt lager för uttag
                      </p>
                    )}
                    {canWithdraw && (
                      <p className="text-sm text-white/40 mt-2">
                        Nytt saldo efter uttag:{" "}
                        <span className={cn('font-semibold', getStockColor(stockAfter))}>
                          {stockAfter} st
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Reason grid */}
                  <div>
                    <Label className="text-xs text-white/50 uppercase mb-2 block tracking-wide">
                      Orsak
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {REASONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setReason(opt.value)}
                          className={cn(
                            'rounded-xl border p-3 text-left transition-all active:scale-[0.97]',
                            reason === opt.value
                              ? 'bg-blue-500/20 border-blue-500/60 ring-1 ring-blue-500/30'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          )}
                        >
                          <div className="text-2xl mb-1">{opt.icon}</div>
                          <div className="text-sm font-medium text-white leading-tight">
                            {opt.label}
                          </div>
                          <div className="text-[10px] text-white/40 mt-0.5 leading-tight">
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="text-xs text-white/50 uppercase mb-1.5 block tracking-wide">
                      Anteckningar (valfritt)
                    </Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="T.ex. Montering på kontoret..."
                      className="bg-white/5 border-white/20 text-white h-11"
                    />
                  </div>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════
                  STEP 3: CONFIRM
              ═══════════════════════════════════════════════════ */}
              {step === 'confirm' && selectedArticle && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <p className="text-center text-white/60 text-sm">
                    Du är på väg att dra följande från lager:
                  </p>

                  {/* Summary card */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-black/20 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {selectedArticle.image_urls?.[0] ? (
                          <img
                            src={selectedArticle.image_urls[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-white/25" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-white truncate">
                          {selectedArticle.name}
                        </div>
                        <div className="text-xs text-white/40">
                          SKU: {selectedArticle.sku || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-3 space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Kvantitet</span>
                        <span className="text-white font-semibold">−{quantity} st</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Orsak</span>
                        <span className="text-white font-medium">
                          {REASONS.find((r) => r.value === reason)?.label}
                        </span>
                      </div>
                      {notes && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Anteckning</span>
                          <span className="text-white text-right max-w-[55%] truncate">
                            {notes}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-white/10 pt-2.5 mt-2 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Nuvarande saldo</span>
                          <span className="text-white">{currentStock} st</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Nytt saldo</span>
                          <span
                            className={cn('font-bold', getStockColor(stockAfter))}
                          >
                            {stockAfter} st
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-white/30 text-center">
                    Kontrollera uppgifterna innan du bekräftar.
                  </p>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════
                  STEP 4: SUCCESS
              ═══════════════════════════════════════════════════ */}
              {step === 'success' && result && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 text-center py-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                      delay: 0.1,
                    }}
                  >
                    <div className="w-24 h-24 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    </div>
                  </motion.div>

                  <div>
                    <div className="text-2xl font-bold text-white mb-1">
                      Uttag klart!
                    </div>
                    <div className="text-white/60 leading-relaxed">
                      <span className="text-white font-semibold">{quantity} st</span>
                      <br />
                      {selectedArticle?.name}
                      <br />
                      har dragits från lager.
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 inline-block min-w-[180px]">
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
                      Nytt saldo
                    </div>
                    <div
                      className={cn(
                        'text-4xl font-bold',
                        getStockColor(result.article?.stock_qty ?? 0)
                      )}
                    >
                      {result.article?.stock_qty ?? 0}
                      <span className="text-lg font-normal text-white/40 ml-1">st</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer actions */}
          <div className="px-5 pb-5 pt-3 border-t border-white/10 shrink-0">
            {step === 'search' && (
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="w-full h-12 rounded-xl border-white/20 text-white bg-white/5 hover:bg-white/10"
              >
                Stäng
              </Button>
            )}

            {step === 'details' && (
              <div className="flex gap-2.5">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-white/20 text-white bg-white/5 hover:bg-white/10 gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Tillbaka
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canWithdraw}
                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
                >
                  Fortsätt <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {step === 'confirm' && (
              <div className="flex gap-2.5">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  disabled={loading}
                  className="flex-1 h-12 rounded-xl border-white/20 text-white bg-white/5 hover:bg-white/10 gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Tillbaka
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Bekräfta uttag
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === 'success' && (
              <div className="flex gap-2.5">
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-white/20 text-white bg-white/5 hover:bg-white/10"
                >
                  Stäng
                </Button>
                <Button
                  onClick={handleNextArticle}
                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
                >
                  <ScanBarcode className="w-4 h-4" />
                  Nästa artikel
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-screen barcode scanner overlay */}
      {showScanner && (
        <div className="fixed inset-0 z-[60] bg-black">
          <BarcodeScanner
            onBarcodeDetected={(code) => handleBarcodeDetected(code)}
            onClose={() => setShowScanner(false)}
          />
        </div>
      )}

      {/* Cancel confirmation dialog */}
      <AlertDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
      >
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Avbryta uttag?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Du har påbörjat ett uttag. Om du avbryter nu sparas inget.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => setShowCancelConfirm(false)}
              className="border-white/20 text-white bg-white/5 hover:bg-white/10 h-11"
            >
              Fortsätt
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClose}
              className="bg-red-600 hover:bg-red-500 text-white h-11"
            >
              Avbryt ändå
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
