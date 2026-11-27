import React, { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  createSoilMeasurement,
  deleteSoilMeasurement,
  subscribeCollection,
  where
} from '../services/firestoreService';
import type { Farm, SoilMeasurement } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard } from '../components/UI';

function getCropSuitability(ph: number, n: number, p: number, k: number): { summary: string; suitableCrops: string[] } {
  const suitable: string[] = [];
  if (ph >= 5.5 && ph <= 7.0) suitable.push('Paddy (Rice)', 'Turmeric', 'Groundnut', 'Banana');
  if (ph >= 6.0 && ph <= 7.5) suitable.push('Tomato', 'Sugarcane', 'Maize', 'Cotton', 'Pulses');
  if (ph > 7.5 && ph <= 8.5) suitable.push('Millets (Ragi / Bajra)', 'Sorghum', 'Sunflower', 'Barley');
  if (ph < 5.5) suitable.push('Tea', 'Coffee', 'Pineapple', 'Pepper');

  const deficits: string[] = [];
  if (n < 40) deficits.push('low Nitrogen');
  if (p < 20) deficits.push('low Phosphorus');
  if (k < 40) deficits.push('low Potassium');

  const summary =
    deficits.length === 0
      ? `Soil pH (${ph}) and NPK balance appear favorable for standard regional cultivation.`
      : `Soil pH is ${ph}. Notable nutrient observation: ${deficits.join(', ')} — verify with a Soil Health Card lab report before fertilizing.`;

  return { summary, suitableCrops: Array.from(new Set(suitable)) };
}

