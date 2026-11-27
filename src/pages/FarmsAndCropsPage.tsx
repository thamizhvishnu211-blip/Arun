import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  createCrop,
  createCropActivity,
  createFarm,
  createFieldPlot,
  deleteCrop,
  deleteFarm,
  subscribeCollection,
  updateCrop,
  where
} from '../services/firestoreService';
import type { CropActivity, CropRecord, Farm, FieldPlot } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

export function FarmsAndCropsPage() {
  const { firebaseUser, userDoc } = useAuth();
  const uid = firebaseUser?.uid;

  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<FieldPlot[]>([]);
  const [crops, setCrops] = useState<CropRecord[]>([]);
  const [activities, setActivities] = useState<CropActivity[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tab, setTab] = useState<'farms' | 'crops' | 'activities'>('farms');

  // Farm form
  const [farmName, setFarmName] = useState('');
  const [farmArea, setFarmArea] = useState('2.5');
  const [soilType, setSoilType] = useState('Alluvial Loam');
  const [waterSource, setWaterSource] = useState('Borewell + Drip');
  const [farmState, setFarmState] = useState(userDoc?.state || 'Tamil Nadu');
  const [farmDistrict, setFarmDistrict] = useState(userDoc?.district || '');
  const [farmVillage, setFarmVillage] = useState(userDoc?.village || '');

  // Field form
  const [fieldFarmId, setFieldFarmId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldArea, setFieldArea] = useState('1.0');
  const [irrigationMethod, setIrrigationMethod] = useState('Drip');

  // Crop form
  const [cropFarmId, setCropFarmId] = useState('');
  const [cropName, setCropName] = useState('');
  const [variety, setVariety] = useState('');
  const [cropCategory, setCropCategory] = useState('Grains & Cereals');
  const [cropArea, setCropArea] = useState('1.5');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('');
  const [expectedYieldKg, setExpectedYieldKg] = useState('1500');
  const [estimatedExpenseInr, setEstimatedExpenseInr] = useState('12000');

  // Activity form
  const [actCropId, setActCropId] = useState('');
  const [actType, setActType] = useState('Organic Fertilizer Application');
  const [actDate, setActDate] = useState(new Date().toISOString().slice(0, 10));
  const [actExpense, setActExpense] = useState('2500');
  const [actNotes, setActNotes] = useState('');

  useEffect(() => {
    if (!uid) return;
    const unsubs = [
      subscribeCollection<Farm>('farms', [where('farmerId', '==', uid)], (list) => {
        setFarms(list);
        if (list.length > 0) {
          setFieldFarmId((prev) => prev || list[0].id);
          setCropFarmId((prev) => prev || list[0].id);
        }
      }),
      subscribeCollection<FieldPlot>('fields', [where('farmerId', '==', uid)], setFields),
      subscribeCollection<CropRecord>('crops', [where('farmerId', '==', uid)], (list) => {
        setCrops(list);
        if (list.length > 0) setActCropId((prev) => prev || list[0].id);
      }),
      subscribeCollection<CropActivity>('crop_activities', [where('farmerId', '==', uid)], setActivities)
    ];
    return () => unsubs.forEach((u) => u());
  }, [uid]);

  const handleAddFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await createFarm({
        name: farmName,
        areaAcres: Number(farmArea),
        soilType,
        waterSource,
        state: farmState,
        district: farmDistrict,
        village: farmVillage
      });
      setFarmName('');
      setFeedback({ type: 'success', message: 'Farm registered successfully in Firestore.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create farm.' });
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldFarmId) return;
    setFeedback(null);
    try {
      await createFieldPlot({
        farmId: fieldFarmId,
        name: fieldName,
        areaAcres: Number(fieldArea),
        irrigationMethod
      });
      setFieldName('');
      setFeedback({ type: 'success', message: 'Field plot added to farm.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create field.' });
    }
  };

  const handleAddCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropFarmId) {
      setFeedback({ type: 'error', message: 'Register a farm first before adding crops.' });
      return;
    }
    setFeedback(null);
    try {
      await createCrop({
        farmId: cropFarmId,
        cropName,
        variety,
        category: cropCategory,
        areaAcres: Number(cropArea),
        plantingDate,
        expectedHarvestDate,
        expectedYieldKg: Number(expectedYieldKg) || 0,
        actualYieldKg: 0,
        estimatedExpenseInr: Number(estimatedExpenseInr) || 0,
        stage: 'sowing',
        healthStatus: 'healthy'
      });
      setCropName('');
      setVariety('');
      setFeedback({ type: 'success', message: 'Crop cultivation record created.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add crop.' });
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actCropId) return;
    setFeedback(null);
    try {
      await createCropActivity({
        cropId: actCropId,
        activityType: actType,
        date: actDate,
        expenseInr: Number(actExpense) || 0,
        notes: actNotes
      });
      setActNotes('');
      setFeedback({ type: 'success', message: 'Cultivation activity and expense logged.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to log activity.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Farms, Fields & Crops"
        subtitle="Register agricultural land holdings, manage plot divisions, monitor crop growth stages, and record cultivation expenses."
        action={
          <div className="flex p-1 bg-white border border-[#E2E5DF] rounded-lg">
            {(['farms', 'crops', 'activities'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tab === key ? 'bg-[#1B4332] text-white' : 'text-[#525B56] hover:text-[#1C1F1D]'
                }`}
              >
                {key === 'farms' ? `Farms (${farms.length})` : key === 'crops' ? `Crops (${crops.length})` : `Expenses (${activities.length})`}
              </button>
            ))}
          </div>
        }
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {tab === 'farms' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <SectionCard title="Register New Farm">
              <form onSubmit={handleAddFarm} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Farm Name *</label>
                  <input required value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="e.g. East Canal Paddy Farm" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Area (Acres) *</label>
                    <input required type="number" step="0.1" min="0.1" value={farmArea} onChange={(e) => setFarmArea(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Soil Type *</label>
                    <select value={soilType} onChange={(e) => setSoilType(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                      <option>Alluvial Loam</option>
                      <option>Red Sandy Loam</option>
                      <option>Black Cotton (Vertisol)</option>
                      <option>Clay Loam</option>
                      <option>Laterite</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Water Source *</label>
                  <input required value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">State *</label>
                    <input required value={farmState} onChange={(e) => setFarmState(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">District *</label>
                    <input required value={farmDistrict} onChange={(e) => setFarmDistrict(e.target.value)} placeholder="District" className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Village</label>
                    <input value={farmVillage} onChange={(e) => setFarmVillage(e.target.value)} placeholder="Village" className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  </div>
                </div>
                <button type="submit" className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325]">
                  <Plus className="w-4 h-4" /> Save Farm
                </button>
              </form>
            </SectionCard>

            {farms.length > 0 && (
              <SectionCard title="Add Field Plot to Farm">
                <form onSubmit={handleAddField} className="space-y-3">
                  <select value={fieldFarmId} onChange={(e) => setFieldFarmId(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input required value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="Plot A / North Block" className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                    <input required type="number" step="0.1" min="0.1" value={fieldArea} onChange={(e) => setFieldArea(e.target.value)} placeholder="Acres" className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                  </div>
                  <select value={irrigationMethod} onChange={(e) => setIrrigationMethod(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                    <option>Drip</option>
                    <option>Sprinkler</option>
                    <option>Furrow</option>
                    <option>Canal / Flood</option>
                    <option>Rainfed</option>
                  </select>
                  <button type="submit" className="w-full py-2 bg-white border border-[#1B4332] text-[#1B4332] text-xs font-semibold rounded-lg hover:bg-[#E9F2EC]">
                    Add Field Plot
                  </button>
                </form>
              </SectionCard>
            )}
          </div>

          <div className="lg:col-span-7">
            <SectionCard title="Registered Farms & Fields">
              {farms.length === 0 ? (
                <EmptyState title="No farms registered" description="Use the form on the left to register your farm land details." />
              ) : (
                <div className="divide-y divide-[#EEF0EB]">
                  {farms.map((farm) => {
                    const farmFields = fields.filter((fl) => fl.farmId === farm.id);
                    return (
                      <div key={farm.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-[#1C1F1D]">{farm.name}</h3>
                            <p className="text-xs text-[#525B56] mt-1">
                              {[farm.village, farm.district, farm.state].filter(Boolean).join(', ')} · {farm.soilType} · {farm.waterSource}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-mono font-semibold tabular-nums text-[#1B4332]">{farm.areaAcres} ac</span>
                            <button
                              type="button"
                              onClick={() => void deleteFarm(farm.id)}
                              className="p-1.5 text-[#525B56] hover:text-[#B91C1C]"
                              aria-label={`Delete ${farm.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {farmFields.length > 0 && (
                          <div className="mt-3 pl-4 border-l border-[#E2E5DF] space-y-1">
                            {farmFields.map((fl) => (
                              <p key={fl.id} className="text-xs text-[#37413C]">
                                {fl.name} · <span className="font-mono tabular-nums">{fl.areaAcres} ac</span> · {fl.irrigationMethod}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'crops' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <SectionCard title="Add Cultivated Crop">
              <form onSubmit={handleAddCrop} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Select Farm *</label>
                  <select required value={cropFarmId} onChange={(e) => setCropFarmId(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                    <option value="">Choose farm...</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1">Crop Name *</label>
                  <input required value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="e.g. Ponni Rice, Turmeric, Tomato" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Category</label>
                    <select value={cropCategory} onChange={(e) => setCropCategory(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                      <option>Grains & Cereals</option>
                      <option>Vegetables</option>
                      <option>Fruits</option>
                      <option>Spices</option>
                      <option>Pulses & Oilseeds</option>
                      <option>Cash Crops</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Area (Acres)</label>
                    <input required type="number" step="0.1" min="0.1" value={cropArea} onChange={(e) => setCropArea(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Planting Date</label>
                    <input required type="date" value={plantingDate} onChange={(e) => setPlantingDate(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Expected Harvest</label>
                    <input type="date" value={expectedHarvestDate} onChange={(e) => setExpectedHarvestDate(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Expected Yield (kg)</label>
                    <input type="number" min="0" value={expectedYieldKg} onChange={(e) => setExpectedYieldKg(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#37413C] mb-1">Est. Expense (₹)</label>
                    <input type="number" min="0" value={estimatedExpenseInr} onChange={(e) => setEstimatedExpenseInr(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                  </div>
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325]">
                  Save Crop Record
                </button>
              </form>
            </SectionCard>
          </div>

          <div className="lg:col-span-8">
            <SectionCard title="Active & Harvested Crops">
              {crops.length === 0 ? (
                <EmptyState title="No crops recorded" description="Add your active crops to monitor growth stage, health status, and yields." />
              ) : (
                <div className="divide-y divide-[#EEF0EB]">
                  {crops.map((c) => {
                    const farm = farms.find((f) => f.id === c.farmId);
                    return (
                      <div key={c.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-sm font-semibold text-[#1C1F1D]">{c.cropName}</h3>
                            <span className="text-xs text-[#525B56]">· {c.category}</span>
                            <StatusLabel status={c.healthStatus} />
                          </div>
                          <p className="text-xs text-[#525B56] mt-1 tabular-nums">
                            {farm?.name || 'Farm'} · {c.areaAcres} ac · Planted {c.plantingDate} · Expected {c.expectedYieldKg || 0} kg
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <select
                            aria-label="Growth stage"
                            value={c.stage}
                            onChange={(e) => void updateCrop(c.id, { stage: e.target.value as CropRecord['stage'] })}
                            className="px-2.5 py-1.5 text-xs border border-[#D3D9CE] rounded-md bg-white"
                          >
                            <option value="sowing">Sowing</option>
                            <option value="vegetative">Vegetative</option>
                            <option value="flowering">Flowering</option>
                            <option value="harvesting">Harvesting</option>
                            <option value="harvested">Harvested</option>
                          </select>
                          <select
                            aria-label="Health status"
                            value={c.healthStatus}
                            onChange={(e) => void updateCrop(c.id, { healthStatus: e.target.value as CropRecord['healthStatus'] })}
                            className="px-2.5 py-1.5 text-xs border border-[#D3D9CE] rounded-md bg-white"
                          >
                            <option value="healthy">Healthy</option>
                            <option value="watch">Watch</option>
                            <option value="at_risk">At Risk</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => void deleteCrop(c.id)}
                            className="p-1.5 text-[#525B56] hover:text-[#B91C1C]"
                            aria-label={`Delete ${c.cropName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'activities' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <SectionCard title="Log Field Activity & Expense">
              <form onSubmit={handleAddActivity} className="space-y-3.5">
                <select required value={actCropId} onChange={(e) => setActCropId(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                  <option value="">Select crop...</option>
                  {crops.map((c) => (
                    <option key={c.id} value={c.id}>{c.cropName}</option>
                  ))}
                </select>
                <input required value={actType} onChange={(e) => setActType(e.target.value)} placeholder="Activity (Sowing, Weeding, Fertilizer)" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                <div className="grid grid-cols-2 gap-3">
                  <input required type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} className="px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  <input required type="number" min="0" value={actExpense} onChange={(e) => setActExpense(e.target.value)} placeholder="Expense (INR)" className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums" />
                </div>
                <textarea rows={2} value={actNotes} onChange={(e) => setActNotes(e.target.value)} placeholder="Optional field notes" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325]">
                  Record Activity
                </button>
              </form>
            </SectionCard>
          </div>
          <div className="lg:col-span-8">
            <SectionCard title="Cultivation Expense Ledger">
              {activities.length === 0 ? (
                <EmptyState title="No logged activities" description="Record field operations and input costs to power your monthly farming expense chart." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E5DF] text-left text-xs text-[#525B56]">
                        <th className="py-2.5 font-medium">Date</th>
                        <th className="py-2.5 font-medium">Crop</th>
                        <th className="py-2.5 font-medium">Activity</th>
                        <th className="py-2.5 font-medium text-right">Expense (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF0EB]">
                      {activities.map((a) => {
                        const crop = crops.find((c) => c.id === a.cropId);
                        return (
                          <tr key={a.id}>
                            <td className="py-3 font-mono text-xs tabular-nums">{a.date}</td>
                            <td className="py-3 font-medium">{crop?.cropName || 'Crop'}</td>
                            <td className="py-3 text-[#525B56]">{a.activityType}</td>
                            <td className="py-3 text-right font-mono tabular-nums font-medium">
                              ₹{Number(a.expenseInr).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
