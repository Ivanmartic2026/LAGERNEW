import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Truck,
  Wrench,
  Calendar,
  ChevronRight,
  Loader2,
  User,
  FileText,
  ScanBarcode,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('sv-SE');
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ───────────────────────────────────────────────────────────────
// Widget: Stat Card
// ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, onClick }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 cursor-pointer transition-colors',
        colorClasses[color] || colorClasses.blue,
        onClick && 'hover:bg-opacity-20'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 opacity-70" />
        {value > 0 && (
          <span className="text-2xl font-bold text-white">{value}</span>
        )}
      </div>
      <div className="text-sm font-medium text-white/80">{label}</div>
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────
// Widget: Attention List
// ───────────────────────────────────────────────────────────────

function AttentionList({ title, icon: Icon, items, emptyText, onItemClick, color = 'amber' }) {
  const [expanded, setExpanded] = useState(true);

  const colorClasses = {
    amber: 'border-amber-500/20 bg-amber-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
  };

  return (
    <div className={cn('rounded-xl border p-4', colorClasses[color])}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-white/60" />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {items.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-xs text-white/60">
              {items.length}
            </span>
          )}
        </div>
        <ChevronRight
          className={cn(
            'w-4 h-4 text-white/40 transition-transform',
            expanded && 'rotate-90'
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-white/30 py-2">{emptyText}</p>
          ) : (
            items.slice(0, 6).map((item, idx) => (
              <button
                key={idx}
                onClick={() => onItemClick?.(item)}
                className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{item.title}</div>
                  {item.subtitle && (
                    <div className="text-xs text-white/40 mt-0.5">{item.subtitle}</div>
                  )}
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full shrink-0',
                      item.badgeColor === 'red'
                        ? 'bg-red-500/20 text-red-400'
                        : item.badgeColor === 'amber'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-white/10 text-white/60'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
                <ArrowRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
              </button>
            ))
          )}
          {items.length > 6 && (
            <p className="text-xs text-white/30 text-center pt-1">
              +{items.length - 6} till
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Widget: Quick Actions
// ───────────────────────────────────────────────────────────────

function QuickActions({ actions }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action, idx) => (
        <Button
          key={idx}
          onClick={action.onClick}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
        >
          <action.icon className="w-5 h-5" />
          <span className="text-xs">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Main Dashboard
// ───────────────────────────────────────────────────────────────

export default function RoleDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const role = user?.role || 'lager';

  // ── Data fetching ──
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['dashboard-orders'],
    queryFn: () => base44.entities.Order.list(),
    enabled: !!user,
  });

  const { data: workOrders = [], isLoading: loadingWO } = useQuery({
    queryKey: ['dashboard-workorders'],
    queryFn: () => base44.entities.WorkOrder.list(),
    enabled: !!user,
  });

  const { data: articles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ['dashboard-articles'],
    queryFn: () => base44.entities.Article.list(),
    enabled: !!user && (role === 'lager' || role === 'produktion' || role === 'admin'),
  });

  const { data: purchaseOrders = [], isLoading: loadingPOs } = useQuery({
    queryKey: ['dashboard-pos'],
    queryFn: () => base44.entities.PurchaseOrder.list(),
    enabled: !!user && (role === 'inkopare' || role === 'lager' || role === 'admin'),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['dashboard-tasks', user?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_to: user?.email }),
    enabled: !!user?.email,
  });

  const isLoading = loadingOrders || loadingWO || loadingArticles || loadingPOs || loadingTasks;

  // ── Derived data ──
  const today = new Date();

  // Orders needing attention
  const ordersNeedingAttention = orders.filter((o) => {
    if (role === 'säljare') {
      return !o.sales_completed || !o.order_number;
    }
    if (role === 'konstruktor') {
      return o.status === 'KONSTRUKTION';
    }
    if (role === 'lager') {
      return o.status === 'LAGER' || o.status === 'picking';
    }
    if (role === 'produktion') {
      return o.status === 'PRODUKTION' || o.status === 'picked';
    }
    if (role === 'montering') {
      return o.status === 'MONTERING';
    }
    return false;
  });

  const overdueOrders = orders.filter((o) => o.delivery_date && isOverdue(o.delivery_date) && o.status !== 'completed');
  const upcomingDeliveries = orders.filter((o) => o.delivery_date && isWithinDays(o.delivery_date, 7) && !isOverdue(o.delivery_date));

  // Work orders
  const myWorkOrders = workOrders.filter((wo) => {
    if (role === 'konstruktor') return wo.current_stage === 'konstruktion';
    if (role === 'produktion') return wo.current_stage === 'produktion';
    if (role === 'lager') return wo.current_stage === 'lager';
    if (role === 'tekniker') return wo.current_stage === 'montering' || wo.current_stage === 'leverans';
    return false;
  });

  // Low stock
  const lowStock = articles.filter((a) => {
    const stock = a.stock_qty || 0;
    const min = a.min_stock_level;
    return min != null && stock <= min;
  });

  // Purchase orders
  const pendingPOs = purchaseOrders.filter((po) => po.status !== 'received' && po.status !== 'cancelled');
  const overduePOs = purchaseOrders.filter((po) => po.expected_delivery_date && isOverdue(po.expected_delivery_date) && po.status !== 'received');

  // My pending tasks
  const myPendingTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  // ── Role-specific content ──

  const getGreeting = () => {
    const hour = today.getHours();
    const timeGreeting = hour < 12 ? 'God morgon' : hour < 17 ? 'God eftermiddag' : 'God kväll';
    const roleLabel = {
      säljare: 'Säljare',
      konstruktor: 'Konstruktör',
      inkopare: 'Inköpare',
      lager: 'Lager',
      produktion: 'Produktion',
      tekniker: 'Tekniker',
      admin: 'Admin',
    }[role] || role;
    return `${timeGreeting}, ${user?.full_name || user?.email || roleLabel}`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">{getGreeting()}</h1>
          <p className="text-white/40 text-sm mt-1">
            Här är vad som kräver din uppmärksamhet idag.
          </p>
        </div>

        {/* ── SALES ── */}
        {role === 'säljare' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={ShoppingCart} label="Ordrar totalt" value={orders.length} color="blue" onClick={() => navigate('/Orders')} />
              <StatCard icon={AlertTriangle} label="Försenade" value={overdueOrders.length} color="red" onClick={() => navigate('/Orders')} />
              <StatCard icon={Calendar} label="Kommande 7 dagar" value={upcomingDeliveries.length} color="amber" onClick={() => navigate('/Orders')} />
              <StatCard icon={CheckCircle2} label="Klara denna månad" value={orders.filter(o => o.sales_completed).length} color="emerald" />
            </div>

            <AttentionList
              title="Ordrar som behöver åtgärd"
              icon={ClipboardList}
              color="amber"
              items={ordersNeedingAttention.map((o) => ({
                title: `${o.order_number || 'Utan nr'} — ${o.customer_name}`,
                subtitle: o.delivery_date ? `Leverans ${formatDate(o.delivery_date)}` : 'Inget leveransdatum',
                badge: o.status,
                badgeColor: isOverdue(o.delivery_date) ? 'red' : 'amber',
              }))}
              emptyText="Inga ordrar kräver åtgärd just nu"
              onItemClick={(item) => navigate('/Orders')}
            />

            <AttentionList
              title="Försenade leveranser"
              icon={Truck}
              color="red"
              items={overdueOrders.map((o) => ({
                title: `${o.order_number || 'Utan nr'} — ${o.customer_name}`,
                subtitle: `Leveransdatum passerat: ${formatDate(o.delivery_date)}`,
                badge: `${daysUntil(o.delivery_date)} dagar`,
                badgeColor: 'red',
              }))}
              emptyText="Inga försenade leveranser"
              onItemClick={() => navigate('/Orders')}
            />
          </>
        )}

        {/* ── WAREHOUSE ── */}
        {role === 'lager' && (
          <>
            <QuickActions
              actions={[
                { icon: ScanBarcode, label: 'Scanna', onClick: () => navigate('/Scan') },
                { icon: Package, label: 'Lager', onClick: () => navigate('/Inventory') },
                { icon: ClipboardList, label: 'Ordrar', onClick: () => navigate('/Orders') },
                { icon: ShoppingCart, label: 'Inköp', onClick: () => navigate('/PurchaseOrders') },
              ]}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={AlertTriangle} label="Lågt lager" value={lowStock.length} color="red" onClick={() => navigate('/Inventory')} />
              <StatCard icon={ClipboardList} label="Plock pågår" value={orders.filter(o => o.status === 'picking').length} color="amber" onClick={() => navigate('/Orders')} />
              <StatCard icon={Truck} label="Inkommande" value={pendingPOs.length} color="blue" onClick={() => navigate('/PurchaseOrders')} />
              <StatCard icon={Wrench} label="Mina uppgifter" value={myPendingTasks.length} color="purple" onClick={() => navigate('/home/lager')} />
            </div>

            <AttentionList
              title="Lågt lager"
              icon={AlertTriangle}
              color="red"
              items={lowStock.map((a) => ({
                title: a.name,
                subtitle: `Saldo: ${a.stock_qty || 0} st (min: ${a.min_stock_level})`,
                badge: `${a.stock_qty || 0} st`,
                badgeColor: 'red',
              }))}
              emptyText="Inga artiklar med lågt lager"
              onItemClick={() => navigate('/Inventory')}
            />

            <AttentionList
              title="Ordrar att plocka"
              icon={Package}
              color="amber"
              items={orders.filter(o => o.status === 'picking' || o.status === 'LAGER').map((o) => ({
                title: `${o.order_number || 'Utan nr'} — ${o.customer_name}`,
                subtitle: o.delivery_date ? `Leverans ${formatDate(o.delivery_date)}` : 'Inget datum',
                badge: o.status,
                badgeColor: 'amber',
              }))}
              emptyText="Inga ordrar att plocka"
              onItemClick={() => navigate('/Orders')}
            />

            <AttentionList
              title="Inkommande leveranser"
              icon={Truck}
              color="blue"
              items={pendingPOs.slice(0, 6).map((po) => ({
                title: `${po.po_number || 'Utan nr'} — ${po.supplier_name}`,
                subtitle: po.expected_delivery_date ? `Beräknat: ${formatDate(po.expected_delivery_date)}` : 'Inget leveransdatum',
                badge: po.status,
                badgeColor: isOverdue(po.expected_delivery_date) ? 'red' : 'blue',
              }))}
              emptyText="Inga inkommande leveranser"
              onItemClick={() => navigate('/PurchaseOrders')}
            />
          </>
        )}

        {/* ── PRODUCTION ── */}
        {role === 'produktion' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard icon={ClipboardList} label="Arbetsordrar" value={workOrders.length} color="blue" onClick={() => navigate('/WorkOrders')} />
              <StatCard icon={Wrench} label="I produktion" value={workOrders.filter(wo => wo.current_stage === 'produktion').length} color="amber" onClick={() => navigate('/WorkOrders')} />
              <StatCard icon={CheckCircle2} label="Klara" value={workOrders.filter(wo => wo.status === 'klar').length} color="emerald" />
            </div>

            <AttentionList
              title="Arbetsordrar i produktion"
              icon={Wrench}
              color="amber"
              items={workOrders.filter(wo => wo.current_stage === 'produktion').map((wo) => ({
                title: `${wo.order_number || 'Utan nr'} — ${wo.customer_name}`,
                subtitle: wo.current_stage,
                badge: wo.status,
              }))}
              emptyText="Inga arbetsordrar i produktion"
              onItemClick={() => navigate('/WorkOrders')}
            />

            <AttentionList
              title="Materialbrist"
              icon={AlertTriangle}
              color="red"
              items={workOrders
                .filter(wo => wo.materials_needed?.some(m => m.needs_purchase))
                .map((wo) => ({
                  title: `${wo.order_number || 'Utan nr'} — ${wo.customer_name}`,
                  subtitle: `${wo.materials_needed.filter(m => m.needs_purchase).length} artiklar saknas`,
                  badge: 'Saknas',
                  badgeColor: 'red',
                }))}
              emptyText="Inga materialbrister"
              onItemClick={() => navigate('/WorkOrders')}
            />
          </>
        )}

        {/* ── TECHNICIAN ── */}
        {role === 'tekniker' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard icon={Calendar} label="Installationer" value={upcomingDeliveries.length} color="blue" />
              <StatCard icon={AlertTriangle} label="Försenade" value={overdueOrders.length} color="red" />
              <StatCard icon={CheckCircle2} label="Klara" value={orders.filter(o => o.status === 'completed').length} color="emerald" />
            </div>

            <AttentionList
              title="Kommande installationer"
              icon={Calendar}
              color="blue"
              items={upcomingDeliveries.map((o) => ({
                title: `${o.order_number || 'Utan nr'} — ${o.customer_name}`,
                subtitle: `${o.delivery_address || 'Ingen adress'} • ${formatDate(o.delivery_date)}`,
                badge: `${daysUntil(o.delivery_date)} dagar`,
                badgeColor: daysUntil(o.delivery_date) <= 2 ? 'red' : 'blue',
              }))}
              emptyText="Inga kommande installationer"
              onItemClick={() => navigate('/Orders')}
            />
          </>
        )}

        {/* ── PURCHASER ── */}
        {role === 'inkopare' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={ShoppingCart} label="Aktiva PO" value={pendingPOs.length} color="blue" onClick={() => navigate('/PurchaseOrders')} />
              <StatCard icon={AlertTriangle} label="Försenade" value={overduePOs.length} color="red" onClick={() => navigate('/PurchaseOrders')} />
              <StatCard icon={Calendar} label="Denna vecka" value={purchaseOrders.filter(po => po.expected_delivery_date && isWithinDays(po.expected_delivery_date, 7)).length} color="amber" />
              <StatCard icon={CheckCircle2} label="Mottagna" value={purchaseOrders.filter(po => po.status === 'received').length} color="emerald" />
            </div>

            <AttentionList
              title="Försenade inköpsordrar"
              icon={AlertTriangle}
              color="red"
              items={overduePOs.map((po) => ({
                title: `${po.po_number || 'Utan nr'} — ${po.supplier_name}`,
                subtitle: `Beräknat leveransdatum passerat: ${formatDate(po.expected_delivery_date)}`,
                badge: po.status,
                badgeColor: 'red',
              }))}
              emptyText="Inga försenade inköpsordrar"
              onItemClick={() => navigate('/PurchaseOrders')}
            />

            <AttentionList
              title="Väntar på leverans"
              icon={Truck}
              color="amber"
              items={pendingPOs.map((po) => ({
                title: `${po.po_number || 'Utan nr'} — ${po.supplier_name}`,
                subtitle: po.expected_delivery_date ? `Beräknat: ${formatDate(po.expected_delivery_date)}` : 'Inget leveransdatum satt',
                badge: po.status,
                badgeColor: !po.expected_delivery_date ? 'red' : 'amber',
              }))}
              emptyText="Inga väntande inköpsordrar"
              onItemClick={() => navigate('/PurchaseOrders')}
            />
          </>
        )}

        {/* ── CONSTRUCTOR ── */}
        {role === 'konstruktor' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard icon={ClipboardList} label="WO i konstruktion" value={workOrders.filter(wo => wo.current_stage === 'konstruktion').length} color="blue" onClick={() => navigate('/WorkOrders')} />
              <StatCard icon={Wrench} label="Mina uppgifter" value={myPendingTasks.length} color="amber" />
              <StatCard icon={CheckCircle2} label="Klara" value={workOrders.filter(wo => wo.status === 'klar').length} color="emerald" />
            </div>

            <AttentionList
              title="Arbetsordrar i konstruktion"
              icon={Wrench}
              color="blue"
              items={workOrders.filter(wo => wo.current_stage === 'konstruktion').map((wo) => ({
                title: `${wo.order_number || 'Utan nr'} — ${wo.customer_name}`,
                subtitle: wo.planned_deadline ? `Deadline: ${formatDate(wo.planned_deadline)}` : 'Ingen deadline',
                badge: wo.status,
              }))}
              emptyText="Inga arbetsordrar i konstruktion"
              onItemClick={() => navigate('/WorkOrders')}
            />
          </>
        )}

        {/* ── ADMIN ── */}
        {role === 'admin' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={ShoppingCart} label="Ordrar" value={orders.length} color="blue" onClick={() => navigate('/Orders')} />
              <StatCard icon={ClipboardList} label="Arbetsordrar" value={workOrders.length} color="purple" onClick={() => navigate('/WorkOrders')} />
              <StatCard icon={AlertTriangle} label="Lågt lager" value={lowStock.length} color="red" onClick={() => navigate('/Inventory')} />
              <StatCard icon={Truck} label="Inköp aktiva" value={pendingPOs.length} color="amber" onClick={() => navigate('/PurchaseOrders')} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AttentionList
                title="Försenade ordrar"
                icon={AlertTriangle}
                color="red"
                items={overdueOrders.map((o) => ({
                  title: `${o.order_number || 'Utan nr'} — ${o.customer_name}`,
                  subtitle: `Leverans: ${formatDate(o.delivery_date)}`,
                  badge: `${daysUntil(o.delivery_date)} dagar`,
                  badgeColor: 'red',
                }))}
                emptyText="Inga försenade ordrar"
                onItemClick={() => navigate('/Orders')}
              />

              <AttentionList
                title="Lågt lager"
                icon={AlertTriangle}
                color="red"
                items={lowStock.map((a) => ({
                  title: a.name,
                  subtitle: `Saldo: ${a.stock_qty || 0} st (min: ${a.min_stock_level})`,
                  badge: `${a.stock_qty || 0} st`,
                  badgeColor: 'red',
                }))}
                emptyText="Inga lagerproblem"
                onItemClick={() => navigate('/Inventory')}
              />
            </div>
          </>
        )}

        {/* ── Common: My Tasks ── */}
        {myPendingTasks.length > 0 && (
          <AttentionList
            title="Mina uppgifter"
            icon={ClipboardList}
            color="purple"
            items={myPendingTasks.map((t) => ({
              title: t.name,
              subtitle: t.due_date ? `Deadline: ${formatDate(t.due_date)}` : 'Ingen deadline',
              badge: t.status,
              badgeColor: t.priority === 'urgent' ? 'red' : t.priority === 'high' ? 'amber' : 'purple',
            }))}
            emptyText="Inga väntande uppgifter"
          />
        )}
      </div>
    </div>
  );
}
