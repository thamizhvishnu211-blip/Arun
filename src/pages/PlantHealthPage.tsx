import React, { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  analyzePlantPhoto,
  savePlantHealthReport,
  subscribeCollection,
  where
} from '../services/firestoreService';
import type { PlantHealthReport } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function PlantHealthPage() {
  const { firebaseUser } = useAuth();
  const { language } = useLanguage();
  const uid = firebaseUser?.uid;

  const [reports, setReports] = useState<PlantHealthReport[]>([]);
  const [cropType, setCropType] = useState('Paddy (Rice)');
  const [observedSymptoms, setObservedSymptoms] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');
  const [imageName, setImageName] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [latestResult, setLatestResult] = useState<Omit<PlantHealthReport, 'id' | 'farmerId' | 'createdAt'> | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeCollection<PlantHealthReport>(
      'plant_health_reports',
      [where('farmerId', '==', uid)],
      setReports
    );
  }, [uid]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', message: 'Please upload a JPEG, PNG, or WebP photograph.' });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFeedback({ type: 'error', message: 'Photograph must be smaller than 5 MB.' });
      return;
    }

    setImageName(file.name);
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setPreviewUrl(dataUrl);
      const base64Part = dataUrl.split(',')[1] || '';
      setImageBase64(base64Part);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64 || !mimeType) {
      setFeedback({ type: 'error', message: 'Upload a clear photograph of the affected leaf, stem, or crop first.' });
      return;
    }

    setAnalyzing(true);
    setFeedback(null);
    try {
      const aiResult = await analyzePlantPhoto({
        imageBase64,
        mimeType,
        cropType,
        observedSymptoms,
        language
      });

      const fullReport: Omit<PlantHealthReport, 'id' | 'farmerId' | 'createdAt'> = {
        cropType,
        observedSymptoms: observedSymptoms || 'Visual photo inspection',
        possibleIssue: aiResult.possibleIssue,
        confidenceLevel: aiResult.confidenceLevel,
        uncertaintyNote: aiResult.uncertaintyNote,
        visibleSymptoms: aiResult.visibleSymptoms || [],
        contributingFactors: aiResult.contributingFactors || [],
        preventiveSteps: aiResult.preventiveSteps || [],
        whenToConsultExpert: aiResult.whenToConsultExpert,
        imageName
      };

      setLatestResult(fullReport);
      await savePlantHealthReport(fullReport);
      setFeedback({ type: 'success', message: 'Analysis complete and saved to your Plant Health History.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to analyze photograph right now.'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Plant Health Monitoring (AI-Assisted)"
        subtitle="Upload clear crop photographs for server-side vision screening, possible symptom explanations, and safe preventive guidance."
      />

      <FeedbackBanner
        type="info"
        message="Advisory Notice: AI image analysis offers preliminary educational screening only. It is not a confirmed laboratory diagnosis and will never prescribe hazardous chemical pesticides. Always verify with an agricultural expert before chemical intervention."
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-5">
          <SectionCard title="Submit Crop Photograph">
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Crop Type *</label>
                <input
                  required
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder="e.g. Paddy, Tomato, Banana, Cotton, Turmeric"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Crop Photograph (JPEG / PNG / WebP, max 5 MB) *</label>
                <label className="mt-1 flex flex-col items-center justify-center border border-dashed border-[#B6C2B9] rounded-xl p-6 bg-[#FAFBF8] hover:border-[#1B4332] cursor-pointer transition-colors">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Selected crop preview" className="max-h-48 rounded-lg object-contain" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[#2D6A4F] mb-2" />
                      <span className="text-xs font-medium text-[#1C1F1D]">Click to select crop photograph</span>
                      <span className="text-[11px] text-[#525B56] mt-1">Clear daylight focus on affected leaves or stems</span>
                    </>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
                </label>
                {imageName && <p className="text-xs text-[#525B56] mt-1.5 truncate">Selected: {imageName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Observed Symptoms</label>
                <textarea
                  rows={3}
                  value={observedSymptoms}
                  onChange={(e) => setObservedSymptoms(e.target.value)}
                  placeholder="Describe leaf spots, yellowing, curling, wilting, duration, and recent weather..."
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={analyzing}
                className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-semibold rounded-lg hover:bg-[#143325] disabled:opacity-60"
              >
                {analyzing ? 'Analyzing Photograph...' : 'Run AI Plant Health Screening'}
              </button>
            </form>
          </SectionCard>
        </div>

        <div className="lg:col-span-7">
          <SectionCard title="Screening Result">
            {latestResult ? (
              <div className="space-y-5 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-[#EEF0EB]">
                  <div>
                    <p className="text-xs text-[#525B56]">{latestResult.cropType}</p>
                    <h3 className="text-lg font-semibold text-[#1C1F1D] mt-0.5">{latestResult.possibleIssue}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#525B56]">Model Confidence</p>
                    <StatusLabel
                      status={
                        latestResult.confidenceLevel === 'High'
                          ? 'healthy'
                          : latestResult.confidenceLevel === 'Moderate'
                            ? 'watch'
                            : 'pending'
                      }
                      label={latestResult.confidenceLevel}
                    />
                  </div>
                </div>

                <div className="bg-[#FDF5E3] border border-[#F3D99B] rounded-lg p-3.5 text-xs text-[#785109] leading-relaxed">
                  <strong>Uncertainty & Scope:</strong> {latestResult.uncertaintyNote}
                </div>

                {latestResult.visibleSymptoms && latestResult.visibleSymptoms.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#1C1F1D] mb-2">Visible Symptoms Noted</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-[#37413C]">
                      {latestResult.visibleSymptoms.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {latestResult.contributingFactors && latestResult.contributingFactors.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#1C1F1D] mb-2">Potential Contributing Factors</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-[#37413C]">
                      {latestResult.contributingFactors.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {latestResult.preventiveSteps && latestResult.preventiveSteps.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#1C1F1D] mb-2">Safe Preventive Next Steps</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-[#37413C]">
                      {latestResult.preventiveSteps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-3 border-t border-[#EEF0EB]">
                  <h4 className="text-xs font-semibold text-[#1C1F1D] mb-1">When to Consult an Agricultural Expert</h4>
                  <p className="text-xs text-[#525B56] leading-relaxed">{latestResult.whenToConsultExpert}</p>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No active screening result"
                description="Upload a clear crop photograph on the left to inspect visible symptoms and preventive measures."
              />
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Previous Plant Health Analyses">
        {reports.length === 0 ? (
          <EmptyState title="No saved reports yet" description="Completed plant health screenings are archived here for seasonal reference." />
        ) : (
          <div className="divide-y divide-[#EEF0EB]">
            {reports.map((rep) => (
              <div key={rep.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1C1F1D]">
                    {rep.cropType} — {rep.possibleIssue}
                  </p>
                  <span className="text-xs text-[#525B56]">
                    Confidence: <strong className="text-[#1C1F1D]">{rep.confidenceLevel}</strong>
                  </span>
                </div>
                <p className="text-xs text-[#525B56] mt-1">{rep.uncertaintyNote}</p>
                <p className="text-xs text-[#37413C] mt-1.5">
                  <strong>Expert Guidance:</strong> {rep.whenToConsultExpert}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
