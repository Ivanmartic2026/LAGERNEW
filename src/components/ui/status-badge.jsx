import React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Truck,
  Package,
  Wrench,
  ShoppingCart,
  Loader2,
  PauseCircle,
  Ban,
  FileText,
  Sparkles,
  Search,
  ShieldAlert,
  Archive,
} from 'lucide-react';

// ───────────────────────────────────────────────────────────────
// SendIcon — must be declared BEFORE STATUS_MAP uses it
// ───────────────────────────────────────────────────────────────

function SendIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────
// Status configuration
// ───────────────────────────────────────────────────────────────

const STATUS_MAP = {
  // Order statuses
  'SÄLJ':         { label: 'Sälj',           color: 'slate',   icon: ShoppingCart },
  'KONSTRUKTION': { label: 'Konstruktion',   color: 'blue',    icon: FileText },
  'PRODUKTION':   { label: 'Produktion',     color: 'purple',  icon: Wrench },
  'LAGER':        { label: 'Lager',          color: 'orange',  icon: Package },
  'MONTERING':    { label: 'Montering',      color: 'emerald', icon: Truck },
  'picking':      { label: 'Plockning',      color: 'amber',   icon: Package },
  'picked':       { label: 'Plockad',        color: 'emerald', icon: CheckCircle2 },
  'in_production':{ label: 'I produktion',   color: 'purple',  icon: Loader2 },
  'completed':    { label: 'Slutförd',       color: 'emerald', icon: CheckCircle2 },

  // WorkOrder statuses
  'v_ntande':     { label: 'Väntande',       color: 'slate',   icon: Clock },
  'p_g_r':        { label: 'Pågår',          color: 'blue',    icon: Loader2 },
  'klar':         { label: 'Klar',           color: 'emerald', icon: CheckCircle2 },
  'avbruten':     { label: 'Avbruten',       color: 'red',     icon: Ban },

  // WorkOrder stages
  'konstruktion': { label: 'Konstruktion',   color: 'blue',    icon: FileText },
  'produktion':   { label: 'Produktion',     color: 'purple',  icon: Wrench },
  'lager':        { label: 'Lager',          color: 'orange',  icon: Package },
  'montering':    { label: 'Montering',      color: 'amber',   icon: Truck },
  'leverans':     { label: 'Leverans',       color: 'emerald', icon: Truck },

  // PurchaseOrder statuses
  'draft':                 { label: 'Utkast',          color: 'slate',   icon: FileText },
  'sent':                  { label: 'Skickad',         color: 'blue',    icon: SendIcon },
  'confirmed':             { label: 'Bekräftad',       color: 'emerald', icon: CheckCircle2 },
  'waiting_for_supplier_documentation': { label: 'Väntar dokument', color: 'amber', icon: FileText },
  'in_production':         { label: 'I produktion',    color: 'purple',  icon: Loader2 },
  'shipped':               { label: 'Skeppad',         color: 'blue',    icon: Truck },
  'ready_for_reception':   { label: 'Redo för mottag', color: 'amber',   icon: Package },
  'received':              { label: 'Mottagen',        color: 'emerald', icon: CheckCircle2 },
  'cancelled':             { label: 'Avbruten',        color: 'red',     icon: Ban },

  // Article statuses
  'active':              { label: 'Aktiv',        color: 'emerald', icon: CheckCircle2 },
  'low_stock':           { label: 'Lågt lager',   color: 'amber',   icon: AlertTriangle },
  'out_of_stock':        { label: 'Slut',         color: 'red',     icon: XCircle },
  'discontinued':        { label: 'Utgången',     color: 'slate',   icon: Archive },
  'on_repair':           { label: 'På reparation',color: 'purple',  icon: Wrench },
  'in_transit':          { label: 'Under transport', color: 'blue', icon: Truck },
  'pending_verification':{ label: 'Väntar granskning', color: 'amber', icon: Search },

  // Batch statuses
  'pending_verification': { label: 'Väntar',      color: 'amber',   icon: Search },
  'verified':             { label: 'Verifierad',  color: 'emerald', icon: CheckCircle2 },
  'rejected':             { label: 'Avvisad',     color: 'red',     icon: XCircle },
  'quarantine':           { label: 'Karantän',    color: 'red',     icon: ShieldAlert },

  // Generic
  'pending':  { label: 'Väntar',    color: 'amber',   icon: Clock },
  'active':   { label: 'Aktiv',     color: 'emerald', icon: CheckCircle2 },
  'done':     { label: 'Klar',      color: 'emerald', icon: CheckCircle2 },
  'open':     { label: 'Öppen',     color: 'blue',    icon: FileText },
  'closed':   { label: 'Stängd',    color: 'slate',   icon: Archive },
  'error':    { label: 'Fel',       color: 'red',     icon: XCircle },
  'warning':  { label: 'Varning',   color: 'amber',   icon: AlertTriangle },
};

const COLOR_STYLES = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
  purple:  'bg-purple-500/10 border-purple-500/20 text-purple-400',
  amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
  orange:  'bg-orange-500/10 border-orange-500/20 text-orange-400',
  red:     'bg-red-500/10 border-red-500/20 text-red-400',
  slate:   'bg-slate-500/10 border-slate-500/20 text-slate-400',
};

// ───────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}) {
  const config = STATUS_MAP[status] || { label: status, color: 'slate', icon: null };
  const Icon = config.icon;
  const colorClass = COLOR_STYLES[config.color] || COLOR_STYLES.slate;

  const sizeClasses = {
    sm: 'h-5  text-[10px] px-2   gap-1',
    md: 'h-6  text-[11px] px-2.5 gap-1.5',
    lg: 'h-7  text-[12px] px-3   gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium tracking-tight num-tabular whitespace-nowrap transition-colors',
        colorClass,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && Icon && <Icon className={cn(iconSizes[size], config.icon === Loader2 && 'animate-spin')} />}
      {config.label}
    </span>
  );
}

// Helper to get just the color class for custom usage
export function getStatusColor(status) {
  const config = STATUS_MAP[status];
  return config?.color || 'slate';
}

// Helper to get label
export function getStatusLabel(status) {
  const config = STATUS_MAP[status];
  return config?.label || status;
}
