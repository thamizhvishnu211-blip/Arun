import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createSupportTicket,
  subscribeCollection,
  updateSupportTicket,
  where
} from '../services/firestoreService';
import type { SupportTicket } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

const FAQS = [
  {
    q: 'How are payments handled on the AgriSphere Marketplace?',
    a: 'AgriSphere connects buyers and farmers transparently through structured purchase requests and 9-stage order tracking. Financial settlement is arranged directly between buyer and farmer offline; AgriSphere does not process online card or UPI charges.'
  },
  {
    q: 'How do I get my Farmer or Service Provider account verified?',
    a: 'All new registrations start in Pending status. Administrators review user details and mark accounts as Verified from the Admin Console, triggering an immediate notification.'
  },
  {
    q: 'Are Soil Monitoring and Irrigation connected to physical field sensors?',
    a: 'No physical IoT sensors or pump valves are pre-connected. Soil readings reflect manually entered field measurements or certified lab reports, and irrigation schedules track manual operations with future IoT readiness.'
  },
  {
    q: 'How are Eco Points earned and verified?',
    a: 'Submit your water-saving, recycling, composting, or soil conservation activity in Eco Points. Administrators verify each ledger entry before points are added to your balance to prevent manipulation.'
  },
  {
    q: 'Does AgriSphere work with intermittent rural internet?',
    a: 'Yes. Cloud Firestore offline caching is enabled so previously loaded records remain viewable offline and queued edits synchronize automatically when connectivity resumes.'
  }
];

export function SupportPage() {
  const { firebaseUser, userDoc } = useAuth();
  const uid = firebaseUser?.uid;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [category, setCategory] = useState('Account & Verification');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeCollection<SupportTicket>('support_tickets', [where('userId', '==', uid)], setTickets);
  }, [uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;
    setFeedback(null);
    try {
      await createSupportTicket({
        userName: userDoc.fullName,
        userRole: userDoc.role,
        category,
        subject,
        description,
        attachmentName
      });
      setSubject('');
      setDescription('');
      setAttachmentName('');
      setFeedback({ type: 'success', message: 'Support ticket created. Administrators will respond here and notify you.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unable to submit support ticket.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Support Centre & Agricultural FAQ"
        subtitle="Submit support requests, track administrator responses, and read operational help documentation."
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-5">
          <SectionCard title="Submit Support Ticket">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Issue Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                  <option>Account & Verification</option>
                  <option>Marketplace & Orders</option>
                  <option>Agricultural Services</option>
                  <option>Reported Listing</option>
                  <option>Eco Points & Rewards</option>
                  <option>Technical Issue</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Subject *</label>
                <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your issue" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Description *</label>
                <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide order IDs, listing details, or steps to help our support team..." className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Supporting Photo Reference (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')}
                  className="w-full text-xs text-[#525B56] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-[#D3D9CE] file:bg-[#FAFBF8] file:text-xs file:font-medium"
                />
                {attachmentName && <p className="text-xs text-[#525B56] mt-1">Attached file: {attachmentName}</p>}
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325]">
                Submit Ticket
              </button>
            </form>
          </SectionCard>
        </div>

        <div className="lg:col-span-7">
          <SectionCard title={`Your Support History (${tickets.length})`}>
            {tickets.length === 0 ? (
              <EmptyState title="No support tickets" description="Submitted support requests and administrator responses will appear here." />
            ) : (
              <div className="divide-y divide-[#EEF0EB]">
                {tickets.map((tk) => (
                  <div key={tk.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#525B56]">{tk.category}</p>
                        <h3 className="text-sm font-semibold text-[#1C1F1D] mt-0.5">{tk.subject}</h3>
                      </div>
                      <StatusLabel status={tk.status} />
                    </div>
                    <p className="text-xs text-[#37413C] leading-relaxed">{tk.description}</p>
                    {tk.attachmentName && <p className="text-xs text-[#525B56]">Attachment: {tk.attachmentName}</p>}
                    {tk.adminResponse && (
                      <div className="bg-[#EEF6F0] border border-[#B7DFC2] rounded-lg p-3 text-xs text-[#14532D]">
                        <strong>Administrator Response:</strong> {tk.adminResponse}
                      </div>
                    )}
                    {tk.status !== 'resolved' && tk.status !== 'closed' && (
                      <button
                        type="button"
                        onClick={() => void updateSupportTicket(tk, { status: 'closed' })}
                        className="text-xs font-medium text-[#525B56] hover:text-[#1C1F1D] underline"
                      >
                        Close Ticket
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Agricultural Help Centre & FAQ">
        <div className="divide-y divide-[#EEF0EB]">
          {FAQS.map((item) => (
            <details key={item.q} className="py-3.5 first:pt-0 last:pb-0 group">
              <summary className="text-sm font-semibold text-[#1C1F1D] list-none flex items-center justify-between gap-4">
                <span>{item.q}</span>
                <span className="text-xs text-[#2D6A4F] group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-xs text-[#525B56] mt-2 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
