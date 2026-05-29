import { storage } from "./storage";
import { sendEmail } from "./email";

const BASE_URL = "https://geoquestgame.live";

export function emailShell(body: string, unsubscribeUrl?: string): string {
  const unsubLine = unsubscribeUrl
    ? `To stop receiving these emails, <a href="${unsubscribeUrl}" style="color:#A8A29E;text-decoration:underline;">unsubscribe from this sequence</a>.`
    : 'To stop receiving these emails, reply with "unsubscribe".';

  return `
    <div style="max-width:600px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.75;color:#1C1917;background:#ffffff;padding:40px 32px;">
      ${body}
      <hr style="border:none;border-top:1px solid #E5DDD0;margin:40px 0 24px;" />
      <p style="font-size:11px;color:#A8A29E;line-height:1.6;font-family:Arial,sans-serif;">
        You're receiving this because you downloaded the GPS Method guide at
        <a href="${BASE_URL}/free-guide" style="color:#E8541A;text-decoration:none;">geoquestgame.live/free-guide</a>.
        No spam — ever. ${unsubLine}
      </p>
    </div>
  `.trim();
}

function p(text: string): string {
  return `<p style="margin:0 0 20px;">${text}</p>`;
}

function rule(): string {
  return `<hr style="border:none;border-top:1px solid #E5DDD0;margin:28px 0;" />`;
}

function blockquote(text: string): string {
  return `<blockquote style="border-left:3px solid #E8541A;margin:28px 0;padding:4px 20px;font-style:italic;color:#44403C;">${text}</blockquote>`;
}

function link(href: string, label: string): string {
  return `<a href="${href}" style="color:#E8541A;font-weight:700;text-decoration:none;">&rarr; ${label}</a>`;
}

function sign(ps?: string): string {
  return `
    ${p("&mdash; Tushar<br><span style='font-size:13px;color:#78716C;font-family:Arial,sans-serif;'>Founder, GeoAdventures &middot; Father of Avir &amp; Aarit</span>")}
    ${ps ? `<p style="margin:24px 0 0;font-size:14px;color:#78716C;font-family:Arial,sans-serif;"><strong>P.S.</strong> &mdash; ${ps}</p>` : ""}
  `.trim();
}

// ── EMAIL 2 — Day 3 — Value ───────────────────────────────────────────────────
function buildEmail2Html(unsubscribeUrl?: string): string {
  return emailShell(`
    ${p("Hi,")}
    ${p("Quick one today.")}
    ${p("The most common complaint I hear from parents about family travel isn&rsquo;t &ldquo;the kids were bored&rdquo; or &ldquo;the destination was wrong&rdquo;.")}
    ${p("It's this:")}
    ${blockquote("The vacation isn&rsquo;t actually a vacation anymore.")}
    ${p("And when I dig into what went wrong, it&rsquo;s almost never the destination. It&rsquo;s almost always pacing.")}
    ${p("Here&rsquo;s the thing nobody puts in the travel guide:")}
    ${p("A day optimised for things to see is completely different from a day optimised for energy. Kids don&rsquo;t have the same stamina for &ldquo;remarkable&rdquo; that adults do. They burn out faster, bottom out harder, and recover slower &mdash; especially away from home.")}
    ${rule()}
    ${p("The fix is small:")}
    ${p("Cut one thing from tomorrow&rsquo;s itinerary tonight. Not the best thing &mdash; the &ldquo;should-see&rdquo; thing. The one you added because it seemed like you should.")}
    ${p("Use that time as buffer. For the stop that runs long because your kids are actually engaged. For the moment that wasn&rsquo;t in the plan.")}
    ${p("<em>The best moments on family trips almost never come from the itinerary. They come from the space around it.</em>")}
    ${rule()}
    ${p("That&rsquo;s it. One idea. Try it on the next trip.")}
    ${sign("Did you try the bedtime question from my last email? I&rsquo;m genuinely curious what your kids said. Hit reply &mdash; I read every one.")}
  `, unsubscribeUrl);
}

const EMAIL_2_SUBJECT = "The thing that ruins most family trips (it's not the destination)";

