import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fetchWeather, subscribeCollection, where } from '../services/firestoreService';
import type {
  CropActivity,
  CropRecord,
  EcoPointsTransaction,
  Farm,
  IrrigationSchedule,
  MarketplaceListing,
  OrderRecord,
  PlatformAnnouncement,
  ServiceBooking,
  SoilMeasurement,
  WeatherResponse
} from '../types';
import { EmptyState, PageHeader, SectionCard, StatusLabel } from '../components/UI';
import type { PortalSection } from '../layouts/PortalLayout';

export function FarmerDashboard({ onNavigate }: { onNavigate: (section: PortalSection) => void }) {
  const { firebaseUser, userDoc } = useAuth();
  const { t } = useLanguage();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [crops, setCrops] = useState<CropRecord[]>([]);
  const [activities, setActivities] = useState<CropActivity[]>([]);
  const [soilLogs, setSoilLogs] = useState<SoilMeasurement[]>([]);
  const [irrigations, setIrrigations] = useState<IrrigationSchedule[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [ecoTxs, setEcoTxs] = useState<EcoPointsTransaction[]>([]);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);

  const uid = firebaseUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const unsubs = [
      subscribeCollection<Farm>('farms', [where('farmerId', '==', uid)], setFarms),
      subscribeCollection<CropRecord>('crops', [where('farmerId', '==', uid)], setCrops),
      subscribeCollection<CropActivity>('crop_activities', [where('farmerId', '==', uid)], setActivities),
      subscribeCollection<SoilMeasurement>('soil_measurements', [where('farmerId', '==', uid)], setSoilLogs),
      subscribeCollection<IrrigationSchedule>('irrigation_schedules', [where('farmerId', '==', uid)], setIrrigations),
      subscribeCollection<MarketplaceListing>('marketplace_listings', [where('farmerId', '==', uid)], setListings),
      subscribeCollection<OrderRecord>('orders', [where('farmerId', '==', uid)], setOrders),
      subscribeCollection<ServiceBooking>('service_bookings', [where('farmerId', '==', uid)], setBookings),
      subscribeCollection<EcoPointsTransaction>('eco_points_transactions', [where('userId', '==', uid)], setEcoTxs),
      subscribeCollection<PlatformAnnouncement>('platform_announcements', [where('active', '==', true)], setAnnouncements)
    ];
    return () => unsubs.forEach((u) => u());
  }, [uid]);

  useEffect(() => {
    const primaryFarm = farms[0];
    const queryLoc = primaryFarm ? `${primaryFarm.district}, ${primaryFarm.state}` : userDoc?.district || '';
    if (!queryLoc) return;
    fetchWeather(
      primaryFarm?.latitude && primaryFarm?.longitude
        ? { lat: primaryFarm.latitude, lon: primaryFarm.longitude, location: queryLoc }
        : { location: queryLoc }
    )
      .then(setWeather)
      .catch(() => setWeather({ available: false, reason: 'Weather service unavailable.' }));
  }, [farms, userDoc?.district]);

  const totalArea = useMemo(() => farms.reduce((acc, f) => acc + (Number(f.areaAcres) || 0), 0), [farms]);
  const activeCrops = useMemo(() => crops.filter((c) => c.stage !== 'harvested'), [crops]);
  const atRiskCrops = useMemo(() => crops.filter((c) => c.healthStatus !== 'healthy'), [crops]);
  const pendingBookings = useMemo(() => bookings.filter((b) => b.status === 'pending' || b.status === 'accepted'), [bookings]);

  const ecoBalance = useMemo(
    () =>
      ecoTxs.reduce((acc, tx) => {
        if (tx.status !== 'verified') return acc;
        return tx.transactionType === 'earn' ? acc + tx.awardedPoints : acc - tx.awardedPoints;
      }, 0),
    [ecoTxs]
  );

  const latestSoil = soilLogs[0];

  // Real database chart datasets
  const cropProductionChart = useMemo(
    () =>
      crops.slice(0, 8).map((c) => ({
        name: c.cropName.slice(0, 14),
        expected: c.expectedYieldKg || 0,
        actual: c.actualYieldKg || 0
      })),
    [crops]
  );

  const monthlyExpensesChart = useMemo(() => {
    const map = new Map<string, number>();
    activities.forEach((a) => {
      const month = (a.date || '').slice(0, 7) || 'Undated';
      map.set(month, (map.get(month) || 0) + (Number(a.expenseInr) || 0));
    });
    crops.forEach((c) => {
      if (c.estimatedExpenseInr && c.estimatedExpenseInr > 0) {
        const month = (c.plantingDate || '').slice(0, 7) || 'Baseline';
        map.set(month, (map.get(month) || 0) + Number(c.estimatedExpenseInr));
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
  }, [activities, crops]);

  const salesChart = useMemo(() => {
    const map = new Map<string, number>();
    orders
      .filter((o) => o.status !== 'rejected' && o.status !== 'cancelled')
      .forEach((o) => {
        const label = o.productName.slice(0, 14);
        map.set(label, (map.get(label) || 0) + Number(o.totalAmountInr || 0));
      });
    return Array.from(map.entries()).map(([product, revenue]) => ({ product, revenue }));
  }, [orders]);

  const waterChart = useMemo(
    () =>
      irrigations.slice(0, 8).map((s) => ({
        label: `${s.cropName.slice(0, 10)} (${s.scheduledDate.slice(5)})`,
        liters: Number(s.waterVolumeLiters || 0)
      })),
    [irrigations]
  );

  // Genuine rule-derived recommendations based purely on user's actual records
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    if (farms.length === 0) {
      recs.push('Register your primary farm and district coordinates to unlock localized live weather alerts and crop tracking.');
    }
    if (latestSoil && latestSoil.ph < 5.8) {
      recs.push(`Recent soil log for ${latestSoil.fieldName} shows acidic pH (${latestSoil.ph}). Consider consulting an agronomist on lime amendment.`);
    } else if (latestSoil && latestSoil.ph > 8.0) {
      recs.push(`Recent soil log for ${latestSoil.fieldName} shows alkaline pH (${latestSoil.ph}). Gypsum and organic compost may help buffer alkalinity.`);
    }
    if (latestSoil && latestSoil.moisturePercent < 25) {
      recs.push(`Low soil moisture (${latestSoil.moisturePercent}%) logged in ${latestSoil.fieldName}. Review your upcoming irrigation schedule.`);
    }
    if (atRiskCrops.length > 0) {
      recs.push(`${atRiskCrops.length} crop lot(s) are marked Watch or At Risk. Upload a clear leaf photograph in Plant Health AI for screening.`);
    }
    if (weather?.available && weather.alerts && weather.alerts.length > 0) {
      recs.push(...weather.alerts);
    }
    if (recs.length === 0) {
      recs.push('All logged farm metrics are within normal parameters. Continue recording irrigation runs and soil logs to build seasonal insights.');
    }
    return recs;
  }, [farms.length, latestSoil, atRiskCrops.length, weather]);

  return (
    <div>
      {/* 1. Welcome Panel */}
      <PageHeader
        title={`${t.dashboard.welcome}, ${userDoc?.fullName || 'Farmer'}`}
        subtitle={`${[userDoc?.village, userDoc?.district, userDoc?.state].filter(Boolean).join(', ') || 'Configure your farm location in Farms & Crops'} · ${
          userDoc?.verificationStatus === 'verified' ? t.common.verifiedAccount : t.common.pendingVerification
        }`}
        action={
          <button
            type="button"
            onClick={() => onNavigate('farms')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325] whitespace-nowrap"
          >
            <span>Manage Farms</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        }
      />

      {/* Platform Announcements if active */}
      {announcements.filter((a) => a.audience === 'all' || a.audience === 'farmer').length > 0 && (
        <div className="mb-8 bg-[#FDF5E3] border border-[#F3D99B] rounded-xl p-4">
          <p className="text-xs font-semibold text-[#785109]">Platform Announcement</p>
          {announcements
            .filter((a) => a.audience === 'all' || a.audience === 'farmer')
            .slice(0, 2)
            .map((a) => (
              <div key={a.id} className="mt-1.5">
                <p className="text-sm font-semibold text-[#1C1F1D]">{a.title}</p>
                <p className="text-xs text-[#525B56] mt-0.5">{a.body}</p>
              </div>
            ))}
        </div>
      )}

      {/* 2–5: Top Real KPI Strip (Strictly derived from Firestore records) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          type="button"
          onClick={() => onNavigate('farms')}
          className="text-left bg-white border border-[#E2E5DF] rounded-xl p-5 hover:border-[#1B4332] transition-colors"
        >
          <p className="text-xs font-medium text-[#525B56]">{t.dashboard.farmOverview}</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-[#1C1F1D] mt-2">{farms.length}</p>
          <p className="text-xs text-[#525B56] mt-1 tabular-nums">{totalArea.toFixed(1)} acres registered</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('farms')}
          className="text-left bg-white border border-[#E2E5DF] rounded-xl p-5 hover:border-[#1B4332] transition-colors"
        >
          <p className="text-xs font-medium text-[#525B56]">{t.dashboard.activeCrops}</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-[#1C1F1D] mt-2">{activeCrops.length}</p>
          <p className="text-xs text-[#525B56] mt-1 tabular-nums">{atRiskCrops.length} need attention</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="text-left bg-white border border-[#E2E5DF] rounded-xl p-5 hover:border-[#1B4332] transition-colors"
        >
          <p className="text-xs font-medium text-[#525B56]">{t.dashboard.marketplaceActivity}</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-[#1C1F1D] mt-2">{listings.length}</p>
          <p className="text-xs text-[#525B56] mt-1 tabular-nums">{orders.length} total orders</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('eco-points')}
          className="text-left bg-white border border-[#E2E5DF] rounded-xl p-5 hover:border-[#1B4332] transition-colors"
        >
          <p className="text-xs font-medium text-[#525B56]">{t.dashboard.ecoBalance}</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-[#1B4332] mt-2">{ecoBalance}</p>
          <p className="text-xs text-[#525B56] mt-1">Verified ledger points</p>
        </button>
      </div>

      {/* 6–9: Soil, Weather, Irrigation, Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <SectionCard
          title={t.dashboard.soilSummary}
          subtitle="Latest recorded measurement"
          action={
            <button type="button" onClick={() => onNavigate('soil')} className="text-xs font-semibold text-[#1B4332] hover:underline">
              Open Soil
            </button>
          }
        >
          {latestSoil ? (
            <div className="space-y-3">
              <p className="text-xs text-[#525B56]">
                {latestSoil.fieldName} · {latestSoil.recordedDate} · {latestSoil.sourceType === 'lab_report' ? 'Lab Report' : 'Manual Entry'}
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <p className="text-xs text-[#525B56]">pH</p>
                  <p className="text-lg font-mono font-semibold tabular-nums">{latestSoil.ph}</p>
                </div>
                <div>
                  <p className="text-xs text-[#525B56]">Moisture</p>
                  <p className="text-lg font-mono font-semibold tabular-nums">{latestSoil.moisturePercent}%</p>
                </div>
                <div>
                  <p className="text-xs text-[#525B56]">Temp</p>
                  <p className="text-lg font-mono font-semibold tabular-nums">{latestSoil.temperatureC}°C</p>
                </div>
              </div>
              <p className="text-xs font-mono tabular-nums text-[#525B56] pt-2 border-t border-[#EEF0EB]">
                N: {latestSoil.nitrogenPpm} · P: {latestSoil.phosphorusPpm} · K: {latestSoil.potassiumPpm} ppm
              </p>
            </div>
          ) : (
            <EmptyState
              title="No soil logs yet"
              description="Enter your first manual or lab soil test reading to monitor pH and NPK."
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('soil')}
                  className="px-3.5 py-2 bg-[#1B4332] text-white text-xs font-medium rounded-lg"
                >
                  Log Soil Reading
                </button>
              }
            />
          )}
        </SectionCard>

        <SectionCard
          title={t.dashboard.weatherOverview}
          subtitle={weather?.locationName || 'Configured farm location'}
          action={
            <button type="button" onClick={() => onNavigate('weather')} className="text-xs font-semibold text-[#1B4332] hover:underline">
              Full Forecast
            </button>
          }
        >
          {weather?.available && weather.current ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-mono font-semibold tabular-nums text-[#1C1F1D]">
                  {weather.current.temperatureC.toFixed(1)}°C
                </p>
                <p className="text-sm font-medium text-[#2D6A4F]">{weather.current.condition}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#EEF0EB] text-xs">
                <div>
                  <p className="text-[#525B56]">Humidity</p>
                  <p className="font-mono font-semibold tabular-nums mt-0.5">{weather.current.humidityPercent}%</p>
                </div>
                <div>
                  <p className="text-[#525B56]">Rain</p>
                  <p className="font-mono font-semibold tabular-nums mt-0.5">{weather.current.rainfallMm} mm</p>
                </div>
                <div>
                  <p className="text-[#525B56]">Wind</p>
                  <p className="font-mono font-semibold tabular-nums mt-0.5">{weather.current.windSpeedKmh} km/h</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Weather data unavailable"
              description={weather?.reason || 'Configure your farm district to load live meteorological readings.'}
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('weather')}
                  className="px-3.5 py-2 bg-[#1B4332] text-white text-xs font-medium rounded-lg"
                >
                  Configure Weather
                </button>
              }
            />
          )}
        </SectionCard>

        <SectionCard
          title={t.dashboard.recommendations}
          subtitle="Based on your active farm data"
        >
          <ul className="space-y-3 text-sm text-[#37413C]">
            {recommendations.slice(0, 4).map((rec, i) => (
              <li key={i} className="pb-3 border-b border-[#EEF0EB] last:border-0 last:pb-0 leading-relaxed">
                {rec}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Real Database Charts (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard title={t.dashboard.charts.cropProduction}>
          {cropProductionChart.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cropProductionChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="expected" name="Expected (kg)" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual (kg)" fill="#D99B26" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No crop yield records" description={t.dashboard.charts.noChartData} />
          )}
        </SectionCard>

        <SectionCard title={t.dashboard.charts.monthlyExpenses}>
          {monthlyExpensesChart.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpensesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="amount" name="Expenses (INR)" fill="#1B4332" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No expense records" description="Log crop cultivation expenses in Farms & Crops to view monthly spending." />
          )}
        </SectionCard>

        <SectionCard title={t.dashboard.charts.salesPerformance}>
          {salesChart.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EB" />
                  <XAxis dataKey="product" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" name="Order Value (INR)" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No order sales data" description="Accepted and completed marketplace orders will plot here automatically." />
          )}
        </SectionCard>

        <SectionCard title={t.dashboard.charts.waterConsumption}>
          {waterChart.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="liters" name="Water (Liters)" fill="#40916C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No irrigation records" description="Schedule irrigation sessions to monitor field water consumption." />
          )}
        </SectionCard>
      </div>

      {/* Recent Orders & Pending Service Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title={t.dashboard.recentOrders}
          action={
            <button type="button" onClick={() => onNavigate('orders')} className="text-xs font-semibold text-[#1B4332] hover:underline">
              View All
            </button>
          }
        >
          {orders.length === 0 ? (
            <EmptyState title="No incoming orders" description="Orders submitted by buyers on your marketplace listings appear here." />
          ) : (
            <div className="divide-y divide-[#EEF0EB]">
              {orders.slice(0, 5).map((o) => (
                <div key={o.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1C1F1D] truncate">{o.productName}</p>
                    <p className="text-xs text-[#525B56] tabular-nums">
                      {o.buyerName} · {o.quantity} {o.unit} · ₹{o.totalAmountInr.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <StatusLabel status={o.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={t.dashboard.pendingServices}
          action={
            <button type="button" onClick={() => onNavigate('services')} className="text-xs font-semibold text-[#1B4332] hover:underline">
              Browse Services
            </button>
          }
        >
          {pendingBookings.length === 0 ? (
            <EmptyState title="No pending service requests" description="Book tractors, harvesters, or soil testing from Agricultural Services." />
          ) : (
            <div className="divide-y divide-[#EEF0EB]">
              {pendingBookings.slice(0, 5).map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1C1F1D] truncate">{b.serviceTitle}</p>
                    <p className="text-xs text-[#525B56]">
                      {b.providerName} · {b.requestedDate}
                    </p>
                  </div>
                  <StatusLabel status={b.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
