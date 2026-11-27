import React, { useEffect, useMemo, useState } from 'react';
import { Flag, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  createMarketplaceListing,
  createOrderRequest,
  createSupportTicket,
  deleteMarketplaceListing,
  subscribeCollection,
  updateMarketplaceListingStatus,
  where
} from '../services/firestoreService';
import type { MarketplaceListing } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, ResilientImage, SectionCard, StatusLabel } from '../components/UI';

const DEFAULT_PRODUCE_IMG = '/src/assets/images/marketplace_harvest_1795678585657.jpg';

const CROP_CATEGORIES = [
  'All',
  'Grains & Cereals',
  'Vegetables',
  'Fruits',
  'Spices',
  'Pulses & Oilseeds',
  'Organic Inputs'
];

export function MarketplacePage() {
  const { firebaseUser, userDoc } = useAuth();
  const { t } = useLanguage();
  const uid = firebaseUser?.uid;
  const isFarmer = userDoc?.role === 'farmer';

  const [availableListings, setAvailableListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [viewTab, setViewTab] = useState<'browse' | 'my-listings'>('browse');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');

  // Create listing form
  const [productName, setProductName] = useState('');
  const [cropCategory, setCropCategory] = useState('Grains & Cereals');
  const [quantity, setQuantity] = useState('500');
  const [unit, setUnit] = useState('kg');
  const [pricePerUnitInr, setPricePerUnitInr] = useState('42');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState([userDoc?.district, userDoc?.state].filter(Boolean).join(', '));
  const [description, setDescription] = useState('');

  // Purchase request modal state
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [orderQty, setOrderQty] = useState('100');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => {
    const u1 = subscribeCollection<MarketplaceListing>(
      'marketplace_listings',
      [where('status', '==', 'available')],
      setAvailableListings
    );
    const u2 = uid
      ? subscribeCollection<MarketplaceListing>(
          'marketplace_listings',
          [where('farmerId', '==', uid)],
          setMyListings
        )
      : () => {};
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  const filteredListings = useMemo(() => {
    return availableListings.filter((item) => {
      if (categoryFilter !== 'All' && item.cropCategory !== categoryFilter) return false;
      if (searchTerm.trim() && !`${item.productName} ${item.description} ${item.farmerName}`.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (locationFilter.trim() && !item.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (maxPriceFilter && Number(maxPriceFilter) > 0 && item.pricePerUnitInr > Number(maxPriceFilter)) return false;
      return true;
    });
  }, [availableListings, categoryFilter, searchTerm, locationFilter, maxPriceFilter]);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await createMarketplaceListing({
        farmerName: userDoc?.fullName || 'Registered Farmer',
        productName,
        cropCategory,
        quantity: Number(quantity),
        unit,
        pricePerUnitInr: Number(pricePerUnitInr),
        harvestDate,
        location,
        description,
        imageUrl: DEFAULT_PRODUCE_IMG,
        status: 'available'
      });
      setProductName('');
      setDescription('');
      setFeedback({ type: 'success', message: 'Produce listing published to the live marketplace.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to publish listing.' });
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing || !userDoc) return;
    setSubmittingOrder(true);
    setFeedback(null);
    try {
      await createOrderRequest({
        listing: selectedListing,
        buyerName: userDoc.fullName,
        quantity: Number(orderQty),
        deliveryLocation,
        buyerNotes
      });
      setSelectedListing(null);
      setBuyerNotes('');
      setFeedback({
        type: 'success',
        message: 'Purchase request sent to the farmer! Track acceptance and fulfilment in your Orders section.'
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unable to submit purchase request.' });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleReportListing = async (item: MarketplaceListing) => {
    if (!userDoc) return;
    try {
      await createSupportTicket({
        userName: userDoc.fullName,
        userRole: userDoc.role,
        category: 'Reported Listing',
        subject: `Reported Marketplace Listing: ${item.productName}`,
        description: `User reported listing ID ${item.id} by ${item.farmerName} (${item.location}) for administrator review.`
      });
      setFeedback({ type: 'info', message: 'Listing reported to administrators for review.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to report listing.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Agricultural Marketplace"
        subtitle="Browse direct farm produce lots, filter by category, location, and price, and submit transparent purchase requests."
        action={
          isFarmer ? (
            <div className="flex p-1 bg-white border border-[#E2E5DF] rounded-lg">
              <button
                type="button"
                onClick={() => setViewTab('browse')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                  viewTab === 'browse' ? 'bg-[#1B4332] text-white' : 'text-[#525B56]'
                }`}
              >
                Browse Produce ({availableListings.length})
              </button>
              <button
                type="button"
                onClick={() => setViewTab('my-listings')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                  viewTab === 'my-listings' ? 'bg-[#1B4332] text-white' : 'text-[#525B56]'
                }`}
              >
                My Listings ({myListings.length})
              </button>
            </div>
          ) : undefined
        }
      />

      <FeedbackBanner type="info" message={t.common.paymentNotice} />
      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {viewTab === 'browse' && (
        <>
          {/* Filter Bar */}
          <div className="bg-white border border-[#E2E5DF] rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#525B56] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search crop or farmer..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#D3D9CE] rounded-lg"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white"
            >
              {CROP_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Filter by district / state..."
              className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg"
            />
            <input
              type="number"
              min="0"
              value={maxPriceFilter}
              onChange={(e) => setMaxPriceFilter(e.target.value)}
              placeholder="Max price (₹ / unit)"
              className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums"
            />
          </div>

          {filteredListings.length === 0 ? (
            <EmptyState
              title="No matching produce listings"
              description="Adjust your search filters or wait for farmers to publish new harvest lots."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((item) => {
                const isOwn = item.farmerId === uid;
                return (
                  <article key={item.id} className="bg-white border border-[#E2E5DF] rounded-xl overflow-hidden flex flex-col">
                    <div className="aspect-[16/10] bg-[#E9F2EC] overflow-hidden">
                      <ResilientImage
                        src={item.imageUrl || DEFAULT_PRODUCE_IMG}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                        fallbackTitle={item.productName}
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-[#525B56]">
                          {item.cropCategory} · {item.location}
                        </p>
                        <h3 className="text-base font-semibold text-[#1C1F1D] mt-1">{item.productName}</h3>
                        <p className="text-xs text-[#525B56] mt-2 leading-relaxed">{item.description}</p>
                        <p className="text-xs text-[#525B56] mt-3 tabular-nums">
                          Seller: <strong className="text-[#1C1F1D]">{item.farmerName}</strong> · Harvested {item.harvestDate}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-[#EEF0EB] flex items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-mono font-semibold tabular-nums text-[#1B4332]">
                            ₹{item.pricePerUnitInr.toLocaleString('en-IN')}
                            <span className="text-xs font-sans font-normal text-[#525B56]"> / {item.unit}</span>
                          </p>
                          <p className="text-xs text-[#525B56] tabular-nums">
                            Available: {item.quantity} {item.unit}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isOwn && (
                            <button
                              type="button"
                              onClick={() => void handleReportListing(item)}
                              title="Report listing"
                              className="p-2 text-[#525B56] hover:text-[#B91C1C] border border-[#E2E5DF] rounded-lg"
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isOwn}
                            onClick={() => {
                              setSelectedListing(item);
                              setOrderQty(String(Math.min(50, item.quantity)));
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-lg hover:bg-[#143325] disabled:opacity-45 whitespace-nowrap"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{isOwn ? 'Your Listing' : 'Request Purchase'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {viewTab === 'my-listings' && isFarmer && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <SectionCard title="Publish New Produce Listing">
              <form onSubmit={handleCreateListing} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Product Name *</label>
                  <input required value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Organic Erode Turmeric Fingers" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Category *</label>
                    <select value={cropCategory} onChange={(e) => setCropCategory(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                      {CROP_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Harvest Date *</label>
                    <input required type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Quantity *</label>
                    <input required type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Unit *</label>
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-2 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                      <option value="kg">kg</option>
                      <option value="quintal">quintal</option>
                      <option value="tonne">tonne</option>
                      <option value="crate">crate</option>
                      <option value="bunch">bunch</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Price (₹) *</label>
                    <input required type="number" min="1" value={pricePerUnitInr} onChange={(e) => setPricePerUnitInr(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Farm Pickup / Dispatch Location *</label>
                  <input required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="District, State" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Product Description *</label>
                  <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Grade, moisture level, organic certification, packaging details..." className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <button type="submit" className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325]">
                  <Plus className="w-4 h-4" /> Publish Listing
                </button>
              </form>
            </SectionCard>
          </div>

          <div className="lg:col-span-7">
            <SectionCard title="Your Published Produce Lots">
              {myListings.length === 0 ? (
                <EmptyState title="No listings published" description="Create a produce listing on the left to connect directly with buyers." />
              ) : (
                <div className="divide-y divide-[#EEF0EB]">
                  {myListings.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-sm font-semibold text-[#1C1F1D]">{item.productName}</h3>
                          <StatusLabel status={item.status} />
                        </div>
                        <p className="text-xs text-[#525B56] mt-1 tabular-nums">
                          {item.quantity} {item.unit} · ₹{item.pricePerUnitInr}/{item.unit} · {item.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          aria-label="Listing availability"
                          value={item.status}
                          onChange={(e) => void updateMarketplaceListingStatus(item.id, e.target.value as MarketplaceListing['status'])}
                          className="px-2.5 py-1.5 text-xs border border-[#D3D9CE] rounded-md bg-white"
                        >
                          <option value="available">Available</option>
                          <option value="reserved">Reserved</option>
                          <option value="sold_out">Sold Out</option>
                          <option value="removed">Removed</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void deleteMarketplaceListing(item.id)}
                          className="p-1.5 text-[#525B56] hover:text-[#B91C1C]"
                          aria-label="Delete listing"
                        >
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

      {/* Purchase Request Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E5DF] rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#1C1F1D]">Submit Purchase Request</h3>
            <p className="text-xs text-[#525B56] mt-1">
              {selectedListing.productName} · ₹{selectedListing.pricePerUnitInr.toLocaleString('en-IN')}/{selectedListing.unit} · Seller: {selectedListing.farmerName}
            </p>

            <form onSubmit={handlePlaceOrder} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">
                  Quantity ({selectedListing.unit}, max {selectedListing.quantity}) *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  max={selectedListing.quantity}
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums"
                />
                <p className="text-xs font-mono tabular-nums text-[#1B4332] mt-1.5">
                  Estimated Total: ₹{(Number(orderQty || 0) * selectedListing.pricePerUnitInr).toLocaleString('en-IN')} (Offline settlement)
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Delivery / Pickup Location *</label>
                <input
                  required
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  placeholder="Enter delivery address or pickup arrangement"
                  className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Notes to Farmer (Optional)</label>
                <textarea
                  rows={2}
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  placeholder="Preferred pickup date, grading requirements, or contact details..."
                  className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="px-4 py-2 text-sm font-medium text-[#525B56] border border-[#E2E5DF] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-4 py-2 bg-[#1B4332] text-white text-sm font-semibold rounded-lg hover:bg-[#143325] disabled:opacity-60"
                >
                  {submittingOrder ? 'Submitting...' : 'Send Purchase Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
