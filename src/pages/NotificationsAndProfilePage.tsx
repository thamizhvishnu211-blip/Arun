import React, { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { deleteNotification, markNotificationRead } from '../services/firestoreService';
import type { AppLanguage, NotificationItem } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

export function NotificationsPage({ notifications }: { notifications: NotificationItem[] }) {
  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(n.id)));
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Real-time alerts for purchase requests, order updates, service bookings, task assignments, and verification changes."
        action={
          notifications.some((n) => !n.read) ? (
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              className="px-4 py-2 text-xs font-semibold bg-[#1B4332] text-white rounded-lg hover:bg-[#143325]"
            >
              Mark All as Read
            </button>
          ) : undefined
        }
      />

      <SectionCard title={`Notification Centre (${notifications.length})`}>
        {notifications.length === 0 ? (
          <EmptyState title="All caught up" description="Database-backed notifications for your account will appear here." />
        ) : (
          <div className="divide-y divide-[#EEF0EB]">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4 ${
                  !item.read ? 'bg-[#FAFBF8] -mx-6 px-6' : ''
                }`}
              >
                <div>
                  <p className="text-xs text-[#525B56] capitalize">
                    {item.category.replace(/_/g, ' ')} {!item.read ? '· Unread' : ''}
                  </p>
                  <p className="text-sm font-semibold text-[#1C1F1D] mt-0.5">{item.title}</p>
                  <p className="text-xs text-[#525B56] mt-1 leading-relaxed">{item.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => void markNotificationRead(item.id)}
                      className="p-1.5 text-[#1B4332] hover:bg-[#E9F2EC] rounded-md"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void deleteNotification(item.id)}
                    className="p-1.5 text-[#525B56] hover:text-[#B91C1C]"
                    title="Clear notification"
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
  );
}

export function ProfilePage() {
  const { userDoc, updateUserProfile } = useAuth();
  const { setLanguage, t } = useLanguage();

  const [fullName, setFullName] = useState(userDoc?.fullName || '');
  const [phone, setPhone] = useState(userDoc?.phone || '');
  const [stateName, setStateName] = useState(userDoc?.state || '');
  const [district, setDistrict] = useState(userDoc?.district || '');
  const [village, setVillage] = useState(userDoc?.village || '');
  const [preferredLanguage, setPreferredLanguage] = useState<AppLanguage>(userDoc?.preferredLanguage || 'en');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await updateUserProfile({
        fullName,
        phone,
        state: stateName,
        district,
        village,
        preferredLanguage
      });
      await setLanguage(preferredLanguage);
      setFeedback({ type: 'success', message: 'Profile and language preferences updated.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unable to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Account Profile"
        subtitle="Maintain your contact information, regional location, and language preferences."
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="max-w-2xl">
        <SectionCard title="Profile Information">
          <div className="pb-4 mb-5 border-b border-[#EEF0EB] flex flex-wrap items-center justify-between gap-2 text-xs text-[#525B56]">
            <span>Email: <strong className="text-[#1C1F1D]">{userDoc?.email}</strong></span>
            <span>Role: <strong className="text-[#1C1F1D]">{userDoc ? t.roles[userDoc.role] : ''}</strong></span>
            <span>Status: <StatusLabel status={userDoc?.verificationStatus || 'pending'} /></span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Full Name *</label>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Phone Number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">State</label>
                <input value={stateName} onChange={(e) => setStateName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">District</label>
                <input value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Village / Town</label>
                <input value={village} onChange={(e) => setVillage(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#37413C] mb-1">Preferred Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as AppLanguage)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg bg-white"
              >
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#1B4332] text-white text-sm font-semibold rounded-lg hover:bg-[#143325] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
