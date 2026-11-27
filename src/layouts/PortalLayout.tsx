import React, { useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  CloudSun,
  Droplets,
  HelpCircle,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  TestTube2,
  Tractor,
  User,
  Users,
  WifiOff,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export type PortalSection =
  | 'dashboard'
  | 'farms'
  | 'soil'
  | 'irrigation'
  | 'plant-health'
  | 'weather'
  | 'marketplace'
  | 'orders'
  | 'services'
  | 'team'
  | 'eco-points'
  | 'expert-hub'
  | 'support'
  | 'notifications'
  | 'profile'
  | 'admin';

interface NavItem {
  id: PortalSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function PortalLayout({
  activeSection,
  onNavigate,
  unreadNotifications,
  children
}: {
  activeSection: PortalSection;
  onNavigate: (section: PortalSection) => void;
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const { userDoc, firebaseUser, isAdmin, isOnline, signOut, resendVerification } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const role = userDoc?.role || 'farmer';

  // Strict role-based navigation: each role sees only its authorized workspace modules
  const navItems: NavItem[] = (() => {
    if (role === 'farmer') {
      return [
        { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { id: 'farms', label: t.nav.farms, icon: Sprout },
        { id: 'soil', label: t.nav.soil, icon: TestTube2 },
        { id: 'irrigation', label: t.nav.irrigation, icon: Droplets },
        { id: 'plant-health', label: t.nav.plantHealth, icon: Leaf },
        { id: 'weather', label: t.nav.weather, icon: CloudSun },
        { id: 'marketplace', label: t.nav.marketplace, icon: ShoppingBag },
        { id: 'orders', label: t.nav.orders, icon: Package },
        { id: 'services', label: t.nav.services, icon: Tractor },
        { id: 'team', label: t.nav.team, icon: Users },
        { id: 'eco-points', label: t.nav.ecoPoints, icon: Award },
        { id: 'expert-hub', label: t.nav.knowledge, icon: BookOpen },
        { id: 'support', label: t.nav.support, icon: HelpCircle },
        { id: 'notifications', label: t.nav.notifications, icon: Bell, badge: unreadNotifications },
        { id: 'profile', label: t.nav.profile, icon: User }
      ];
    }
    if (role === 'buyer') {
      return [
        { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { id: 'marketplace', label: t.nav.marketplace, icon: ShoppingBag },
        { id: 'orders', label: t.nav.orders, icon: Package },
        { id: 'expert-hub', label: t.nav.knowledge, icon: BookOpen },
        { id: 'support', label: t.nav.support, icon: HelpCircle },
        { id: 'notifications', label: t.nav.notifications, icon: Bell, badge: unreadNotifications },
        { id: 'profile', label: t.nav.profile, icon: User }
      ];
    }
    if (role === 'provider') {
      return [
        { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { id: 'services', label: t.nav.providerHub, icon: Tractor },
        { id: 'weather', label: t.nav.weather, icon: CloudSun },
        { id: 'support', label: t.nav.support, icon: HelpCircle },
        { id: 'notifications', label: t.nav.notifications, icon: Bell, badge: unreadNotifications },
        { id: 'profile', label: t.nav.profile, icon: User }
      ];
    }
    if (role === 'expert') {
      return [
        { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { id: 'expert-hub', label: t.nav.expertHub, icon: BookOpen },
        { id: 'plant-health', label: t.nav.plantHealth, icon: Leaf },
        { id: 'weather', label: t.nav.weather, icon: CloudSun },
        { id: 'support', label: t.nav.support, icon: HelpCircle },
        { id: 'notifications', label: t.nav.notifications, icon: Bell, badge: unreadNotifications },
        { id: 'profile', label: t.nav.profile, icon: User }
      ];
    }
    // Admin role
    return [
      { id: 'admin', label: t.nav.adminPanel, icon: ShieldCheck },
      { id: 'marketplace', label: t.nav.marketplace, icon: ShoppingBag },
      { id: 'services', label: t.nav.services, icon: Tractor },
      { id: 'expert-hub', label: t.nav.knowledge, icon: BookOpen },
      { id: 'support', label: t.nav.support, icon: HelpCircle },
      { id: 'notifications', label: t.nav.notifications, icon: Bell, badge: unreadNotifications },
      { id: 'profile', label: t.nav.profile, icon: User }
    ];
  })();

  // Allow bootstrapped administrator to enter Admin Console cleanly even if testing another role profile
  const finalNavItems: NavItem[] =
    isAdmin && !navItems.some((item) => item.id === 'admin')
      ? [...navItems, { id: 'admin', label: t.nav.adminPanel, icon: ShieldCheck }]
      : navItems;

  const mobileBottomItems = finalNavItems.slice(0, 4);

  const handleSelect = (id: PortalSection) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#1C1F1D] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-[#E2E5DF] z-30">
        <div className="h-16 px-6 flex items-center border-b border-[#E2E5DF]">
          <button
            type="button"
            onClick={() => handleSelect(role === 'admin' ? 'admin' : 'dashboard')}
            className="text-lg font-bold tracking-tight text-[#1B4332] whitespace-nowrap"
          >
            {t.brandName}
          </button>
        </div>

        <div className="px-4 py-3 border-b border-[#EEF0EB]">
          <p className="text-xs font-semibold text-[#1C1F1D] truncate">{userDoc?.fullName || firebaseUser?.displayName}</p>
          <p className="text-xs text-[#525B56] mt-0.5">
            {t.roles[role]} · {userDoc?.verificationStatus === 'verified' ? t.common.verifiedAccount : t.statuses.pending}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Portal Navigation">
          {finalNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#1B4332] text-white'
                    : 'text-[#37413C] hover:bg-[#F3F5F0] hover:text-[#1C1F1D]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </span>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${
                      active ? 'bg-white/20 text-white' : 'bg-[#FDF5E3] text-[#785109]'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E2E5DF] space-y-3">
          {/* Language Switcher */}
          <div className="flex items-center p-1 bg-[#F3F5F0] rounded-lg" role="group" aria-label="Language switcher">
            <button
              type="button"
              onClick={() => void setLanguage('en')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                language === 'en' ? 'bg-white text-[#1C1F1D] shadow-xs' : 'text-[#525B56] hover:text-[#1C1F1D]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => void setLanguage('ta')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                language === 'ta' ? 'bg-white text-[#1C1F1D] shadow-xs' : 'text-[#525B56] hover:text-[#1C1F1D]'
              }`}
            >
              தமிழ்
            </button>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#525B56] border border-[#E2E5DF] rounded-lg hover:bg-[#F8F7F2] hover:text-[#1C1F1D] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.nav.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-[#E2E5DF] px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#1C1F1D] rounded-lg hover:bg-[#F3F5F0]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-[#525B56] truncate">
              <span className="font-semibold text-[#1B4332] lg:hidden mr-2">{t.brandName}</span>
              <span className="hidden sm:inline">{t.roles[role]}</span>
              <span className="hidden sm:inline mx-2 text-[#C2C8BE]">/</span>
              <span className="text-[#1C1F1D] font-medium">
                {finalNavItems.find((n) => n.id === activeSection)?.label || t.nav.dashboard}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Compact Language Switcher for Mobile/Tablet */}
            <div className="flex lg:hidden items-center p-0.5 bg-[#F3F5F0] rounded-lg">
              <button
                type="button"
                onClick={() => void setLanguage('en')}
                className={`px-2 py-1 text-xs font-medium rounded-md ${
                  language === 'en' ? 'bg-white text-[#1C1F1D]' : 'text-[#525B56]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => void setLanguage('ta')}
                className={`px-2 py-1 text-xs font-medium rounded-md ${
                  language === 'ta' ? 'bg-white text-[#1C1F1D]' : 'text-[#525B56]'
                }`}
              >
                தமிழ்
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSelect('notifications')}
              className="relative p-2 text-[#37413C] hover:bg-[#F3F5F0] rounded-lg transition-colors"
              aria-label={t.nav.notifications}
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#D99B26] text-white text-[10px] font-mono font-semibold rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Honest Network Offline Sync Banner (rendered strictly when offline) */}
        {!isOnline && (
          <div className="bg-[#FDF5E3] border-b border-[#F3D99B] px-4 sm:px-8 py-2.5 flex items-center gap-2.5 text-xs text-[#785109]">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>{t.common.offlineBanner}</span>
          </div>
        )}

        {/* Email Verification Notice (for unverified email/password signups) */}
        {firebaseUser && !firebaseUser.emailVerified && (
          <div className="bg-[#FEF2F2] border-b border-[#FECACA] px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#991B1B]">
            <span>
              <strong>{t.auth.verifyBannerTitle}:</strong> {t.auth.verifyBannerText}
            </span>
            <button
              type="button"
              onClick={async () => {
                await resendVerification();
                setVerificationSent(true);
              }}
              className="px-3 py-1.5 bg-[#991B1B] text-white font-medium rounded-md hover:bg-[#7F1D1D] whitespace-nowrap self-start sm:self-auto"
            >
              {verificationSent ? 'Sent — Check Inbox' : t.auth.resendVerification}
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-8 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col z-10 shadow-xl">
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#E2E5DF]">
              <span className="text-lg font-bold text-[#1B4332]">{t.brandName}</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[#525B56] hover:text-[#1C1F1D]"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {finalNavItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                      active ? 'bg-[#1B4332] text-white' : 'text-[#37413C] hover:bg-[#F3F5F0]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge && item.badge > 0 ? (
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#FDF5E3] text-[#785109]">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#E2E5DF]">
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-[#525B56] border border-[#E2E5DF] rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.nav.signOut}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Mobile Bottom Navigation (within 15% mobile sticky cap) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#E2E5DF] z-20 flex items-center justify-around h-14 px-2"
        aria-label="Quick Mobile Navigation"
      >
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[64px] text-[11px] font-medium ${
                active ? 'text-[#1B4332]' : 'text-[#525B56]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[72px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
