import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { PortalLayout, type PortalSection } from './layouts/PortalLayout';
import { subscribeCollection, where } from './services/firestoreService';
import type { NotificationItem } from './types';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { FarmerDashboard } from './pages/FarmerDashboard';
import { FarmsAndCropsPage } from './pages/FarmsAndCropsPage';
import { SoilMonitoringPage } from './pages/SoilMonitoringPage';
import { SmartIrrigationPage } from './pages/SmartIrrigationPage';
import { PlantHealthPage } from './pages/PlantHealthPage';
import { WeatherPage } from './pages/WeatherPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { OrdersPage } from './pages/OrdersPage';
import { ServicesPage } from './pages/ServicesPage';
import { TeamManagementPage } from './pages/TeamManagementPage';
import { EcoPointsPage } from './pages/EcoPointsPage';
import { ExpertHubPage } from './pages/ExpertHubPage';
import { SupportPage } from './pages/SupportPage';
import { NotificationsPage, ProfilePage } from './pages/NotificationsAndProfilePage';
import { BuyerDashboard, ExpertDashboard, ProviderDashboard } from './pages/RoleDashboards';
import { AdminDashboard } from './pages/AdminDashboard';

function AgriSphereRouter() {
  const { firebaseUser, userDoc, authLoading, isAdmin, signOut } = useAuth();
  const { t } = useLanguage();

  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [activeSection, setActiveSection] = useState<PortalSection>('dashboard');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Redirect to role's home view upon profile load
  useEffect(() => {
    if (userDoc?.role === 'admin') {
      setActiveSection('admin');
    } else if (userDoc) {
      setActiveSection('dashboard');
    }
  }, [userDoc?.role, userDoc?.uid]);

  useEffect(() => {
    if (!firebaseUser?.uid || !userDoc) {
      setNotifications([]);
      return;
    }
    return subscribeCollection<NotificationItem>(
      'notifications',
      [where('userId', '==', firebaseUser.uid)],
      setNotifications
    );
  }, [firebaseUser?.uid, userDoc]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F7F2] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-[#1B4332]">{t.brandName}</p>
          <p className="text-xs text-[#525B56] mt-2">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  // Unauthenticated state: Public Homepage or AuthPage
  if (!firebaseUser) {
    if (showAuth) {
      return <AuthPage initialMode={authInitialMode} onBack={() => setShowAuth(false)} />;
    }
    return (
      <LandingPage
        isSignedIn={false}
        onOpenAuth={(mode = 'login') => {
          setAuthInitialMode(mode);
          setShowAuth(true);
        }}
      />
    );
  }

  // Authenticated but onboarding profile not yet created
  if (!userDoc) {
    return <AuthPage />;
  }

  // Suspended account enforcement
  if (userDoc.accountStatus === 'suspended' && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8F7F2] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#E2E5DF] rounded-2xl p-8 text-center">
          <h1 className="text-xl font-semibold text-[#991B1B]">{t.common.suspendedTitle}</h1>
          <p className="text-sm text-[#525B56] mt-3 leading-relaxed">{t.common.suspendedBody}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 px-5 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg"
          >
            {t.nav.signOut}
          </button>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderSection = () => {
    const role = userDoc.role;

    // Strict role guard for Admin Console
    if (activeSection === 'admin') {
      return isAdmin ? <AdminDashboard /> : <FarmerDashboard onNavigate={setActiveSection} />;
    }

    if (activeSection === 'dashboard') {
      if (role === 'buyer') return <BuyerDashboard onNavigate={setActiveSection} />;
      if (role === 'provider') return <ProviderDashboard onNavigate={setActiveSection} />;
      if (role === 'expert') return <ExpertDashboard onNavigate={setActiveSection} />;
      if (role === 'admin') return <AdminDashboard />;
      return <FarmerDashboard onNavigate={setActiveSection} />;
    }

    // Farmer-specific operational modules (also protected against cross-role unauthorized access)
    if (activeSection === 'farms') {
      return role === 'farmer' || isAdmin ? <FarmsAndCropsPage /> : <BuyerDashboard onNavigate={setActiveSection} />;
    }
    if (activeSection === 'soil') {
      return role === 'farmer' || isAdmin ? <SoilMonitoringPage /> : <BuyerDashboard onNavigate={setActiveSection} />;
    }
    if (activeSection === 'irrigation') {
      return role === 'farmer' || isAdmin ? <SmartIrrigationPage /> : <BuyerDashboard onNavigate={setActiveSection} />;
    }
    if (activeSection === 'team') {
      return role === 'farmer' || isAdmin ? <TeamManagementPage /> : <BuyerDashboard onNavigate={setActiveSection} />;
    }
    if (activeSection === 'eco-points') {
      return role === 'farmer' || isAdmin ? <EcoPointsPage /> : <BuyerDashboard onNavigate={setActiveSection} />;
    }

    if (activeSection === 'plant-health') return <PlantHealthPage />;
    if (activeSection === 'weather') return <WeatherPage />;
    if (activeSection === 'marketplace') return <MarketplacePage />;
    if (activeSection === 'orders') return <OrdersPage />;
    if (activeSection === 'services') return <ServicesPage />;
    if (activeSection === 'expert-hub') return <ExpertHubPage />;
    if (activeSection === 'support') return <SupportPage />;
    if (activeSection === 'notifications') return <NotificationsPage notifications={notifications} />;
    if (activeSection === 'profile') return <ProfilePage />;

    return <FarmerDashboard onNavigate={setActiveSection} />;
  };

  return (
    <PortalLayout
      activeSection={activeSection}
      onNavigate={setActiveSection}
      unreadNotifications={unreadCount}
    >
      {renderSection()}
    </PortalLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <AgriSphereRouter />
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
