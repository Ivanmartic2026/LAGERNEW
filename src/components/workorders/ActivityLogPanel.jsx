import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { MessageSquare, History } from 'lucide-react';

function safeParseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatActivityDate(dateValue) {
  const date = safeParseDate(dateValue);
  if (!date) return 'Okänt datum';
  const hoursAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 24) {
    const mins = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (mins < 1) return 'nyss';
    if (mins < 60) return `för ${mins} min sedan`;
    return `för ${Math.floor(mins / 60)} tim sedan`;
  }
  return format(date, 'd MMM yyyy HH:mm', { locale: sv });
}

const EVENT_ICONS = {
  comment: MessageSquare,
  system: History,
  decision: History,
  assignment: History,
  file_upload: History,
  status_change: History,
  field_change: History,
};

export default function ActivityLogPanel({ workOrderId, open, onOpenChange }) {
  const [filter, setFilter] = useState('all');

  const { data: activities = [] } = useQuery({
    queryKey: ['workOrderActivity', workOrderId],
    queryFn: async () => {
      const res = await base44.entities.WorkOrderActivity.list('-created_date');
      const all = Array.isArray(res) ? res : [];
      return all.filter((a) => a.work_order_id === workOrderId);
    },
    enabled: !!workOrderId && open,
  });

  const filtered = filter === 'all' ? activities : activities.filter((a) => a.type === filter);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px] bg-black border-l border-white/10 p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <SheetTitle className="text-white text-base flex items-center gap-2">
            <History className="w-4 h-4 text-white/50" />
            Aktivitetslogg
          </SheetTitle>
          <div className="flex items-center gap-2 mt-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs bg-white/5 border border-white/10 rounded-md px-2 py-1 text-white/70"
            >
              <option value="all">Alla händelser</option>
              <option value="comment">Kommentarer</option>
              <option value="status_change">Statusändringar</option>
              <option value="assignment">Tilldelningar</option>
              <option value="file_upload">Filuppladdningar</option>
            </select>
            <span className="text-[11px] text-white/30">{filtered.length} händelser</span>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto p-5 space-y-3 max-h-[calc(100vh-140px)]">
          {filtered.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-10">Inga aktiviteter att visa</p>
          ) : (
            filtered.map((a) => {
              const Icon = EVENT_ICONS[a.type] || History;
              return (
                <div key={a.id} className="text-sm border-b border-white/5 pb-3 last:border-0">
                  <div className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/60 text-xs">{a.actor_name || 'System'}</span>
                        <span className="text-white/20 text-[10px]">{formatActivityDate(a.createdAt)}</span>
                      </div>
                      <p className="text-white/80 text-sm mt-0.5">{a.message}</p>
                      {a.field_name && (
                        <p className="text-white/40 text-xs mt-1">
                          {a.field_name}: {a.old_value} → {a.new_value}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