// ── EMAIL 3 — Day 7 — Bridge ──────────────────────────────────────────────────
function buildEmail3Html(unsubscribeUrl?: string): string {
  return emailShell(`
    ${p("Hi,")}
    ${p("The week before we flew to Hawaii, I spent three evenings doing research.")}
    ${p("Not trip logistics. Not hotel bookings. I made my wife Sonal watch a YouTube documentary about Kilauea with me, because my son Avir, who was almost seven, had become obsessed with volcanoes. Fossils. Cloud forests. Ocean depths.")}
    ${p("That research took longer than booking the flights had.")}
    ${p("And I kept thinking: there are millions of parents willing to do this. Caring enough to try. But spending hours on it anyway, because nothing exists to help.")}
    ${p("So I built the thing I couldn&rsquo;t find.")}
    ${rule()}
    ${p("<strong>GeoAdventures is the GPS Method in app form.</strong>")}
    ${p("Before your trip, it learns about your kids &mdash; their ages, interests, what makes them lean in. It does the midnight research for you.")}
    ${p("At each stop, it gives kids a mission and gets out of the way. It doesn&rsquo;t ask you to stare at a screen. It gives your child something real to do, then hands the moment back to you.")}
    ${p("After each stop, it captures what your kids said and discovered &mdash; building something that&rsquo;s part memory book, part field journal. Something they&rsquo;ll actually want to look back at.")}
    ${rule()}
    ${p("The first trip is free. No credit card.")}
    ${p(link(`${BASE_URL}/geoadventures?from=guide-email3`, `${BASE_URL}/geoadventures?from=guide-email3`))}
    ${p("Set up takes 2 minutes. Tell us your kids&rsquo; ages and what they&rsquo;re into. We&rsquo;ll build your first trip plan.")}
    ${p("If it doesn&rsquo;t change something about how your kids show up at the first stop, you don&rsquo;t owe us anything.")}
    ${sign("You don&rsquo;t need the app to have better trips. Everything in the guide works without it. But if you want to stop doing the midnight research yourself &mdash; this is what I built.")}
  `, unsubscribeUrl);
}

const EMAIL_3_SUBJECT = "Why I spent 3 evenings researching volcanoes at midnight";

// ── EMAIL 4 — Day 14 — Listen ─────────────────────────────────────────────────
function buildEmail4Html(unsubscribeUrl?: string): string {
  return emailShell(`
    ${p("Hi,")}
    ${p("Short one today.")}
    ${p("If you&rsquo;ve had a trip since you got the guide &mdash; how did it go?")}
    ${p("Did you try any of the GPS stuff? What worked? What fell apart? Did your kids surprise you with something you weren&rsquo;t expecting?")}
    ${p("I&rsquo;m asking because the guide is still evolving, and the stories parents send back are how I make it better.")}
    ${p("<em>That&rsquo;s the kind of thing I built this for.</em>")}
    ${rule()}
    ${p("If you have a moment, hit reply and tell me one thing from your last trip &mdash; something that worked, or something that spectacularly didn&rsquo;t.")}
    ${p("I read every reply.")}
    ${sign("If you haven&rsquo;t had a trip yet but you&rsquo;re planning one, reply with where you&rsquo;re going. I&rsquo;ll send you a few specific things to try for that destination.")}
  `, unsubscribeUrl);
}

const EMAIL_4_SUBJECT = "How did the trip go?";

// ── EMAIL 5 — Day 21 — Convert (personalised) ────────────────────────────────
function buildEmail5Html(promoCode: string | null, unsubscribeUrl?: string): string {
  const ctaUrl = promoCode
    ? `${BASE_URL}/geoadventures?code=${promoCode}&from=guide-email5`
    : `${BASE_URL}/geoadventures?from=guide-email5`;

  const ctaLabel = promoCode
    ? `Claim your free trip: geoquestgame.live/geoadventures?code=${promoCode}`
    : `Try your first trip free: geoquestgame.live/geoadventures`;

  return emailShell(`
    ${p("Hi,")}
    ${p("Quick note.")}
    ${promoCode
      ? p(`I&rsquo;ve set up a free trip for you. The link below applies it automatically &mdash; no payment screen, no credit card. <strong>This link is personal to you.</strong>`)
      : p("If you downloaded the guide but haven&rsquo;t tried GeoAdventures yet, I want to remove the last remaining excuse.")}
    ${p("<strong>One full trip, completely free. No credit card. No time limit on that trip.</strong>")}
    ${rule()}
    ${p("Here&rsquo;s what it actually does in practice:")}
    ${p("You tell us where you&rsquo;re going and something about your kids &mdash; what they&rsquo;re into, how old they are, what makes them curious. We build a trip plan around that.")}
    ${p("At each stop, they get a mission. Something real to do, not just something to look at.")}
    ${p("After the trip, you get a memory book &mdash; what they said, what they found, what surprised them.")}
    ${p("That&rsquo;s it. The GPS Method, built for your specific family.")}
    ${rule()}
    ${p(link(ctaUrl, ctaLabel))}
    ${p("If you do try it &mdash; reply and tell me how it went. I want to know.")}
    ${sign("The families who get the most out of GeoAdventures are the ones who&rsquo;ve already been doing this manually &mdash; the bedtime questions, the missions, the end-of-day memory habit. If that&rsquo;s you, the app just does the heavy lifting.")}
  `, unsubscribeUrl);
}