export function SoilMonitoringPage() {
  const { firebaseUser } = useAuth();
  const { t } = useLanguage();
  const uid = firebaseUser?.uid;

  const [farms, setFarms] = useState<Farm[]>([]);
  const [logs, setLogs] = useState<SoilMeasurement[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [farmId, setFarmId] = useState('');
  const [fieldName, setFieldName] = useState('Main Plot');
  const [sourceType, setSourceType] = useState<'manual_entry' | 'lab_report'>('manual_entry');
  const [ph, setPh] = useState('6.7');
  const [moisturePercent, setMoisturePercent] = useState('42');
  const [temperatureC, setTemperatureC] = useState('27');
  const [nitrogenPpm, setNitrogenPpm] = useState('55');
  const [phosphorusPpm, setPhosphorusPpm] = useState('28');
  const [potassiumPpm, setPotassiumPpm] = useState('64');
  const [recordedDate, setRecordedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!uid) return;
    const u1 = subscribeCollection<Farm>('farms', [where('farmerId', '==', uid)], (list) => {
      setFarms(list);
      if (list.length > 0) setFarmId((prev) => prev || list[0].id);
    });
    const u2 = subscribeCollection<SoilMeasurement>('soil_measurements', [where('farmerId', '==', uid)], setLogs);
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  const latest = logs[0];
  const suitability = useMemo(
    () => (latest ? getCropSuitability(latest.ph, latest.nitrogenPpm, latest.phosphorusPpm, latest.potassiumPpm) : null),
    [latest]
  );

  const chartData = useMemo(
    () =>
      [...logs]
        .reverse()
        .map((m) => ({
          date: m.recordedDate,
          ph: m.ph,
          moisture: m.moisturePercent,
          nitrogen: m.nitrogenPpm
        })),
    [logs]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) {
      setFeedback({ type: 'error', message: 'Please register a farm in Farms & Crops before logging soil measurements.' });
      return;
    }
    setFeedback(null);
    try {
      await createSoilMeasurement({
        farmId,
        fieldName,
        sourceType,
        ph: Number(ph),
        moisturePercent: Number(moisturePercent),
        temperatureC: Number(temperatureC),
        nitrogenPpm: Number(nitrogenPpm),
        phosphorusPpm: Number(phosphorusPpm),
        potassiumPpm: Number(potassiumPpm),
        recordedDate,
        notes
      });
      setNotes('');
      setFeedback({ type: 'success', message: 'Soil measurement saved to your historical ledger.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save soil reading.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Soil Monitoring"
        subtitle="Track soil pH, moisture, temperature, and NPK nutrient records from manual field tests or certified soil testing laboratories."
      />

      <FeedbackBanner type="info" message={t.common.sensorNotice} />
      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* Latest Soil Cards */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Soil pH', value: latest.ph.toFixed(1), unit: 'pH' },
            { label: 'Moisture', value: latest.moisturePercent, unit: '%' },
            { label: 'Temperature', value: latest.temperatureC, unit: '°C' },
            { label: 'Nitrogen (N)', value: latest.nitrogenPpm, unit: 'ppm' },
            { label: 'Phosphorus (P)', value: latest.phosphorusPpm, unit: 'ppm' },
            { label: 'Potassium (K)', value: latest.potassiumPpm, unit: 'ppm' }
          ].map((metric) => (
            <div key={metric.label} className="bg-white border border-[#E2E5DF] rounded-xl p-4">
              <p className="text-xs text-[#525B56]">{metric.label}</p>
              <p className="text-xl font-mono font-semibold tabular-nums text-[#1C1F1D] mt-1.5">
                {metric.value} <span className="text-xs font-sans font-normal text-[#525B56]">{metric.unit}</span>
              </p>
              <p className="text-[11px] text-[#525B56] mt-1">
                {latest.sourceType === 'lab_report' ? 'Lab Report' : 'Manual Entry'}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-5">
          <SectionCard title="Enter Soil Measurement">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Farm *</label>
                  <select required value={farmId} onChange={(e) => setFarmId(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                    <option value="">Select farm...</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Source Type *</label>
                  <select value={sourceType} onChange={(e) => setSourceType(e.target.value as 'manual_entry' | 'lab_report')} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                    <option value="manual_entry">Manual Field Test</option>
                    <option value="lab_report">Certified Lab Report</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Field / Plot Name *</label>
                  <input required value={fieldName} onChange={(e) => setFieldName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Date *</label>
                  <input required type="date" value={recordedDate} onChange={(e) => setRecordedDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">pH (0–14)</label>
                  <input required type="number" step="0.1" min="0" max="14" value={ph} onChange={(e) => setPh(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Moisture (%)</label>
                  <input required type="number" step="0.5" min="0" max="100" value={moisturePercent} onChange={(e) => setMoisturePercent(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Temp (°C)</label>
                  <input required type="number" step="0.5" min="-10" max="70" value={temperatureC} onChange={(e) => setTemperatureC(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">N (ppm)</label>
                  <input required type="number" min="0" value={nitrogenPpm} onChange={(e) => setNitrogenPpm(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">P (ppm)</label>
                  <input required type="number" min="0" value={phosphorusPpm} onChange={(e) => setPhosphorusPpm(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">K (ppm)</label>
                  <input required type="number" min="0" value={potassiumPpm} onChange={(e) => setPotassiumPpm(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                </div>
              </div>

              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Lab reference ID or sampling notes (optional)" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />

              <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325]">
                Save Soil Measurement
              </button>
            </form>
          </SectionCard>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <SectionCard title="Historical Soil Trend" subtitle="Moisture (%) & Nitrogen (ppm) across recorded dates">
            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="moisture" name="Moisture (%)" stroke="#1B4332" strokeWidth={2} />
                    <Line type="monotone" dataKey="nitrogen" name="Nitrogen (ppm)" stroke="#D99B26" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No historical trend yet" description="Record two or more soil measurements to visualize seasonal soil changes." />
            )}
          </SectionCard>

          <SectionCard title="Crop Suitability & Future IoT Integration">
            {suitability ? (
              <div className="space-y-3 text-sm">
                <p className="text-[#37413C] leading-relaxed">{suitability.summary}</p>
                <p className="text-xs text-[#525B56]">
                  <strong className="text-[#1C1F1D]">Generally suitable regional crops for pH {latest?.ph}:</strong>{' '}
                  {suitability.suitableCrops.join(', ')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#525B56]">Enter a soil measurement to generate crop pH suitability guidance.</p>
            )}
            <div className="mt-4 pt-4 border-t border-[#EEF0EB] text-xs text-[#525B56] leading-relaxed">
              <strong className="text-[#1C1F1D]">IoT Sensor Readiness:</strong> Hardware telemetry devices (LoRaWAN / MQTT soil probes) are currently disconnected. When field hardware is provisioned, authenticated gateways can write signed payloads into <code className="font-mono">soil_measurements</code> with verified device attribution.
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Soil Measurement History">
        {logs.length === 0 ? (
          <EmptyState title="No soil records" description="Your manually entered and laboratory soil readings will appear in this table." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E5DF] text-left text-xs text-[#525B56]">
                  <th className="py-2.5 font-medium">Date</th>
                  <th className="py-2.5 font-medium">Field</th>
                  <th className="py-2.5 font-medium">Source</th>
                  <th className="py-2.5 font-medium text-right">pH</th>
                  <th className="py-2.5 font-medium text-right">Moisture</th>
                  <th className="py-2.5 font-medium text-right">Temp</th>
                  <th className="py-2.5 font-medium text-right">N-P-K (ppm)</th>
                  <th className="py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF0EB]">
                {logs.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 font-mono text-xs tabular-nums">{m.recordedDate}</td>
                    <td className="py-3 font-medium">{m.fieldName}</td>
                    <td className="py-3 text-xs text-[#525B56]">{m.sourceType === 'lab_report' ? 'Lab Report' : 'Manual Entry'}</td>
                    <td className="py-3 text-right font-mono tabular-nums">{m.ph}</td>
                    <td className="py-3 text-right font-mono tabular-nums">{m.moisturePercent}%</td>
                    <td className="py-3 text-right font-mono tabular-nums">{m.temperatureC}°C</td>
                    <td className="py-3 text-right font-mono tabular-nums">
                      {m.nitrogenPpm} / {m.phosphorusPpm} / {m.potassiumPpm}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void deleteSoilMeasurement(m.id)}
                        className="p-1 text-[#525B56] hover:text-[#B91C1C]"
                        aria-label="Delete reading"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
