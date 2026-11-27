import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { subscribeCollection, updateOrderStatus, where } from '../services/firestoreService';
import type { OrderRecord, OrderStatus } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

const FARMER_TRANSITIONS: Record<string, OrderStatus[]> = {
  pending: ['accepted', 'rejected'],
  accepted: ['processing', 'ready_for_pickup'],
  processing: ['ready_for_pickup', 'shipped'],
  ready_for_pickup: ['shipped', 'delivered'],
  shipped: ['delivered']
};

export function OrdersPage() {
  const { firebaseUser, userDoc } = useAuth();
  const { t } = useLanguage();
  const uid = firebaseUser?.uid;

  const [incomingOrders, setIncomingOrders] = useState<OrderRecord[]>([]);
  const [outgoingOrders, setOutgoingOrders] = useState<OrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reviewOrder, setReviewOrder] = useState<OrderRecord | null>(null);
  const [rating, setRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const u1 = subscribeCollection<OrderRecord>('orders', [where('farmerId', '==', uid)], setIncomingOrders);
    const u2 = subscribeCollection<OrderRecord>('orders', [where('buyerId', '==', uid)], setOutgoingOrders);
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  const allOrders = userDoc?.role === 'buyer' ? outgoingOrders : [...incomingOrders, ...outgoingOrders];
  const uniqueOrders = Array.from(new Map(allOrders.map((o) => [o.id, o])).values()).filter(
    (o) => statusFilter === 'all' || o.status === statusFilter
  );

  const handleStatusChange = async (order: OrderRecord, nextStatus: OrderStatus) => {
    setFeedback(null);
    try {
      await updateOrderStatus(order, nextStatus);
      setFeedback({ type: 'success', message: `Order updated to "${nextStatus.replace(/_/g, ' ')}".` });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unable to update order.' });
    }
  };

  const handleCompleteWithReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrder) return;
    setFeedback(null);
    try {
      await updateOrderStatus(reviewOrder, 'completed', {
        reviewRating: Number(rating),
        reviewComment
      });
      setReviewOrder(null);
      setReviewComment('');
      setFeedback({ type: 'success', message: 'Order marked completed and review recorded.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to complete order.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Orders & Fulfilment"
        subtitle="Manage buyer purchase requests, farmer fulfilment transitions, delivery confirmation, and transaction records."
        action={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[#D3D9CE] rounded-lg"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="processing">Processing</option>
            <option value="ready_for_pickup">Ready for Pickup</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        }
      />

      <FeedbackBanner type="info" message={t.common.paymentNotice} />
      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <SectionCard title={`Transaction History (${uniqueOrders.length})`}>
        {uniqueOrders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="Purchase requests submitted or received through the Agricultural Marketplace appear here."
          />
        ) : (
          <div className="divide-y divide-[#EEF0EB]">
            {uniqueOrders.map((order) => {
              const isSeller = order.farmerId === uid;
              const isBuyer = order.buyerId === uid;
              const nextFarmerStatuses = isSeller ? FARMER_TRANSITIONS[order.status] || [] : [];

              return (
                <div key={order.id} className="py-5 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-semibold text-[#1C1F1D]">{order.productName}</h3>
                      <StatusLabel status={order.status} />
                      <span className="text-xs text-[#525B56]">
                        · {isSeller ? `Buyer: ${order.buyerName}` : `Farmer: ${order.farmerName}`}
                      </span>
                    </div>
                    <p className="text-xs text-[#525B56] tabular-nums">
                      Quantity: <strong>{order.quantity} {order.unit}</strong> · Rate: ₹{order.pricePerUnitInr}/{order.unit} · Total:{' '}
                      <strong className="font-mono text-[#1B4332]">₹{order.totalAmountInr.toLocaleString('en-IN')}</strong> · Offline settlement pending
                    </p>
                    <p className="text-xs text-[#525B56]">Delivery / Pickup: {order.deliveryLocation}</p>
                    {order.buyerNotes && <p className="text-xs text-[#37413C]">Notes: {order.buyerNotes}</p>}
                    {order.reviewRating && (
                      <p className="text-xs text-[#1B4332]">
                        Buyer Review: {order.reviewRating}/5 {order.reviewComment ? `— "${order.reviewComment}"` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {nextFarmerStatuses.map((nextStatus) => (
                      <button
                        key={nextStatus}
                        type="button"
                        onClick={() => void handleStatusChange(order, nextStatus)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                          nextStatus === 'rejected'
                            ? 'border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]'
                            : 'bg-[#1B4332] text-white hover:bg-[#143325]'
                        }`}
                      >
                        Mark {nextStatus.replace(/_/g, ' ')}
                      </button>
                    ))}

                    {isBuyer && order.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(order, 'cancelled')}
                        className="px-3 py-1.5 text-xs font-medium border border-[#FECACA] text-[#B91C1C] rounded-md hover:bg-[#FEF2F2]"
                      >
                        Cancel Request
                      </button>
                    )}

                    {isBuyer && order.status === 'delivered' && (
                      <button
                        type="button"
                        onClick={() => setReviewOrder(order)}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#1B4332] text-white rounded-md hover:bg-[#143325]"
                      >
                        Confirm Completion & Review
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {reviewOrder && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E5DF] rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[#1C1F1D]">Confirm Delivery & Review</h3>
            <p className="text-xs text-[#525B56] mt-1">
              Confirm receipt of {reviewOrder.quantity} {reviewOrder.unit} of {reviewOrder.productName} from {reviewOrder.farmerName}.
            </p>
            <form onSubmit={handleCompleteWithReview} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Rating (1–5)</label>
                <select value={rating} onChange={(e) => setRating(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                  <option value="5">5 — Excellent quality & timeliness</option>
                  <option value="4">4 — Good</option>
                  <option value="3">3 — Satisfactory</option>
                  <option value="2">2 — Below expectations</option>
                  <option value="1">1 — Issue with fulfilment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Review Notes (Optional)</label>
                <textarea rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReviewOrder(null)} className="px-4 py-2 text-xs font-medium border border-[#E2E5DF] rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold bg-[#1B4332] text-white rounded-lg">
                  Complete Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
