import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeCollection, where } from '../services/firestoreService';
import type {
  EducationalArticle,
  ExpertQuestion,
  MarketplaceListing,
  OrderRecord,
  ServiceBooking,
  ServiceListing
} from '../types';
import { EmptyState, PageHeader, SectionCard, StatusLabel } from '../components/UI';
import type { PortalSection } from '../layouts/PortalLayout';

export function BuyerDashboard({ onNavigate }: { onNavigate: (section: PortalSection) => void }) {
  const { firebaseUser, userDoc } = useAuth();
  const uid = firebaseUser?.uid;
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    const u1 = subscribeCollection<MarketplaceListing>('marketplace_listings', [where('status', '==', 'available')], setListings);
    const u2 = uid ? subscribeCollection<OrderRecord>('orders', [where('buyerId', '==', uid)], setOrders) : () => {};
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  const activeOrders = orders.filter((o) => !['completed', 'rejected', 'cancelled'].includes(o.status));
  const completedValue = orders
    .filter((o) => o.status === 'completed')
    .reduce((acc, o) => acc + Number(o.totalAmountInr || 0), 0);

  return (
    <div>
      <PageHeader
        title={`Buyer Portal — ${userDoc?.fullName || 'Buyer'}`}
        subtitle="Discover farm-direct harvests, submit purchase requests, and monitor fulfilment status."
        action={
          <button
            type="button"
            onClick={() => onNavigate('marketplace')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg"
          >
            <span>Browse Marketplace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Available Produce Lots</p>
          <p className="text-2xl font-mono font-semibold tabular-nums mt-1.5">{listings.length}</p>
        </div>
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Active Purchase Orders</p>
          <p className="text-2xl font-mono font-semibold tabular-nums mt-1.5">{activeOrders.length}</p>
        </div>
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Completed Trade Value</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-[#1B4332] mt-1.5">
            ₹{completedValue.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Recent Orders"
          action={<button type="button" onClick={() => onNavigate('orders')} className="text-xs font-semibold text-[#1B4332] hover:underline">Manage Orders</button>}
        >
          {orders.length === 0 ? (
            <EmptyState title="No purchase requests yet" description="Browse available farmer harvests to place your first purchase request." />
          ) : (
            <div className="divide-y divide-[#EEF0EB]">
              {orders.slice(0, 6).map((o) => (
                <div key={o.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{o.productName}</p>
                    <p className="text-xs text-[#525B56] tabular-nums">
                      {o.farmerName} · {o.quantity} {o.unit} · ₹{o.totalAmountInr.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <StatusLabel status={o.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Latest Available Harvests"
          action={<button type="button" onClick={() => onNavigate('marketplace')} className="text-xs font-semibold text-[#1B4332] hover:underline">See All</button>}
        >
          {listings.length === 0 ? (
            <EmptyState title="No available listings" description="New farmer listings appear here in real time." />
          ) : (
            <div className="divide-y divide-[#EEF0EB]">
              {listings.slice(0, 6).map((l) => (
                <div key={l.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{l.productName}</p>
                    <p className="text-xs text-[#525B56]">{l.location} · {l.quantity} {l.unit}</p>
                  </div>
                  <p className="font-mono font-semibold tabular-nums text-[#1B4332]">₹{l.pricePerUnitInr}/{l.unit}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export function ProviderDashboard({ onNavigate }: { onNavigate: (section: PortalSection) => void }) {
  const { firebaseUser, userDoc } = useAuth();
  const uid = firebaseUser?.uid;
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);

  useEffect(() => {
    if (!uid) return;
    const u1 = subscribeCollection<ServiceListing>('service_listings', [where('providerId', '==', uid)], setServices);
    const u2 = subscribeCollection<ServiceBooking>('service_bookings', [where('providerId', '==', uid)], setBookings);
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  return (
    <div>
      <PageHeader
        title={`Service Provider Hub — ${userDoc?.fullName || 'Provider'}`}
        subtitle="Manage listed tractors, harvesters, soil testing, and incoming farmer service bookings."
        action={
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg"
          >
            <span>Manage Services</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Listed Services</p>
          <p className="text-2xl font-mono font-semibold tabular-nums mt-1.5">{services.length}</p>
        </div>
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Pending Booking Requests</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-[#B45309] mt-1.5">
            {bookings.filter((b) => b.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Completed Jobs</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-[#1B4332] mt-1.5">
            {bookings.filter((b) => b.status === 'completed').length}
          </p>
        </div>
      </div>

      <SectionCard
        title="Recent Farmer Booking Inquiries"
        action={<button type="button" onClick={() => onNavigate('services')} className="text-xs font-semibold text-[#1B4332] hover:underline">Respond to Requests</button>}
      >
        {bookings.length === 0 ? (
          <EmptyState title="No booking requests yet" description="Publish your equipment and service availability to receive farmer bookings." />
        ) : (
          <div className="divide-y divide-[#EEF0EB]">
            {bookings.slice(0, 8).map((b) => (
              <div key={b.id} className="py-3.5 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium">{b.serviceTitle}</p>
                  <p className="text-xs text-[#525B56]">
                    {b.farmerName} · {b.requestedDate} · {b.location}
                  </p>
                </div>
                <StatusLabel status={b.status} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function ExpertDashboard({ onNavigate }: { onNavigate: (section: PortalSection) => void }) {
  const { firebaseUser, userDoc } = useAuth();
  const uid = firebaseUser?.uid;
  const [questions, setQuestions] = useState<ExpertQuestion[]>([]);
  const [articles, setArticles] = useState<EducationalArticle[]>([]);

  useEffect(() => {
    const u1 = subscribeCollection<ExpertQuestion>('expert_questions', [where('isPublic', '==', true)], setQuestions);
    const u2 = uid ? subscribeCollection<EducationalArticle>('educational_articles', [where('authorId', '==', uid)], setArticles) : () => {};
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  const openQuestions = questions.filter((q) => q.status === 'open');

  return (
    <div>
      <PageHeader
        title={`Agricultural Expert Portal — ${userDoc?.fullName || 'Expert'}`}
        subtitle="Answer open farmer inquiries, share sustainable crop management guidance, and publish educational articles."
        action={
          <button
            type="button"
            onClick={() => onNavigate('expert-hub')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg"
          >
            <span>Open Advisory Hub</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Open Farmer Questions</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-[#B45309] mt-1.5">{openQuestions.length}</p>
        </div>
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Total Answered Questions</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-[#1B4332] mt-1.5">
            {questions.filter((q) => q.status === 'answered').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Your Published Guides</p>
          <p className="text-2xl font-mono font-semibold tabular-nums mt-1.5">{articles.length}</p>
        </div>
      </div>

      <SectionCard
        title="Questions Awaiting Expert Guidance"
        action={<button type="button" onClick={() => onNavigate('expert-hub')} className="text-xs font-semibold text-[#1B4332] hover:underline">Respond Now</button>}
      >
        {openQuestions.length === 0 ? (
          <EmptyState title="No unanswered questions" description="All public farmer questions have been answered. Publish a new agronomy guide anytime." />
        ) : (
          <div className="divide-y divide-[#EEF0EB]">
            {openQuestions.slice(0, 6).map((q) => (
              <div key={q.id} className="py-3.5">
                <p className="text-xs text-[#525B56]">{q.cropName} · {q.farmerName}</p>
                <p className="text-sm font-medium text-[#1C1F1D] mt-0.5">{q.question}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
