import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  createServiceBooking,
  createServiceListing,
  deleteServiceListing,
  subscribeCollection,
  updateServiceBookingStatus,
  updateServiceListingStatus,
  where
} from '../services/firestoreService';
import type { ServiceBooking, ServiceListing } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

const SERVICE_CATEGORIES = [
  'All',
  'Tractor Rental',
  'Harvesting',
  'Soil Testing',
  'Irrigation Installation',
  'Agricultural Transportation',
  'Equipment Rental',
  'Farming Consultation',
  'Seed & Fertilizer Services'
];

export function ServicesPage() {
  const { firebaseUser, userDoc } = useAuth();
  const uid = firebaseUser?.uid;
  const isProvider = userDoc?.role === 'provider';

  const [services, setServices] = useState<ServiceListing[]>([]);
  const [myServices, setMyServices] = useState<ServiceListing[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [tab, setTab] = useState<'browse' | 'bookings' | 'manage'>(isProvider ? 'manage' : 'browse');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchLoc, setSearchLoc] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // New service form (Provider)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(SERVICE_CATEGORIES[1]);
  const [rateInr, setRateInr] = useState('1200');
  const [rateUnit, setRateUnit] = useState('per hour');
  const [operatingLocation, setOperatingLocation] = useState('');
  const [description, setDescription] = useState('');

  // Booking modal (Farmer)
  const [bookingService, setBookingService] = useState<ServiceListing | null>(null);
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookingLocation, setBookingLocation] = useState([userDoc?.village, userDoc?.district].filter(Boolean).join(', '));
  const [bookingNotes, setBookingNotes] = useState('');

  useEffect(() => {
    const u1 = subscribeCollection<ServiceListing>(
      'service_listings',
      [where('availabilityStatus', '==', 'available')],
      setServices
    );
    const u2 =
      uid && isProvider
        ? subscribeCollection<ServiceListing>('service_listings', [where('providerId', '==', uid)], setMyServices)
        : () => {};
    const u3 = uid
      ? subscribeCollection<ServiceBooking>(
          'service_bookings',
          [where(isProvider ? 'providerId' : 'farmerId', '==', uid)],
          setBookings
        )
      : () => {};
    return () => {
      u1();
      u2();
      u3();
    };
  }, [uid, isProvider]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      if (searchLoc.trim() && !`${s.operatingLocation} ${s.title} ${s.providerName}`.toLowerCase().includes(searchLoc.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [services, categoryFilter, searchLoc]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await createServiceListing({
        providerName: userDoc?.fullName || 'Service Provider',
        title,
        category,
        rateInr: Number(rateInr),
        rateUnit,
        operatingLocation,
        description,
        availabilityStatus: 'available'
      });
      setTitle('');
      setDescription('');
      setFeedback({ type: 'success', message: 'Agricultural service listing published.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create service.' });
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingService || !userDoc) return;
    setFeedback(null);
    try {
      await createServiceBooking({
        service: bookingService,
        farmerName: userDoc.fullName,
        requestedDate,
        location: bookingLocation,
        notes: bookingNotes
      });
      setBookingService(null);
      setBookingNotes('');
      setFeedback({ type: 'success', message: 'Booking request submitted to the service provider.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unable to book service.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Agricultural Services"
        subtitle="Connect with verified machinery operators, harvesters, soil testing labs, irrigation installers, and farm transport providers."
        action={
          <div className="flex p-1 bg-white border border-[#E2E5DF] rounded-lg">
            {isProvider && (
              <button
                type="button"
                onClick={() => setTab('manage')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                  tab === 'manage' ? 'bg-[#1B4332] text-white' : 'text-[#525B56]'
                }`}
              >
                My Services ({myServices.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab('browse')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                tab === 'browse' ? 'bg-[#1B4332] text-white' : 'text-[#525B56]'
              }`}
            >
              Browse ({services.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('bookings')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                tab === 'bookings' ? 'bg-[#1B4332] text-white' : 'text-[#525B56]'
              }`}
            >
              Bookings ({bookings.length})
            </button>
          </div>
        }
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {tab === 'browse' && (
        <>
          <div className="bg-white border border-[#E2E5DF] rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#525B56] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchLoc}
                onChange={(e) => setSearchLoc(e.target.value)}
                placeholder="Search by district, village, or equipment..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#D3D9CE] rounded-lg"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white"
            >
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {filteredServices.length === 0 ? (
            <EmptyState title="No services listed yet" description="Registered service providers will appear here as they publish equipment and field services." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((s) => (
                <article key={s.id} className="bg-white border border-[#E2E5DF] rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-[#525B56]">
                      {s.category} · {s.operatingLocation}
                    </p>
                    <h3 className="text-base font-semibold text-[#1C1F1D] mt-1">{s.title}</h3>
                    <p className="text-xs text-[#525B56] mt-2 leading-relaxed">{s.description}</p>
                    <p className="text-xs text-[#37413C] mt-3">Provider: <strong>{s.providerName}</strong></p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#EEF0EB] flex items-center justify-between gap-3">
                    <p className="text-base font-mono font-semibold tabular-nums text-[#1B4332]">
                      ₹{s.rateInr.toLocaleString('en-IN')}{' '}
                      <span className="text-xs font-sans font-normal text-[#525B56]">{s.rateUnit}</span>
                    </p>
                    {s.providerId !== uid && (
                      <button
                        type="button"
                        onClick={() => setBookingService(s)}
                        className="px-3.5 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-lg hover:bg-[#143325]"
                      >
                        Request Booking
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'manage' && isProvider && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <SectionCard title="Register Equipment or Service">
              <form onSubmit={handleCreateService} className="space-y-3.5">
                <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 55 HP Tractor with Rotavator" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                  {SERVICE_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input required type="number" min="1" value={rateInr} onChange={(e) => setRateInr(e.target.value)} placeholder="Rate (INR)" className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                  <input required value={rateUnit} onChange={(e) => setRateUnit(e.target.value)} placeholder="per hour / per acre" className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <input required value={operatingLocation} onChange={(e) => setOperatingLocation(e.target.value)} placeholder="Operating districts / towns" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Equipment specifications, operator inclusion, minimum booking terms..." className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                <button type="submit" className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg">
                  <Plus className="w-4 h-4" /> Publish Service
                </button>
              </form>
            </SectionCard>
          </div>
          <div className="lg:col-span-7">
            <SectionCard title="Your Listed Services">
              {myServices.length === 0 ? (
                <EmptyState title="No services published" description="Add your agricultural equipment or consulting services to receive farmer bookings." />
              ) : (
                <div className="divide-y divide-[#EEF0EB]">
                  {myServices.map((s) => (
                    <div key={s.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#1C1F1D]">{s.title}</p>
                        <p className="text-xs text-[#525B56] mt-0.5 tabular-nums">
                          {s.category} · ₹{s.rateInr} {s.rateUnit} · {s.operatingLocation}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Availability status"
                          value={s.availabilityStatus}
                          onChange={(e) => void updateServiceListingStatus(s.id, e.target.value as ServiceListing['availabilityStatus'])}
                          className="px-2.5 py-1.5 text-xs border border-[#D3D9CE] rounded-md bg-white"
                        >
                          <option value="available">Available</option>
                          <option value="busy">Busy</option>
                          <option value="paused">Paused</option>
                        </select>
                        <button type="button" onClick={() => void deleteServiceListing(s.id)} className="p-1.5 text-[#525B56] hover:text-[#B91C1C]">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'bookings' && (
        <SectionCard title={isProvider ? 'Incoming Farmer Service Requests' : 'Your Service Booking Requests'}>
          {bookings.length === 0 ? (
            <EmptyState title="No booking requests" description="Service bookings submitted or received appear here with live status tracking." />
          ) : (
            <div className="divide-y divide-[#EEF0EB]">
              {bookings.map((b) => (
                <div key={b.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <p className="text-sm font-semibold text-[#1C1F1D]">{b.serviceTitle}</p>
                      <StatusLabel status={b.status} />
                    </div>
                    <p className="text-xs text-[#525B56] mt-1">
                      {isProvider ? `Farmer: ${b.farmerName}` : `Provider: ${b.providerName}`} · Date: {b.requestedDate} · {b.location}
                    </p>
                    {b.notes && <p className="text-xs text-[#37413C] mt-1">{b.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {isProvider && b.status === 'pending' && (
                      <>
                        <button type="button" onClick={() => void updateServiceBookingStatus(b, 'accepted')} className="px-3 py-1.5 text-xs font-medium bg-[#1B4332] text-white rounded-md">
                          Accept
                        </button>
                        <button type="button" onClick={() => void updateServiceBookingStatus(b, 'rejected')} className="px-3 py-1.5 text-xs font-medium border border-[#FECACA] text-[#B91C1C] rounded-md">
                          Reject
                        </button>
                      </>
                    )}
                    {isProvider && b.status === 'accepted' && (
                      <button type="button" onClick={() => void updateServiceBookingStatus(b, 'in_progress')} className="px-3 py-1.5 text-xs font-medium bg-[#1B4332] text-white rounded-md">
                        Start Job
                      </button>
                    )}
                    {isProvider && b.status === 'in_progress' && (
                      <button type="button" onClick={() => void updateServiceBookingStatus(b, 'completed')} className="px-3 py-1.5 text-xs font-medium bg-[#1B4332] text-white rounded-md">
                        Mark Completed
                      </button>
                    )}
                    {!isProvider && b.status === 'pending' && (
                      <button type="button" onClick={() => void updateServiceBookingStatus(b, 'cancelled')} className="px-3 py-1.5 text-xs font-medium border border-[#FECACA] text-[#B91C1C] rounded-md">
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {bookingService && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E5DF] rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[#1C1F1D]">Book {bookingService.title}</h3>
            <p className="text-xs text-[#525B56] mt-1">
              Provider: {bookingService.providerName} · ₹{bookingService.rateInr} {bookingService.rateUnit}
            </p>
            <form onSubmit={handleCreateBooking} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Preferred Service Date *</label>
                <input required type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Field Location *</label>
                <input required value={bookingLocation} onChange={(e) => setBookingLocation(e.target.value)} placeholder="Village, District" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Field Instructions (Optional)</label>
                <textarea rows={2} value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} placeholder="Acreage, crop type, soil condition..." className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setBookingService(null)} className="px-4 py-2 text-xs font-medium border border-[#E2E5DF] rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold bg-[#1B4332] text-white rounded-lg">
                  Submit Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
