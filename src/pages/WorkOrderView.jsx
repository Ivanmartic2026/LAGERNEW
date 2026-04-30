import { useState, useEffect, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, History } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { filterVisibleTabs, canEditTab } from "@/lib/permissions";

import WorkOrderHeader from "@/components/workorders/WorkOrderHeader";
import ProcessFlow from "@/components/workorders/ProcessFlow";
import CriticalNotesBanner from "@/components/workorders/CriticalNotesBanner";
import RoleAssignmentBar from "@/components/workorders/RoleAssignmentBar";
import ActivityLogPanel from "@/components/workorders/ActivityLogPanel";
import PhaseTransitionCTA from "@/components/workorders/PhaseTransitionCTA";

// Tab components
import OverviewTab from "@/components/workorders/tabs/OverviewTab";
import KonstruktionTab from "@/components/workorders/tabs/KonstruktionTab";
import ProduktionTab from "@/components/workorders/tabs/ProduktionTab";
import LagerTab from "@/components/workorders/tabs/LagerTab";
import MonteringTab from "@/components/workorders/tabs/MonteringTab";
import LeveransTab from "@/components/workorders/tabs/LeveransTab";

const ALL_TABS = [
  { key: 'overview', label: 'Översikt', phase: null },
  { key: 'konstruktion', label: 'Konstruktion', phase: 'konstruktion' },
  { key: 'produktion', label: 'Produktion', phase: 'produktion' },
  { key: 'lager', label: 'Lager', phase: 'lager' },
  { key: 'montering', label: 'Montering', phase: 'montering' },
  { key: 'leverans', label: 'Leverans', phase: 'leverans' },
];

export default function WorkOrderViewPage() {
  const { workOrderId: workOrderIdParam, tab: tabParam } = useParams();
  const urlSearchParams = new URLSearchParams(window.location.search);
  const workOrderId = workOrderIdParam || urlSearchParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [activityOpen, setActivityOpen] = useState(false);

  const visibleTabs = useMemo(() => filterVisibleTabs(authUser, ALL_TABS), [authUser]);

  // Sticky tab per order
  const storageKey = `wo-tab-${workOrderId}`;
  const rawTab = tabParam || localStorage.getItem(storageKey) || 'overview';
  const defaultTab = visibleTabs.find((t) => t.key === rawTab)?.key || visibleTabs[0]?.key || 'overview';
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['workOrder', workOrderId],
    queryFn: async () => {
      const list = await base44.entities.WorkOrder.filter({ id: workOrderId });
      return list[0] || null;
    },
    enabled: !!workOrderId
  });

  // Fetch roles for this work order
  const { data: roles = [] } = useQuery({
    queryKey: ['workOrderRoles', workOrderId],
    queryFn: async () => {
      const res = await base44.entities.WorkOrderRole.filter({ work_order_id: workOrderId });
      return Array.isArray(res) ? res : [];
    },
    enabled: !!workOrderId,
  });

  // Fetch linked order
  const { data: order } = useQuery({
    queryKey: ['order', workOrder?.order_id],
    queryFn: async () => {
      if (!workOrder?.order_id) return null;
      const list = await base44.entities.Order.filter({ id: workOrder.order_id });
      return list[0] || null;
    },
    enabled: !!workOrder?.order_id,
  });

  const updateWOMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrder', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    },
  });

  const handleTabChange = (newTab) => {
    if (!visibleTabs.find((t) => t.key === newTab)) return;
    setActiveTab(newTab);
    localStorage.setItem(storageKey, newTab);
    navigate(`/WorkOrders/${workOrderId}/${newTab}`, { replace: true });
  };

  const handleSaveNotes = (field, value) => {
    updateWOMutation.mutateAsync({ id: workOrderId, data: { [field]: value } });
  };

  if (isLoading || !workOrder) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50">Laddar arbetsorder...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Back + Print + Activity buttons */}
          <div className="flex items-center justify-between">
            <Link to={createPageUrl('WorkOrders')}>
              <Button variant="ghost" className="text-white/60 hover:text-white -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Work Orders
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"
                className="bg-white/5 border-white/20 hover:bg-white/10 text-white gap-2"
                onClick={() => setActivityOpen(true)}>
                <History className="w-4 h-4" /> Aktivitet
              </Button>
              <Button variant="outline" size="sm"
                className="bg-white/5 border-white/20 hover:bg-white/10 text-white gap-2"
                onClick={() => window.open(`/PrintPickList?id=${workOrderId}`, '_blank')}>
                <Printer className="w-4 h-4" /> Plocklista
              </Button>
              <Button variant="outline" size="sm"
                className="bg-white/5 border-white/20 hover:bg-white/10 text-white gap-2"
                onClick={() => window.open(`/PrintWorkOrder?id=${workOrderId}`, '_blank')}>
                <Printer className="w-4 h-4" /> Arbetsorder
              </Button>
            </div>
          </div>

          {/* Critical Notes */}
          <CriticalNotesBanner text={workOrder.critical_notes || order?.critical_notes} />

          {/* Header Card */}
          <WorkOrderHeader
            workOrder={workOrder}
            order={order}
            onNameChange={(name) => handleSaveNotes('name', name)}
            onStatusChange={(status) => updateWOMutation.mutateAsync({ id: workOrderId, data: { status } })}
          />

          {/* Role Assignment Bar */}
          <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Rolltilldelningar</p>
            <RoleAssignmentBar roles={roles} />
          </div>

          {/* Process Flow */}
          <ProcessFlow workOrder={workOrder} />

          {/* Phase Transition CTA */}
          <div className="flex justify-end">
            <PhaseTransitionCTA
              workOrder={workOrder}
              currentPhase={workOrder.current_stage}
              onTransition={() => {
                queryClient.invalidateQueries({ queryKey: ['workOrder', workOrderId] });
                queryClient.invalidateQueries({ queryKey: ['board'] });
              }}
            />
          </div>

          {/* Tabs */}
          <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-white/10">
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`
                      relative px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors
                      ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
                    `}
                  >
                    {tab.label}
                    {!canEditTab(authUser, tab.key) && tab.key !== 'overview' && (
                      <span className="ml-1 text-[9px] text-white/20">(läs)</span>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-white rounded-full" />
                    )}
                    {tab.phase === workOrder.current_stage && !isActive && (
                      <div className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="p-4 md:p-5">
              {activeTab === 'overview' && (
                <OverviewTab workOrder={workOrder} order={order} roles={roles} />
              )}
              {activeTab === 'konstruktion' && (
                <KonstruktionTab workOrder={workOrder} workOrderId={workOrderId} onSaveNotes={handleSaveNotes} />
              )}
              {activeTab === 'produktion' && (
                <ProduktionTab workOrder={workOrder} workOrderId={workOrderId} />
              )}
              {activeTab === 'lager' && (
                <LagerTab workOrder={workOrder} workOrderId={workOrderId} />
              )}
              {activeTab === 'montering' && (
                <MonteringTab workOrder={workOrder} workOrderId={workOrderId} />
              )}
              {activeTab === 'leverans' && (
                <LeveransTab workOrder={workOrder} workOrderId={workOrderId} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Panel */}
      <ActivityLogPanel
        workOrderId={workOrderId}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </>
  );
}
