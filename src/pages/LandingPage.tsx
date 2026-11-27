import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { subscribeCollection, where } from '../services/firestoreService';
import type { MarketplaceListing } from '../types';
import { ResilientImage } from '../components/UI';

const HERO_IMG = '/src/assets/images/agri_machinery_1795678586627.jpg';
const MARKET_IMG = '/src/assets/images/marketplace_harvest_1795678585657.jpg';
const SOIL_IMG = '/src/assets/images/soil_agronomy_1795678586253.jpg';
const LEAF_IMG = '/src/assets/images/plant_health_leaf_1795678587316.jpg';

export function LandingPage({
  onOpenAuth,
  isSignedIn
}: {
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  isSignedIn: boolean;
}) {
  const { language, setLanguage, t } = useLanguage();
  const [liveListings, setLiveListings] = useState<MarketplaceListing[]>([]);

  useEffect(() => {
    const unsub = subscribeCollection<MarketplaceListing>(
      'marketplace_listings',
      [where('status', '==', 'available')],
      (items) => setLiveListings(items.slice(0, 4)),
      () => setLiveListings([])
    );
    return () => unsub();
  }, []);

  const isTa = language === 'ta';

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#1C1F1D]">
      {/* Strict 3-Zone Top Navigation Contract */}
      <header className="sticky top-0 z-30 bg-[#F8F7F2]/95 backdrop-blur border-b border-[#E2E5DF]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a href="#top" className="text-xl font-bold tracking-tight text-[#1B4332] whitespace-nowrap shrink-0">
            {t.brandName}
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#37413C]">
            <a href="#ecosystem" className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0">
              {t.nav.ecosystem}
            </a>
            <a href="#marketplace" className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0">
              {t.nav.marketplace}
            </a>
            <a href="#roles" className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0">
              {t.nav.services}
            </a>
            <a href="#advisory" className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0">
              {t.nav.knowledge}
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 text-sm font-medium text-white bg-[#1B4332] rounded-lg hover:bg-[#143325] transition-colors whitespace-nowrap shrink-0"
            >
              {isSignedIn ? t.nav.openPortal : t.nav.signIn}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section: Balanced 2-Column Editorial Split */}
      <section id="top" className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              {/* Clean utility language switcher placed in Hero context, not Top Bar */}
              <div className="flex items-center gap-3 text-xs text-[#525B56] mb-6">
                <Globe className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>{isTa ? 'மொழி தேர்வு' : 'Platform Language'}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => void setLanguage('en')}
                  className={`font-medium transition-colors ${
                    language === 'en' ? 'text-[#1B4332] underline underline-offset-4' : 'hover:text-[#1C1F1D]'
                  }`}
                >
                  English
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={() => void setLanguage('ta')}
                  className={`font-medium transition-colors ${
                    language === 'ta' ? 'text-[#1B4332] underline underline-offset-4' : 'hover:text-[#1C1F1D]'
                  }`}
                >
                  தமிழ்
                </button>
              </div>

              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1C1F1D] leading-[1.12] max-w-xl">
                {t.tagline}
              </h1>

              <p className="mt-6 text-base sm:text-lg text-[#525B56] leading-relaxed max-w-xl">
                {isTa
                  ? 'விவசாயிகள், வாங்குபவர்கள், வேளாண் சேவை வழங்குநர்கள் மற்றும் வேளாண் நிபுணர்களை இணைக்கும் ஒருங்கிணைந்த டிஜிட்டல் வேளாண் தளம். பண்ணை மேலாண்மை, மண் பரிசோதனை பதிவுகள், நேரடி சந்தை மற்றும் பயிர் நல ஆலோசனை அனைத்தும் ஒரே இடத்தில்.'
                  : 'AgriSphere unites farmers, wholesale buyers, equipment providers, and agronomists on one transparent digital platform—combining farm records, soil & irrigation planning, AI-assisted crop inspection, and direct produce trade.'}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1B4332] rounded-lg hover:bg-[#143325] transition-colors whitespace-nowrap"
                >
                  <span>{isTa ? 'இலவச கணக்கைத் தொடங்குக' : 'Register Your Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#ecosystem"
                  className="px-5 py-3 text-sm font-medium text-[#1C1F1D] border border-[#CFD5CB] rounded-lg hover:bg-white transition-colors whitespace-nowrap"
                >
                  {isTa ? 'தள அம்சங்களைக் காண்க' : 'Explore Capabilities'}
                </a>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#E2E5DF] grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs text-[#525B56]">
              <div>
                <p className="font-semibold text-[#1C1F1D] text-sm">5 Role Portals</p>
                <p className="mt-0.5">{isTa ? 'தனித்தனி பாதுகாப்பான அணுகல்' : 'Dedicated role workspaces'}</p>
              </div>
              <div>
                <p className="font-semibold text-[#1C1F1D] text-sm">English & தமிழ்</p>
                <p className="mt-0.5">{isTa ? 'முழு இருமொழி ஆதரவு' : 'Full bilingual interface'}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="font-semibold text-[#1C1F1D] text-sm">{isTa ? 'ஆஃப்லைன் ஒத்திசைவு' : 'Offline-Ready Sync'}</p>
                <p className="mt-0.5">{isTa ? 'கிராமப்புற பண்ணைகளுக்கான தரவு சேமிப்பு' : 'Built for rural field networks'}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[320px] rounded-2xl overflow-hidden border border-[#E2E5DF] bg-[#1B4332] relative">
              <ResilientImage
                src={HERO_IMG}
                alt="Modern agricultural tractor cultivating green farmland at golden hour"
                className="w-full h-full object-cover"
                fallbackTitle="AgriSphere Digital Agriculture"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-6 text-white">
                <p className="text-xs font-medium tracking-wide text-white/80">
                  {isTa ? 'ஒருங்கிணைந்த பண்ணை & சந்தை தளம்' : 'Unified Farm Operations & Direct Trade'}
                </p>
                <p className="text-sm sm:text-base font-medium mt-1">
                  {isTa
                    ? 'பண்ணை பதிவு முதல் அறுவடை விற்பனை வரை வெளிப்படையான டிஜிட்டல் பணிப்பாய்வு.'
                    : 'From soil logging and irrigation scheduling to direct buyer fulfilment.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Ecosystem Capabilities (Asymmetric Editorial Bento) */}
      <section id="ecosystem" className="bg-white border-y border-[#E2E5DF] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold text-[#2D6A4F] mb-2">
              {isTa ? 'வேளாண் தொழில்நுட்ப தொகுதிகள்' : 'Core Operational Modules'}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#1C1F1D]">
              {isTa
                ? 'நடைமுறை விவசாயத் தேவைகளுக்காக வடிவமைக்கப்பட்ட கருவிகள்'
                : 'Practical digital infrastructure built for real field operations'}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <article className="lg:col-span-7 border border-[#E2E5DF] rounded-xl overflow-hidden bg-[#F8F7F2] flex flex-col">
              <div className="aspect-[16/9] overflow-hidden">
                <ResilientImage
                  src={MARKET_IMG}
                  alt="Freshly harvested grain sacks, tomatoes, turmeric, and vegetables at a farm market"
                  className="w-full h-full object-cover"
                  fallbackTitle="Direct Agricultural Marketplace"
                />
              </div>
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-[#1C1F1D]">
                    {isTa ? '01. இருவழி வேளாண் சந்தை & ஆர்டர் மேலாண்மை' : '01. Two-Sided Produce Marketplace & Order Workflow'}
                  </h3>
                  <p className="text-sm text-[#525B56] mt-3 leading-relaxed">
                    {isTa
                      ? 'விவசாயிகள் தங்கள் அறுவடை விவரம், அளவு மற்றும் விலையைப் பதிவேற்றலாம். வாங்குபவர்கள் பயிர், இடம் மற்றும் விலை அடிப்படையில் தேடி நேரடி கொள்முதல் கோரிக்கை அனுப்பலாம்.'
                      : 'Farmers publish harvest lots with quantity, unit pricing, and harvest date. Buyers search by crop, district, and rate, submit purchase requests, and track fulfilment from acceptance to delivery.'}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E2E5DF] flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#37413C]">
                  <span>9-Stage Order Tracking</span>
                  <span>·</span>
                  <span>Direct Buyer-Farmer Notifications</span>
                  <span>·</span>
                  <span>Transparent Offline Settlement</span>
                </div>
              </div>
            </article>

            <div className="lg:col-span-5 flex flex-col gap-8">
              <article className="border border-[#E2E5DF] rounded-xl overflow-hidden bg-[#F8F7F2] flex-1">
                <div className="aspect-[16/9] overflow-hidden">
                  <ResilientImage
                    src={SOIL_IMG}
                    alt="Farmer inspecting rich moist agricultural soil next to seedlings"
                    className="w-full h-full object-cover"
                    fallbackTitle="Soil & Irrigation Intelligence"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-[#1C1F1D]">
                    {isTa ? '02. மண் பரிசோதனை & அறிவார்ந்த நீர்ப்பாசனம்' : '02. Soil Health Ledger & Smart Irrigation'}
                  </h3>
                  <p className="text-sm text-[#525B56] mt-2 leading-relaxed">
                    {isTa
                      ? 'மண்ணின் pH, ஈரப்பதம், NPK அளவீடுகளைப் பதிவு செய்து வரலாற்று வரைபடங்களையும் நீர்ப்பாசன அட்டவணைகளையும் கண்காணிக்கலாம்.'
                      : 'Record manual and laboratory pH, moisture, and NPK logs, schedule crop-wise irrigation, monitor water usage, and connect future IoT sensors cleanly.'}
                  </p>
                </div>
              </article>

              <article id="advisory" className="border border-[#E2E5DF] rounded-xl overflow-hidden bg-[#F8F7F2] flex-1">
                <div className="aspect-[16/9] overflow-hidden">
                  <ResilientImage
                    src={LEAF_IMG}
                    alt="Close-up of vibrant healthy green crop leaves with morning dew"
                    className="w-full h-full object-cover"
                    fallbackTitle="AI Plant Health & Expert Advisory"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-[#1C1F1D]">
                    {isTa ? '03. AI பயிர் நலப் பகுப்பாய்வு & நிபுணர் ஆலோசனை' : '03. AI-Assisted Plant Health & Expert Q&A'}
                  </h3>
                  <p className="text-sm text-[#525B56] mt-2 leading-relaxed">
                    {isTa
                      ? 'பாதிக்கப்பட்ட பயிர் புகைப்படங்களைப் பதிவேற்றி முதற்கட்ட அறிகுறி பகுப்பாய்வு மற்றும் பாதுகாப்பான தடுப்பு வழிமுறைகளைப் பெறலாம்.'
                      : 'Upload crop photographs for cautious, vision-assisted symptom screening, preventive guidance, and direct escalation to verified agricultural experts.'}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* Live Public Marketplace Preview (strictly real Firestore data, zero fake listings) */}
      <section id="marketplace" className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold text-[#2D6A4F] mb-2">
              {isTa ? 'நேரடி சந்தைப் பட்டியல்கள்' : 'Live Marketplace Feed'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
              {isTa ? 'தற்போது விற்பனைக்கு உள்ள விளைபொருட்கள்' : 'Currently listed produce from registered farms'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="text-sm font-semibold text-[#1B4332] hover:underline whitespace-nowrap self-start sm:self-auto"
          >
            {isTa ? 'சந்தையில் இணைக →' : 'Sign in to trade →'}
          </button>
        </div>

        {liveListings.length === 0 ? (
          <div className="bg-white border border-[#E2E5DF] rounded-xl p-10 text-center">
            <h3 className="text-base font-semibold text-[#1C1F1D]">
              {isTa ? 'இன்னும் விளைபொருட்கள் பட்டியலிடப்படவில்லை' : 'No produce lots published yet'}
            </h3>
            <p className="text-sm text-[#525B56] mt-2 max-w-lg mx-auto">
              {isTa
                ? 'அக்ரிஸ்பியர் நேரடி தரவுத்தளத்தில் மட்டுமே செயல்படுகிறது. விவசாயியாகப் பதிவு செய்து உங்கள் முதல் அறுவடையைச் சந்தையில் வெளியிடுங்கள்.'
                : 'AgriSphere displays only authentic farmer listings stored in Firestore. Register as a Farmer to publish the first harvest lot, or sign in as a Buyer to monitor new availability.'}
            </p>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="mt-5 px-5 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325] transition-colors"
            >
              {isTa ? 'விவசாயியாகப் பதிவு செய்க' : 'Register as Farmer'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {liveListings.map((item) => (
              <div key={item.id} className="bg-white border border-[#E2E5DF] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#525B56]">
                    {item.cropCategory} · {item.location}
                  </p>
                  <h3 className="text-base font-semibold text-[#1C1F1D] mt-1.5">{item.productName}</h3>
                  <p className="text-xs text-[#525B56] mt-2 line-clamp-2">{item.description}</p>
                </div>
                <div className="mt-5 pt-4 border-t border-[#EEF0EB] flex items-end justify-between">
                  <div>
                    <p className="text-lg font-mono font-semibold tabular-nums text-[#1B4332]">
                      ₹{item.pricePerUnitInr.toLocaleString('en-IN')}
                      <span className="text-xs font-sans font-normal text-[#525B56]"> / {item.unit}</span>
                    </p>
                    <p className="text-xs text-[#525B56] tabular-nums">
                      {item.quantity} {item.unit} · {item.farmerName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="text-xs font-semibold text-[#1B4332] hover:underline"
                  >
                    Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Five Role Portals Breakdown */}
      <section id="roles" className="bg-[#1B4332] text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold text-[#F3D99B] mb-2">
              {isTa ? 'ஐந்து தனித்துவமான பணித்தளங்கள்' : 'Role-Based Digital Ecosystem'}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              {isTa
                ? 'வேளாண் மதிப்புச் சங்கிலியில் ஒவ்வொருவருக்கும் தனிப் பலகை'
                : 'Purpose-built portals across the entire agricultural value chain'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              {
                title: t.roles.farmer,
                points: ['Farm, plot & crop ledger', 'Soil, irrigation & weather tools', 'Sell produce & book services', 'Verified Eco Points & team tasks']
              },
              {
                title: t.roles.buyer,
                points: ['Search verified farm produce', 'Filter by crop, district & rate', 'Submit purchase requests', 'Track 9-stage order fulfilment']
              },
              {
                title: t.roles.provider,
                points: ['List tractors & farm equipment', 'Set service rates & availability', 'Manage farmer booking requests', 'Track completed field jobs']
              },
              {
                title: t.roles.expert,
                points: ['Answer farmer field questions', 'Publish bilingual crop guides', 'Review crop health patterns', 'Support sustainable farming']
              },
              {
                title: t.roles.admin,
                points: ['Verify farmer & provider accounts', 'Moderate listings & support tickets', 'Audit Eco Points ledger', 'Inspect immutable audit logs']
              }
            ].map((roleCard) => (
              <div key={roleCard.title} className="bg-white/8 border border-white/15 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{roleCard.title}</h3>
                  <ul className="mt-4 space-y-2.5 text-xs text-white/85">
                    {roleCard.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-[#F3D99B] shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-[#F8F7F2] border-t border-[#E2E5DF] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#525B56]">
          <div>
            <p className="text-sm font-bold text-[#1B4332]">{t.brandName}</p>
            <p className="mt-1">{t.tagline}</p>
          </div>
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => onOpenAuth('login')} className="hover:text-[#1B4332]">
              {t.nav.signIn}
            </button>
            <button type="button" onClick={() => void setLanguage(language === 'en' ? 'ta' : 'en')} className="hover:text-[#1B4332]">
              {language === 'en' ? 'தமிழ் பதிப்பு' : 'English Version'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
