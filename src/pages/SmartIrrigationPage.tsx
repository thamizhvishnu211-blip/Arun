import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  createIrrigationSchedule,
  deleteIrrigationSchedule,
  subscribeCollection,
  updateIrrigationStatus,
  where
} from '../services/firestoreService';
import type { Farm, IrrigationSchedule } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

const CROP_WATER_GUIDE = [
  { crop: 'Paddy (SRI / AWD)', requirement: '900–1,200 mm / season', tip: 'Alternate Wetting and Drying (AWD) saves up to 25% water without lowering grain yield.' },
  { crop: 'Sugarcane', requirement: '1,500–2,000 mm / season', tip: 'Sub-surface or surface drip fertigation cuts evaporation losses substantially.' },
  { crop: 'Turmeric', requirement: '600–800 mm / season', tip: 'Use mulching with dry leaves and drip irrigation every 3–4 days.' },
  { crop: 'Tomato / Vegetables', requirement: '400–600 mm / season', tip: 'Irrigate early morning before 8 AM to minimize fungal foliage pressure and evaporation.' },
  { crop: 'Groundnut / Millets', requirement: '350–500 mm / season', tip: 'Critical moisture stages are flowering and pod/grain filling.' }
];

export function SmartIrrigationPage() {
  const { firebaseUser } = useAuth();
  const { t } = useLanguage();
  const uid = firebaseUser?.uid;

  const [farms, setFarms] = useState<Farm[]>([]);
  const [schedules, setSchedules] = useState<IrrigationSchedule[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [farmId, setFarmId] = useState('');
  const [cropName, setCropName] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState('06:30');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [waterVolumeLiters, setWaterVolumeLiters] = useState('2400');
  const [method, setMethod] = useState<IrrigationSchedule['method']>('drip');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!uid) return;
    const u1 = subscribeCollection<Farm>('farms', [where('farmerId', '==', uid)], (list) => {
      setFarms(list);
      if (list.length > 0) setFarmId((prev) => prev || list[0].id);
    });
    const u2 = subscribeCollection<IrrigationSchedule>('irrigation_schedules', [where('farmerId', '==', uid)], setSchedules);
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  const totalWaterLiters = useMemo(
    () => schedules.filter((s) => s.status === 'completed').reduce((acc, s) => acc + Number(s.waterVolumeLiters || 0), 0),
    [schedules]
  );

  const waterChart = useMemo(
    () =>
      schedules.slice(0, 8).map((s) => ({
        label: `${s.cropName.slice(0, 10)} ${s.scheduledDate.slice(5)}`,
        liters: Number(s.waterVolumeLiters || 0)
      })),
    [schedules]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) {
      setFeedback({ type: 'error', message: 'Please register a farm first in Farms & Crops.' });
      return;
    }
    setFeedback(null);
    try {
      await createIrrigationSchedule({
        farmId,
        cropName,
        fieldName,
        scheduledDate,
        scheduledTime,
        durationMinutes: Number(durationMinutes),
        waterVolumeLiters: Number(waterVolumeLiters),
        method,
        status: 'scheduled',
        notes
      });
      setCropName('');
      setFieldName('');
      setNotes('');
      setFeedback({ type: 'success', message: 'Irrigation schedule saved.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create irrigation schedule.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Smart Irrigation"
        subtitle="Plan crop-wise irrigation schedules, track manual water usage, and review conservation recommendations."
      />

      <FeedbackBanner type="info" message={t.common.valveNotice} />
      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Scheduled Sessions</p>
          <p className="text-2xl font-mono font-semibold tabular-nums mt-1.5">
            {schedules.filter((s) => s.status === 'scheduled').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Completed Sessions</p>
          <p className="text-2xl font-mono font-semibold tabular-nums mt-1.5">
            {schedules.filter((s) => s.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
          <p className="text-xs text-[#525B56]">Logged Completed Water Usage</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-[#1B4332] mt-1.5">
            {totalWaterLiters.toLocaleString('en-IN')} L
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-5">
          <SectionCard title="Create Irrigation Schedule">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Farm *</label>
                <select required value={farmId} onChange={(e) => setFarmId(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                  <option value="">Select farm...</option>
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Crop *</label>
                  <input required value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="e.g. Paddy" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Field / Plot *</label>
                  <input required value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="e.g. North Plot" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Date *</label>
                  <input required type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Start Time *</label>
                  <input required type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Duration (min)</label>
                  <input required type="number" min="1" max="1440" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Est. Liters</label>
                  <input required type="number" min="0" value={waterVolumeLiters} onChange={(e) => setWaterVolumeLiters(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Method</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value as IrrigationSchedule['method'])} className="w-full px-2 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                    <option value="drip">Drip</option>
                    <option value="sprinkler">Sprinkler</option>
                    <option value="furrow">Furrow</option>
                    <option value="flood">Flood</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (e.g. pause if rain exceeds 10 mm)" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325]">
                Save Irrigation Schedule
              </button>
            </form>
          </SectionCard>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <SectionCard title="Water Usage Overview (Liters)">
            {waterChart.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="liters" name="Volume (Liters)" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No water usage logged" description="Add irrigation schedules to track water volume across plots." />
            )}
          </SectionCard>

          <SectionCard title="Crop-Wise Water Reference & Conservation">
            <div className="divide-y divide-[#EEF0EB]">
              {CROP_WATER_GUIDE.map((row) => (
                <div key={row.crop} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-[#1C1F1D]">{row.crop}</p>
                    <p className="text-xs font-mono tabular-nums text-[#2D6A4F]">{row.requirement}</p>
                  </div>
                  <p className="text-xs text-[#525B56] mt-1">{row.tip}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Irrigation Schedule & History">
        {schedules.length === 0 ? (
          <EmptyState title="No irrigation schedules yet" description="Create a schedule above to organize watering intervals and mark completions." />
        ) : (
          <div className="divide-y divide-[#EEF0EB]">
            {schedules.map((item) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <p className="text-sm font-semibold text-[#1C1F1D]">{item.cropName} — {item.fieldName}</p>
                    <StatusLabel status={item.status} />
                  </div>
                  <p className="text-xs text-[#525B56] mt-1 tabular-nums">
                    {item.scheduledDate} at {item.scheduledTime} · {item.durationMinutes} min · {item.waterVolumeLiters.toLocaleString('en-IN')} L · {item.method}
                  </p>
                  {item.notes && <p className="text-xs text-[#525B56] mt-1">{item.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'scheduled' && (
                    <>
                      <button
                        type="button"
                        onClick={() => void updateIrrigationStatus(item.id, 'completed')}
                        className="px-3 py-1.5 text-xs font-medium bg-[#1B4332] text-white rounded-md hover:bg-[#143325]"
                      >
                        Mark Completed
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateIrrigationStatus(item.id, 'skipped')}
                        className="px-3 py-1.5 text-xs font-medium border border-[#D3D9CE] text-[#525B56] rounded-md hover:bg-[#F8F7F2]"
                      >
                        Skip
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => void deleteIrrigationSchedule(item.id)}
                    className="p-1.5 text-[#525B56] hover:text-[#B91C1C]"
                    aria-label="Delete schedule"
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