const EMAIL_5_SUBJECT = "One trip. Free. No catch.";

async function processGuideEmails(): Promise<void> {
  try {
    const pending = await storage.getPendingGuideEmails();
    if (pending.length === 0) return;

    console.log(`[GuideEmail] Processing ${pending.length} pending drip email(s)`);

    for (const schedule of pending) {
      try {
        // ── Email 5: conversion check — skip for paying customers ──────────────
        if (schedule.emailNum === 5) {
          const converted = await storage.guideSubscriberHasConverted(schedule.email);
          if (converted) {
            await storage.markGuideEmailSent(schedule.id);
            console.log(`[GuideEmail] Skipping Email 5 for ${schedule.email} — already converted`);
            continue;
          }
        }

        // ── Build unsubscribe URL ───────────────────────────────────────────────
        const subscriber = await storage.getGuideSubscriber(schedule.email);
        const unsubscribeUrl = subscriber?.unsubscribeToken
          ? `${BASE_URL}/api/free-guide/unsubscribe?email=${encodeURIComponent(schedule.email)}&token=${subscriber.unsubscribeToken}`
          : undefined;

        // ── Build HTML ──────────────────────────────────────────────────────────
        let subject: string;
        let html: string;

        if (schedule.emailNum === 5) {
          subject = EMAIL_5_SUBJECT;
          html = buildEmail5Html(schedule.promoCode ?? null, unsubscribeUrl);
        } else {
          const builders: Record<number, { subject: string; buildHtml: (u?: string) => string }> = {
            2: { subject: EMAIL_2_SUBJECT, buildHtml: buildEmail2Html },
            3: { subject: EMAIL_3_SUBJECT, buildHtml: buildEmail3Html },
            4: { subject: EMAIL_4_SUBJECT, buildHtml: buildEmail4Html },
          };
          const template = builders[schedule.emailNum];
          if (!template) {
            console.error(`[GuideEmail] Unknown email number ${schedule.emailNum} — marking sent`);
            await storage.markGuideEmailSent(schedule.id);
            continue;
          }
          subject = template.subject;
          html = template.buildHtml(unsubscribeUrl);
        }

        const sent = await sendEmail({ to: schedule.email, subject, html });

        if (sent) {
          await storage.markGuideEmailSent(schedule.id);
          console.log(`[GuideEmail] Sent Email ${schedule.emailNum} to ${schedule.email}${schedule.emailNum === 5 && schedule.promoCode ? ` (code: ${schedule.promoCode})` : ''}`);
        } else {
          console.error(`[GuideEmail] Failed to send Email ${schedule.emailNum} to ${schedule.email}`);
        }
      } catch (err: any) {
        console.error(`[GuideEmail] Error sending Email ${schedule.emailNum} to ${schedule.email}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[GuideEmail] Scheduler error:", err.message);
  }
}

export function scheduleGuideEmails(): void {
  const MS_PER_HOUR = 60 * 60 * 1000;

  const runAt10Am = () => {
    const now = new Date();
    const next10am = new Date(now);
    next10am.setHours(10, 0, 0, 0);
    if (next10am <= now) next10am.setDate(next10am.getDate() + 1);
    const msUntil = next10am.getTime() - now.getTime();
    console.log(`[GuideEmail] Scheduling next drip run for ${next10am.toISOString()} (10am)`);
    setTimeout(() => {
      processGuideEmails();
      setInterval(processGuideEmails, 24 * MS_PER_HOUR);
    }, msUntil);
  };

  runAt10Am();
}
