import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import childWaitingImage from '@/assets/images/child-waiting-travel.png';
import familyHawaiiAirportImage from '@/assets/images/family-hawaii-airport.png';

interface TripFitModalProps {
  onClose: () => void;
  onComplete: () => void;
}

const SpinningCompass = ({ size = 40 }: { size?: number }) => (
  <div 
    className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg animate-spin"
    style={{ width: size, height: size, animationDuration: '8s' }}
  >
    <svg className="text-white" style={{ width: size * 0.6, height: size * 0.6 }} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" />
    </svg>
  </div>
);

const Header = ({ onStart }: { onStart: () => void }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-2">
            <SpinningCompass size={40} />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-stone-900 tracking-tight leading-none">GeoQuest</span>
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">GEOADVENTURES</span>
            </div>
          </div>
          <nav className="hidden md:flex space-x-8 items-center text-sm font-medium text-stone-600">
            <a href="#check-fit" className="hover:text-emerald-700 transition-colors">Check Fit</a>
            <a href="#how-it-works" className="hover:text-emerald-700 transition-colors">How It Works</a>
            <a href="#why-geoadventures" className="hover:text-emerald-700 transition-colors">Why GeoAdventures</a>
            <a href="#testimonials" className="hover:text-emerald-700 transition-colors">Testimonials</a>
            <a href="#pricing" className="hover:text-emerald-700 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-emerald-700 transition-colors">Contact</a>
            <a href="/geogames-landing" className="hover:text-emerald-700 transition-colors">GeoGames</a>
            <button 
              onClick={onStart}
              className="bg-emerald-700 text-white px-5 py-2.5 rounded-full hover:bg-emerald-800 transition-all shadow-sm"
              data-testid="button-start-adventure-header"
            >
              Start
            </button>
          </nav>
          
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            <svg className="w-6 h-6 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-stone-100">
            <nav className="flex flex-col space-y-4 text-sm font-medium text-stone-600">
              <a href="#check-fit" className="hover:text-emerald-700 transition-colors">Check Fit</a>
              <a href="#how-it-works" className="hover:text-emerald-700 transition-colors">How It Works</a>
              <a href="#why-geoadventures" className="hover:text-emerald-700 transition-colors">Why GeoAdventures</a>
              <a href="#testimonials" className="hover:text-emerald-700 transition-colors">Testimonials</a>
              <a href="#pricing" className="hover:text-emerald-700 transition-colors">Pricing</a>
              <a href="#contact" className="hover:text-emerald-700 transition-colors">Contact</a>
              <a href="/geogames-landing" className="hover:text-emerald-700 transition-colors">GeoGames</a>
              <button 
                onClick={onStart}
                className="bg-emerald-700 text-white px-5 py-2.5 rounded-full font-semibold w-full"
                data-testid="button-start-mobile"
              >
                Start
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

const Hero = ({ onStart }: { onStart: () => void }) => (
  <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-40" style={{ background: 'radial-gradient(circle at top right, #fdfcf8, #f0f7f4)' }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/50 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-8 border border-emerald-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Now in founding families pilot
      </div>
      <h1 className="text-5xl md:text-8xl font-bold text-stone-900 leading-[1.1] mb-8 max-w-5xl mx-auto" style={{ fontFamily: "'Fraunces', serif" }}>
        Turn real-world trips into <span className="text-emerald-700 italic">kid-led adventures.</span>
      </h1>
      <p className="text-xl md:text-2xl text-stone-600 mb-12 max-w-3xl mx-auto leading-relaxed">
        Before, during, and after travel — GeoQuest helps kids explore places through curiosity, not screens that numb.
      </p>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
        <button 
          onClick={onStart}
          className="w-full sm:w-auto px-10 py-5 bg-emerald-700 text-white rounded-full font-bold text-xl hover:bg-emerald-800 hover:scale-105 transition-all shadow-[0_20px_50px_rgba(4,120,87,0.3)]"
          data-testid="button-start-geoadventure"
        >
          Start a GeoAdventure
        </button>
        <a href="#how-it-works" className="text-stone-500 font-semibold text-lg hover:text-stone-900 transition-colors flex items-center gap-2 group">
          See how it works <span className="group-hover:translate-x-1 transition-transform">→</span>
        </a>
      </div>
      <div className="mt-20 relative max-w-5xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-t from-[#fdfcf8] via-transparent to-transparent z-10"></div>
        <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-[12px] border-white bg-white">
          <img src={familyHawaiiAirportImage} alt="Family arriving at Hawaiian airport, excited for adventure" className="w-full h-auto object-cover aspect-[16/9]" />
        </div>
      </div>
    </div>
  </section>
);

const ProblemSection = () => (
  <section className="py-32 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-2 gap-20 items-center">
        <div>
          <div className="mb-10 leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            <h2 className="text-5xl md:text-7xl font-bold text-stone-900 mb-4">Trips are unforgettable.</h2>
            <p className="text-2xl md:text-4xl font-bold text-stone-400">Unless kids are just waiting for them to end.</p>
          </div>
          <div className="space-y-8 text-xl md:text-2xl leading-relaxed">
            <div className="py-6 border-y border-stone-100">
              <p className="text-stone-900 font-medium italic mb-2">"Are we there yet?"</p>
              <p className="text-stone-400">Between every stop.</p>
            </div>
            <div>
              <p className="text-stone-700 mb-2">Phones handed over.</p>
              <p className="text-stone-400">Moments and places fade into the background.</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="grid grid-cols-2 gap-6 grayscale brightness-110">
            <img src={childWaitingImage} className="rounded-3xl shadow-lg aspect-[3/4] object-cover" alt="Child waiting at airport" />
            <img src="https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&q=60&w=600" className="rounded-3xl shadow-lg aspect-square object-cover mt-12" alt="Trees" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-white text-4xl shadow-2xl z-20 border-4 border-white">✨</div>
        </div>
      </div>
      <div className="text-center mt-16">
        <p className="font-bold text-emerald-700 text-3xl md:text-4xl" style={{ fontFamily: "'Fraunces', serif" }}>GeoAdventure makes every stop part of the story.</p>
      </div>
    </div>
  </section>
);

const SolutionSection = () => (
  <section className="py-32 bg-[#f9f8f3] overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
      <h2 className="text-5xl md:text-7xl font-bold text-stone-900 mb-8" style={{ fontFamily: "'Fraunces', serif" }}>What if the place became the game?</h2>
      <p className="text-xl md:text-2xl text-stone-600 max-w-3xl mx-auto leading-relaxed">GeoAdventure turns real locations into playful explorations.</p>
    </div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-10">
      {[
        { title: "Discover before", desc: "Build anticipation by noticing patterns and stories of the place you're headed to.", icon: "🌱", label: "The Wonder Phase" },
        { title: "Notice during", desc: "Active prompts guide kids to find surprises and connect with actual streets around them.", icon: "🔎", label: "The Trip Phase" },
        { title: "Connect after", desc: "Return to the place through games that reinforce what they noticed.", icon: "✨", label: "The Memory Phase" }
      ].map((item, idx) => (
        <div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-stone-100 group flex flex-col h-full">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-6">{item.label}</div>
          <div className="text-5xl mb-8 group-hover:scale-110 transition-transform origin-left">{item.icon}</div>
          <h3 className="text-3xl font-bold text-stone-900 mb-6" style={{ fontFamily: "'Fraunces', serif" }}>{item.title}</h3>
          <p className="text-stone-600 text-lg leading-relaxed flex-grow">{item.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

const HowItWorks = () => (
  <section id="how-it-works" className="py-32 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-24">
        <h2 className="text-5xl font-bold text-stone-900 mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Three steps to adventure</h2>
        <div className="h-1.5 w-24 bg-emerald-600 mx-auto rounded-full"></div>
      </div>
      <div className="grid md:grid-cols-3 gap-16">
        {[
          { num: "1", title: "Pick a place", desc: "Choose where you're going (or dreaming about)." },
          { num: "2", title: "Explore together", desc: "GeoQuest guides kids to notice patterns and stories." },
          { num: "3", title: "Keep playing", desc: "After the trip, return to the place through games." }
        ].map((step, idx) => (
          <div key={idx} className="relative flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 text-3xl font-black mb-8 border-2 border-emerald-100">{step.num}</div>
            <h3 className="text-3xl font-bold text-stone-900 mb-6" style={{ fontFamily: "'Fraunces', serif" }}>{step.title}</h3>
            <p className="text-xl text-stone-600 leading-relaxed max-w-xs">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const TripFitModal = ({ onClose, onComplete }: TripFitModalProps) => {
  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const nextStep = () => {
    if (step === 1 && (!formData.name.trim() || !formData.email.trim())) return;
    setAnimating(true);
    setTimeout(() => { setStep(prev => prev + 1); setAnimating(false); }, 300);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const renderScreen = () => {
    switch(step) {
      case 1:
        return (
          <div className={`space-y-8 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} transition-all duration-300`}>
            <div className="text-center mb-10">
              <h3 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Let's find your fit</h3>
              <p className="text-lg text-stone-500">Enter your details to start the 20-second check.</p>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <input 
                  type="text" 
                  placeholder="Your Name" 
                  className="w-full px-6 py-5 rounded-2xl bg-black text-white placeholder:text-stone-500 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  data-testid="input-fit-name"
                />
                <input 
                  type="email" 
                  placeholder="Your Email" 
                  className="w-full px-6 py-5 rounded-2xl bg-black text-white placeholder:text-stone-500 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  data-testid="input-fit-email"
                />
              </div>
              <button 
                onClick={nextStep} 
                disabled={!formData.name.trim() || !formData.email.trim()} 
                className="w-full py-6 bg-emerald-700 text-white rounded-[2rem] font-bold text-xl hover:bg-emerald-800 disabled:bg-stone-200 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                data-testid="button-fit-continue"
              >
                Continue <span>→</span>
              </button>
              <div className="text-center">
                <p className="text-[11px] text-stone-400 font-medium italic">We will keep this safe and won't share with anyone.</p>
              </div>
            </div>
          </div>
        );
      case 2:
      case 3:
      case 4:
      case 5:
        const questions = [
          { q: "Are you traveling with kids in the next few months?", opts: ["Yes, we have a trip planned", "Maybe / something coming up", "Not right now"] },
          { q: "What kind of trip is it?", opts: ["Vacation", "Visiting family", "Road trip", "Weekend getaway", "Not sure yet"] },
          { q: "What usually happens with kids during travel?", opts: ["They get bored quickly", "They ask lots of questions", "They go quiet on screens", "It depends on the day"] },
          { q: "Would you like your child to notice the place more — without adding more screen time?", opts: ["Yes", "Possibly", "Not really"] }
        ];
        const currentQ = questions[step - 2];
        return (
          <div className={`space-y-8 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} transition-all duration-300`}>
            <h3 className="text-3xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', serif" }}>{currentQ.q}</h3>
            <div className="grid gap-4">
              {currentQ.opts.map((opt) => (
                <button key={opt} onClick={nextStep} className="w-full text-left px-8 py-5 rounded-2xl border-2 border-stone-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all font-medium text-lg text-stone-700" data-testid={`option-${opt.slice(0, 10)}`}>{opt}</button>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✨</div>
              <h3 className="text-4xl font-bold text-stone-900 mb-6" style={{ fontFamily: "'Fraunces', serif" }}>GeoAdventure fits trips like yours, {formData.name.split(' ')[0]}!</h3>
              <p className="text-xl text-stone-600 leading-relaxed max-w-lg mx-auto">GeoAdventure works best when families are traveling — or even just thinking about a place.</p>
            </div>
            <div className="bg-stone-50 rounded-[2rem] p-8 mb-10">
              <h4 className="font-bold text-stone-900 mb-4 text-lg">It helps kids:</h4>
              <ul className="space-y-3 mb-8">
                {["notice patterns", "ask better questions", "connect memories to real locations"].map(benefit => (
                  <li key={benefit} className="flex items-center gap-3 text-stone-700 text-lg">
                    <span className="text-emerald-500 font-bold">✓</span> {benefit}
                  </li>
                ))}
              </ul>
              <p className="text-stone-500 italic text-base">Without rushing, pressure, or addictive loops.</p>
            </div>
            <div className="border-l-4 border-amber-300 pl-6 mb-12">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Example</p>
              <p className="text-xl text-stone-800 leading-relaxed">A 7-year-old exploring Paris notices why most buildings are the same height — and remembers it long after the trip ends.</p>
            </div>
            <button 
              onClick={() => { onClose(); onComplete(); }} 
              className="w-full py-6 bg-emerald-700 text-white rounded-[2rem] font-bold text-xl hover:bg-emerald-800 transition-all shadow-xl active:scale-95"
              data-testid="button-try-geoadventure"
            >
              Try a GeoAdventure
            </button>
            <p className="text-center text-[13px] text-stone-400 font-medium mt-4">Free during our founding families pilot.</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-8 text-stone-300 hover:text-stone-600 transition-colors text-3xl font-light z-10" data-testid="button-close-modal">×</button>
        {step < 6 && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-stone-50">
            <div className="h-full bg-emerald-500 transition-all duration-500 ease-out" style={{ width: `${(step / 5) * 100}%` }}></div>
          </div>
        )}
        <div className="p-8 md:p-16">{renderScreen()}</div>
      </div>
    </div>
  );
};

const TripFitSection = ({ onStartAdventure }: { onStartAdventure: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <section id="check-fit" className="py-24 bg-white border-y border-stone-100">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Is GeoAdventures right for your next trip?</h2>
        <p className="text-lg text-stone-500 mb-10">Take 20 seconds to see if this fits your family.</p>
        <button 
          onClick={() => setIsOpen(true)} 
          className="group px-10 py-5 bg-stone-900 text-white rounded-full font-bold text-xl hover:bg-emerald-700 transition-all flex items-center gap-3 mx-auto shadow-lg"
          data-testid="button-check-fit"
        >
          Check fit <span className="group-hover:translate-x-1 transition-transform">→</span>
        </button>
        {isOpen && <TripFitModal onClose={() => setIsOpen(false)} onComplete={onStartAdventure} />}
      </div>
    </section>
  );
};

const SafetySection = () => (
  <section id="why-geoadventures" className="py-32 bg-[#fdfcf8]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-20">
        <h2 className="text-5xl font-bold text-stone-900 mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Built with families in mind</h2>
        <p className="text-xl text-stone-600 max-w-2xl mx-auto">GeoQuest is designed for real-world exploration, not screen addiction.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-10">
        {[
          { title: "No addictive loops", desc: "No streaks, no endless scrolling. Kids explore at their own pace.", icon: "🌿" },
          { title: "Family-first privacy", desc: "We don't sell data. Your family's adventures stay private.", icon: "🔒" },
          { title: "Screen time that matters", desc: "Short bursts that enhance the real world, not replace it.", icon: "⏱️" }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-10 rounded-[2rem] shadow-sm border border-stone-100">
            <div className="text-4xl mb-6">{item.icon}</div>
            <h3 className="text-2xl font-bold text-stone-900 mb-4" style={{ fontFamily: "'Fraunces', serif" }}>{item.title}</h3>
            <p className="text-stone-600 text-lg leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const adventureTestimonials = [
  {
    name: "Laura",
    role: "Parent of two kids (5 & 9)",
    content: "We used GeoQuest on a road trip, and it completely changed the mood. The kids were curious before we arrived instead of bored.",
    tag: "GeoAdventures",
    tagColor: "bg-emerald-100 text-emerald-700"
  },
  {
    name: "Chris",
    role: "Parent of a 7-year-old",
    content: "What surprised me most was the memory part. Weeks later, my son still remembers places we visited.",
    tag: "GeoAdventures",
    tagColor: "bg-emerald-100 text-emerald-700"
  },
  {
    name: "Nina",
    role: "Parent of a 10-year-old",
    content: "It doesn't interrupt the trip — it enhances it. That's very rare for a kids app.",
    tag: "GeoAdventures",
    tagColor: "bg-emerald-100 text-emerald-700"
  },
  {
    name: "Sarah M.",
    role: "Parent of a 7-year-old",
    content: "We traveled to Hawaii with GeoAdventures, and my son experienced the Big Island very differently than past trips. He was curious before we arrived and still talks about volcanoes weeks later.",
    tag: "GeoAdventures",
    tagColor: "bg-emerald-100 text-emerald-700"
  },
  {
    name: "Jason L.",
    role: "Parent of an 8-year-old",
    content: "We used GeoAdventures on the drive to Yellowstone National Park. My son arrived already excited and asking questions instead of staring at a screen.",
    tag: "GeoAdventures",
    tagColor: "bg-emerald-100 text-emerald-700"
  },
  {
    name: "Laura W.",
    role: "Parent of a 6-year-old",
    content: "After our trip, GeoAdventures helped us talk about what we actually saw and felt. It turned memories into conversations, not just photos.",
    tag: "GeoAdventures",
    tagColor: "bg-emerald-100 text-emerald-700"
  },
  {
    name: "Emily R.",
    role: "Parent of two kids (5 & 9)",
    content: "GeoQuest works for both everyday play and family trips. We use GeoGames at home and GeoAdventures when we travel — it all feels connected instead of separate apps.",
    tag: "GeoQuest",
    tagColor: "bg-purple-100 text-purple-700"
  },
  {
    name: "Daniel T.",
    role: "Parent of a 10-year-old",
    content: "What I appreciate about GeoQuest is that it doesn't rush kids. It rewards curiosity instead of speed, which feels rare in kids' apps.",
    tag: "GeoQuest",
    tagColor: "bg-purple-100 text-purple-700"
  },
  {
    name: "Rohit",
    role: "Parent of two kids",
    content: "GeoQuest feels like it was built by parents. Nothing about it feels pushy or addictive.",
    tag: "GeoQuest",
    tagColor: "bg-purple-100 text-purple-700"
  }
];

const Testimonials = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    
    let animationId: number;
    let scrollPos = 0;
    
    const scroll = () => {
      if (!isPaused && scrollContainer) {
        scrollPos += 1;
        if (scrollPos >= scrollContainer.scrollWidth / 2) {
          scrollPos = 0;
        }
        scrollContainer.scrollLeft = scrollPos;
      }
      animationId = requestAnimationFrame(scroll);
    };
    
    animationId = requestAnimationFrame(scroll);
    
    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);
  
  return (
    <section id="testimonials" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4" style={{ fontFamily: "'Fraunces', serif" }}>What families are saying</h2>
          <p className="text-xl text-stone-600">Real experiences from parents like you</p>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-hidden cursor-grab px-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {[...adventureTestimonials, ...adventureTestimonials].map((testimonial, index) => (
          <div 
            key={index}
            className="flex-shrink-0 w-[350px] bg-[#fdfcf8] rounded-2xl p-6 border border-stone-100 shadow-lg"
          >
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${testimonial.tagColor}`}>
              {testimonial.tag}
            </div>
            <p className="text-stone-700 mb-6 leading-relaxed">"{testimonial.content}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                {testimonial.name[0]}
              </div>
              <div>
                <p className="font-semibold text-stone-900">{testimonial.name}</p>
                <p className="text-sm text-stone-500">{testimonial.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const PricingSection = () => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [hovered, setHovered] = useState<string | null>(null);

  const geopassPrice = billing === 'annual' ? '$39.99' : '$4.99';
  const geopassCadence = billing === 'annual'
    ? 'per year · whole family · billed once'
    : 'per month · whole family';

  const plans = [
    {
      id: 'free',
      tier: 'FREE EXPLORER',
      price: '$0',
      cadence: 'always free',
      features: [
        'Build up to 1 trip',
        'Day 1 preview (5 stops)',
        'AI trip suggestions',
        'Basic planning tools',
      ],
      cta: 'Get started free',
      dark: false,
      popular: false,
    },
    {
      id: 'geopass',
      tier: 'GEOPASS',
      price: geopassPrice,
      cadence: geopassCadence,
      features: [
        'Unlimited trips',
        'Full Run layer at every stop',
        'All kids missions + games',
        'Offline access',
        'Auto trip story + memories',
        'Push notifications',
      ],
      cta: 'Join the waitlist',
      dark: true,
      popular: true,
    },
    {
      id: 'trippack',
      tier: 'TRIP PACK',
      price: '$9.99',
      cadence: 'per trip · one-time',
      features: [
        'One full trip unlock',
        'Complete Run experience',
        'Kids missions included',
        'Trip story auto-generated',
        'Offline access for the trip',
      ],
      cta: 'Join the waitlist',
      dark: false,
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24" style={{ background: '#EEF5F2', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#E8692A' }}>Pricing</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight" style={{ fontFamily: "'Fraunces', serif", color: '#1A1F2E', letterSpacing: '-1px' }}>
            Start free.<br />
            Pay when it <em style={{ color: '#E8692A' }}>matters.</em>
          </h2>
          <p className="text-lg max-w-lg mx-auto leading-relaxed" style={{ color: '#8A8FA8' }}>
            Build your trip for free. Unlock the Run layer — the part that actually makes your day work — when you're ready to go.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-8">
          <div className="relative inline-flex p-1 rounded-full gap-1" style={{ background: 'rgba(26,31,46,0.08)' }}>
            {(['monthly', 'annual'] as const).map((val) => (
              <button
                key={val}
                onClick={() => setBilling(val)}
                className="relative px-7 py-2.5 rounded-full text-sm font-semibold transition-all duration-200"
                style={{
                  background: billing === val ? '#fff' : 'transparent',
                  boxShadow: billing === val ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                  color: billing === val ? '#1A1F2E' : '#8A8FA8',
                }}
              >
                {val === 'monthly' ? 'Monthly' : 'Annual'}
                {val === 'annual' && (
                  <span
                    className="absolute -top-2.5 -right-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap transition-opacity duration-200"
                    style={{
                      background: '#E8692A',
                      opacity: billing === 'annual' ? 0 : 1,
                    }}
                  >
                    Save 33%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Annual callout bar */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: billing === 'annual' ? '60px' : '0px' }}
        >
          <div
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 mb-7 max-w-md mx-auto"
            style={{ background: 'rgba(61,170,110,0.10)', border: '1px solid rgba(61,170,110,0.25)' }}
          >
            <span className="text-sm">🎉</span>
            <span className="text-sm font-semibold" style={{ color: '#3DAA6E' }}>
              GeoPass Annual saves you $19.89/year — that's 2 months free.
            </span>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {plans.map((plan) => {
            const isActive = hovered === plan.id;
            return (
              <div
                key={plan.id}
                onMouseEnter={() => setHovered(plan.id)}
                onMouseLeave={() => setHovered(null)}
                className="relative rounded-3xl p-7 transition-all duration-250 flex flex-col"
                style={{
                  background: plan.dark ? '#1A1F2E' : '#fff',
                  border: plan.dark ? 'none' : '1px solid rgba(26,31,46,0.08)',
                  boxShadow: isActive
                    ? plan.dark ? '0 20px 60px rgba(26,31,46,0.25)' : '0 20px 60px rgba(0,0,0,0.10)'
                    : plan.dark ? '0 8px 32px rgba(26,31,46,0.15)' : '0 2px 12px rgba(0,0,0,0.05)',
                  transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                }}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[11px] font-bold tracking-wide px-5 py-1 rounded-full whitespace-nowrap"
                    style={{ background: '#E8692A', letterSpacing: '0.08em' }}
                  >
                    MOST POPULAR
                  </div>
                )}

                {/* One-time badge for Trip Pack */}
                {plan.id === 'trippack' && (
                  <div
                    className="absolute top-4 right-4 rounded-lg px-2 py-1"
                    style={{ background: 'rgba(138,143,168,0.12)' }}
                  >
                    <span className="text-[10px] font-semibold" style={{ color: '#8A8FA8' }}>one-time</span>
                  </div>
                )}

                {/* Tier */}
                <div
                  className="text-xs font-semibold tracking-widest uppercase mb-2.5"
                  style={{ color: plan.dark ? 'rgba(255,255,255,0.45)' : '#8A8FA8', letterSpacing: '0.12em' }}
                >
                  {plan.tier}
                </div>

                {/* Price */}
                <div
                  className="font-bold leading-none mb-1 transition-all duration-200"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 46,
                    color: plan.dark ? '#fff' : '#1A1F2E',
                    letterSpacing: '-2px',
                  }}
                >
                  {plan.price}
                </div>

                {/* Cadence */}
                <div
                  className="text-[13px] leading-snug"
                  style={{
                    color: plan.dark ? 'rgba(255,255,255,0.4)' : '#8A8FA8',
                    marginBottom: plan.id === 'geopass' && billing === 'annual' ? 10 : 24,
                  }}
                >
                  {plan.cadence}
                </div>

                {/* Annual saving badge — GeoPass only */}
                {plan.id === 'geopass' && (
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: billing === 'annual' ? '48px' : '0px', marginBottom: billing === 'annual' ? 20 : 0 }}
                  >
                    <div
                      className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{ background: 'rgba(61,170,110,0.15)' }}
                    >
                      <span className="text-sm">✓</span>
                      <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>
                        Save 33% — 2 months free
                      </span>
                    </div>
                  </div>
                )}

                {/* "Best if" note — Trip Pack only */}
                {plan.id === 'trippack' && (
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2 mb-5"
                    style={{ background: '#EEF5F2' }}
                  >
                    <span className="text-sm">💡</span>
                    <span className="text-xs font-medium" style={{ color: '#7A9E8E' }}>
                      Best if you travel once a year
                    </span>
                  </div>
                )}

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-grow">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span
                        className="font-bold text-base leading-snug flex-shrink-0"
                        style={{ color: plan.dark ? '#E8692A' : '#7A9E8E' }}
                      >✓</span>
                      <span
                        className="text-sm leading-snug"
                        style={{ color: plan.dark ? 'rgba(255,255,255,0.8)' : '#1A1F2E' }}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  className="w-full h-12 rounded-3xl text-sm font-bold transition-all duration-200"
                  style={
                    plan.id === 'geopass'
                      ? { background: '#E8692A', color: '#fff', boxShadow: '0 4px 14px rgba(232,105,42,0.35)' }
                      : plan.dark
                      ? { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
                      : { background: '#1A1F2E', color: '#fff' }
                  }
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm" style={{ color: '#8A8FA8' }}>
          One subscription covers your whole family · Cancel anytime
        </p>

        {/* Decision helper */}
        <div
          className="mt-7 rounded-2xl px-6 py-5"
          style={{ background: 'rgba(26,31,46,0.06)' }}
        >
          <div
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: '#8A8FA8', letterSpacing: '0.1em' }}
          >
            WHICH ONE IS RIGHT FOR YOU?
          </div>
          <div className="space-y-3">
            {[
              ['🌍', 'Travel 2+ times a year', 'GeoPass Annual — $39.99, best value'],
              ['✈️', 'One big trip planned', 'Trip Pack — $9.99, no commitment'],
              ['🧪', 'Not sure yet', 'Free Explorer — build a trip, see how it feels'],
            ].map(([icon, q, a]) => (
              <div key={q} className="flex items-start gap-3">
                <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                <div>
                  <span className="text-sm" style={{ color: '#1A1F2E' }}>{q} </span>
                  <span className="text-sm font-semibold" style={{ color: '#E8692A' }}>→ {a}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

const ContactSection = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <section id="contact" className="py-20 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Contact Us</h2>
          <p className="text-lg text-white/90">Have questions? We'd love to hear from you.</p>
          <p className="text-white/80 mt-2">support@geoquestgame.com</p>
        </div>
        
        {submitted ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
            <p className="text-white/90">We'll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
                {error}
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="John Smith"
                  data-testid="input-contact-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="john@example.com"
                  data-testid="input-contact-email"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">Message</label>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="How can we help you?"
                data-testid="textarea-contact-message"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-800 transition-all disabled:bg-stone-300 disabled:cursor-not-allowed"
              data-testid="button-contact-submit"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

const Footer = () => {
  const [showComingSoon, setShowComingSoon] = useState(false);
  
  const handleSocialClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 2000);
  };
  
  return (
    <footer className="bg-slate-900 text-white py-16 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-20 w-2 h-2 bg-white rounded-full"></div>
        <div className="absolute top-32 right-40 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-white rounded-full"></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-white rounded-full"></div>
      </div>
      
      {showComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold mb-2">Coming Soon!</h3>
            <p className="text-slate-600">We're working on our social presence.</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <SpinningCompass size={40} />
              <div>
                <span className="text-lg font-bold block">GeoQuest</span>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">GEOADVENTURES</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Making travel fun, one stop at a time.<br />
              Join the adventure today!
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-white">Explore</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li><a href="https://geoquestgame.live" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="https://geoquestgame.live/geoadventures-landing" className="hover:text-white transition-colors">GeoAdventure</a></li>
              <li><a href="https://geoquestgame.live/geogames-landing" className="hover:text-white transition-colors">Guess & Go Game</a></li>
              <li><a href="https://geoquest.scoreapp.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Scorecard</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-white">Company</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-white">Follow Us</h4>
            <div className="flex gap-4">
              <button onClick={handleSocialClick} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </button>
              <button onClick={handleSocialClick} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors" aria-label="Facebook">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </button>
              <button onClick={handleSocialClick} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} GeoQuest Games. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default function GeoAdventuresLanding() {
  const [, setLocation] = useLocation();
  const creatorRef = useRef<HTMLDivElement>(null);

  const startExploring = () => {
    setLocation('/geoadventures');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,700&display=swap');
        
        .geo-landing-page {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: #fdfcf8;
          scroll-behavior: smooth;
        }
      `}</style>
      <div className="geo-landing-page min-h-screen flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
        <Header onStart={startExploring} />
        <main className="flex-grow">
          <Hero onStart={startExploring} />
          <ProblemSection />
          <SolutionSection />
          <TripFitSection onStartAdventure={startExploring} />
          <HowItWorks />
          <SafetySection />
          <Testimonials />
          <PricingSection />
          <ContactSection />
          <div ref={creatorRef} />
        </main>
        <Footer />
      </div>
    </>
  );
}
