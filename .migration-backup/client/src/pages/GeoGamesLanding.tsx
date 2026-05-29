import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import physicalDeckImage from '@/assets/images/physical-deck-cards.png';

const Header = ({ onPlayGuessGo }: { onPlayGuessGo: () => void }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg animate-spin" style={{ animationDuration: '8s' }}>
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900 tracking-tight leading-none">GeoQuest</span>
              <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">GEOGAMES</span>
            </div>
          </div>
          
          <nav className="hidden md:flex space-x-8 items-center text-sm font-medium text-slate-600">
            <a href="#what-is-geoquest" className="hover:text-teal-600 transition-colors">About</a>
            <a href="#how-it-works" className="hover:text-teal-600 transition-colors">How It Works</a>
            <a href="#try-round" className="hover:text-teal-600 transition-colors">Try It</a>
            <a href="#waitlist" className="hover:text-teal-600 transition-colors">Waitlist</a>
            <a href="#faq" className="hover:text-teal-600 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-teal-600 transition-colors">Contact</a>
            <a href="/geoadventures-landing" className="hover:text-teal-600 transition-colors">GeoAdventures</a>
            <button 
              onClick={onPlayGuessGo}
              className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-5 py-2.5 rounded-full hover:from-orange-500 hover:to-orange-600 transition-all shadow-md font-semibold"
              data-testid="button-play-header"
            >
              Play Guess & Go
            </button>
          </nav>
          
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100">
            <nav className="flex flex-col space-y-4 text-sm font-medium text-slate-600">
              <a href="#what-is-geoquest" className="hover:text-teal-600 transition-colors">About</a>
              <a href="#how-it-works" className="hover:text-teal-600 transition-colors">How It Works</a>
              <a href="#try-round" className="hover:text-teal-600 transition-colors">Try It</a>
              <a href="#waitlist" className="hover:text-teal-600 transition-colors">Waitlist</a>
              <a href="#faq" className="hover:text-teal-600 transition-colors">FAQ</a>
              <a href="#contact" className="hover:text-teal-600 transition-colors">Contact</a>
              <a href="/geoadventures-landing" className="hover:text-teal-600 transition-colors">GeoAdventures</a>
              <button 
                onClick={onPlayGuessGo}
                className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-5 py-2.5 rounded-full font-semibold w-full"
                data-testid="button-play-mobile"
              >
                Play Guess & Go
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

const Hero = ({ onPlayGuessGo, onWaitlist }: { onPlayGuessGo: () => void; onWaitlist: () => void }) => (
  <section className="relative overflow-hidden pt-16 pb-24 md:pt-20 md:pb-32 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500">
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-semibold mb-8 border border-white/30">
        <span>For Ages 4+</span>
      </div>
      
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6 max-w-5xl mx-auto">
        Finally, a Geography Game That Makes Kids Think...{' '}
        <span className="italic">and Laugh.</span>
      </h1>
      
      <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
        Not just naming capitals. Real clues. Real thinking. Real joy. Designed for curious minds age 4+.
      </p>
      
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12">
        <button 
          onClick={onPlayGuessGo}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full font-bold text-lg hover:from-orange-500 hover:to-orange-600 hover:scale-105 transition-all shadow-xl shadow-orange-500/30"
          data-testid="button-play-guess-go"
        >
          Play Guess & Go
        </button>
        <button 
          onClick={onWaitlist}
          className="w-full sm:w-auto px-8 py-4 bg-white text-teal-700 rounded-full font-bold text-lg hover:bg-white/90 hover:scale-105 transition-all shadow-xl"
          data-testid="button-waitlist-hero"
        >
          Waitlist for Physical Deck
        </button>
      </div>
    </div>
  </section>
);

const WhatIsGeoQuest = () => {
  const features = [
    {
      icon: '🧠',
      title: 'Critical Thinking',
      description: 'Kids analyze clues and make connections, not just memorize facts.',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: '🌍',
      title: 'Geography Skills',
      description: 'Learn about cities, countries, landmarks, and cultures from around the world.',
      color: 'bg-teal-100 text-teal-600'
    },
    {
      icon: '👨‍👩‍👧‍👦',
      title: 'Family Fun',
      description: 'Perfect for game nights, road trips, or anytime the family wants to play together.',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      icon: '📚',
      title: 'Classroom Friendly',
      description: 'Great for teachers looking to make geography engaging and interactive.',
      color: 'bg-blue-100 text-blue-600'
    }
  ];

  return (
    <section id="what-is-geoquest" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            What is GeoGames?
          </h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
            GeoGames is a card-based geography game where players use clues to guess cities around the world. 
            It's designed to spark curiosity, encourage reasoning, and make learning about the world genuinely fun.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorks = ({ onPlayNow }: { onPlayNow: () => void }) => {
  const steps = [
    {
      number: '1',
      icon: '🎴',
      title: 'Pick a Card',
      description: 'Draw a mystery city card from the deck.'
    },
    {
      number: '2',
      icon: '🔍',
      title: 'Answer Clues',
      description: 'Read clues about landmarks, culture, and geography.'
    },
    {
      number: '3',
      icon: '💡',
      title: 'Make a Guess',
      description: 'Use your reasoning to guess the city.'
    },
    {
      number: '4',
      icon: '⭐',
      title: 'Score Points',
      description: 'Earn points based on how few clues you needed!'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
            How It Works — Guess & Go
          </h2>
          <p className="text-lg text-slate-600">Simple to learn, endlessly engaging</p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm h-full">
                <div className="w-10 h-10 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  {step.number}
                </div>
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600 text-sm">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-slate-300 text-2xl">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="text-center bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-4">Don't Just Play,<br />Learn in a Fun Way!</h3>
          <button 
            onClick={onPlayNow}
            className="bg-white text-teal-600 px-8 py-3 rounded-full font-bold text-lg hover:bg-white/90 hover:scale-105 transition-all shadow-lg"
            data-testid="button-play-now"
          >
            Play Now
          </button>
        </div>
      </div>
    </section>
  );
};

const LearningScienceSection = () => (
  <section className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
          Why GeoQuest Works: Built on Real Learning Science
        </h2>
        <p className="text-lg text-slate-600 max-w-3xl mx-auto">
          We didn't just make a game — we designed an experience backed by how kids actually learn.
        </p>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-8 border border-teal-100">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-xl flex items-center justify-center mb-6">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r="0.5" fill="currentColor" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Inquiry-Based Learning</h3>
          <p className="text-slate-600 mb-6">
            Instead of giving answers, we ask questions that lead to discovery.
          </p>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <span className="text-teal-500 mt-1">•</span>
              <span>"What do the clues tell you about this place?"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-teal-500 mt-1">•</span>
              <span>"What other city could this be?"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-teal-500 mt-1">•</span>
              <span>"Why did you think that?"</span>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 rounded-2xl p-8 text-white">
          <div className="w-12 h-12 bg-orange-400 text-white rounded-xl flex items-center justify-center text-xl mb-6">✓</div>
          <h3 className="text-xl font-bold mb-4">Why This Matters for Your Child</h3>
          <p className="text-slate-300 mb-6">
            Research shows that active learning outperforms passive memorization every time.
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs">✓</span>
              <span>Builds real problem-solving skills</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs">✓</span>
              <span>Creates lasting memories through engagement</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs">✓</span>
              <span>Sparks curiosity to learn more</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs">✓</span>
              <span>Encourages family conversation</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-8 border border-orange-100">
          <div className="w-12 h-12 bg-orange-400 text-white rounded-xl flex items-center justify-center text-xl mb-6">🎮</div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Learning That Feels Like Play</h3>
          <p className="text-slate-600 mb-6">
            When kids don't realize they're learning, they absorb more. That's the magic of GeoQuest.
          </p>
          <div className="bg-white/70 rounded-xl p-4 border border-orange-100">
            <p className="text-sm text-slate-700 italic">
              "My kids don't even know they're doing geography — they just think it's game time!"
            </p>
            <p className="text-xs text-slate-500 mt-2">— Deb M.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const CLUEFramework = () => {
  const clues = [
    {
      letter: 'C',
      word: 'Curiosity',
      description: 'Spark wonder about the world',
      color: 'from-purple-500 to-purple-600'
    },
    {
      letter: 'L',
      word: 'Locate',
      description: 'Discover where places are',
      color: 'from-blue-500 to-blue-600'
    },
    {
      letter: 'U',
      word: 'Understand',
      description: 'Learn what makes each place unique',
      color: 'from-teal-500 to-teal-600'
    },
    {
      letter: 'E',
      word: 'Explore',
      description: 'Build knowledge through discovery',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const badges = [
    { icon: '🌟', label: 'Explorer' },
    { icon: '🏆', label: 'Champion' },
    { icon: '🎯', label: 'Master' }
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold mb-4">
            <span>Our Learning Framework</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
            The C.L.U.E.™ Framework
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Every GeoQuest experience is designed around our proven learning approach
          </p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {clues.map((clue, index) => (
            <div key={index} className="text-center">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${clue.color} flex items-center justify-center text-white text-4xl font-bold shadow-lg`}>
                {clue.letter}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{clue.word}</h3>
              <p className="text-slate-600 text-sm">{clue.description}</p>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center gap-2 sm:gap-4 flex-wrap">
          {badges.map((badge, index) => (
            <div key={index} className="bg-white px-3 sm:px-6 py-2 sm:py-3 rounded-full shadow-md flex items-center gap-1 sm:gap-2 border border-slate-100">
              <span className="text-lg sm:text-2xl">{badge.icon}</span>
              <span className="font-semibold text-slate-700 text-sm sm:text-base">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const mysteryCities = [
  {
    id: 1,
    clues: [
      "This city has a famous tower that was once the tallest in the world.",
      "It's known as the 'City of Light'.",
      "The river Seine flows through it.",
      "It's the capital of a country famous for wine and cheese."
    ],
    city: "Paris",
    country: "France",
    flag: "🇫🇷",
    funFact: "The Eiffel Tower was originally meant to be a temporary structure and was almost torn down!"
  },
  {
    id: 2,
    clues: [
      "This city has a giant statue holding a torch in its harbor.",
      "It's called 'The Big Apple'.",
      "Times Square is located here.",
      "Central Park is one of the largest urban parks in the world."
    ],
    city: "New York City",
    country: "United States",
    flag: "🇺🇸",
    funFact: "New York City's subway system has 472 stations — more than any other system in the world!"
  },
  {
    id: 3,
    clues: [
      "This city has an ancient arena where gladiators once fought.",
      "It's built on seven hills.",
      "You can throw a coin in a famous fountain for good luck.",
      "It's home to the smallest country in the world within its borders."
    ],
    city: "Rome",
    country: "Italy",
    flag: "🇮🇹",
    funFact: "About 3,000 euros are thrown into the Trevi Fountain every day!"
  },
  {
    id: 4,
    clues: [
      "This city has a famous opera house shaped like sails.",
      "It's the largest city in its country but not the capital.",
      "There's a famous bridge nicknamed 'The Coathanger'.",
      "Kangaroos and koalas live in the wild nearby."
    ],
    city: "Sydney",
    country: "Australia",
    flag: "🇦🇺",
    funFact: "The Sydney Opera House has over 1 million tiles on its roof!"
  },
  {
    id: 5,
    clues: [
      "This city blends ancient temples with ultra-modern skyscrapers.",
      "It's famous for cherry blossom season.",
      "Bullet trains depart from here traveling over 300 km/h.",
      "It hosted the Summer Olympics twice."
    ],
    city: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    funFact: "Tokyo's Shibuya Crossing is the busiest pedestrian crossing in the world!"
  }
];

const TryQuickRound = () => {
  const [currentCityIndex, setCurrentCityIndex] = useState(0);
  const [currentClueIndex, setCurrentClueIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  
  const currentCity = mysteryCities[currentCityIndex];
  
  const handleReveal = () => {
    setIsRevealed(true);
  };
  
  const handleNextCity = () => {
    setCurrentCityIndex((prev) => (prev + 1) % mysteryCities.length);
    setCurrentClueIndex(0);
    setIsRevealed(false);
  };
  
  const handleNextClue = () => {
    if (currentClueIndex < currentCity.clues.length - 1) {
      setCurrentClueIndex(prev => prev + 1);
    }
  };

  return (
    <section id="try-round" className="py-20 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Try a Quick Round!
          </h2>
          <p className="text-lg text-white/90">
            See if you can guess the mystery city from the clues
          </p>
        </div>
        
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {!isRevealed ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-full font-semibold mb-4">
                  <span>🎴</span>
                  <span>Mystery City #{currentCityIndex + 1}</span>
                </div>
                <p className="text-slate-500 text-sm">Clue {currentClueIndex + 1} of {currentCity.clues.length}</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-6 mb-6 min-h-[120px] flex items-center justify-center">
                <p className="text-xl text-slate-800 text-center leading-relaxed">
                  "{currentCity.clues[currentClueIndex]}"
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                {currentClueIndex < currentCity.clues.length - 1 && (
                  <button
                    onClick={handleNextClue}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-full font-semibold hover:bg-slate-200 transition-all"
                    data-testid="button-next-clue"
                  >
                    Need Another Clue
                  </button>
                )}
                <button
                  onClick={handleReveal}
                  className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full font-semibold hover:from-orange-500 hover:to-orange-600 transition-all shadow-md"
                  data-testid="button-reveal-answer"
                >
                  Reveal Answer
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="text-6xl mb-4">{currentCity.flag}</div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{currentCity.city}</h3>
                <p className="text-lg text-slate-600 mb-6">{currentCity.country}</p>
                
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-6 mb-8 border border-teal-100">
                  <p className="text-sm font-semibold text-teal-700 mb-2">Fun Fact:</p>
                  <p className="text-slate-700">{currentCity.funFact}</p>
                </div>
                
                <button
                  onClick={handleNextCity}
                  className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full font-bold text-lg hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg"
                  data-testid="button-next-city"
                >
                  Next City →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

const FreeAssessment = () => (
  <section className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold mb-6">
            <span>Free Assessment</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            Test Your Geography Superpower
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Take our free 3-minute quiz to discover your child's geography learning style 
            and get personalized recommendations.
          </p>
          <a 
            href="https://geoquest.scoreapp.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full font-bold text-lg hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg"
            data-testid="link-scorecard"
          >
            Take the Free Scorecard
            <span>→</span>
          </a>
        </div>
        
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border border-slate-200">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Ready to begin?</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <span className="text-slate-700">Answer 20 quick questions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-slate-700">Get your child's learning profile</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <span className="text-slate-700">Receive personalized game recommendations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const PhysicalDeckWaitlist = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      setSubmitted(true);
      setName('');
      setEmail('');
    } catch (error) {
      console.error('Failed to submit waitlist:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <section id="waitlist" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={physicalDeckImage}
                alt="GeoQuest geography learning cards spread on table"
                className="w-full h-auto"
              />
            </div>
            <div className="absolute -top-4 -right-4 bg-orange-400 text-white px-4 py-2 rounded-full font-bold shadow-lg rotate-12">
              Screen-Free Fun!
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Physical Deck Coming Soon!
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Love the digital game? We're creating a beautiful physical card deck you can take anywhere. 
              Perfect for road trips, game nights, and screen-free family time.
            </p>
            
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <h3 className="text-lg font-bold text-green-800 mb-1">You're on the list!</h3>
                <p className="text-green-700 text-sm">We'll email you when the deck is ready.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-6 py-4 rounded-full border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-lg"
                    data-testid="input-waitlist-name"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="w-full px-6 py-4 rounded-full border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-lg"
                    data-testid="input-waitlist-email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full font-bold text-lg hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg disabled:from-slate-300 disabled:to-slate-400"
                  data-testid="button-waitlist-submit"
                >
                  {isSubmitting ? 'Joining...' : 'Join the Waitlist'}
                </button>
              </form>
            )}
            
            <div className="flex flex-wrap gap-4 mt-8">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200">
                <span className="text-xl">👨‍👩‍👧‍👦</span>
                <span className="text-sm font-medium text-slate-700">Instant Family Fun</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200">
                <span className="text-xl">✈️</span>
                <span className="text-sm font-medium text-slate-700">Travel-Sized Deck</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const testimonials = [
  {
    name: "Megan",
    role: "Parent of a 6-year-old",
    content: "GeoQuest is one of the few apps I don't have to supervise constantly. My daughter plays Guess & Go and then tells us facts at dinner.",
    tag: "GeoGames",
    tagColor: "bg-teal-100 text-teal-700"
  },
  {
    name: "Daniel",
    role: "Parent of an 8-year-old",
    content: "My son struggles with attention, but the games are short and calm. No loud animations, no pressure — just thinking.",
    tag: "GeoGames",
    tagColor: "bg-teal-100 text-teal-700"
  },
  {
    name: "Ayesha",
    role: "Parent of a 9-year-old",
    content: "I love that it doesn't feel competitive. There's no stress, just curiosity.",
    tag: "GeoGames",
    tagColor: "bg-teal-100 text-teal-700"
  },
  {
    name: "Nitin",
    role: "Parent of a 7-year-old",
    content: "My kid plays this every day after school without fail. It's a screen time that I'm not worried about.",
    tag: "GeoGames",
    tagColor: "bg-teal-100 text-teal-700"
  },
  {
    name: "Amit K.",
    role: "Parent of a 6-year-old",
    content: "Guess & Go is the first geography game my daughter asks to play on her own. She doesn't even realize she's learning — she just loves figuring things out.",
    tag: "GeoGames",
    tagColor: "bg-teal-100 text-teal-700"
  },
  {
    name: "Priya S.",
    role: "Parent of a 5-year-old",
    content: "The mini games are short, calm, and surprisingly smart. My daughter plays for a few minutes and walks away happy — not overstimulated.",
    tag: "GeoGames",
    tagColor: "bg-teal-100 text-teal-700"
  },
  {
    name: "Rohit",
    role: "Parent of two kids",
    content: "GeoQuest feels like it was built by parents. Nothing about it feels pushy or addictive.",
    tag: "GeoQuest",
    tagColor: "bg-purple-100 text-purple-700"
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
        scrollPos += 1.5;
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
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
            Why People Love GeoQuest
          </h2>
          <p className="text-lg text-slate-600">
            Hear from families, teachers, and explorers
          </p>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-hidden cursor-pointer"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {[...testimonials, ...testimonials].map((testimonial, index) => (
          <div 
            key={index}
            className="flex-shrink-0 w-[350px] bg-white rounded-2xl p-6 border border-slate-100 shadow-lg"
          >
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${testimonial.tagColor}`}>
              {testimonial.tag}
            </div>
            <p className="text-slate-700 mb-6 leading-relaxed">"{testimonial.content}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">
                {testimonial.name[0]}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{testimonial.name}</p>
                <p className="text-sm text-slate-500">{testimonial.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const MissionSection = () => (
  <section className="py-20 bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            Our Mission
          </h2>
          <p className="text-lg text-slate-600 mb-6 leading-relaxed">
            We believe every child deserves to discover the wonder of our world. GeoQuest was born from a simple idea: 
            what if learning geography could be as exciting as a treasure hunt?
          </p>
          <p className="text-lg text-slate-600 mb-6 leading-relaxed">
            Our team of educators, parents, and game designers work together to create experiences that spark genuine 
            curiosity and build lasting knowledge — one city at a time.
          </p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white text-xl">🌍</div>
            <p className="text-slate-700 font-medium">Learning about the world, one city at a time</p>
          </div>
        </div>
        
        <div className="relative">
          <div className="rounded-3xl overflow-hidden shadow-xl">
            <img 
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=800"
              alt="Family learning together"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
);

const faqItems = [
  {
    question: "What ages is GeoQuest suitable for?",
    answer: "GeoQuest is designed for ages 4 and up. The game automatically adjusts difficulty based on age — younger children get simpler clues with pictures, while older kids and adults get more challenging questions."
  },
  {
    question: "Can an adult play the game too?",
    answer: "Absolutely! Many adults are surprised by how much they learn. It's designed to be fun for the whole family, and we've had plenty of feedback from parents saying they enjoy it as much as their kids."
  },
  {
    question: "Is it educational?",
    answer: "Yes! GeoQuest teaches geography, critical thinking, and cultural awareness. But here's the secret: kids don't realize they're learning because it feels like play. That's intentional — research shows we learn best when we're having fun."
  },
  {
    question: "How many players can play?",
    answer: "GeoQuest works great for solo play or with groups. In our family mode, up to 7 players can have their own profiles and compete or collaborate."
  },
  {
    question: "How long does a round take?",
    answer: "A single city guess takes about 1-2 minutes. Most play sessions run 10-20 minutes, though we've heard from families who play for hours! The Daily Quest feature gives you a fresh challenge each day."
  },
  {
    question: "Do I need to know a lot of geography to play?",
    answer: "Not at all! GeoQuest is designed to teach, not test. You'll learn as you play. Even if you've never heard of a city before, the clues guide you toward the answer."
  }
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-slate-600">
            Everything you need to know about GeoQuest
          </p>
        </div>
        
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div 
              key={index}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                data-testid={`faq-question-${index}`}
              >
                <span className="font-semibold text-slate-900 text-lg pr-4">{item.question}</span>
                <span className={`text-2xl text-slate-400 transition-transform ${openIndex === index ? 'rotate-45' : ''}`}>
                  +
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-slate-600 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
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
    <section id="contact" className="py-20 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Contact Us</h2>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="John Smith"
                  data-testid="input-contact-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="john@example.com"
                  data-testid="input-contact-email"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="How can we help you?"
                data-testid="textarea-contact-message"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-4 rounded-xl font-bold text-lg hover:from-teal-600 hover:to-cyan-600 transition-all disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed"
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
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg animate-spin" style={{ animationDuration: '8s' }}>
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold">GeoQuest</span>
                <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider block">GEOGAMES</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Exploring the world, one city at a time!
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-white">Explore</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li><a href="https://geoquestgame.live" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="https://geoquestgame.live/geoadventures-landing" className="hover:text-white transition-colors">GeoAdventures</a></li>
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

export default function GeoGamesLanding() {
  const [, setLocation] = useLocation();

  const handlePlayGuessGo = () => {
    window.location.href = 'https://geoquestgame.live';
  };
  
  const scrollToWaitlist = () => {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header onPlayGuessGo={handlePlayGuessGo} />
      <Hero onPlayGuessGo={handlePlayGuessGo} onWaitlist={scrollToWaitlist} />
      <WhatIsGeoQuest />
      <HowItWorks onPlayNow={handlePlayGuessGo} />
      <LearningScienceSection />
      <CLUEFramework />
      <TryQuickRound />
      <FreeAssessment />
      <PhysicalDeckWaitlist />
      <Testimonials />
      <MissionSection />
      <FAQSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
