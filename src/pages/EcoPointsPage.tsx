import React, { useEffect, useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  submitEcoPointsClaim,
  subscribeCollection,
  where
} from '../services/firestoreService';
import type { EcoPointsTransaction, RewardItem } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

const ECO_CATEGORIES: Array<{
  id: EcoPointsTransaction['activityCategory'];
  label: string;
  suggestedPoints: number;
}> = [
  { id: 'water_saving', label: 'Water-Saving Practice (Drip / AWD)', suggestedPoints: 50 },
  { id: 'recycling', label: 'Agricultural Plastic / Mulch Recycling', suggestedPoints: 40 },
  { id: 'organic_composting', label: 'Organic Composting / Vermicompost', suggestedPoints: 60 },
  { id: 'soil_conservation', label: 'Soil Conservation & Cover Cropping', suggestedPoints: 50 }
];

export function EcoPointsPage() {
  const { firebaseUser, userDoc } = useAuth();
  const uid = firebaseUser?.uid;

  const [transactions, setTransactions] = useState<EcoPointsTransaction[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [category, setCategory] = useState<EcoPointsTransaction['activityCategory']>('water_saving');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const u1 = subscribeCollection<EcoPointsTransaction>(
      'eco_points_transactions',
      [where('userId', '==', uid)],
      setTransactions
    );
    const u2 = subscribeCollection<RewardItem>('rewards', [where('active', '==', true)], setRewards);
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  const verifiedBalance = useMemo(
    () =>
      transactions.reduce((acc, tx) => {
        if (tx.status !== 'verified') return acc;
        return tx.transactionType === 'earn' ? acc + tx.awardedPoints : acc - tx.awardedPoints;
      }, 0),
    [transactions]
  );

  const pendingPoints = useMemo(
    () =>
      transactions
        .filter((tx) => tx.status === 'pending' && tx.transactionType === 'earn')
        .reduce((acc, tx) => acc + tx.requestedPoints, 0),
    [transactions]
  );

  const verifiedCount = useMemo(
    () => transactions.filter((tx) => tx.status === 'verified' && tx.transactionType === 'earn').length,
    [transactions]
  );

  const badges = useMemo(() => {
    const list: Array<{ title: string; criteria: string; earned: boolean }> = [
      { title: 'Water Steward', criteria: '1+ verified water-saving activity', earned: transactions.some((t) => t.status === 'verified' && t.activityCategory === 'water_saving') },
      { title: 'Soil Guardian', criteria: '1+ verified composting or soil conservation log', earned: transactions.some((t) => t.status === 'verified' && (t.activityCategory === 'organic_composting' || t.activityCategory === 'soil_conservation')) },
      { title: 'Zero-Waste Grower', criteria: '1+ verified recycling log', earned: transactions.some((t) => t.status === 'verified' && t.activityCategory === 'recycling') },
      { title: 'Sustainability Champion', criteria: '250+ verified Eco Points earned', earned: verifiedBalance >= 250 }
    ];
    return list;
  }, [transactions, verifiedBalance]);

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;
    setFeedback(null);
    const selected = ECO_CATEGORIES.find((c) => c.id === category);
    try {
      await submitEcoPointsClaim({
        userName: userDoc.fullName,
        activityCategory: category,
        description,
        requestedPoints: selected?.suggestedPoints || 50,
        transactionType: 'earn'
      });
      setDescription('');
      setFeedback({
        type: 'success',
        message: 'Sustainable activity submitted to the Eco Points ledger. Points are credited once verified by an administrator.'
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unable to submit Eco Points claim.' });
    }
  };

  const handleRedeem = async (reward: RewardItem) => {
    if (!userDoc) return;
    if (verifiedBalance < reward.pointsCost) {
      setFeedback({ type: 'error', message: `You need ${reward.pointsCost} verified Eco Points to request this reward.` });
      return;
    }
    try {
      await submitEcoPointsClaim({
        userName: userDoc.fullName,
        activityCategory: 'reward_redemption',
        description: `Redemption request: ${reward.title} (${reward.pointsCost} pts)`,
        requestedPoints: reward.pointsCost,
        transactionType: 'redeem'
      });
      setFeedback({
        type: 'success',
        message: `Redemption request for "${reward.title}" submitted for administrator fulfilment.`
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Redemption request failed.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Eco Points & Sustainability Rewards"
        subtitle="Submit verifiable water-saving, recycling, and soil conservation activities to earn administrator-verified Eco Points."
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Verified Eco Points Balance</p>
          <p className="text-3xl font-mono font-semibold tabular-nums text-[#1B4332] mt-1.5">{verifiedBalance}</p>
          <p className="text-xs text-[#525B56] mt-1">Server-rule protected ledger</p>
        </div>
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Pending Admin Review</p>
          <p className="text-3xl font-mono font-semibold tabular-nums text-[#B45309] mt-1.5">{pendingPoints}</p>
          <p className="text-xs text-[#525B56] mt-1">Awaiting verification</p>
        </div>
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Verified Sustainable Actions</p>
          <p className="text-3xl font-mono font-semibold tabular-nums text-[#1C1F1D] mt-1.5">{verifiedCount}</p>
          <p className="text-xs text-[#525B56] mt-1">Completed & audited</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-5">
          <SectionCard title="Submit Sustainable Activity Claim">
            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Sustainability Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EcoPointsTransaction['activityCategory'])}
                  className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white"
                >
                  {ECO_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} (~{c.suggestedPoints} pts)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Activity Details & Verification Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the field plot, date, water saved or organic practice completed..."
                  className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325]">
                Submit for Verification
              </button>
            </form>
          </SectionCard>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <SectionCard title="Achievement Milestones">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {badges.map((b) => (
                <div
                  key={b.title}
                  className={`p-4 rounded-lg border ${
                    b.earned ? 'bg-[#E9F2EC]/60 border-[#1B4332]' : 'bg-[#FAFBF8] border-[#E2E5DF]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#1C1F1D]">{b.title}</p>
                    <Award className={`w-4 h-4 ${b.earned ? 'text-[#1B4332]' : 'text-[#A0A8A2]'}`} />
                  </div>
                  <p className="text-xs text-[#525B56] mt-1">{b.criteria}</p>
                  <p className={`text-xs font-medium mt-2 ${b.earned ? 'text-[#166534]' : 'text-[#525B56]'}`}>
                    {b.earned ? 'Earned' : 'Not yet earned'}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Reward Catalogue">
            {rewards.length === 0 ? (
              <EmptyState
                title="No active rewards published"
                description="Administrators manage the Eco Points reward catalogue from the Admin Console."
              />
            ) : (
              <div className="divide-y divide-[#EEF0EB]">
                {rewards.map((r) => (
                  <div key={r.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#1C1F1D]">{r.title}</p>
                      <p className="text-xs text-[#525B56] mt-0.5">{r.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-semibold tabular-nums text-[#1B4332]">{r.pointsCost} pts</p>
                      <button
                        type="button"
                        disabled={verifiedBalance < r.pointsCost}
                        onClick={() => void handleRedeem(r)}
                        className="mt-1 px-3 py-1 text-xs font-medium bg-[#1B4332] text-white rounded-md disabled:opacity-40"
                      >
                        Request Redeem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Eco Points Transaction Ledger">
        {transactions.length === 0 ? (
          <EmptyState title="No ledger entries yet" description="Your submitted sustainability claims and verified rewards will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E5DF] text-left text-xs text-[#525B56]">
                  <th className="py-2.5 font-medium">Type</th>
                  <th className="py-2.5 font-medium">Category</th>
                  <th className="py-2.5 font-medium">Description</th>
                  <th className="py-2.5 font-medium text-right">Requested</th>
                  <th className="py-2.5 font-medium text-right">Verified Pts</th>
                  <th className="py-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF0EB]">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-3 text-xs font-medium capitalize">{tx.transactionType}</td>
                    <td className="py-3 text-xs text-[#525B56]">{tx.activityCategory.replace(/_/g, ' ')}</td>
                    <td className="py-3 text-xs text-[#1C1F1D]">{tx.description}</td>
                    <td className="py-3 text-right font-mono tabular-nums text-xs">{tx.requestedPoints}</td>
                    <td className="py-3 text-right font-mono tabular-nums font-semibold text-[#1B4332]">
                      {tx.transactionType === 'redeem' ? `-${tx.awardedPoints}` : `+${tx.awardedPoints}`}
                    </td>
                    <td className="py-3 text-right">
                      <StatusLabel status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
