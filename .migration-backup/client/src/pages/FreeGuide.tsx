import { useState, useEffect } from 'react';

const FREE_GUIDE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .fg-root {
    --sand:      #F5EFE6;
    --sand-d:    #EDE4D8;
    --orange:    #E8541A;
    --orange-d:  #C93F0E;
    --orange-l:  #FDF0EA;
    --dark:      #1A1A2E;
    --body:      #3D3929;
    --mid:       #7A6F62;
    --light:     #B5A99A;
    --rule:      #E5DDD0;
    --white:     #FFFFFF;
    --red-pin:   #E84343;
    --teal:      #0D9488;
    --green:     #15803D;
    --radius-sm: 12px;
    --radius-md: 18px;
    --radius-lg: 24px;
    --shadow-sm: 0 2px 8px rgba(80,60,30,0.08);
    --shadow-md: 0 6px 24px rgba(80,60,30,0.12);
    --shadow-lg: 0 16px 48px rgba(80,60,30,0.16);
    font-family: 'Nunito', sans-serif;
    background: var(--sand);
    color: var(--body);
    line-height: 1.6;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  .fg-root nav {
    background: var(--white);
    border-bottom: 1px solid var(--rule);
    padding: 0 32px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky; top: 0; z-index: 100;
    box-shadow: var(--shadow-sm);
  }

  .fg-root .nav-brand {
    display: flex; align-items: center; gap: 8px;
    font-weight: 800; font-size: 18px; color: var(--dark);
    text-decoration: none;
  }
  .fg-root .nav-brand .plane { font-size: 20px; }
  .fg-root .nav-brand span  { color: var(--orange); }

  .fg-root .nav-cta {
    padding: 9px 20px; background: var(--orange); color: #fff;
    border: none; border-radius: 100px;
    font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 700;
    cursor: pointer; text-decoration: none;
    transition: background 0.2s, transform 0.1s;
  }
  .fg-root .nav-cta:hover { background: var(--orange-d); transform: scale(1.02); }

  .fg-root .hero {
    max-width: 1080px; margin: 0 auto;
    padding: 64px 32px 56px;
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 60px; align-items: center;
  }

  @media(max-width: 760px) {
    .fg-root .hero { grid-template-columns: 1fr; padding: 40px 20px 48px; gap: 40px; }
    .fg-root nav   { padding: 0 20px; }
  }

  .fg-root .steps-row {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 20px; flex-wrap: wrap;
  }
  .fg-root .step-pill {
    padding: 6px 14px; border-radius: 100px;
    font-size: 12px; font-weight: 700;
    display: flex; align-items: center; gap: 5px;
  }
  .fg-root .step-pill.active   { background: var(--orange); color: #fff; }
  .fg-root .step-pill.inactive { background: var(--white); color: var(--mid); border: 1.5px solid var(--rule); }
  .fg-root .step-arrow         { color: var(--light); font-size: 12px; }

  .fg-root .hero-eyebrow {
    font-size: 13px; font-weight: 700; letter-spacing: 0.15em;
    text-transform: uppercase; color: var(--orange);
    margin-bottom: 14px; display: flex; align-items: center; gap: 6px;
  }

  .fg-root .hero-title {
    font-family: 'Lora', serif;
    font-size: clamp(30px, 5vw, 46px); font-weight: 700;
    color: var(--dark); line-height: 1.2; margin-bottom: 14px;
  }
  .fg-root .hero-title em { font-style: italic; color: var(--orange); }

  .fg-root .hero-sub {
    font-size: 17px; color: var(--mid); line-height: 1.65;
    margin-bottom: 28px; font-weight: 400;
  }

  .fg-root .gps-row { display: flex; gap: 8px; margin-bottom: 28px; flex-wrap: wrap; }
  .fg-root .gps-tag {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 14px; background: var(--white);
    border: 1.5px solid var(--rule); border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 700; color: var(--body);
    box-shadow: var(--shadow-sm);
  }
  .fg-root .gps-dot {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: #fff; flex-shrink: 0;
  }
  .fg-root .dot-g { background: var(--orange); }
  .fg-root .dot-p { background: var(--teal); }
  .fg-root .dot-s { background: var(--green); }

  .fg-root .form-card {
    background: var(--white); border-radius: var(--radius-lg);
    padding: 24px; box-shadow: var(--shadow-md);
    border: 1px solid var(--rule);
  }
  .fg-root .form-title { font-size: 15px; font-weight: 800; color: var(--dark); margin-bottom: 6px; }
  .fg-root .form-sub   { font-size: 13px; color: var(--mid); margin-bottom: 16px; }

  .fg-root .search-bar {
    display: flex; align-items: center; gap: 10px;
    background: var(--sand); border: 2px solid var(--rule);
    border-radius: 100px; padding: 4px 4px 4px 18px;
    margin-bottom: 12px; transition: border-color 0.2s;
  }
  .fg-root .search-bar:focus-within { border-color: var(--orange); }
  .fg-root .search-bar input {
    flex: 1; border: none; background: transparent;
    font-family: 'Nunito', sans-serif; font-size: 15px;
    color: var(--dark); outline: none; padding: 8px 0;
  }
  .fg-root .search-bar input::placeholder { color: var(--light); }

  .fg-root .search-btn {
    padding: 10px 20px; background: var(--orange); color: #fff;
    border: none; border-radius: 100px;
    font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800;
    cursor: pointer; white-space: nowrap;
    transition: background 0.2s, transform 0.1s;
  }
  .fg-root .search-btn:hover    { background: var(--orange-d); }
  .fg-root .search-btn:active   { transform: scale(0.97); }
  .fg-root .search-btn:disabled { opacity: 0.7; cursor: not-allowed; }

  .fg-root .form-trust { font-size: 12px; color: var(--light); text-align: center; }

  .fg-root .status-msg {
    border-radius: var(--radius-sm); padding: 12px 16px;
    font-size: 14px; font-weight: 700; margin-top: 10px; text-align: center;
  }
  .fg-root .status-msg.success {
    background: #F0FDF4; border: 1.5px solid #86EFAC; color: var(--green);
  }
  .fg-root .status-msg.error {
    background: #FEF2F2; border: 1.5px solid #FCA5A5; color: #DC2626;
  }

  .fg-root .hero-right {
    display: flex; justify-content: center; align-items: center; position: relative;
  }
  .fg-root .book-scene { position: relative; width: 260px; }
  .fg-root .book-glow {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 280px; height: 280px;
    background: radial-gradient(circle, #FFD6C0 0%, transparent 70%);
    z-index: 0;
  }
  .fg-root .book-shadow {
    position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
    width: 200px; height: 20px;
    background: radial-gradient(ellipse, rgba(80,40,10,0.2) 0%, transparent 70%);
    z-index: 0;
  }
  .fg-root .book {
    position: relative; z-index: 1;
    background: var(--dark); border-radius: 3px 14px 14px 3px;
    padding: 28px 24px;
    box-shadow: -5px 0 0 #0d0c14, -3px 4px 18px rgba(20,15,5,0.4), 0 10px 40px rgba(20,15,5,0.25);
    animation: fgBookFloat 5s ease-in-out infinite;
  }
  @keyframes fgBookFloat {
    0%,100% { transform: translateY(0) rotate(-0.8deg); }
    50%      { transform: translateY(-9px) rotate(0.4deg); }
  }
  .fg-root .book-top-badge {
    display: inline-block; background: var(--orange); color: #fff;
    font-size: 8px; font-weight: 800; letter-spacing: 0.14em;
    text-transform: uppercase; padding: 4px 10px;
    border-radius: 100px; margin-bottom: 16px;
  }
  .fg-root .book-heading {
    font-family: 'Lora', serif; font-size: 20px; font-weight: 700;
    color: #F5EFE6; line-height: 1.25; margin-bottom: 7px;
  }
  .fg-root .book-sub-text {
    font-family: 'Lora', serif; font-style: italic;
    font-size: 13px; color: var(--orange); margin-bottom: 18px;
  }
  .fg-root .book-divider {
    width: 36px; height: 2px; background: var(--orange);
    margin-bottom: 16px; border-radius: 2px;
  }
  .fg-root .book-gps-mini { display: flex; gap: 5px; margin-bottom: 20px; }
  .fg-root .mini-pill {
    flex: 1; background: rgba(255,255,255,0.07);
    border-radius: 8px; padding: 7px 5px; text-align: center;
  }
  .fg-root .mini-letter { font-size: 15px; font-weight: 900; display: block; margin-bottom: 3px; }
  .fg-root .mini-label  { font-size: 6.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.7; }
  .fg-root .mini-g .mini-letter { color: var(--orange); }
  .fg-root .mini-p .mini-letter { color: #2DD4BF; }
  .fg-root .mini-s .mini-letter { color: #4ADE80; }
  .fg-root .mini-g .mini-label  { color: var(--orange); }
  .fg-root .mini-p .mini-label  { color: #2DD4BF; }
  .fg-root .mini-s .mini-label  { color: #4ADE80; }
  .fg-root .book-author-strip {
    border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;
    font-size: 9.5px; color: rgba(255,255,255,0.4);
  }
  .fg-root .book-author-strip strong { color: rgba(255,255,255,0.65); font-size: 10.5px; }

  .fg-root .floating-badge {
    position: absolute; bottom: -12px; right: -18px; z-index: 2;
    background: var(--orange); color: #fff;
    width: 58px; height: 58px; border-radius: 50%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 900; line-height: 1;
    box-shadow: 0 4px 16px rgba(232,84,26,0.45);
    animation: fgBadgePop 5s ease-in-out infinite;
  }
  .fg-root .floating-badge span { font-size: 8px; font-weight: 700; opacity: 0.9; }
  @keyframes fgBadgePop {
    0%,100% { transform: scale(1); }
    50%      { transform: scale(1.06); }
  }

  .fg-root .proof-strip {
    background: var(--white); border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule); padding: 18px 32px;
  }
  .fg-root .proof-inner {
    max-width: 1080px; margin: 0 auto;
    display: flex; align-items: center; gap: 32px; flex-wrap: wrap;
  }
  .fg-root .proof-label {
    font-size: 11px; font-weight: 800; letter-spacing: 0.15em;
    text-transform: uppercase; color: var(--light); white-space: nowrap;
  }
  .fg-root .proof-items { display: flex; gap: 24px; flex-wrap: wrap; }
  .fg-root .proof-item  {
    font-size: 13px; font-weight: 600; color: var(--mid);
    display: flex; align-items: center; gap: 7px;
  }
  .fg-root .proof-pin { font-size: 14px; }

  .fg-root .section { max-width: 1080px; margin: 0 auto; padding: 72px 32px; }
  .fg-root .section-eyebrow {
    font-size: 11px; font-weight: 800; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--orange);
    text-align: center; margin-bottom: 10px;
  }
  .fg-root .section-title {
    font-family: 'Lora', serif;
    font-size: clamp(22px, 3.5vw, 30px); font-weight: 700;
    color: var(--dark); text-align: center;
    margin-bottom: 44px; line-height: 1.3;
  }
  .fg-root .section-title em { font-style: italic; color: var(--orange); }

  .fg-root .quotes-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;
  }
  .fg-root .quote-card {
    background: var(--white); border: 1px solid var(--rule);
    border-radius: var(--radius-md); padding: 24px 20px;
    position: relative; overflow: hidden; box-shadow: var(--shadow-sm);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .fg-root .quote-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
  .fg-root .quote-accent {
    position: absolute; top: 0; left: 0; width: 100%; height: 3px;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }
  .fg-root .quote-ch {
    font-size: 10px; font-weight: 800; letter-spacing: 0.15em;
    text-transform: uppercase; margin-bottom: 12px; margin-top: 4px;
  }
  .fg-root .quote-text {
    font-family: 'Lora', serif; font-size: 15px;
    font-style: italic; line-height: 1.7; color: var(--dark);
  }

  .fg-root .dark-section { background: var(--dark); padding: 72px 32px; }
  .fg-root .dark-inner   { max-width: 1080px; margin: 0 auto; }
  .fg-root .dark-section .section-eyebrow { color: var(--orange); }
  .fg-root .dark-section .section-title   { color: #F5EFE6; margin-bottom: 44px; }

  .fg-root .chapters-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px; margin-bottom: 44px;
  }
  .fg-root .ch-card {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    border-radius: var(--radius-md); padding: 18px 16px;
    display: flex; align-items: flex-start; gap: 12px;
    transition: background 0.2s;
  }
  .fg-root .ch-card:hover { background: rgba(255,255,255,0.1); }
  .fg-root .ch-pin  { font-size: 18px; flex-shrink: 0; margin-top: 2px; }
  .fg-root .ch-num  { font-size: 9px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 3px; }
  .fg-root .ch-title { font-size: 13px; font-weight: 700; color: #F5EFE6; line-height: 1.3; margin-bottom: 3px; }
  .fg-root .ch-sub   { font-size: 11px; color: rgba(255,255,255,0.35); }

  .fg-root .gps-cards {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
  }
  @media(max-width: 600px) { .fg-root .gps-cards { grid-template-columns: 1fr; } }
  .fg-root .gps-method-card {
    background: rgba(255,255,255,0.05); border-radius: var(--radius-md);
    padding: 24px 20px; border: 1px solid rgba(255,255,255,0.08);
  }
  .fg-root .gps-big-letter {
    font-family: 'Lora', serif; font-size: 40px; font-weight: 700;
    line-height: 1; margin-bottom: 8px;
  }
  .fg-root .gps-label {
    font-size: 11px; font-weight: 800; letter-spacing: 0.1em;
    text-transform: uppercase; margin-bottom: 8px;
  }
  .fg-root .gps-desc { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.6; }

  .fg-root .author-section {
    max-width: 1080px; margin: 0 auto; padding: 72px 32px;
    display: grid; grid-template-columns: auto 1fr; gap: 44px; align-items: center;
  }
  @media(max-width: 680px) {
    .fg-root .author-section { grid-template-columns: 1fr; text-align: center; }
    .fg-root .author-photo-wrap { margin: 0 auto; }
  }
  .fg-root .author-photo-wrap { position: relative; width: 130px; height: 130px; flex-shrink: 0; }
  .fg-root .author-photo-circle {
    width: 130px; height: 130px; border-radius: 50%;
    border: 4px solid var(--white); box-shadow: var(--shadow-md);
    background: var(--sand-d); overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .fg-root .author-photo-circle img {
    width: 100%; height: 100%;
    object-fit: cover; object-position: center 15%;
    display: block;
  }
  .fg-root .author-photo-ring {
    position: absolute; inset: -6px; border-radius: 50%;
    border: 2px dashed var(--orange); opacity: 0.5;
    animation: fgSpinRing 12s linear infinite;
  }
  @keyframes fgSpinRing { to { transform: rotate(360deg); } }
  .fg-root .author-eyebrow {
    font-size: 10px; font-weight: 800; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 8px;
  }
  .fg-root .author-name  { font-family: 'Lora', serif; font-size: 26px; font-weight: 700; color: var(--dark); margin-bottom: 4px; }
  .fg-root .author-role  { font-size: 14px; color: var(--mid); margin-bottom: 14px; font-weight: 600; }
  .fg-root .author-bio   { font-size: 15px; color: var(--body); line-height: 1.75; max-width: 520px; }

  .fg-root .bottom-cta {
    background: var(--orange); padding: 64px 32px;
    text-align: center; position: relative; overflow: hidden;
  }
  .fg-root .cta-pattern {
    position: absolute; inset: 0;
    background-image:
      radial-gradient(circle at 20% 50%, rgba(255,255,255,0.06) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 40%);
  }
  .fg-root .bottom-cta h2 {
    font-family: 'Lora', serif; font-size: clamp(24px, 4vw, 36px); font-weight: 700;
    color: #fff; margin-bottom: 10px; line-height: 1.25; position: relative;
  }
  .fg-root .bottom-cta > p {
    font-size: 17px; color: rgba(255,255,255,0.85);
    margin-bottom: 32px; font-weight: 500; position: relative;
  }
  .fg-root .bottom-bar {
    display: flex; gap: 10px; justify-content: center;
    max-width: 460px; margin: 0 auto; position: relative;
  }
  @media(max-width: 480px) { .fg-root .bottom-bar { flex-direction: column; } }
  .fg-root .bottom-input {
    flex: 1; padding: 14px 20px; background: #fff;
    border: none; border-radius: 100px;
    font-family: 'Nunito', sans-serif; font-size: 15px; color: var(--dark);
    outline: none; box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  }
  .fg-root .bottom-input::placeholder { color: var(--light); }
  .fg-root .bottom-submit {
    padding: 14px 24px; background: var(--dark); color: #fff;
    border: none; border-radius: 100px;
    font-family: 'Nunito', sans-serif; font-size: 15px; font-weight: 800;
    cursor: pointer; white-space: nowrap;
    transition: background 0.2s, transform 0.1s;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  }
  .fg-root .bottom-submit:hover    { background: #2D2A28; }
  .fg-root .bottom-submit:disabled { opacity: 0.7; cursor: not-allowed; }
  .fg-root .bottom-trust-b {
    font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 12px; position: relative;
  }
  .fg-root .bottom-status {
    max-width: 440px; margin: 12px auto 0;
  }

  .fg-root footer { background: var(--dark); padding: 22px 32px; }
  .fg-root .footer-inner {
    max-width: 1080px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 10px;
  }
  .fg-root .footer-brand {
    display: flex; align-items: center; gap: 8px;
    font-size: 14px; font-weight: 800; color: var(--orange); text-decoration: none;
  }
  .fg-root .footer-links { display: flex; gap: 20px; }
  .fg-root .footer-links a {
    font-size: 12px; color: rgba(255,255,255,0.35);
    text-decoration: none; font-weight: 600; transition: color 0.2s;
  }
  .fg-root .footer-links a:hover { color: var(--orange); }

  @keyframes fgFadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fg-root .anim  { opacity: 0; animation: fgFadeUp 0.6s ease forwards; }
  .fg-root .a1 { animation-delay: 0.05s; }
  .fg-root .a2 { animation-delay: 0.18s; }
  .fg-root .a3 { animation-delay: 0.3s; }
  .fg-root .a4 { animation-delay: 0.44s; }
  .fg-root .a5 { animation-delay: 0.58s; }

  .fg-root .reveal {
    opacity: 0; transform: translateY(20px);
    transition: opacity 0.55s ease, transform 0.55s ease;
  }
  .fg-root .reveal.visible { opacity: 1; transform: translateY(0); }
`;

const QUOTES = [
  { color: '#E8541A', chapter: 'Chapter 2', text: 'The vacation isn\'t actually a vacation anymore. A lot of parents quietly admit: I feel like I\'m running a travelling daycare instead of enjoying the destination.' },
  { color: '#0D9488', chapter: 'Chapter 1', text: 'The trip wasn\'t broken because the kids were difficult. It was broken because I had planned an adult trip and brought children on it.' },
  { color: '#D97706', chapter: 'Chapter 5', text: 'Kids rarely remember the stop adults thought was important. They remember how the day felt.' },
  { color: '#15803D', chapter: 'Chapter 3', text: 'Kids don\'t light up when they\'re told things. They light up when they\'re trying to figure something out.' },
  { color: '#7C3AED', chapter: 'Chapter 4', text: 'If a child is genuinely engaged at a stop, the next stop can wait. An itinerary is a plan, not a contract.' },
  { color: '#E8541A', chapter: 'Chapter 2', text: 'The photo that proves you were at the fort doesn\'t create a memory. The moment that made your kid gasp does.' },
];

const CHAPTERS = [
  { color: '#E8541A', num: 'Chapter 01', title: 'The Trip We Almost Didn\'t Take Again',    sub: 'Jaipur. Hawaii. How this book started.' },
  { color: '#EF4444', num: 'Chapter 02', title: 'Why Family Travel Is Secretly Broken',     sub: 'The hidden tax on every family trip.' },
  { color: '#2DD4BF', num: 'Chapter 03', title: 'What Actually Makes Kids Light Up',        sub: 'Curiosity. Role. Space.' },
  { color: '#A78BFA', num: 'Chapter 04', title: 'The GPS Method',                           sub: 'Get Curious. Play the Stop. Save the Memory.' },
  { color: '#FBB040', num: 'Chapter 05', title: 'Two Families. Two Trips.',                 sub: 'Real moments. Real lessons.' },
  { color: '#60A5FA', num: 'Chapter 06', title: '10 Things to Do This Weekend',             sub: 'Practical. No app required.' },
  { color: '#4ADE80', num: 'Chapter 07', title: 'Why I Built GeoAdventures',               sub: 'The honest founder story.' },
];

const GPS_METHODS = [
  { letter: 'G', color: '#E8541A', label: 'Get Curious',     desc: 'Start three days before you leave. Not with facts — with a question your kids can chase once you arrive.' },
  { letter: 'P', color: '#2DD4BF', label: 'Play the Stop',   desc: 'Give each child a real mission at every stop. Then get out of the way while they run it.' },
  { letter: 'S', color: '#4ADE80', label: 'Save the Memory', desc: 'A five-minute habit at the end of each day. Three questions. One thing they said, written down exactly as they said it.' },
];

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export default function FreeGuide() {
  const [heroEmail,   setHeroEmail]   = useState('');
  const [bottomEmail, setBottomEmail] = useState('');
  const [heroStatus,   setHeroStatus]   = useState<FormStatus>('idle');
  const [bottomStatus, setBottomStatus] = useState<FormStatus>('idle');
  const [heroInputError,   setHeroInputError]   = useState(false);
  const [bottomInputError, setBottomInputError] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.fg-root .reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (
    email: string,
    setStatus: (s: FormStatus) => void,
    setInputError: (v: boolean) => void,
    setEmail: (v: string) => void,
  ) => {
    if (!email || !email.includes('@')) {
      setInputError(true);
      setTimeout(() => setInputError(false), 1500);
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/free-guide/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=Lora:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet" />
      <style>{FREE_GUIDE_CSS}</style>

      <div className="fg-root">
        {/* NAV */}
        <nav>
          <a href="/geoadventures" className="nav-brand">
            <span className="plane">✈️</span>
            Geo<span>Adventures</span>
          </a>
          <a href="/geoadventures?from=explore" className="nav-cta">Try the app →</a>
        </nav>

        {/* HERO */}
        <section style={{ background: 'var(--sand)' }}>
          <div className="hero">
            <div>
              <div className="steps-row anim a1">
                <div className="step-pill active">📖 Free Guide</div>
                <span className="step-arrow">›</span>
                <div className="step-pill inactive">📧 Your Inbox</div>
                <span className="step-arrow">›</span>
                <div className="step-pill inactive">✈️ Better Trips</div>
              </div>

              <div className="hero-eyebrow anim a2">✨ For parents travelling with kids</div>

              <h1 className="hero-title anim a2">
                Why Family Trips<br />Are So Hard
                <em><br />(And What Actually Works)</em>
              </h1>

              <p className="hero-sub anim a3">
                A 40-page guide from a dad who spent 4 trips figuring out
                why family travel keeps failing. Spoiler: it has nothing
                to do with the destination.
              </p>

              <div className="gps-row anim a4">
                <div className="gps-tag"><div className="gps-dot dot-g">G</div>Get Curious</div>
                <div className="gps-tag"><div className="gps-dot dot-p">P</div>Play the Stop</div>
                <div className="gps-tag"><div className="gps-dot dot-s">S</div>Save the Memory</div>
              </div>

              <div className="form-card anim a5">
                <div className="form-title">📬 Where should we send the guide?</div>
                <div className="form-sub">Free. No app required. No subscription.</div>
                <div className="search-bar" style={{ borderColor: heroInputError ? '#EF4444' : undefined }}>
                  <input
                    type="email"
                    placeholder="Search your email address..."
                    autoComplete="email"
                    value={heroEmail}
                    onChange={e => setHeroEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit(heroEmail, setHeroStatus, setHeroInputError, setHeroEmail)}
                    data-testid="input-hero-email"
                  />
                  <button
                    className="search-btn"
                    onClick={() => handleSubmit(heroEmail, setHeroStatus, setHeroInputError, setHeroEmail)}
                    disabled={heroStatus === 'loading'}
                    data-testid="button-hero-submit"
                  >
                    {heroStatus === 'loading' ? 'Sending…' : 'Send it →'}
                  </button>
                </div>
                {heroStatus === 'success' && (
                  <div className="status-msg success" data-testid="status-hero-success">
                    ✓ On its way! Check your inbox in the next few minutes.
                  </div>
                )}
                {heroStatus === 'error' && (
                  <div className="status-msg error">Something went wrong. Please try again.</div>
                )}
                <p className="form-trust">No spam. Unsubscribe any time. Just a guide that took 4 trips to write.</p>
              </div>
            </div>

            {/* Right: Book */}
            <div className="hero-right anim a3">
              <div className="book-scene">
                <div className="book-glow" />
                <div className="book">
                  <div className="book-top-badge">✈️ The GPS Method</div>
                  <div className="book-heading">Why Family Trips Are So Hard</div>
                  <div className="book-sub-text">(And What Actually Works)</div>
                  <div className="book-divider" />
                  <div className="book-gps-mini">
                    <div className="mini-pill mini-g"><span className="mini-letter">G</span><span className="mini-label">Get Curious</span></div>
                    <div className="mini-pill mini-p"><span className="mini-letter">P</span><span className="mini-label">Play Stop</span></div>
                    <div className="mini-pill mini-s"><span className="mini-letter">S</span><span className="mini-label">Save Memory</span></div>
                  </div>
                  <div className="book-author-strip">
                    <strong>Tushar Ambre</strong><br />
                    Founder, GeoAdventures · Father of Avir &amp; Aarit
                  </div>
                </div>
                <div className="floating-badge">40<span>pages</span></div>
                <div className="book-shadow" />
              </div>
            </div>
          </div>
        </section>

        {/* PROOF STRIP */}
        <div className="proof-strip">
          <div className="proof-inner">
            <div className="proof-label">Inside</div>
            <div className="proof-items">
              <div className="proof-item"><span className="proof-pin">📍</span>The GPS Method — fully explained</div>
              <div className="proof-item"><span className="proof-pin">📍</span>7 chapters, ~7,000 words</div>
              <div className="proof-item"><span className="proof-pin">📍</span>10 things to try this weekend</div>
              <div className="proof-item"><span className="proof-pin">📍</span>Real family stories</div>
              <div className="proof-item"><span className="proof-pin">📍</span>No app required</div>
            </div>
          </div>
        </div>

        {/* PULL QUOTES */}
        <section className="section reveal">
          <div className="section-eyebrow">From the guide</div>
          <h2 className="section-title">Lines that make parents say <em>"that's exactly it"</em></h2>
          <div className="quotes-grid">
            {QUOTES.map((q, i) => (
              <div key={i} className="quote-card reveal">
                <div className="quote-accent" style={{ background: q.color }} />
                <div className="quote-ch" style={{ color: q.color }}>{q.chapter}</div>
                <div className="quote-text">"{q.text}"</div>
              </div>
            ))}
          </div>
        </section>

        {/* WHAT'S INSIDE */}
        <section className="dark-section">
          <div className="dark-inner reveal">
            <div className="section-eyebrow">What's inside</div>
            <h2 className="section-title" style={{ fontFamily: "'Lora',serif", fontSize: 'clamp(20px,3.5vw,30px)', fontWeight: 700, color: '#F5EFE6', textAlign: 'center', marginBottom: 44, lineHeight: 1.3 }}>
              Seven chapters. One framework. Immediately useful.
            </h2>
            <div className="chapters-grid">
              {CHAPTERS.map((ch, i) => (
                <div key={i} className="ch-card reveal">
                  <div className="ch-pin">📍</div>
                  <div>
                    <div className="ch-num" style={{ color: ch.color }}>{ch.num}</div>
                    <div className="ch-title">{ch.title}</div>
                    <div className="ch-sub">{ch.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="gps-cards reveal">
              {GPS_METHODS.map((g, i) => (
                <div key={i} className="gps-method-card">
                  <div className="gps-big-letter" style={{ color: g.color }}>{g.letter}</div>
                  <div className="gps-label" style={{ color: g.color }}>{g.label}</div>
                  <div className="gps-desc">{g.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AUTHOR */}
        <section style={{ background: 'var(--sand)' }}>
          <div className="author-section reveal">
            <div className="author-photo-wrap">
              <div className="author-photo-ring" />
              <div className="author-photo-circle">
                <img
                  src="/images/author-tushar.jpg"
                  alt="Tushar Ambre"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            </div>
            <div>
              <div className="author-eyebrow">About the author</div>
              <div className="author-name">Tushar Ambre</div>
              <div className="author-role">Founder, GeoAdventures · Father of Avir (7) &amp; Aarit (4)</div>
              <p className="author-bio">
                I'm not a parenting expert or a travel writer. I'm a founder who built
                a product because I couldn't find what I needed, and a dad who spent
                three years testing ideas about family travel on my own kids. Avir wants to
                be a paleontologist. Aarit treats every "do not touch" sign as a personal
                challenge. This book is what I learned from them.
              </p>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="bottom-cta">
          <div className="cta-pattern" />
          <h2>Ready for a trip<br />they'll actually remember?</h2>
          <p>Get the free guide. Try three things. See what happens.</p>
          <div className="bottom-bar">
            <input
              className="bottom-input"
              type="email"
              placeholder="your@email.com"
              autoComplete="email"
              value={bottomEmail}
              onChange={e => setBottomEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit(bottomEmail, setBottomStatus, setBottomInputError, setBottomEmail)}
              style={{ borderColor: bottomInputError ? '#EF4444' : undefined }}
              data-testid="input-bottom-email"
            />
            <button
              className="bottom-submit"
              onClick={() => handleSubmit(bottomEmail, setBottomStatus, setBottomInputError, setBottomEmail)}
              disabled={bottomStatus === 'loading'}
              data-testid="button-bottom-submit"
            >
              {bottomStatus === 'loading' ? 'Sending…' : 'Send me the guide →'}
            </button>
          </div>
          {bottomStatus === 'success' && (
            <div className="status-msg success bottom-status" data-testid="status-bottom-success">
              ✓ Check your inbox — the guide is on its way.
            </div>
          )}
          {bottomStatus === 'error' && (
            <div className="status-msg error bottom-status">Something went wrong. Please try again.</div>
          )}
          <p className="bottom-trust-b">No spam. No subscription. Just the guide, delivered immediately.</p>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="footer-inner">
            <a href="/geoadventures" className="footer-brand">✈️ GeoAdventures</a>
            <div className="footer-links">
              <a href="/geoadventures-landing">About the App</a>
              <a href="/geoadventures?from=explore">Try GeoAdventures</a>
              <a href="https://geoquestgame.com">GeoQuest Game</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
