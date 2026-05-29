import { useLocation } from "wouter";

export default function TermsOfService() {
  const [, setLocation] = useLocation();

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#F5F2EE", color: "#1A1F2E", minHeight: "100vh", lineHeight: 1.7, WebkitFontSmoothing: "antialiased" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(26,31,46,0.10)", background: "#F5F2EE" }}>
        <a href="/" style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: "#E8692A", textDecoration: "none" }}>RoamUs</a>
        <a href="/" onClick={(e) => { e.preventDefault(); if (window.history.length > 1) { window.history.back(); } else { setLocation("/"); } }} style={{ fontSize: 14, color: "#8A8FA8", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>← Back to home</a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 80px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".15em", color: "#E8692A", textTransform: "uppercase", marginBottom: 12 }}>Legal</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 38, fontWeight: 700, letterSpacing: "-.8px", marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: "#8A8FA8", marginBottom: 48 }}>Last updated: January 1, 2026 · Entity: GeoQuest Games LLC</p>

        <Section title="1. Acceptance of Terms">
          <p>By downloading, installing, or using the RoamUs mobile application or related services (the "Services"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Services.</p>
          <p>Parents or legal guardians are responsible for approving, supervising, and managing their family's use of RoamUs at all times, including use by children.</p>
          <div style={highlightStyle}>
            <p style={{ margin: 0, fontSize: 14 }}><strong>RoamUs is a family travel companion app.</strong> It helps families plan trips, execute days at a destination, engage children at each stop, and capture memories. It is not a navigation service, safety tool, or emergency resource.</p>
          </div>
        </Section>

        <Section title="2. Eligibility and Accounts">
          <ul style={ulStyle}>
            <li>A parent or legal guardian must create and manage the account</li>
            <li>You must be at least 18 years old to create an account</li>
            <li>Children may use RoamUs only through a parent-managed profile</li>
            <li>Children are not permitted to create accounts independently</li>
            <li>RoamUs is intended for personal, family, non-commercial use</li>
            <li>You may not share your account with other families</li>
          </ul>
        </Section>

        <Section title="3. Account Responsibilities">
          <p>As the account holder, you agree to:</p>
          <ul style={ulStyle}>
            <li>Provide accurate registration information</li>
            <li>Keep your login credentials secure and confidential</li>
            <li>Supervise your children's use of the app</li>
            <li>Notify us immediately of any unauthorized access at <a href="mailto:hello@roamus.app" style={linkStyle}>hello@roamus.app</a></li>
          </ul>
          <p>You are responsible for all activity that occurs under your account.</p>
        </Section>

        <Section title="4. Description of Services">
          <p>RoamUs provides the following core experiences:</p>
          <h3 style={h3Style}>Build (Trip Planning)</h3>
          <p>Create trip itineraries by entering your destination, travel dates, party composition, and preferences. RoamUs uses AI to generate stop recommendations and a structured day-by-day plan.</p>
          <h3 style={h3Style}>Run (Trip Execution)</h3>
          <p>During your trip, RoamUs guides your family through each stop — providing context, timing, navigation links, and suggested activities. This is the core paid feature.</p>
          <h3 style={h3Style}>Engage (Kids Layer)</h3>
          <p>At each stop, children can participate in age-appropriate missions, challenges, and games. Mission responses are stored privately within your family account.</p>
          <h3 style={h3Style}>Remember (Memories)</h3>
          <p>After a trip, RoamUs generates an auto-story combining your photos, moments, and route. This is stored privately in your account and can be shared at your discretion.</p>
        </Section>

        <Section title="5. Subscription, Payment, and Refunds">
          <h3 style={h3Style}>Free tier</h3>
          <p>All users have access to a free tier allowing limited trip planning and a Day 1 preview. No payment is required for free features.</p>
          <h3 style={h3Style}>GeoPass Monthly Subscription</h3>
          <p>At $4.99/month (US) or regional equivalent, GeoPass unlocks the full RoamUs experience for your entire family with no per-trip fees. Subscription is billed monthly and renews automatically until cancelled.</p>
          <h3 style={h3Style}>Trip Pack (One-Time Purchase)</h3>
          <p>At $9.99/trip (US) or regional equivalent, Trip Packs unlock one complete trip. There is no expiry on a purchased trip.</p>
          <h3 style={h3Style}>Billing, cancellation, and refunds</h3>
          <ul style={ulStyle}>
            <li>Payments are processed by Stripe (web) or Apple In-App Purchase (iOS App Store)</li>
            <li>Subscriptions can be cancelled at any time — you retain access until the end of the paid period</li>
            <li>We do not offer refunds for partial subscription periods, except where required by law</li>
            <li>For App Store purchases, Apple's refund policy applies</li>
            <li>We reserve the right to change pricing with 30 days' notice to existing subscribers</li>
          </ul>
        </Section>

        <Section title="6. License to Use">
          <p>We grant you a limited, non-exclusive, non-transferable, revocable license to download and use RoamUs for personal, family, non-commercial purposes in accordance with these Terms.</p>
          <p>You may not:</p>
          <ul style={ulStyle}>
            <li>Copy, reproduce, or redistribute RoamUs content or code</li>
            <li>Create derivative works based on RoamUs materials</li>
            <li>Use content for commercial purposes</li>
            <li>Reverse engineer, scrape, or extract assets or systems</li>
            <li>Attempt to bypass subscription locks or access controls</li>
            <li>Use RoamUs to build competing products or services</li>
          </ul>
        </Section>

        <Section title="7. Intellectual Property">
          <p>All content and materials in RoamUs — including trip itinerary frameworks, stop recommendation systems, mission content, UI/UX designs, the memory generation system, educational frameworks, and code — are the exclusive property of GeoQuest Games LLC.</p>
          <p>No ownership rights are transferred to users. A limited license is granted solely for use within the RoamUs app.</p>
          <h3 style={h3Style}>AI-generated content</h3>
          <p>Some stop descriptions, trip narratives, mission content, and images may be created or enhanced using AI tools (including OpenAI). Regardless of the tools used, all final outputs and compilations within RoamUs are the property of GeoQuest Games LLC. AI assistance does not create any copyright or ownership claims by users.</p>
          <h3 style={h3Style}>User-generated content</h3>
          <p>Photos and notes you add to your trips remain your property. By uploading photos to RoamUs, you grant us a limited license to store and display them within your account and in your generated trip stories. We do not use your photos for any other purpose, and we do not share them with third parties.</p>
        </Section>

        <Section title="8. Real-World Activities and Safety">
          <div style={warningStyle}>
            <p style={{ margin: 0, fontSize: 14 }}><strong>Important:</strong> RoamUs is a travel companion, not a safety or navigation service. RoamUs content is educational and experiential in nature and must not be relied upon for real-world safety decisions.</p>
          </div>
          <p>Parents and guardians are solely responsible for:</p>
          <ul style={ulStyle}>
            <li>Their children's physical safety at all times</li>
            <li>All travel decisions, including transportation and accommodation</li>
            <li>Supervising children at stops and attractions</li>
            <li>Ensuring activities are appropriate for their family</li>
            <li>Following all local rules, regulations, and venue requirements</li>
          </ul>
          <p>RoamUs stop information (hours, addresses, activities) is AI-generated and may not be current. Always verify critical information (hours, access, pricing) before visiting a stop.</p>
        </Section>

        <Section title="9. Location Services and Push Notifications">
          <p>RoamUs requests access to location services and push notifications to deliver the core experience. These permissions are optional — the app can be used without them, though certain features will be unavailable.</p>
          <p>You can manage these permissions at any time in your device settings. Granting these permissions does not affect your subscription status.</p>
        </Section>

        <Section title="10. Offline Access">
          <p>RoamUs caches trip data locally on your device to enable offline use during travel. Cached data remains on your device until you clear it or delete the app. We are not responsible for data loss due to device failure, app deletion, or operating system changes.</p>
        </Section>

        <Section title="11. Prohibited Conduct">
          <p>Users may not:</p>
          <ul style={ulStyle}>
            <li>Attempt to access other users' accounts or data</li>
            <li>Bypass subscription locks or access controls</li>
            <li>Upload harmful, unlawful, or offensive content</li>
            <li>Use RoamUs to harass, threaten, or harm others</li>
            <li>Interfere with system integrity or performance</li>
            <li>Misrepresent yourself or provide false registration information</li>
            <li>Use the app for any commercial or resale purpose</li>
          </ul>
          <p>Violations may result in immediate suspension or termination of your account without refund.</p>
        </Section>

        <Section title="12. Virtual Items and Rewards">
          <p>All in-app rewards, XP points, explorer achievements, missions completed, and progress indicators are virtual items with no monetary value. They cannot be redeemed for cash, transferred to other accounts, or exchanged outside the platform.</p>
        </Section>

        <Section title="13. Third-Party Services">
          <p>RoamUs integrates with third-party services including Stripe (payments), OpenAI (content generation), and Google Analytics (analytics). Use of these services is subject to their respective terms and privacy policies. RoamUs is not responsible for third-party service outages or changes.</p>
          <p>Navigation links within the app may open Apple Maps, Google Maps, or other mapping services. Use of those services is subject to their terms.</p>
        </Section>

        <Section title="14. Disclaimer of Warranties">
          <p>RoamUs is provided "as is" and "as available." We do not guarantee:</p>
          <ul style={ulStyle}>
            <li>Continuous or uninterrupted service (particularly in areas with limited connectivity)</li>
            <li>Accuracy or currency of stop information, hours, or pricing</li>
            <li>Compatibility with all devices or operating system versions</li>
            <li>That AI-generated content will be accurate, complete, or appropriate for all families</li>
          </ul>
        </Section>

        <Section title="15. Limitation of Liability">
          <p>To the fullest extent permitted by law, GeoQuest Games LLC is not liable for:</p>
          <ul style={ulStyle}>
            <li>Physical harm, accidents, or injuries during travel or at stops</li>
            <li>Inaccurate stop information or navigation errors</li>
            <li>Data loss or service interruptions</li>
            <li>Unauthorized account access due to compromised credentials</li>
            <li>Indirect, incidental, or consequential damages of any kind</li>
          </ul>
          <p>Maximum liability is limited to fees paid to RoamUs in the previous 12 months.</p>
        </Section>

        <Section title="16. Termination">
          <p>RoamUs may suspend or terminate accounts that violate these Terms, pose legal or safety risks, or engage in fraudulent activity. We will provide notice where reasonably possible.</p>
          <p>Parents may delete their account and all associated data at any time through the app or by contacting <a href="mailto:hello@roamus.app" style={linkStyle}>hello@roamus.app</a>. Deletion is permanent and cannot be undone.</p>
        </Section>

        <Section title="17. Changes to Terms">
          <p>We may update these Terms from time to time. We will notify you of material changes via the app or email at least 14 days before they take effect. Continued use of RoamUs after that date constitutes acceptance.</p>
        </Section>

        <Section title="18. Governing Law">
          <p>These Terms are governed by the laws of the United States and the State of Delaware, without regard to conflict-of-law principles. Any disputes shall be resolved in the courts of Delaware.</p>
        </Section>

        <Section title="19. Contact">
          <p>RoamUs (a product of GeoQuest Games LLC)<br />
          Email: <a href="mailto:hello@roamus.app" style={linkStyle}>hello@roamus.app</a><br />
          Legal: <a href="mailto:legal@roamus.app" style={linkStyle}>legal@roamus.app</a></p>
        </Section>

        <p style={{ marginTop: 48, fontSize: 13, color: "#8A8FA8" }}>© 2026 GeoQuest Games LLC. All rights reserved. RoamUs and the RoamUs logo are trademarks of GeoQuest Games LLC.</p>
      </div>
    </div>
  );
}

const h3Style: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: "#1A1F2E", margin: "24px 0 10px" };
const ulStyle: React.CSSProperties = { paddingLeft: 20, marginBottom: 14 };
const linkStyle: React.CSSProperties = { color: "#E8692A", textDecoration: "none" };
const highlightStyle: React.CSSProperties = { background: "rgba(232,105,42,.08)", borderLeft: "3px solid #E8692A", borderRadius: "0 8px 8px 0", padding: "16px 20px", margin: "24px 0" };
const warningStyle: React.CSSProperties = { background: "rgba(26,31,46,.04)", borderRadius: 12, padding: "20px 24px", margin: "20px 0" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1A1F2E", margin: "40px 0 14px", paddingTop: 12, borderTop: "1px solid rgba(26,31,46,0.10)" }}>{title}</h2>
      <div style={{ fontSize: 15, color: "#3d4255" }}>{children}</div>
    </div>
  );
}
