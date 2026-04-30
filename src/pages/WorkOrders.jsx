import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Package, Factory, CheckCircle2, Truck, Zap,
  ArrowRight, ClipboardList, Plus, Trash2, Edit2, Download,
  MessageSquare, ChevronRight, Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import CreateProductionWorkOrderModal from "@/components/workorders/CreateProductionWorkOrderModal";
import { resolveStage, ORDER_STAGES } from "@/components/workorders/ProcessFlow";
import UnreadBadge from "@/components/workorders/UnreadBadge";

import { EmptyState } from "@/components/ui/empty-state";
import { RowActionsDropdown, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/row-actions";
import QuickWithdrawalModal from "@/components/inventory/QuickWithdrawalModal";
import ProcessBoard from "@/components/workorders/ProcessBoard";
import { useBoard } from "@/hooks/useBoard";
import { useAuth } from "@/lib/AuthContext";
import { shouldDefaultToMyOrders } from "@/lib/permissions";

const STAGE_META = {
  konstruktion: { label: 'Konstruktion',   accent: 'sky',     icon: Pencil,     cta: 'Fortsätt',  ctaColor: 'bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 border-sky-500/30' },
  produktion:   { label: 'Produktion',     accent: 'blue',    icon: Factory,    cta: 'Producera', ctaColor: 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-500/30' },
  lager:        { label: 'Lager',          accent: 'amber',   icon: Package,    cta: 'Plocka',    ctaColor: 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border-amber-500/30' },
  montering:    { label: 'Montering',      accent: 'purple',  icon: Zap,        cta: 'Montera',   ctaColor: 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border-purple-500/30' },
  leverans:     { label: 'Leverans',       accent: 'green',   icon: Truck,      cta: 'Leverera',  ctaColor: 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border-green-500/30' },
};

const PRIORITY_DOT = {
  low:    'bg-white/20',
  normal: 'bg-white/20',
  high:   'bg-orange-400',
  urgent: 'bg-red-400',
};

function DeliveryPill({ date, status }) {
  if (!date) return <span className="text-white/20 text-xs">—</span>;
  const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  const overdue = days < 0 && status !== 'completed';
  const soon = days >= 0 && days <= 3 && status !== 'completed';
  return (
    <span className={cn(
      "text-xs font-medium px-2 py-0.5 rounded-full",
      overdue ? "bg-red-500/15 text-red-400" : soon ? "bg-amber-500/15 text-amber-400" : "bg-white/5 text-white/40"
    )}>
      {format(new Date(date), 'd MMM', { locale: sv })}
      {overdue ? ` · ${Math.abs(days)}d sen` : soon ? ` · ${days}d kvar` : null}
    </span>
  );
}

function WorkOrderRow({ wo, stageKey, onDelete, onOpenWithdrawal }) {
  const navigate = useNavigate();
  const stage = STAGE_META[stageKey] || STAGE_META.konstruktion;
  const StageIcon = stage.icon;
  const unreadCount = wo._unreadCount || 0;
  const isUrgent = wo.priority === 'urgent' || wo.priority === 'high';

  const isLager = stageKey === 'lager';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer",
        isUrgent
          ? "bg-white/8 border-orange-500/20 hover:border-orange-500/40"
          : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10"
      )}
      onClick={() => navigate(`/WorkOrders/${wo.id}`)}
    >
      {/* Stage color line */}
      <div className={cn("w-1 h-10 rounded-full shrink-0", `bg-${stage.accent}-500/40`)} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-semibold text-sm text-white truncate">
            {wo.name || wo.order_number || `AO-${wo.id.slice(0, 6)}`}
          </h3>
          <div className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_DOT[wo.priority] || PRIORITY_DOT.normal)} />
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
              <MessageSquare className="w-3 h-3" />
              <UnreadBadge count={unreadCount} />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/50">{wo.customer_name}</span>
          <DeliveryPill date={wo.delivery_date} status={wo.status} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isLager && (
          <Button
            size="sm"
            className={cn("h-7 text-xs px-2.5", stage.ctaColor)}
            onClick={(e) => {
              e.stopPropagation();
              onOpenWithdrawal(wo);
            }}
          >
            <Package className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">{stage.cta}</span>
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-white/30 hover:text-white/70"
          onClick={(e) => { e.stopPropagation(); navigate(`/WorkOrders/${wo.id}`); }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <RowActionsDropdown>
          {!isLager && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/WorkOrders/${wo.id}`);
              }}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              {stage.cta}
            </DropdownMenuItem>
          )}
          {isLager && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate(createPageUrl(`PickOrder?id=${wo.id}`));
              }}
            >
              <Package className="mr-2 h-4 w-4" />
              Plockningslista
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              base44.functions.invoke('printPickList', { work_order_id: wo.id }).then(res => {
                const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                const tab = window.open('', '_blank');
                tab.document.write(html);
                tab.document.close();
              });
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Plocklista
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              navigate(createPageUrl(`WorkOrderView?id=${wo.id}&edit=true`));
            }}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Redigera
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Vill du ta bort denna arbetsorder?')) {
                onDelete(wo.id);
              }
            }}
            className="text-red-400 focus:text-red-400 focus:bg-red-950"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Ta bort
          </DropdownMenuItem>
        </RowActionsDropdown>
      </div>
    </motion.div>
  );
}

function CompletedRow({ wo, onDelete }) {
  const navigate = useNavigate();
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer"
      onClick={() => navigate(`/WorkOrders/${wo.id}`)}
    >
      <CheckCircle2 className="w-4 h-4 text-green-500/50 shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm text-white/60 truncate">{wo.name || wo.order_number || `AO-${wo.id.slice(0, 6)}`}</h3>
        <span className="text-xs text-white/30">{wo.customer_name}</span>
      </div>
      <span className="text-xs text-white/20">{wo.delivery_date ? format(new Date(wo.delivery_date), 'd MMM', { locale: sv }) : ''}</span>
      <RowActionsDropdown>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(createPageUrl(`WorkOrderView?id=${wo.id}&edit=true`)); }}>
          <Edit2 className="mr-2 h-4 w-4" />
          Redigera
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); if (confirm('Vill du ta bort denna arbetsorder?')) onDelete(wo.id); }}
          className="text-red-400 focus:text-red-400 focus:bg-red-950"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Ta bort
        </DropdownMenuItem>
      </RowActionsDropdown>
    </motion.div>
  );
}

export default function WorkOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('process');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list('-created_date'),
    staleTime: 30000,
    refetchOnWindowFocus: true
  });

  const { user: authUser } = useAuth();
  const defaultFilter = shouldDefaultToMyOrders(authUser) ? 'me' : 'all';
  const [boardFilter, setBoardFilter] = useState(defaultFilter);
  const { data: boardData, isLoading: isBoardLoading } = useBoard({ assignedTo: boardFilter });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['chat_messages_all_wo'],
    queryFn: () => base44.entities.ChatMessage.filter({ deleted: false }, '-created_date', 500),
    enabled: !!currentUser,
    staleTime: 30000,
    refetchInterval: 60000
  });

  const { data: myReads = [] } = useQuery({
    queryKey: ['chat_reads_mine', currentUser?.email],
    queryFn: () => base44.entities.ChatRead.filter({ user_email: currentUser.email }, '-read_at', 1000),
    enabled: !!currentUser,
    staleTime: 30000,
    refetchInterval: 60000
  });

  const unreadByWO = useMemo(() => {
    if (!currentUser) return {};
    const readMessageIds = new Set(myReads.map(r => r.message_id));
    const counts = {};
    for (const msg of allMessages) {
      if (msg.author_email === currentUser.email) continue;
      if (readMessageIds.has(msg.id)) continue;
      counts[msg.work_order_id] = (counts[msg.work_order_id] || 0) + 1;
    }
    return counts;
  }, [allMessages, myReads, currentUser]);

  const deleteMutation = useMutation({
    mutationFn: (workOrderId) => base44.entities.WorkOrder.delete(workOrderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workOrders'] }),
  });

  const activeOrders = workOrders.filter(wo => wo.status !== 'klar' && wo.status !== 'completed' && wo.status !== 'avbruten' && wo.status !== 'cancelled');
  const completedOrders = workOrders.filter(wo => wo.status === 'klar' || wo.status === 'completed');

  const searchMatch = (wo) => !searchQuery ||
    wo.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());

  const activeByStage = useMemo(() => {
    const result = {};
    for (const s of ORDER_STAGES) {
      result[s.key] = activeOrders
        .filter(wo => resolveStage(wo) === s.key && searchMatch(wo))
        .map(wo => ({ ...wo, _unreadCount: unreadByWO[wo.id] || 0 }));
    }
    return result;
  }, [activeOrders, searchQuery, unreadByWO]);

  const filteredCompleted = useMemo(() =>
    completedOrders.filter(searchMatch),
    [completedOrders, searchQuery]
  );

  const totalActive = activeOrders.length;
  const totalCompleted = completedOrders.length;

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-400" />
            Arbetsordrar
          </h1>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Ny produktion
          </Button>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="bg-white/5 border border-white/10 h-10">
              <TabsTrigger value="process" className="text-xs data-[state=active]:bg-white/10">
                Process
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs data-[state=active]:bg-white/10">
                Lista
                {totalActive > 0 && <span className="ml-1.5 text-[10px] text-white/40">{totalActive}</span>}
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs data-[state=active]:bg-white/10">
                Klara
                {totalCompleted > 0 && <span className="ml-1.5 text-[10px] text-white/40">{totalCompleted}</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Sök order eller kund..."
              className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'process' ? (
              <motion.div
                key="process"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ProcessBoard
                  columns={boardData?.columns || {}}
                  totals={boardData?.totals || {}}
                  isLoading={isBoardLoading}
                />
              </motion.div>
            ) : activeTab === 'active' ? (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {ORDER_STAGES.map(({ key }) => {
                  const orders = activeByStage[key];
                  if (orders.length === 0) return null;
                  const meta = STAGE_META[key];
                  const StageIcon = meta.icon;

                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", `bg-${meta.accent}-500/15`)}>
                          <StageIcon className={cn("w-3.5 h-3.5", `text-${meta.accent}-400`)} />
                        </div>
                        <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">
                          {meta.label}
                        </h2>
                        <span className="text-xs text-white/30 font-mono">{orders.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {orders.map(wo => (
                          <WorkOrderRow
                            key={wo.id}
                            wo={wo}
                            stageKey={key}
                            onDelete={(id) => deleteMutation.mutate(id)}
                            onOpenWithdrawal={(wo) => {
                              setSelectedWorkOrder(wo);
                              setWithdrawalModalOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {Object.values(activeByStage).every(arr => arr.length === 0) && (
                  <EmptyState
                    icon={CheckCircle2}
                    title="Inga aktiva arbetsordrar"
                    description="Alla arbetsordrar är klara eller så finns inga att visa"
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="completed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5"
              >
                {filteredCompleted.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="Inga klara arbetsordrar"
                    description="Inga arbetsordrar har markerats som klara än"
                  />
                ) : (
                  filteredCompleted.map(wo => (
                    <CompletedRow
                      key={wo.id}
                      wo={wo}
                      onDelete={(id) => deleteMutation.mutate(id)}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <CreateProductionWorkOrderModal open={createModalOpen} onOpenChange={setCreateModalOpen} />

      <QuickWithdrawalModal
        open={withdrawalModalOpen}
        onOpenChange={setWithdrawalModalOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['workOrders'] })}
      />
    </div>
  );
}
