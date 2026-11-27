import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth, type OnboardingPayload } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { AppLanguage, UserRole } from '../types';
import { FeedbackBanner } from '../components/UI';

const SERVICE_CATEGORIES = [
  'Tractor Rental',
  'Harvesting Services',
  'Soil Testing',
  'Irrigation Installation',
  'Agricultural Transportation',
  'Equipment Rental',
  'Farming Consultation',
  'Seed & Fertilizer Services'
];

export function AuthPage({
  initialMode = 'login',
  onBack
}: {
  initialMode?: 'login' | 'register';
  onBack?: () => void;
}) {
  const {
    firebaseUser,
    userDoc,
    isBootstrappedAdmin,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resetPassword,
    completeOnboarding,
    signOut
  } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(firebaseUser?.displayName || '');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Onboarding state
  const [selectedRole, setSelectedRole] = useState<UserRole>(isBootstrappedAdmin ? 'admin' : 'farmer');
  const [phone, setPhone] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<AppLanguage>(language);
  const [stateName, setStateName] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [farmName, setFarmName] = useState('');
  const [farmAreaAcres, setFarmAreaAcres] = useState('2.5');
  const [businessName, setBusinessName] = useState('');
  const [buyerLocation, setBuyerLocation] = useState('');
  const [buyerCategory, setBuyerCategory] = useState<'individual' | 'retailer' | 'wholesaler' | 'processor' | 'exporter'>('retailer');
  const [serviceCategory, setServiceCategory] = useState(SERVICE_CATEGORIES[0]);
  const [operatingLocation, setOperatingLocation] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [specialization, setSpecialization] = useState('Agronomy & Soil Science');
  const [qualification, setQualification] = useState('');
  const [organization, setOrganization] = useState('');
  const [operatingRegion, setOperatingRegion] = useState('Tamil Nadu');

  const formatAuthError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('auth/operation-not-allowed')) {
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method → Email/Password). Please use "Continue with Google" for immediate access, or enable Email/Password in Firebase Console.';
    }
    if (msg.includes('auth/popup-closed-by-user')) {
      return 'Google sign-in popup was closed before completing authentication.';
    }
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
      return 'Invalid email or password. Please check your credentials or use Reset Password.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    return msg;
  };

  const handleGoogleLogin = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setFeedback({ type: 'error', message: formatAuthError(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else if (mode === 'register') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await registerWithEmail(email, password, fullName);
        setFeedback({
          type: 'success',
          message: 'Account created. A verification email has been dispatched — please verify your email and complete your profile below.'
        });
      } else {
        await resetPassword(email);
        setFeedback({
          type: 'success',
          message: 'Password reset instructions have been sent to your email address.'
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: formatAuthError(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    if (!firebaseUser.emailVerified) {
      setFeedback({
        type: 'error',
        message: 'Please verify your email address first before saving your profile, or sign in with Google for instant verified access.'
      });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const payload: OnboardingPayload = {
        role: selectedRole,
        fullName: fullName.trim() || firebaseUser.displayName || 'AgriSphere User',
        phone: phone.trim() || '+91-0000000000',
        preferredLanguage,
        state: stateName,
        district,
        village,
        farmName,
        farmAreaAcres: Number(farmAreaAcres) || 1,
        businessName,
        location: buyerLocation,
        buyerCategory,
        serviceCategory,
        operatingLocation,
        serviceDescription,
        specialization,
        qualification,
        organization,
        operatingRegion
      };
      await completeOnboarding(payload);
      await setLanguage(preferredLanguage);
    } catch (err) {
      setFeedback({ type: 'error', message: formatAuthError(err) });
    } finally {
      setBusy(false);
    }
  };

  // Signed-in user who has NOT completed onboarding yet
  if (firebaseUser && !userDoc) {
    const roleOptions: Array<{ id: UserRole; label: string; desc: string }> = [
      { id: 'farmer', label: t.roles.farmer, desc: 'Manage farms, crops, soil, irrigation, produce listings & Eco Points' },
      { id: 'buyer', label: t.roles.buyer, desc: 'Discover harvests, place purchase requests & track orders' },
      { id: 'provider', label: t.roles.provider, desc: 'List tractors, equipment & field services and manage bookings' },
      { id: 'expert', label: t.roles.expert, desc: 'Publish crop guides and answer farmer advisory questions' }
    ];
    if (isBootstrappedAdmin) {
      roleOptions.push({
        id: 'admin',
        label: t.roles.admin,
        desc: 'Platform administration, account verification, Eco Points & audit logs'
      });
    }

    return (
      <div className="min-h-screen bg-[#F8F7F2] py-10 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto bg-white border border-[#E2E5DF] rounded-2xl p-6 sm:p-10">
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#EEF0EB]">
            <div>
              <p className="text-xs font-semibold text-[#2D6A4F]">{t.brandName}</p>
              <h1 className="text-2xl font-semibold text-[#1C1F1D] mt-1">{t.auth.onboardingTitle}</h1>
              <p className="text-sm text-[#525B56] mt-1">{t.auth.onboardingSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-xs font-medium text-[#525B56] hover:text-[#1C1F1D] whitespace-nowrap"
            >
              {t.nav.signOut}
            </button>
          </div>

          {feedback && <div className="mt-6"><FeedbackBanner type={feedback.type} message={feedback.message} /></div>}

          <form onSubmit={handleOnboardingSubmit} className="mt-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#1C1F1D] mb-3">{t.auth.selectRole}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedRole(opt.id)}
                    className={`text-left p-4 rounded-xl border transition-colors ${
                      selectedRole === opt.id
                        ? 'border-[#1B4332] bg-[#E9F2EC]/60'
                        : 'border-[#E2E5DF] bg-white hover:border-[#B6C2B9]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#1C1F1D]">{opt.label}</p>
                    <p className="text-xs text-[#525B56] mt-1 leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Full Name *</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg focus:outline-none focus:border-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Phone Number *</label>
                <input
                  required
                  minLength={5}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Preferred Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as AppLanguage)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg bg-white focus:outline-none focus:border-[#1B4332]"
              >
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
            </div>

            {selectedRole === 'farmer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EEF0EB]">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">State *</label>
                  <input
                    required
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">District *</label>
                  <input
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Thanjavur, Erode, Salem"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Village *</label>
                  <input
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="Village or town name"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Farm Area (Acres) *</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={farmAreaAcres}
                    onChange={(e) => setFarmAreaAcres(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg font-mono tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Farm Name (Optional)</label>
                  <input
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="e.g. Cauvery Delta Organic Farm"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
              </div>
            )}

            {selectedRole === 'buyer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EEF0EB]">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Name or Business Name *</label>
                  <input
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Green Harvest Wholesale"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Buyer Category *</label>
                  <select
                    value={buyerCategory}
                    onChange={(e) => setBuyerCategory(e.target.value as typeof buyerCategory)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg bg-white"
                  >
                    <option value="individual">Individual</option>
                    <option value="retailer">Retailer</option>
                    <option value="wholesaler">Wholesaler / Mandi</option>
                    <option value="processor">Food Processor</option>
                    <option value="exporter">Exporter</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Operating Location *</label>
                  <input
                    required
                    value={buyerLocation}
                    onChange={(e) => setBuyerLocation(e.target.value)}
                    placeholder="City, District, State"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
              </div>
            )}

            {selectedRole === 'provider' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EEF0EB]">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Business Name *</label>
                  <input
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Kongu Agri Machinery Services"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Primary Service Category *</label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg bg-white"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Operating Location *</label>
                  <input
                    required
                    value={operatingLocation}
                    onChange={(e) => setOperatingLocation(e.target.value)}
                    placeholder="Districts / radius served"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Service Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Describe available tractors, harvesters, soil testing equipment, or consultation expertise..."
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
              </div>
            )}

            {selectedRole === 'expert' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EEF0EB]">
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Specialization *</label>
                  <input
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Plant Pathology, Paddy Agronomy"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Qualification *</label>
                  <input
                    required
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. M.Sc Agriculture (TNAU)"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Organization (Optional)</label>
                  <input
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="University, KVK, or Independent"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Operating Region *</label>
                  <input
                    required
                    value={operatingRegion}
                    onChange={(e) => setOperatingRegion(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-[#1B4332] text-white text-sm font-semibold rounded-lg hover:bg-[#143325] disabled:opacity-60 transition-colors"
            >
              {busy ? 'Saving Profile...' : t.auth.completeSetup}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F2] flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#525B56] hover:text-[#1B4332] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {t.brandName}</span>
          </button>
        )}

        <div className="bg-white border border-[#E2E5DF] rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-[#2D6A4F]">{t.brandName}</p>
              <h1 className="text-2xl font-semibold text-[#1C1F1D] mt-1">{t.auth.welcomeTitle}</h1>
            </div>
            <div className="flex items-center p-0.5 bg-[#F3F5F0] rounded-lg">
              <button
                type="button"
                onClick={() => void setLanguage('en')}
                className={`px-2 py-1 text-xs font-medium rounded-md ${language === 'en' ? 'bg-white text-[#1C1F1D]' : 'text-[#525B56]'}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => void setLanguage('ta')}
                className={`px-2 py-1 text-xs font-medium rounded-md ${language === 'ta' ? 'bg-white text-[#1C1F1D]' : 'text-[#525B56]'}`}
              >
                தமிழ்
              </button>
            </div>
          </div>

          <p className="text-sm text-[#525B56] mb-6">{t.auth.welcomeSubtitle}</p>

          {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 bg-[#1B4332] text-white text-sm font-semibold rounded-lg hover:bg-[#143325] disabled:opacity-60 transition-colors flex items-center justify-center gap-2.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t.auth.continueWithGoogle}</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E5DF]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#525B56]">{t.auth.orEmail}</span>
            </div>
          </div>

          <div className="flex p-1 bg-[#F3F5F0] rounded-lg mb-5">
            {(['login', 'register', 'reset'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setMode(tab);
                  setFeedback(null);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === tab ? 'bg-white text-[#1C1F1D] shadow-xs' : 'text-[#525B56] hover:text-[#1C1F1D]'
                }`}
              >
                {tab === 'login' ? t.auth.loginTab : tab === 'register' ? t.auth.registerTab : t.auth.resetTab}
              </button>
            ))}
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1.5">Full Name</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#37413C] mb-1.5">{t.auth.emailLabel}</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1.5">{t.auth.passwordLabel}</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D3D9CE] rounded-lg focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 bg-white border border-[#1B4332] text-[#1B4332] text-sm font-semibold rounded-lg hover:bg-[#E9F2EC] disabled:opacity-60 transition-colors"
            >
              {busy
                ? 'Please wait...'
                : mode === 'login'
                  ? t.auth.loginTab
                  : mode === 'register'
                    ? t.auth.registerTab
                    : t.auth.sendResetLink}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
