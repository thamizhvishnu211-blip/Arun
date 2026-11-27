import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  answerExpertQuestion,
  createEducationalArticle,
  createExpertQuestion,
  deleteEducationalArticle,
  subscribeCollection,
  where
} from '../services/firestoreService';
import type { AppLanguage, EducationalArticle, ExpertQuestion } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

export function ExpertHubPage() {
  const { firebaseUser, userDoc, isAdmin } = useAuth();
  const uid = firebaseUser?.uid;
  const canPublishOrAnswer = userDoc?.role === 'expert' || isAdmin;

  const [articles, setArticles] = useState<EducationalArticle[]>([]);
  const [questions, setQuestions] = useState<ExpertQuestion[]>([]);
  const [tab, setTab] = useState<'qa' | 'articles'>('qa');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Farmer question form
  const [qCrop, setQCrop] = useState('');
  const [qText, setQText] = useState('');

  // Expert answer form state per question id
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  // Expert article form
  const [artTitle, setArtTitle] = useState('');
  const [artCategory, setArtCategory] = useState('Soil & Nutrient Management');
  const [artCrop, setArtCrop] = useState('');
  const [artLang, setArtLang] = useState<AppLanguage>('en');
  const [artSummary, setArtSummary] = useState('');
  const [artContent, setArtContent] = useState('');

  useEffect(() => {
    const u1 = subscribeCollection<EducationalArticle>(
      'educational_articles',
      [where('status', '==', 'published')],
      setArticles
    );
    const u2 = subscribeCollection<ExpertQuestion>(
      'expert_questions',
      [where('isPublic', '==', true)],
      setQuestions
    );
    return () => {
      u1();
      u2();
    };
  }, []);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;
    setFeedback(null);
    try {
      await createExpertQuestion({
        farmerName: userDoc.fullName,
        cropName: qCrop,
        question: qText
      });
      setQCrop('');
      setQText('');
      setFeedback({ type: 'success', message: 'Your agricultural question has been posted for verified experts.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unable to post question.' });
    }
  };

  const handleAnswer = async (question: ExpertQuestion) => {
    const answerText = (answerDrafts[question.id] || '').trim();
    if (!answerText || !userDoc) return;
    setFeedback(null);
    try {
      await answerExpertQuestion(question, answerText, userDoc.fullName);
      setAnswerDrafts((prev) => ({ ...prev, [question.id]: '' }));
      setFeedback({ type: 'success', message: 'Expert response published and farmer notified.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to publish response.' });
    }
  };

  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;
    setFeedback(null);
    try {
      await createEducationalArticle({
        authorName: userDoc.fullName,
        title: artTitle,
        category: artCategory,
        cropFocus: artCrop,
        summary: artSummary,
        content: artContent,
        language: artLang,
        status: 'published'
      });
      setArtTitle('');
      setArtSummary('');
      setArtContent('');
      setFeedback({ type: 'success', message: 'Educational agronomy guide published.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to publish guide.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Agricultural Advisory & Knowledge Hub"
        subtitle="Connect with agricultural experts for crop management questions and browse bilingual educational guides."
        action={
          <div className="flex p-1 bg-white border border-[#E2E5DF] rounded-lg">
            <button
              type="button"
              onClick={() => setTab('qa')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                tab === 'qa' ? 'bg-[#1B4332] text-white' : 'text-[#525B56]'
              }`}
            >
              Farmer Q&A ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('articles')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                tab === 'articles' ? 'bg-[#1B4332] text-white' : 'text-[#525B56]'
              }`}
            >
              Agronomy Guides ({articles.length})
            </button>
          </div>
        }
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {tab === 'qa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <SectionCard title="Ask an Agricultural Expert">
              <form onSubmit={handleAskQuestion} className="space-y-3.5">
                <input
                  required
                  value={qCrop}
                  onChange={(e) => setQCrop(e.target.value)}
                  placeholder="Crop / Subject (e.g. Samba Paddy, Drip Fertigation)"
                  className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg"
                />
                <textarea
                  required
                  rows={4}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Describe your field observation, soil type, or consultation question..."
                  className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg"
                />
                <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg">
                  Submit Question
                </button>
              </form>
            </SectionCard>
          </div>

          <div className="lg:col-span-8">
            <SectionCard title="Community & Consultation Q&A">
              {questions.length === 0 ? (
                <EmptyState title="No farmer questions yet" description="Post a crop or soil question on the left to consult agricultural experts." />
              ) : (
                <div className="divide-y divide-[#EEF0EB]">
                  {questions.map((q) => (
                    <div key={q.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-[#525B56]">
                            {q.cropName} · Asked by {q.farmerName}
                          </p>
                          <p className="text-sm font-semibold text-[#1C1F1D] mt-1 leading-relaxed">{q.question}</p>
                        </div>
                        <StatusLabel status={q.status} />
                      </div>

                      {q.answer && (
                        <div className="bg-[#FAFBF8] border border-[#E2E5DF] rounded-lg p-4">
                          <p className="text-xs font-semibold text-[#1B4332]">
                            Expert Response — {q.expertName || 'Agricultural Expert'}
                          </p>
                          <p className="text-sm text-[#37413C] mt-1.5 leading-relaxed whitespace-pre-line">{q.answer}</p>
                        </div>
                      )}

                      {canPublishOrAnswer && q.status !== 'closed' && (
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <input
                            value={answerDrafts[q.id] || ''}
                            onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder={q.answer ? 'Update expert recommendation...' : 'Write clear, safe agronomy recommendation...'}
                            className="flex-1 px-3 py-2 text-xs border border-[#D3D9CE] rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => void handleAnswer(q)}
                            className="px-4 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-lg whitespace-nowrap"
                          >
                            Publish Answer
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'articles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {canPublishOrAnswer && (
            <div className="lg:col-span-5">
              <SectionCard title="Publish Educational Content">
                <form onSubmit={handlePublishArticle} className="space-y-3.5">
                  <input required value={artTitle} onChange={(e) => setArtTitle(e.target.value)} placeholder="Guide title *" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={artCategory} onChange={(e) => setArtCategory(e.target.value)} className="px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                      <option>Soil & Nutrient Management</option>
                      <option>Integrated Pest Management</option>
                      <option>Water Conservation</option>
                      <option>Post-Harvest Storage</option>
                      <option>Organic Farming</option>
                    </select>
                    <select value={artLang} onChange={(e) => setArtLang(e.target.value as AppLanguage)} className="px-2.5 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                      <option value="en">English</option>
                      <option value="ta">தமிழ் (Tamil)</option>
                    </select>
                  </div>
                  <input value={artCrop} onChange={(e) => setArtCrop(e.target.value)} placeholder="Crop focus (optional, e.g. Paddy)" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  <input required value={artSummary} onChange={(e) => setArtSummary(e.target.value)} placeholder="Short 1-line summary *" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  <textarea required rows={5} value={artContent} onChange={(e) => setArtContent(e.target.value)} placeholder="Write actionable, evidence-based agricultural guidance..." className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                  <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg">
                    Publish Guide
                  </button>
                </form>
              </SectionCard>
            </div>
          )}

          <div className={canPublishOrAnswer ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <SectionCard title="Published Agronomy Guides">
              {articles.length === 0 ? (
                <EmptyState
                  title="No guides published yet"
                  description="Verified agricultural experts and administrators publish practical crop-management guides here."
                />
              ) : (
                <div className="divide-y divide-[#EEF0EB]">
                  {articles.map((art) => (
                    <article key={art.id} className="py-5 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-[#525B56]">
                            {art.category} {art.cropFocus ? `· ${art.cropFocus}` : ''} · {art.language === 'ta' ? 'தமிழ்' : 'English'} · By {art.authorName}
                          </p>
                          <h3 className="text-base font-semibold text-[#1C1F1D] mt-1">{art.title}</h3>
                          <p className="text-xs text-[#525B56] mt-1">{art.summary}</p>
                        </div>
                        {(art.authorId === uid || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => void deleteEducationalArticle(art.id)}
                            className="p-1.5 text-[#525B56] hover:text-[#B91C1C]"
                            aria-label="Delete guide"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-[#37413C] mt-3 leading-relaxed whitespace-pre-line">{art.content}</p>
                    </article>
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
