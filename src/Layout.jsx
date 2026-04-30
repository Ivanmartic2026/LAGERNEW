import React, { useEffect, useState as useReactState } from 'react';
import { createPageUrl } from "@/utils";
import {
  Camera, Package, Menu, X, MapPin, Activity, FileText,
  ShoppingCart, PackageSearch, ClipboardList, BarChart2, Layers,
  Users, Clock, Car, Scan, CheckCircle2, RefreshCw, Lightbulb, GitMerge,
  Search, ArrowLeft, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import NotificationBell from "@/components/notifications/NotificationBell";
import QuickWithdrawalModal from "@/components/inventory/QuickWithdrawalModal";
import CommandMenu from "@/components/search/CommandMenu";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";
import PWAOptimizer from "@/components/pwa/PWAOptimizer";
import PushManager from "@/components/pwa/PushManager";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { LanguageProvider, useLanguage } from "@/components/language/LanguageProvider";
import LanguageToggle from "@/components/language/LanguageToggle";
import { t } from "@/components/language/translations";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { queryClientInstance } from '@/lib/query-client';
import ErrorBoundary from "@/components/utils/ErrorBoundary";
import IOSInstallPrompt from "@/components/pwa/IOSInstallPrompt";
import IOSPushPrompt from "@/components/pwa/IOSPushPrompt";
import SWUpdateForcer from "@/components/pwa/SWUpdateForcer";

/**
 * IM Vision 2026 Layout
 * --------------------------------------------------------------------------
 *  - Desktop: floating glass top bar + a centered glass "Tesla dock" at the
 *    bottom with pill segments and a neon active indicator.
 *  - Mobile : floating glass top bar + bottom tab bar (Apple Dock feel).
 *  - Page transitions: spring + subtle blur for depth.
 * --------------------------------------------------------------------------
 */

const SPRING = { type: "spring", stiffness: 380, damping: 32, mass: 0.6 };

function LayoutContent({ children, currentPageName }) {
  const { language } = useLanguage();
  const [userModules, setUserModules] = useReactState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [navCollapsed, setNavCollapsed] = useReactState(
    () => localStorage.getItem('nav_collapsed') === 'true',
  );

  const [navigationStacks, setNavigationStacks] = useReactState(() => {
    localStorage.removeItem('nav_stacks');
    return {};
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await base44.auth.me();
        setUserModules(user?.allowed_modules || []);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    fetchUserData();
  }, []);

  const NAV_ITEMS = [
    { name: "Inventory",      label: t('nav_inventory', language),    icon: Package,        module: null },
    { name: "Orders",         label: t('nav_orders', language),       icon: ShoppingCart,   module: "Orders" },
    { name: "WorkOrders",     label: t('nav_work_orders', language),  icon: ClipboardList,  module: null },
    { name: "PurchaseOrders", label: t('nav_purchase', language),     icon: ShoppingCart,   module: "PurchaseOrders" },
    { name: "SiteReports",    label: t('nav_site', language),         icon: MapPin,         module: "SiteReports" },
    { name: "Repairs",        label: t('nav_repairs', language),      icon: Activity,       module: "Repairs" },
    { name: "ProjectResults", label: t('nav_projects', language),     icon: BarChart2,      module: null },
    { name: "Admin",          label: t('nav_admin', language),        icon: FileText,       module: null },
  ];

  const ADMIN_SUB_ITEMS = [
    { name: "WorkspaceProjects", label: t('nav_workspace', language), icon: Layers },
    { name: "MedarbetarOversikt",label: t('nav_employees', language), icon: Users },
    { name: "TidsRapport",       label: t('nav_timesheet', language), icon: Clock },
    { name: "KilometerErsattning",label: t('nav_mileage', language),  icon: Car },
    { name: "FortnoxSync",       label: "Fortnox",                    icon: ShoppingCart },
    { name: "FortnoxCustomers",  label: "Fortnox-kunder",             icon: ShoppingCart },
    { name: "BatchDashboard",    label: "Batch AI",                   icon: Scan },
    { name: "BatchReview",       label: "Batch Review",               icon: CheckCircle2 },
    { name: "BatchSuggestions",  label: "Förslag",                    icon: Lightbulb },
    { name: "BatchReanalyze",    label: "Omanalysera",                icon: RefreshCw },
    { name: "UsersManagement",   label: "Användare",                  icon: Users },
    { name: "MigrationCenter",   label: "Migration",                  icon: RefreshCw },
    { name: "MatchReview",       label: "Match Review",               icon: Search },
    { name: "PatternRules",      label: "Mönster",                    icon: GitMerge },
  ];

  const visibleNavItems = NAV_ITEMS.filter(
    item => !item.module || userModules.includes(item.module),
  );

  const [mobileMenuOpen, setMobileMenuOpen]       = useState(false);
  const [withdrawalModalOpen, setWithdrawalOpen]  = useState(false);

  // Persist nav stacks
  useEffect(() => {
    const currentTab = visibleNavItems.find(item =>
      location.pathname.toLowerCase().includes(`/${item.name.toLowerCase()}`),
    );
    if (currentTab) {
      const newStacks = { ...navigationStacks };
      if (!newStacks[currentTab.name]) newStacks[currentTab.name] = [];
      const lastPath = newStacks[currentTab.name][newStacks[currentTab.name].length - 1];
      if (lastPath !== location.pathname) {
        newStacks[currentTab.name].push(location.pathname);
        if (newStacks[currentTab.name].length > 10) newStacks[currentTab.name].shift();
        setNavigationStacks(newStacks);
        localStorage.setItem('nav_stacks', JSON.stringify(newStacks));
      }
    }
  }, [location.pathname]);

  const handleTabClick = (tabName) => {
    const stack = navigationStacks[tabName];
    const tabRoot = `/${tabName.toLowerCase()}`;
    if (stack && stack.length > 0) {
      const lastPath = stack[stack.length - 1];
      if (lastPath.toLowerCase().startsWith(tabRoot)) { navigate(lastPath); return; }
    }
    navigate(createPageUrl(tabName));
  };

  const rootPages = visibleNavItems.map(item => `/${item.name.toLowerCase()}`);
  const isDeepPage = !rootPages.includes(location.pathname.toLowerCase()) && location.pathname !== '/';

  // PWA setup
  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'data:application/json;base64,eyJuYW1lIjoiSU12aXNpb24gTGFnZXIgJiBPcmRlciIsInNob3J0X25hbWUiOiJJTXZpc2lvbiIsImRlc2NyaXB0aW9uIjoiTGFnZXJzdHlybmluZyBvY2ggb3JkZXJoYW5kZXJpbmcgZsO2ciBJTXZpc2lvbiIsInN0YXJ0X3VybCI6Ii8iLCJzY29wZSI6Ii8iLCJkaXNwbGF5Ijoic3RhbmRhbG9uZSIsIm9yaWVudGF0aW9uIjoicG9ydHJhaXQtcHJpbWFyeSIsImJhY2tncm91bmRfY29sb3IiOiIjMDAwMDAwIiwidGhlbWVfY29sb3IiOiIjMDAwMDAwIiwicHJlZmVyX3JlbGF0ZWRfYXBwbGljYXRpb25zIjpmYWxzZX0=';
      document.head.appendChild(link);
    }
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no';
      document.head.appendChild(viewport);
    }
    const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleStatusBar) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-status-bar-style';
      meta.content = 'black-translucent';
      document.head.appendChild(meta);
    }
  }, []);

  const NavTile = ({ item, active, compact }) => (
    <button
      key={item.name}
      onClick={() => handleTabClick(item.name)}
      className={cn(
        "relative flex items-center gap-2 px-3 h-10 rounded-full",
        "transition-all duration-300 ease-apple group",
        active ? "text-foreground" : "text-foreground/55 hover:text-foreground",
      )}
    >
      {active && (
        <motion.div
          layoutId="dock-active"
          transition={SPRING}
          className="absolute inset-0 rounded-full bg-white/[0.08] hairline-strong"
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        <item.icon className="w-4 h-4" />
        {!compact && (
          <span className="text-[13px] font-medium tracking-tight whitespace-nowrap">
            {item.label}
          </span>
        )}
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SWUpdateForcer />
      <PWAOptimizer />
      <PushManager />
      <OfflineIndicator />
      <InstallPrompt />

      {/* Ambient backdrop — soft purple aurora */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[60vw] h-[60vw] rounded-full opacity-[0.08] blur-3xl"
             style={{ background: "radial-gradient(circle, hsl(var(--signal)), transparent 65%)" }} />
        <div className="absolute -bottom-40 -right-20 w-[50vw] h-[50vw] rounded-full opacity-[0.06] blur-3xl"
             style={{ background: "radial-gradient(circle, hsl(210 100% 60%), transparent 65%)" }} />
      </div>

      {/* ========== DESKTOP TOP BAR (glass, floating) ========== */}
      <div className="hidden md:flex fixed top-4 left-4 right-4 z-50">
        <div className="glass-strong rounded-2xl flex items-center justify-between w-full px-4 h-14">
          <button onClick={() => navigate(createPageUrl("Home"))} className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png"
              alt="IMvision"
              className="h-6 object-contain opacity-90"
              loading="lazy"
            />
          </button>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost" size="icon"
              onClick={() => setWithdrawalOpen(true)}
              title="Uttag från lager"
            >
              <PackageSearch className="w-4 h-4" />
            </Button>
            <LanguageToggle />
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* ========== DESKTOP DOCK (Tesla/Apple) ========== */}
      <nav className="hidden md:flex fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <div className="glass-strong rounded-full px-2 h-14 flex items-center gap-1 shadow-card-2">
          <button
            onClick={() => {
              setNavCollapsed(!navCollapsed);
              localStorage.setItem('nav_collapsed', !navCollapsed);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-colors"
            title={navCollapsed ? "Expandera" : "Minimera"}
          >
            {navCollapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />}
          </button>

          {visibleNavItems.map(item => (
            <NavTile
              key={item.name}
              item={item}
              compact={navCollapsed}
              active={currentPageName === item.name}
            />
          ))}

          {!navCollapsed && (
            <>
              <div className="mx-1 h-7 w-px bg-white/10" />
              {ADMIN_SUB_ITEMS.slice(0, 6).map(item => (
                <NavTile
                  key={item.name}
                  item={item}
                  compact
                  active={currentPageName === item.name}
                />
              ))}
            </>
          )}
        </div>
      </nav>

      {/* ========== MOBILE TOP BAR ========== */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 glass-strong flex items-center justify-between px-3"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(3.5rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          {isDeepPage ? (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <button onClick={() => navigate(createPageUrl("Home"))} className="px-1">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png"
                alt="IMvision"
                className="h-6 object-contain opacity-90"
              />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setWithdrawalOpen(true)} title="Uttag">
            <PackageSearch className="w-5 h-5" />
          </Button>
          <LanguageToggle />
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* ========== MOBILE FULL MENU ========== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-background/90 backdrop-blur-2xl flex flex-col"
            style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}
          >
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {visibleNavItems.map(item => (
                <button
                  key={item.name}
                  onClick={() => { handleTabClick(item.name); setMobileMenuOpen(false); }}
                  className={cn(
                    "w-full text-left flex items-center gap-4 px-4 h-14 rounded-2xl transition-colors",
                    currentPageName === item.name
                      ? "bg-white/[0.07] text-foreground hairline-strong"
                      : "text-foreground/70 hover:text-foreground hover:bg-white/[0.04]",
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium tracking-tight">{item.label}</span>
                </button>
              ))}
              <div className="pt-3 mt-3 border-t border-white/5">
                <p className="text-[11px] text-foreground/40 tracking-widest uppercase px-4 py-2">Admin</p>
                {ADMIN_SUB_ITEMS.map(item => (
                  <button
                    key={item.name}
                    onClick={() => { handleTabClick(item.name); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full text-left flex items-center gap-4 px-4 h-12 rounded-xl transition-colors",
                      currentPageName === item.name
                        ? "bg-white/[0.07] text-foreground"
                        : "text-foreground/55 hover:text-foreground hover:bg-white/[0.04]",
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm tracking-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MOBILE BOTTOM TAB BAR ========== */}
      <nav
        className="md:hidden fixed bottom-3 left-3 right-3 z-50 glass-strong rounded-full overflow-x-auto px-2 shadow-card-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(3.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-1 min-w-max h-[3.75rem]">
          {visibleNavItems.slice(0, 6).map(item => (
            <NavTile
              key={item.name}
              item={item}
              compact
              active={currentPageName === item.name}
            />
          ))}
        </div>
      </nav>

      {/* ========== MAIN ========== */}
      <main
        className="relative z-10 md:pt-24 min-h-screen"
        style={{
          paddingTop: 'calc(3.75rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
        }}
      >
        <ErrorBoundary>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
              exit   ={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      <CommandMenu />

      <QuickWithdrawalModal
        open={withdrawalModalOpen}
        onOpenChange={setWithdrawalOpen}
        onSuccess={() => queryClientInstance.invalidateQueries({ queryKey: ['articles'] })}
      />

      <IOSInstallPrompt />
      <IOSPushPrompt />

      {/* Floating CTA — Scan/Camera */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => navigate(createPageUrl("Scan"))}
        className="fixed bottom-24 md:bottom-24 right-5 w-14 h-14 rounded-full bg-signal text-white glow-signal z-40 flex items-center justify-center"
        title="Öppna kamera"
      >
        <Camera className="w-6 h-6" />
      </motion.button>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <LanguageProvider>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </LanguageProvider>
  );
}
