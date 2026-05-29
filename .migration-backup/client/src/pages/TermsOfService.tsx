import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ExternalLink } from "@/components/ParentalGate";
import { useLocation } from "wouter";

export default function TermsOfService() {
  const [, setLocation] = useLocation();
  
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/50"
            data-testid="button-back-terms"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-heading text-blue-800 dark:text-blue-300 mb-2">
            GeoQuest Game — Terms of Service
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-2">Last Updated: January 1st, 2026</p>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Entity: GeoQuest Games LLC</p>

          <div className="prose prose-blue dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
            
            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the GeoQuest website, web app, or related services (the "Services"), you agree to these Terms of Service ("Terms").
            </p>
            <p>
              If you do not agree to these Terms, do not use the Services.
            </p>
            <p>
              Parents or legal guardians are responsible for approving, supervising, and managing their child's use of GeoQuest at all times.
            </p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">1.1 Service Definitions</h2>
            <p>GeoQuest provides two types of experiences:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>GeoGames</strong> – At-home, screen-based educational games designed for play without real-world location dependency.</li>
              <li><strong>GeoAdventures</strong> – Optional travel-enhanced experiences that may reference real-world locations (such as cities, regions, or landmarks) to unlock educational content.</li>
            </ul>
            <p>Both GeoGames and GeoAdventures are part of the GeoQuest Services and are intended for use under parental supervision.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">2. Eligibility</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>A parent or legal guardian must create and manage the account.</li>
              <li>Children may use the Services only through a parent-managed profile.</li>
              <li>Children are not permitted to create accounts independently.</li>
              <li>GeoQuest is intended for personal, non-commercial, educational use only.</li>
            </ul>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">3. Account Responsibilities</h2>
            <p>Parents agree to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide accurate registration information</li>
              <li>Maintain the security of login credentials</li>
              <li>Supervise their child's use of the Services</li>
              <li>Monitor content sharing actions</li>
              <li>Notify GeoQuest of unauthorized access or security concerns</li>
            </ul>
            <p>Parents are responsible for all activity that occurs under their account.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">4. License to Use the Services</h2>
            <p>
              GeoQuest grants a limited, non-exclusive, non-transferable, revocable license to access and use the Services for personal, educational, non-commercial purposes.
            </p>
            <p className="font-semibold">You may not:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Copy, reproduce, or redistribute GeoQuest content</li>
              <li>Create derivative works based on GeoQuest materials</li>
              <li>Use content for commercial purposes</li>
              <li>Reverse engineer, scrape, or extract assets or systems</li>
              <li>Attempt to bypass parental locks or security features</li>
            </ul>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">5. Ownership of GeoQuest Content</h2>
            <p>
              All content and materials provided through GeoQuest — including but not limited to maps, missions, adventures, characters, artwork, UI/UX designs, game mechanics, educational frameworks, GeoArt tools, and code — are the exclusive property of GeoQuest Games LLC.
            </p>
            <p>No ownership rights are transferred to users.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">6. GeoArt Feature & Parent-Locked Sharing</h2>
            <p>
              GeoArt allows children to draw, color, and create artwork within the GeoQuest platform.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>All GeoArt creations are private by default</li>
              <li>Children cannot publish, export, or share content</li>
              <li>Sharing is disabled within child gameplay flows</li>
              <li>Only parents may initiate sharing actions</li>
              <li>All sharing actions are protected by parental locks</li>
              <li>Shared content includes only the image and no personal data</li>
            </ul>
            <p>
              When a parent chooses to share a GeoArt creation externally, the content is shared through the parent's selected third-party platform (such as Instagram, Facebook, or Twitter/X) and is governed by that platform's terms and privacy policies.
            </p>
            <p>Parents assume full responsibility for any content they choose to share outside the GeoQuest platform.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">6.1 GeoAdventures & Real-World Activities</h2>
            <p>GeoQuest does not provide travel guidance, navigation services, supervision, or safety instructions.</p>
            <p className="font-semibold">Parents and guardians are solely responsible for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>A child's supervision</li>
              <li>Travel decisions</li>
              <li>Physical safety during GeoAdventures</li>
            </ul>
            <p>GeoQuest content is educational and exploratory in nature and must not be relied upon for real-world safety decisions.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">6.2 Virtual Rewards</h2>
            <p>
              All in-game rewards, stars, passports, achievements, collectibles, and progress indicators are virtual items with no monetary value.
            </p>
            <p>They cannot be redeemed for cash, transferred, or exchanged outside the platform.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">7. Prohibited Conduct</h2>
            <p className="font-semibold">Users may not:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Attempt to access other users' accounts</li>
              <li>Bypass parental locks or security controls</li>
              <li>Upload harmful, unlawful, or offensive content</li>
              <li>Interfere with system integrity or performance</li>
              <li>Copy, extract, or reuse proprietary content</li>
              <li>Use GeoQuest to build competing products</li>
              <li>Attempt to enable unauthorized sharing or social interaction</li>
            </ul>
            <p>Violations may result in suspension or termination of accounts.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">8. Third-Party Services</h2>
            <p>
              GeoQuest may use trusted third-party services (such as Google Analytics) to monitor performance and improve functionality.
            </p>
            <p>If advertising services are introduced:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>These Terms will be updated</li>
              <li>Personalized advertising will be disabled for child users</li>
              <li>Parental notices and consent will be provided as required by law</li>
            </ul>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">9. Disclaimer of Warranties</h2>
            <p>GeoQuest is provided "as is" and "as available."</p>
            <p className="font-semibold">We do not guarantee:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Continuous or uninterrupted service</li>
              <li>Error-free operation</li>
              <li>Compatibility with all devices</li>
              <li>Specific educational outcomes</li>
            </ul>
            <p>GeoQuest is intended to support curiosity, learning, and exploration. Educational outcomes may vary.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">10. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, GeoQuest Games LLC is not liable for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Data loss</li>
              <li>Service interruptions</li>
              <li>Unauthorized access due to compromised credentials</li>
              <li>Indirect, incidental, or consequential damages</li>
            </ul>
            <p>Maximum liability is limited to any fees paid to GeoQuest in the previous 12 months (typically $0 for free users).</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">11. Termination</h2>
            <p>GeoQuest may suspend or terminate accounts that:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Violate these Terms</li>
              <li>Attempt to bypass security or parental controls</li>
              <li>Pose legal, safety, or operational risks</li>
            </ul>
            <p>Parents may delete their account and associated child profiles at any time.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the United States and the State of Delaware, without regard to conflict-of-law principles.
            </p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">13. Intellectual Property Rights</h2>
            <p>
              All GeoQuest content — including maps, missions, adventures, characters, artwork, UI/UX design, tools, systems, educational content, and game mechanics — is the exclusive property of GeoQuest Games LLC.
            </p>
            <p className="font-semibold">Users may not:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Copy or duplicate content</li>
              <li>Create derivative works</li>
              <li>Distribute or publish GeoQuest materials</li>
              <li>Modify, extract, or reuse assets</li>
              <li>Build competing educational or gaming products</li>
            </ul>
            <p>A limited license is granted solely for use within the GeoQuest platform.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">14. AI-Assisted Content Clause</h2>
            <p>
              Some maps, images, characters, artwork, or system-generated elements may be created or enhanced using AI-assisted tools.
            </p>
            <p>Regardless of the tools used:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>All final outputs and compilations are the exclusive property of GeoQuest Games LLC</li>
              <li>No rights are granted to copy, redistribute, adapt, or commercialize content</li>
              <li>Use of AI tools does not diminish GeoQuest's intellectual property rights</li>
            </ul>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">15. Contact Information</h2>
            <p>
              <strong>GeoQuest Games LLC</strong>
            </p>
            <p>
              Email: <ExternalLink href="mailto:support@geoquestgame.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@geoquestgame.com</ExternalLink>
            </p>

          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>© 2026 GeoQuest Games LLC. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
