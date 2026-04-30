import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  BarChart2, AlertTriangle, CheckCircle2, Zap, RefreshCw, TrendingUp,
  PackageCheck, Activity, ShieldAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KpiTile } from '@/components/ui/kpi-tile';
import { SectionHeader } from '@/components/ui/section-header';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useState, useEffect } from 'react';

const STAGE_LABELS = {
  'SÄLJ': 'Sälj',
  'KONSTRUKTION': 'Konstruktion',
  'PRODUKTION': 'Produktion',
  'LAGER': 'Lager',
  'MONTERING': 'Montering',
};

export default function HomeIvan() {
  const [me, setMe] = useState(null);
  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  const { data: orders = [] }        = useQuery({ queryKey: ['ivan-orders'],     queryFn: () => base44.entities.Order.list('-created_date', 200) });
  const { data: tasks = [] }         = useQuery({ queryKey: ['ivan-tasks'],      queryFn: () => base44.entities.Task.list('-updated_date', 100) });
  const { data: syncLogs = [] }      = useQuery({ queryKey: ['ivan-sync'],       queryFn: () => base44.entities.SyncLog.list('-created_date', 50) });
  const { data: scans = [] }         = useQuery({ queryKey: ['ivan-scans'],      queryFn: () => base44.entities.LabelScan.list('-created_date', 100) });
  const { data: quarantine = [] }    = useQuery({ queryKey: ['ivan-quarantine'], queryFn: () => base44.entities.Batch.filter({ status: 'quarantine' }) });
  const { data: notifications = [] } = useQuery({ queryKey: ['ivan-notifs'],     queryFn: () => base44.entities.Notification.list('-created_date', 50) });

  const pipelineData = Object.entries(STAGE_LABELS).map(([key, label]) => ({
    stage: label,
    count: orders.filter(o => o.status === key).length,
  }));

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const weekDeliveries = orders.filter(o => {
    if (!o.delivery_date) return false;
    const d = new Date(o.delivery_date);
    return d >= startOfWeek && d <= endOfWeek;
  });

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  const stuckTasks = tasks.filter(
    t => t.status === 'in_progress' && new Date(t.updated_date || t.created_date) < threeDaysAgo,
  );

  const todayStr   = new Date().toISOString().split('T')[0];
  const todayScans = scans.filter(s => s.created_date?.startsWith(todayStr));
  const avgConfidence = todayScans.length > 0
    ? (todayScans.reduce((sum, s) => sum + (s.field_confidence?.overall || 0), 0) / todayScans.length).toFixed(2)
    : '—';
  const monthCost = scans.reduce((sum, s) => sum + (s.ai_cost_usd || 0), 0).toFixed(2);

  const todaySyncs  = syncLogs.filter(s => s.created_date?.startsWith(todayStr));
  const failedSyncs = todaySyncs.filter(s => s.status === 'error');

  const criticalNotifs = notifications.filter(
    n => n.priority === 'critical' &&
         n.created_date > new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  );

  const totalAlerts = quarantine.length + stuckTasks.length + criticalNotifs.length;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6)  return 'God natt';
    if (h < 11) return 'God morgon';
    if (h < 18) return 'God dag';
    return 'God kväll';
  })();
  const firstName = me?.full_name?.split(' ')[0] || 'Ivan';

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-foreground/45">
          Executive overview
        </span>
        <h1 className="font-display tracking-tightest text-4xl md:text-5xl">
          {greeting}, {firstName}.
        </h1>
        <p className="text-foreground/55 max-w-prose">
          {totalAlerts === 0
            ? "Allt i pipeline rullar enligt plan."
            : `Du har ${totalAlerts} sak${totalAlerts === 1 ? '' : 'er'} att titta på idag.`}
        </p>

        <div className="flex flex-wrap gap-2 mt-2">
          <Link to="/BatchReview">
            <Button variant="signal" size="sm">
              <CheckCircle2 className="w-4 h-4" />Granska karantän
            </Button>
          </Link>
          <Link to="/BatchReanalyze">
            <Button variant="secondary" size="sm">
              <RefreshCw className="w-4 h-4" />Bulk-omanalys
            </Button>
          </Link>
          <Link to="/FortnoxSync">
            <Button variant="outline" size="sm">Fortnox</Button>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiTile
          label="Aktiva ordrar"
          value={orders.length}
          icon={PackageCheck}
          tone="signal"
          glow
        />
        <KpiTile
          label="Veckans leveranser"
          value={weekDeliveries.length}
          hint={`v${Math.ceil(((today - new Date(today.getFullYear(),0,1)) / 86400000 + 1) / 7)}`}
          icon={TrendingUp}
          tone="ok"
        />
        <KpiTile
          label="Karantän"
          value={quarantine.length}
          icon={ShieldAlert}
          tone={quarantine.length > 0 ? "bad" : "default"}
          onClick={() => window.location.href = '/BatchReview'}
        />
        <KpiTile
          label="Flaskhalsar"
          value={stuckTasks.length}
          icon={AlertTriangle}
          tone={stuckTasks.length > 0 ? "warn" : "default"}
        />
      </div>

      {/* Pipeline + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card glass className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-foreground/60" />
              <CardTitle>Pipeline per fas</CardTitle>
            </div>
            <Badge variant="secondary">live</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipelineData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background: 'hsl(0 0% 8% / 0.92)',
                    border: '1px solid hsl(0 0% 100% / 0.08)',
                    borderRadius: 12, color: '#fff', fontSize: 12,
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--signal))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-status-warn" />
              <CardTitle>Kimi AI · idag</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Stat label="Scanningar"        value={todayScans.length} />
            <Stat label="Avg confidence"    value={avgConfidence} />
            <Stat label="Kostnad månaden"   value={`$${monthCost}`} />
            <Stat label="Totalt skannat"    value={scans.length} />
          </CardContent>
        </Card>
      </div>

      {/* Operations row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card glass interactive>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-status-info" />
              <CardTitle>Fortnox sync · idag</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Stat label="Synkar totalt" value={todaySyncs.length} />
            <Stat
              label="Misslyckade"
              value={failedSyncs.length}
              valueClass={failedSyncs.length > 0 ? 'text-status-bad' : 'text-status-ok'}
            />
            <Link to="/FortnoxSync" className="block pt-1">
              <Button variant="outline" size="sm" className="w-full">Öppna Fortnox-vy</Button>
            </Link>
          </CardContent>
        </Card>

        <Card glass interactive>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-status-warn" />
              <CardTitle>Flaskhalsar ({stuckTasks.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {stuckTasks.length === 0 ? (
              <p className="text-foreground/45 text-sm">Inga blockerade uppgifter</p>
            ) : (
              <ul className="space-y-2">
                {stuckTasks.slice(0, 5).map(t => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.03] hairline-strong">
                    <span className="text-sm truncate">{t.name}</span>
                    <span className="text-[11px] text-foreground/45 shrink-0">
                      {t.assigned_to?.split('@')[0]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card glass interactive>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-status-ok" />
              <CardTitle>Veckans leveranser</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {weekDeliveries.length === 0 ? (
              <p className="text-foreground/45 text-sm">Inga leveranser denna vecka</p>
            ) : (
              <ul className="space-y-2">
                {weekDeliveries.slice(0, 5).map(o => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.03] hairline-strong">
                    <span className="text-sm truncate">{o.customer_name}</span>
                    <span className="text-[11px] text-foreground/45 shrink-0 num-tabular">{o.delivery_date}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quarantine */}
      <SectionHeader
        eyebrow="Inbox"
        title="Karantän"
        description="Batcher som AI:n flaggat och som väntar på ditt godkännande."
        actions={
          <Link to="/BatchReview">
            <Button variant="secondary" size="sm">Öppna alla</Button>
          </Link>
        }
      />
      <Card glass className={quarantine.length > 0 ? "stroke-gradient" : ""}>
        <CardContent className="p-4">
          {quarantine.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-status-ok/10">
              <CheckCircle2 className="w-5 h-5 text-status-ok" />
              <span className="text-sm text-status-ok">Ingen karantän — allt klart.</span>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {quarantine.slice(0, 8).map(b => (
                <li key={b.id}>
                  <Link
                    to={`/BatchDetail?id=${b.id}`}
                    className="flex items-center justify-between gap-3 px-2 py-3 rounded-xl hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-status-bad shadow-[0_0_8px_hsl(var(--status-bad))]" />
                      <span className="font-medium num-tabular truncate">{b.batch_number}</span>
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[12px] text-foreground/55 truncate hidden sm:block">
                        {b.article_name || b.supplier_name || '—'}
                      </span>
                      <Badge variant="quarantine">risk {b.risk_score || 0}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, valueClass }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-foreground/55">{label}</span>
      <span className={`font-display num-tabular ${valueClass || 'text-foreground'}`}>{value}</span>
    </div>
  );
}
