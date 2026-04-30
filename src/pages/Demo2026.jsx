/**
 * Demo2026 — public showcase of the IM Vision 2026 (Tesla/Apple) design system.
 * No auth, no API calls. Mounted at /Demo2026 (public route in App.jsx).
 */
import React, { useState } from "react";
import {
  PackageCheck, TrendingUp, ShieldAlert, AlertTriangle, BarChart2, Zap,
  Activity, CheckCircle2, RefreshCw, ChevronRight, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/ui/kpi-tile";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const fakePipeline = [
  { stage: "Sälj",         count: 24 },
  { stage: "Konstruktion", count: 18 },
  { stage: "Produktion",   count: 31 },
  { stage: "Lager",        count: 12 },
  { stage: "Montering",    count:  9 },
];

const fakeQuarantine = [
  { id: 1, batch_number: "B-2026-0421", article_name: "Servoblock SK-12",  risk_score: 84 },
  { id: 2, batch_number: "B-2026-0418", article_name: "Kabelhärva A2",     risk_score: 67 },
  { id: 3, batch_number: "B-2026-0417", article_name: "Sensorpaket V3",    risk_score: 92 },
];

export default function Demo2026() {
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient aurora */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[60vw] h-[60vw] rounded-full opacity-[0.10] blur-3xl"
             style={{ background: "radial-gradient(circle, hsl(var(--signal)), transparent 65%)" }} />
        <div className="absolute -bottom-40 -right-20 w-[50vw] h-[50vw] rounded-full opacity-[0.07] blur-3xl"
             style={{ background: "radial-gradient(circle, hsl(210 100% 60%), transparent 65%)" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-12">
        {/* Hero */}
        <header className="space-y-3">
          <span className="text-[11px] uppercase tracking-[0.18em] text-foreground/45">
            IM Vision · Design System 2026
          </span>
          <h1 className="font-display tracking-tightest text-4xl md:text-6xl">
            Tesla touch. Apple polish.
          </h1>
          <p className="text-foreground/60 max-w-2xl text-lg">
            En live‑genomgång av nya tokens, primitiver och layout‑shellet.
            Allt på den här sidan är samma komponenter som används i appen — utan inloggning.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="signal">
              Primary signal CTA <ChevronRight />
            </Button>
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </header>

        {/* Color tokens */}
        <section className="space-y-4">
          <SectionHeader
            eyebrow="01"
            title="Färg & ytor"
            description="OLED‑svart bas, tre höjda ytlager och statusfärger som tonade pills istället för pastellblock."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Swatch name="Background" varName="--background" />
            <Swatch name="Surface 1"  varName="--surface-1" />
            <Swatch name="Surface 2"  varName="--surface-2" />
            <Swatch name="Surface 3"  varName="--surface-3" />
            <Swatch name="Signal"     varName="--signal"     glow />
            <Swatch name="Status OK"  varName="--status-ok" />
            <Swatch name="Status warn" varName="--status-warn" />
            <Swatch name="Status bad" varName="--status-bad" />
          </div>
        </section>

        {/* KPI tiles */}
        <section className="space-y-4">
          <SectionHeader eyebrow="02" title="KPI‑rutnät" description="Apple‑känsla: stora tabular‑siffror, hairline‑border, mjuk hover." />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiTile label="Aktiva ordrar"      value="124" delta={4.2}  icon={PackageCheck} tone="signal" glow />
            <KpiTile label="Veckans leveranser" value="38"  delta={12.5} icon={TrendingUp}   tone="ok" />
            <KpiTile label="Karantän"           value="3"   icon={ShieldAlert}              tone="bad" />
            <KpiTile label="Flaskhalsar"        value="2"   delta={-1.4} icon={AlertTriangle} tone="warn" />
          </div>
        </section>

        {/* Cards + chart */}
        <section className="space-y-4">
          <SectionHeader eyebrow="03" title="Kort & chart" description="Glas, hairline, mjuk depth. Recharts retoneras till mörka glas‑tooltips." />
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
                  <BarChart data={fakePipeline} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                <Stat label="Scanningar"       value="42" />
                <Stat label="Avg confidence"   value="0.94" />
                <Stat label="Kostnad månaden"  value="$18.42" />
                <Stat label="Totalt skannat"   value="1 287" />
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">Öppna AI‑logg</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Inputs + status */}
        <section className="space-y-4">
          <SectionHeader eyebrow="04" title="Form‑element" description="Höjd 44px för touch, neon focus‑halo." />
          <Card glass>
            <CardContent className="p-6 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                <Input
                  placeholder="Sök artiklar, ordrar, batcher…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Email" type="email" />
                <Input placeholder="Lösenord" type="password" />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <StatusBadge status="active" />
                <StatusBadge status="picking" />
                <StatusBadge status="quarantine" />
                <StatusBadge status="completed" />
                <StatusBadge status="in_production" />
                <Badge variant="default">Default</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="verified">Verified</Badge>
                <Badge variant="quarantine">Quarantine</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quarantine list */}
        <section className="space-y-4">
          <SectionHeader
            eyebrow="05"
            title="Karantän‑inbox"
            description="Hairline‑rader, neon‑prick på riskstatus."
            actions={<Button variant="secondary" size="sm">Öppna alla</Button>}
          />
          <Card glass className="stroke-gradient">
            <CardContent className="p-4">
              <ul className="divide-y divide-white/[0.06]">
                {fakeQuarantine.map(b => (
                  <li key={b.id}>
                    <div className="flex items-center justify-between gap-3 px-2 py-3 rounded-xl hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-status-bad shadow-[0_0_8px_hsl(var(--status-bad))]" />
                        <span className="font-medium num-tabular truncate">{b.batch_number}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-foreground/55 truncate hidden sm:block">{b.article_name}</span>
                        <Badge variant="quarantine">risk {b.risk_score}</Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Operations row */}
        <section className="space-y-4">
          <SectionHeader eyebrow="06" title="Drifts‑kort" description="Interaktiva glaskort med subtle hover‑lift." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card glass interactive>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-status-info" />
                  <CardTitle>Fortnox sync</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Stat label="Synkar idag" value="148" />
                <Stat label="Misslyckade" value="0" valueClass="text-status-ok" />
              </CardContent>
            </Card>

            <Card glass interactive>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-status-ok" />
                  <CardTitle>Senaste skanning</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display num-tabular">02:14</div>
                <div className="text-sm text-foreground/55">minuter sedan</div>
              </CardContent>
            </Card>

            <Card glass interactive>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-foreground/60" />
                  <CardTitle>Bulk‑omanalys</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/55 mb-3">Kör om Kimi AI på äldre batcher.</p>
                <Button variant="signal" size="sm">Starta jobb</Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="pt-8 pb-24 text-center text-foreground/40 text-xs tracking-widest uppercase">
          IM Vision Design System · 2026 preview
        </footer>
      </div>
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

function Swatch({ name, varName, glow }) {
  return (
    <div className={`rounded-2xl p-4 hairline-strong ${glow ? 'glow-soft' : ''}`}
         style={{ background: `hsl(var(${varName}))` }}>
      <div className="text-[11px] uppercase tracking-[0.12em] mix-blend-difference text-white">
        {name}
      </div>
      <div className="text-[11px] mt-2 num-tabular mix-blend-difference text-white/80">
        var({varName})
      </div>
    </div>
  );
}
