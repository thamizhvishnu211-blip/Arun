import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Search, Trash2 } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import {
  adminUpdateUser,
  createAnnouncement,
  createRewardItem,
  deleteAnnouncement,
  deleteMarketplaceListing,
  deleteRewardItem,
  reviewEcoPointsTransaction,
  savePlatformSettings,
  subscribeAdminAuditLogs,
  subscribeCollection,
  updateMarketplaceListingStatus,
  updateSupportTicket
} from '../services/firestoreService';
import type {
  AuditLog,
  EcoPointsTransaction,
  MarketplaceListing,
  OrderRecord,
  PlatformAnnouncement,
  PlatformSettings,
  RewardItem,
  ServiceBooking,
  ServiceListing,
  SupportTicket,
  SupportTicketStatus,
  UserDoc
} from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

type AdminTab = 'overview' | 'users' | 'marketplace' | 'services' | 'eco' | 'support' | 'announcements' | 'audit';

export function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [users, setUsers] = useState<UserDoc[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ecoTxs, setEcoTxs] = useState<EcoPointsTransaction[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Search / filters / pagination
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const pageSize = 10;

  // Support response draft
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});

  // Reward form
  const [rewTitle, setRewTitle] = useState('');
  const [rewDesc, setRewDesc] = useState('');
  const [rewCost, setRewCost] = useState('150');
  const [rewCat, setRewCat] = useState('Farm Inputs');

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annAudience, setAnnAudience] = useState<PlatformAnnouncement['audience']>('all');

  // Platform settings
  const [settings, setSettings] = useState<PlatformSettings>({
    maintenanceNotice: '',
    ecoPointsDefaultReward: 50,
    requireVerificationForListings: false,
    supportEmail: 'support@agrisphere.in'
  });

  useEffect(() => {
    if (!isAdmin) return;
    const unsubs = [
      subscribeCollection<UserDoc>('users', [], setUsers),
      subscribeCollection<MarketplaceListing>('marketplace_listings', [], setListings),
      subscribeCollection<OrderRecord>('orders', [], setOrders),
      subscribeCollection<ServiceListing>('service_listings', [], setServices),
      subscribeCollection<ServiceBooking>('service_bookings', [], setBookings),
      subscribeCollection<SupportTicket>('support_tickets', [], setTickets),
      subscribeCollection<EcoPointsTransaction>('eco_points_transactions', [], setEcoTxs),
      subscribeCollection<RewardItem>('rewards', [], setRewards),
      subscribeCollection<PlatformAnnouncement>('platform_announcements', [], setAnnouncements),
      subscribeAdminAuditLogs(setAuditLogs)
    ];

    getDoc(doc(db, 'platform_settings', 'global'))
      .then((snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as PlatformSettings);
        }
      })
      .catch(() => {});

    return () => unsubs.forEach((u) => u());
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <EmptyState
        title="Administrator Authorization Required"
        description="This console is strictly protected by role-based access control and Firestore security rules."
      />
    );
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (userSearch.trim() && !`${u.fullName} ${u.email} ${u.district || ''}`.toLowerCase().includes(userSearch.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [users, userRoleFilter, userSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = filteredUsers.slice((userPage - 1) * pageSize, userPage * pageSize);

  const verifiedEcoIssued = useMemo(
    () =>
      ecoTxs
        .filter((tx) => tx.status === 'verified' && tx.transactionType === 'earn')
        .reduce((acc, tx) => acc + tx.awardedPoints, 0),
    [ecoTxs]
  );

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRewardItem({
        title: rewTitle,
        description: rewDesc,
        pointsCost: Number(rewCost),
        category: rewCat,
        active: true
      });
      setRewTitle('');
      setRewDesc('');
      setFeedback({ type: 'success', message: 'Reward added to Eco Points catalogue.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create reward.' });
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAnnouncement({ title: annTitle, body: annBody, audience: annAudience });
      setAnnTitle('');
      setAnnBody('');
      setFeedback({ type: 'success', message: 'Platform announcement published.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to publish announcement.' });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await savePlatformSettings({
        maintenanceNotice: settings.maintenanceNotice,
        ecoPointsDefaultReward: Number(settings.ecoPointsDefaultReward),
        requireVerificationForListings: settings.requireVerificationForListings,
        supportEmail: settings.supportEmail
      });
      setFeedback({ type: 'success', message: 'Platform settings saved and audited.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save settings.' });
    }
  };

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: `Users (${users.length})` },
    { id: 'marketplace', label: `Market & Orders (${orders.length})` },
    { id: 'services', label: `Services (${bookings.length})` },
    { id: 'eco', label: `Eco Points (${ecoTxs.filter((t) => t.status === 'pending').length})` },
    { id: 'support', label: `Support (${tickets.filter((t) => t.status === 'open').length})` },
    { id: 'announcements', label: 'Announcements' },
    { id: 'audit', label: 'Audit & Settings' }
  ];

  return (
    <div>
      <PageHeader
        title="Administrator Console"
        subtitle="Manage platform accounts, farmer & provider verification, marketplace moderation, Eco Points ledger, support tickets, and audit logs."
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* Horizontal Admin Tab Bar */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-white border border-[#E2E5DF] rounded-xl mb-8">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              tab === item.id ? 'bg-[#1B4332] text-white' : 'text-[#525B56] hover:bg-[#F3F5F0] hover:text-[#1C1F1D]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Registered Users', value: users.length },
            { label: 'Active Farmers', value: users.filter((u) => u.role === 'farmer').length },
            { label: 'Registered Buyers', value: users.filter((u) => u.role === 'buyer').length },
            { label: 'Service Providers', value: users.filter((u) => u.role === 'provider').length },
            { label: 'Agricultural Experts', value: users.filter((u) => u.role === 'expert').length },
            { label: 'Active Listings', value: listings.filter((l) => l.status === 'available').length },
            { label: 'Marketplace Orders', value: orders.length },
            { label: 'Service Requests', value: bookings.length },
            { label: 'Open Support Tickets', value: tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length },
            { label: 'Verified Eco Points Issued', value: verifiedEcoIssued }
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-[#E2E5DF] rounded-xl p-5">
              <p className="text-xs text-[#525B56]">{stat.label}</p>
              <p className="text-2xl font-mono font-semibold tabular-nums text-[#1C1F1D] mt-2">
                {stat.value.toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <SectionCard title="User Directory & Account Verification">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#525B56] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Search by name, email, or district..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#D3D9CE] rounded-lg"
              />
            </div>
            <select
              value={userRoleFilter}
              onChange={(e) => {
                setUserRoleFilter(e.target.value);
                setUserPage(1);
              }}
              className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white"
            >
              <option value="all">All Roles</option>
              <option value="farmer">Farmers</option>
              <option value="buyer">Buyers</option>
              <option value="provider">Service Providers</option>
              <option value="expert">Experts</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E5DF] text-left text-xs text-[#525B56]">
                  <th className="py-2.5 font-medium">User</th>
                  <th className="py-2.5 font-medium">Role</th>
                  <th className="py-2.5 font-medium">Verification</th>
                  <th className="py-2.5 font-medium">Account</th>
                  <th className="py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF0EB]">
                {pagedUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3">
                      <p className="font-medium text-[#1C1F1D]">{u.fullName}</p>
                      <p className="text-xs text-[#525B56]">{u.email} {u.district ? `· ${u.district}` : ''}</p>
                    </td>
                    <td className="py-3 capitalize text-xs font-medium">{u.role}</td>
                    <td className="py-3"><StatusLabel status={u.verificationStatus} /></td>
                    <td className="py-3"><StatusLabel status={u.accountStatus} /></td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      {u.verificationStatus !== 'verified' && (
                        <button
                          type="button"
                          onClick={() => void adminUpdateUser(u, { verificationStatus: 'verified' })}
                          className="px-2.5 py-1 text-xs font-medium bg-[#1B4332] text-white rounded"
                        >
                          Verify
                        </button>
                      )}
                      {u.accountStatus === 'active' && u.role !== 'admin' ? (
                        <button
                          type="button"
                          onClick={() => void adminUpdateUser(u, { accountStatus: 'suspended' })}
                          className="px-2.5 py-1 text-xs font-medium border border-[#FECACA] text-[#B91C1C] rounded"
                        >
                          Suspend
                        </button>
                      ) : u.accountStatus === 'suspended' ? (
                        <button
                          type="button"
                          onClick={() => void adminUpdateUser(u, { accountStatus: 'active' })}
                          className="px-2.5 py-1 text-xs font-medium border border-[#D3D9CE] text-[#1C1F1D] rounded"
                        >
                          Reactivate
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#EEF0EB] text-xs text-[#525B56]">
              <span>Page {userPage} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={userPage <= 1} onClick={() => setUserPage((p) => p - 1)} className="px-3 py-1 border border-[#D3D9CE] rounded disabled:opacity-40">Prev</button>
                <button disabled={userPage >= totalPages} onClick={() => setUserPage((p) => p + 1)} className="px-3 py-1 border border-[#D3D9CE] rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {tab === 'marketplace' && (
        <div className="space-y-6">
          <SectionCard title={`Marketplace Listings (${listings.length})`}>
            {listings.length === 0 ? (
              <EmptyState title="No marketplace listings" description="Farmer listings will appear here for moderation." />
            ) : (
              <div className="divide-y divide-[#EEF0EB]">
                {listings.map((l) => (
                  <div key={l.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{l.productName} · ₹{l.pricePerUnitInr}/{l.unit}</p>
                      <p className="text-xs text-[#525B56]">{l.farmerName} · {l.location} · <StatusLabel status={l.status} /></p>
                    </div>
                    <div className="flex items-center gap-2">
                      {l.status !== 'removed' && (
                        <button type="button" onClick={() => void updateMarketplaceListingStatus(l.id, 'removed')} className="px-2.5 py-1 text-xs border border-[#FECACA] text-[#B91C1C] rounded">
                          Remove
                        </button>
                      )}
                      <button type="button" onClick={() => void deleteMarketplaceListing(l.id)} className="p-1.5 text-[#525B56] hover:text-[#B91C1C]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title={`Platform Orders (${orders.length})`}>
            {orders.length === 0 ? (
              <EmptyState title="No orders recorded" description="Marketplace transactions will appear here." />
            ) : (
              <div className="divide-y divide-[#EEF0EB]">
                {orders.map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="text-sm font-medium text-[#1C1F1D]">{o.productName} ({o.quantity} {o.unit})</p>
                      <p className="text-[#525B56]">Buyer: {o.buyerName} → Farmer: {o.farmerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold tabular-nums">₹{o.totalAmountInr.toLocaleString('en-IN')}</p>
                      <StatusLabel status={o.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'services' && (
        <SectionCard title={`Service Listings (${services.length}) & Bookings (${bookings.length})`}>
          {bookings.length === 0 ? (
            <EmptyState title="No service bookings" description="Farmer service bookings across all providers appear here." />
          ) : (
            <div className="divide-y divide-[#EEF0EB]">
              {bookings.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="text-sm font-medium text-[#1C1F1D]">{b.serviceTitle}</p>
                    <p className="text-[#525B56]">Farmer: {b.farmerName} · Provider: {b.providerName} · {b.requestedDate}</p>
                  </div>
                  <StatusLabel status={b.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {tab === 'eco' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <SectionCard title="Eco Points Verification Queue">
              {ecoTxs.length === 0 ? (
                <EmptyState title="No Eco Points claims" description="Farmer sustainability submissions appear here for verification." />
              ) : (
                <div className="divide-y divide-[#EEF0EB]">
                  {ecoTxs.map((tx) => (
                    <div key={tx.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{tx.userName}</p>
                          <span className="text-xs text-[#525B56]">· {tx.transactionType} · {tx.requestedPoints} pts</span>
                          <StatusLabel status={tx.status} />
                        </div>
                        <p className="text-xs text-[#525B56] mt-1">{tx.description}</p>
                      </div>
                      {tx.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => void reviewEcoPointsTransaction(tx, 'verified', tx.requestedPoints)}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#1B4332] text-white rounded"
                          >
                            Approve ({tx.requestedPoints} pts)
                          </button>
                          <button
                            type="button"
                            onClick={() => void reviewEcoPointsTransaction(tx, 'rejected', 0)}
                            className="px-3 py-1.5 text-xs border border-[#FECACA] text-[#B91C1C] rounded"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <SectionCard title="Add Reward to Catalogue">
              <form onSubmit={handleCreateReward} className="space-y-3">
                <input required value={rewTitle} onChange={(e) => setRewTitle(e.target.value)} placeholder="Reward title (e.g. Certified Soil Test Voucher)" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                <div className="grid grid-cols-2 gap-3">
                  <input required type="number" min="1" value={rewCost} onChange={(e) => setRewCost(e.target.value)} placeholder="Points cost" className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                  <input required value={rewCat} onChange={(e) => setRewCat(e.target.value)} placeholder="Category" className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <textarea required rows={2} value={rewDesc} onChange={(e) => setRewDesc(e.target.value)} placeholder="Redemption terms..." className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                <button type="submit" className="w-full py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-lg">
                  Publish Reward
                </button>
              </form>
            </SectionCard>

            <SectionCard title={`Active Rewards (${rewards.length})`}>
              <div className="divide-y divide-[#EEF0EB]">
                {rewards.map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <span><strong>{r.title}</strong> ({r.pointsCost} pts)</span>
                    <button type="button" onClick={() => void deleteRewardItem(r.id)} className="text-[#B91C1C] hover:underline">Delete</button>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'support' && (
        <SectionCard title={`Support & Reported Listing Queue (${tickets.length})`}>
          {tickets.length === 0 ? (
            <EmptyState title="No support tickets" description="User inquiries and reported listings appear here." />
          ) : (
            <div className="divide-y divide-[#EEF0EB]">
              {tickets.map((tk) => (
                <div key={tk.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#525B56]">{tk.category} · {tk.userName} ({tk.userRole})</p>
                      <h3 className="text-sm font-semibold">{tk.subject}</h3>
                      <p className="text-xs text-[#37413C] mt-1">{tk.description}</p>
                    </div>
                    <StatusLabel status={tk.status} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={ticketReplies[tk.id] ?? tk.adminResponse ?? ''}
                      onChange={(e) => setTicketReplies((p) => ({ ...p, [tk.id]: e.target.value }))}
                      placeholder="Write administrator response..."
                      className="flex-1 px-3 py-2 text-xs border border-[#D3D9CE] rounded-lg"
                    />
                    <select
                      aria-label="Ticket status"
                      defaultValue={tk.status}
                      onChange={(e) =>
                        void updateSupportTicket(tk, {
                          status: e.target.value as SupportTicketStatus,
                          adminResponse: ticketReplies[tk.id] ?? tk.adminResponse ?? ''
                        })
                      }
                      className="px-2.5 py-2 text-xs border border-[#D3D9CE] rounded-lg bg-white"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_for_response">Waiting for Response</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        void updateSupportTicket(tk, {
                          status: 'resolved',
                          adminResponse: ticketReplies[tk.id] ?? tk.adminResponse ?? 'Reviewed and resolved by AgriSphere Support.'
                        })
                      }
                      className="px-3.5 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-lg whitespace-nowrap"
                    >
                      Send & Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {tab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <SectionCard title="Publish Platform Announcement">
              <form onSubmit={handleCreateAnnouncement} className="space-y-3">
                <input required value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Announcement headline *" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                <select value={annAudience} onChange={(e) => setAnnAudience(e.target.value as PlatformAnnouncement['audience'])} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                  <option value="all">All Users</option>
                  <option value="farmer">Farmers Only</option>
                  <option value="buyer">Buyers Only</option>
                  <option value="provider">Service Providers</option>
                  <option value="expert">Experts</option>
                </select>
                <textarea required rows={3} value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="Seasonal advisory, policy update, or notice..." className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg">
                  Publish Announcement
                </button>
              </form>
            </SectionCard>
          </div>
          <div className="lg:col-span-7">
            <SectionCard title={`Active Announcements (${announcements.length})`}>
              {announcements.length === 0 ? (
                <EmptyState title="No announcements published" description="Broadcast important advisories to all or selected user roles." />
              ) : (
                <div className="divide-y divide-[#EEF0EB]">
                  {announcements.map((a) => (
                    <div key={a.id} className="py-3.5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#525B56] capitalize">Audience: {a.audience}</p>
                        <p className="text-sm font-semibold">{a.title}</p>
                        <p className="text-xs text-[#37413C] mt-1">{a.body}</p>
                      </div>
                      <button type="button" onClick={() => void deleteAnnouncement(a.id)} className="p-1 text-[#525B56] hover:text-[#B91C1C]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <SectionCard title="Platform Settings">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Support Email</label>
                  <input required type="email" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Default Eco Points Award</label>
                  <input required type="number" min="0" max="1000" value={settings.ecoPointsDefaultReward} onChange={(e) => setSettings({ ...settings, ecoPointsDefaultReward: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Maintenance Notice (Optional)</label>
                  <input value={settings.maintenanceNotice || ''} onChange={(e) => setSettings({ ...settings, maintenanceNotice: e.target.value })} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <label className="flex items-center gap-2 text-xs text-[#37413C]">
                  <input
                    type="checkbox"
                    checked={settings.requireVerificationForListings}
                    onChange={(e) => setSettings({ ...settings, requireVerificationForListings: e.target.checked })}
                  />
                  <span>Require account verification before publishing marketplace listings</span>
                </label>
                <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg">
                  Save Settings
                </button>
              </form>
            </SectionCard>
          </div>

          <div className="lg:col-span-7">
            <SectionCard title={`Immutable Audit Trail (${auditLogs.length})`}>
              {auditLogs.length === 0 ? (
                <EmptyState title="No audit events yet" description="Key administrative and operational mutations are permanently logged here." />
              ) : (
                <div className="divide-y divide-[#EEF0EB] max-h-[480px] overflow-y-auto">
                  {auditLogs.slice(0, 50).map((log) => (
                    <div key={log.id} className="py-3 text-xs">
                      <p className="font-mono font-medium text-[#1C1F1D]">
                        {log.action} · {log.targetCollection}/{log.targetId}
                      </p>
                      <p className="text-[#525B56] mt-0.5">
                        Actor: {log.actorEmail || log.actorId} {log.details ? `— ${log.details}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
