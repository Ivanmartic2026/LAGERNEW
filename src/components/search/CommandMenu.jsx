import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Package,
  ShoppingCart,
  ClipboardList,
  ScanBarcode,
  MapPin,
  Loader2,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

function highlightMatch(text, query) {
  if (!query || !text) return text;
  const q = query.toLowerCase();
  const t = String(text).toLowerCase();
  const idx = t.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-blue-500/30 text-white rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function getStockColor(stock) {
  if (stock === 0) return 'text-red-400';
  if (stock <= 10) return 'text-amber-400';
  return 'text-emerald-400';
}

// ───────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────

export default function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset search when opening
  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  // ── Fetch data (parallel) ──
  const { data: articles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ['cmdk-articles'],
    queryFn: () => base44.entities.Article.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['cmdk-orders'],
    queryFn: () => base44.entities.Order.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const { data: workOrders = [], isLoading: loadingWO } = useQuery({
    queryKey: ['cmdk-workorders'],
    queryFn: () => base44.entities.WorkOrder.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ['cmdk-batches'],
    queryFn: () => base44.entities.Batch.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingArticles || loadingOrders || loadingWO || loadingBatches;

  // ── Filter results ──
  const query = search.trim().toLowerCase();

  const filteredArticles = useMemo(() => {
    if (!query) return [];
    return articles
      .filter(
        (a) =>
          a.name?.toLowerCase().includes(query) ||
          a.sku?.toLowerCase().includes(query) ||
          a.batch_number?.toLowerCase().includes(query) ||
          a.shelf_address?.some((s) => s.toLowerCase().includes(query))
      )
      .slice(0, 5);
  }, [query, articles]);

  const filteredOrders = useMemo(() => {
    if (!query) return [];
    return orders
      .filter(
        (o) =>
          o.order_number?.toLowerCase().includes(query) ||
          o.customer_name?.toLowerCase().includes(query) ||
          o.customer_reference?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [query, orders]);

  const filteredWorkOrders = useMemo(() => {
    if (!query) return [];
    return workOrders
      .filter(
        (wo) =>
          wo.order_number?.toLowerCase().includes(query) ||
          wo.customer_name?.toLowerCase().includes(query) ||
          wo.name?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [query, workOrders]);

  const filteredBatches = useMemo(() => {
    if (!query) return [];
    return batches
      .filter(
        (b) =>
          b.batch_number?.toLowerCase().includes(query) ||
          b.article_name?.toLowerCase().includes(query) ||
          b.article_sku?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [query, batches]);

  const totalResults =
    filteredArticles.length +
    filteredOrders.length +
    filteredWorkOrders.length +
    filteredBatches.length;

  // ── Navigation handlers ──
  const goTo = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Sök order, artikel, arbetsorder, batch..."
        value={search}
        onValueChange={setSearch}
        className="text-white placeholder:text-white/40"
      />
      <CommandList className="max-h-[60vh]">
        {/* Loading state */}
        {isLoading && query && (
          <div className="py-8 text-center text-white/40 flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Söker...</span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && query && totalResults === 0 && (
          <CommandEmpty className="text-white/40 py-8">
            <div className="flex flex-col items-center gap-2">
              <Package className="w-8 h-8 opacity-30" />
              <span>Inga resultat för &quot;{search}&quot;</span>
            </div>
          </CommandEmpty>
        )}

        {/* Initial state — no query */}
        {!query && !isLoading && (
          <div className="py-8 text-center text-white/30 text-sm">
            <p>Börja skriva för att söka</p>
            <p className="text-xs mt-1 text-white/20">
              Sökbar: Artiklar, Ordrar, Arbetsordrar, Batcher
            </p>
          </div>
        )}

        {/* ── Articles ── */}
        {filteredArticles.length > 0 && (
          <CommandGroup heading="Artiklar">
            {filteredArticles.map((article) => (
              <CommandItem
                key={article.id}
                onSelect={() => goTo(`/Inventory`)}
                className="text-white data-[selected=true]:bg-white/10"
              >
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                    {article.image_urls?.[0] ? (
                      <img
                        src={article.image_urls[0]}
                        alt=""
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">
                      {highlightMatch(article.name, query)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span>SKU: {article.sku || '-'}</span>
                      <span className={cn('font-medium', getStockColor(article.stock_qty ?? 0))}>
                        {article.stock_qty ?? 0} st
                      </span>
                      {article.shelf_address?.[0] && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {article.shelf_address[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/20 shrink-0" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ── Orders ── */}
        {filteredOrders.length > 0 && (
          <CommandGroup heading="Ordrar">
            {filteredOrders.map((order) => (
              <CommandItem
                key={order.id}
                onSelect={() => goTo(`/OrderDetail?id=${order.id}`)}
                className="text-white data-[selected=true]:bg-white/10"
              >
                <div className="flex items-center gap-3 w-full min-w-0">
                  <ShoppingCart className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">
                      {highlightMatch(order.order_number, query) || 'Utan ordernummer'}
                      <span className="text-white/40 mx-1">—</span>
                      {highlightMatch(order.customer_name, query)}
                    </div>
                    <div className="text-xs text-white/40">
                      {order.status} {order.delivery_date && `• Leverans ${new Date(order.delivery_date).toLocaleDateString('sv-SE')}`}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/20 shrink-0" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ── Work Orders ── */}
        {filteredWorkOrders.length > 0 && (
          <CommandGroup heading="Arbetsordrar">
            {filteredWorkOrders.map((wo) => (
              <CommandItem
                key={wo.id}
                onSelect={() => goTo(`/WorkOrders/${wo.id}`)}
                className="text-white data-[selected=true]:bg-white/10"
              >
                <div className="flex items-center gap-3 w-full min-w-0">
                  <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">
                      {highlightMatch(wo.order_number, query) || 'Utan nummer'}
                      <span className="text-white/40 mx-1">—</span>
                      {highlightMatch(wo.customer_name, query)}
                    </div>
                    <div className="text-xs text-white/40">
                      {wo.current_stage} {wo.status && `• ${wo.status}`}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/20 shrink-0" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ── Batches ── */}
        {filteredBatches.length > 0 && (
          <CommandGroup heading="Batcher">
            {filteredBatches.map((batch) => (
              <CommandItem
                key={batch.id}
                onSelect={() => goTo(`/BatchDetail?id=${batch.id}`)}
                className="text-white data-[selected=true]:bg-white/10"
              >
                <div className="flex items-center gap-3 w-full min-w-0">
                  <ScanBarcode className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">
                      {highlightMatch(batch.batch_number, query)}
                    </div>
                    <div className="text-xs text-white/40">
                      {batch.article_name || batch.article_sku || 'Okänd artikel'}
                      {batch.quantity != null && ` • ${batch.quantity} st`}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/20 shrink-0" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {totalResults > 0 && (
          <>
            <CommandSeparator className="bg-white/10" />
            <div className="px-2 py-2 text-xs text-white/30 text-center">
              {totalResults} resultat •{' '}
              <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[10px]">↑↓</kbd>{' '}
              för att navigera •{' '}
              <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[10px]">↵</kbd>{' '}
              för att öppna
            </div>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
