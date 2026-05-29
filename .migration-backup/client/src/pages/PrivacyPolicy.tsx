import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ExternalLink } from "@/components/ParentalGate";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
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
            data-testid="button-back-privacy"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-heading text-blue-800 dark:text-blue-300 mb-2">
            GeoQuest Game — Privacy Policy
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Last Updated: January 1st, 2026</p>

          <div className="prose prose-blue dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
            
            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">1. Overview</h2>
            <p>
              This Privacy Policy explains how GeoQuest Games LLC ("GeoQuest," "we," "our") collects, uses, and protects personal information when parents and children use our services (the "Services").
            </p>
            <p>
              GeoQuest is designed for families and children. We comply with the Children's Online Privacy Protection Act (COPPA) and are committed to transparent, parent-friendly data practices. Parents are always in control of their child's account and information.
            </p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">1.1 GeoGames and GeoAdventures</h2>
            <p>GeoQuest offers two types of experiences:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>GeoGames</strong> – At-home, screen-based educational games that do not rely on real-world location.</li>
              <li><strong>GeoAdventures</strong> – Optional travel-enhanced experiences that may reference a general place (such as a city, region, or landmark) to unlock educational content.</li>
            </ul>
            <p>GeoAdventures are designed to be used under parental supervision and do not require continuous location tracking.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">2. Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4">Information collected from parents</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Email address</li>
              <li>Password (encrypted)</li>
              <li>Parent name (optional)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4">Information collected about children (entered by parents only)</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Child's first name</li>
              <li>Child's age or age range</li>
              <li>Profile avatar or animal character</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4">Information created during gameplay</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Gameplay progress</li>
              <li>Completed missions and adventures</li>
              <li>Achievements, stars, passports, and learning milestones</li>
              <li>GeoArt creations (stored privately within the account)</li>
            </ul>
            <p>Children cannot submit, publish, or share content without parental approval protected by parental locks.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">Location Information (GeoAdventures)</h2>
            <p>GeoQuest may use approximate or manually selected location information (such as a city or region chosen by a parent) to unlock GeoAdventure content.</p>
            <p className="font-semibold">We do not:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Collect precise GPS coordinates</li>
              <li>Track real-time movement</li>
              <li>Store travel routes or location history</li>
              <li>Monitor a child's physical activity</li>
            </ul>
            <p>Location-based features are optional and parent-initiated.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">Automatically Collected Technical Data</h2>
            <p>We collect minimal technical data to improve performance and reliability, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Browser type</li>
              <li>Device type</li>
              <li>Anonymous usage statistics</li>
            </ul>
            <p>This data is collected through tools such as Google Analytics and is not used for behavioral advertising.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">Information We Do NOT Collect</h2>
            <p>We do not collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Precise location tracking</li>
              <li>Audio recordings</li>
              <li>Biometric identifiers</li>
              <li>Behavioral advertising profiles</li>
            </ul>
            <p>We might collect names, emails, photos or videos which are only saved to your personal account and never shared by us externally without proper consent.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">3. How We Use Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Create and manage parent and child accounts</li>
              <li>Personalize gameplay and learning paths</li>
              <li>Store progress and achievements</li>
              <li>Support GeoGames and GeoAdventures experiences</li>
              <li>Improve platform performance and stability</li>
              <li>Communicate with parents about updates and features</li>
            </ul>
            <p className="font-semibold">We do not sell personal data.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">Offline Gameplay</h2>
            <p>Some GeoQuest features, particularly during GeoAdventures, may be available offline. When offline, gameplay progress is stored locally on the device and synced once an internet connection is restored.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">4. Children's Privacy & COPPA Compliance</h2>
            
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4">Parental Consent</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Parents must create the account and provide verifiable consent</li>
              <li>All child information is entered by a parent</li>
              <li>Children cannot create accounts on their own</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4">Child Safety by Design</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Children cannot access external websites</li>
              <li>No chat, messaging, or social interaction features exist</li>
              <li>GeoQuest is designed so children can play without directly submitting personal information</li>
            </ul>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">GeoArt Privacy & Parent-Locked Sharing</h2>
            <p>GeoArt creations are private by default and visible only within the parent-managed account.</p>
            <p className="font-semibold">Sharing is strictly parent-controlled and protected by parental locks:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Children cannot initiate sharing</li>
              <li>Children cannot publish or export content</li>
              <li>Sharing requires a parent action behind parental controls</li>
              <li>Only the image is shared</li>
              <li>No name, age, account data, or location data is included</li>
            </ul>
            <p>When a parent chooses to share content externally, it is shared through the parent's selected third-party platform (such as Instagram, Facebook, or Twitter/X) and is governed by that platform's privacy policies.</p>
            <p>GeoQuest does not provide public galleries, child-to-child sharing, or in-app social features.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">Parental Rights</h2>
            <p>Parents may:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Review their child's information</li>
              <li>Update or correct information</li>
              <li>Request deletion of their child's data</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p>
              Requests can be made by contacting: <ExternalLink href="mailto:support@geoquestgame.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@geoquestgame.com</ExternalLink>
            </p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">5. Third-Party Tools & Advertising</h2>
            <p>We currently use:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Google Analytics (privacy-focused configuration)</li>
            </ul>
            <p>Future tools may include:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Advertising services (e.g., Google AdSense)</li>
            </ul>
            <p>If advertising is introduced:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Personalized ads will be disabled for child users</li>
              <li>This Privacy Policy will be updated</li>
              <li>Parental consent will be obtained as required by law</li>
            </ul>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">6. Cookies & Tracking</h2>
            <p>We use cookies only for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Login sessions</li>
              <li>Platform functionality</li>
              <li>Basic analytics and performance improvement</li>
            </ul>
            <p>We do not use tracking cookies for behavioral advertising directed at children.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">7. Data Security</h2>
            <p>
              We use industry-standard security measures, including encryption and access controls, to protect personal information.
            </p>
            <p>
              While no system is 100% secure, we take reasonable steps to safeguard data and limit access to authorized personnel only.
            </p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">8. Data Retention</h2>
            <p>We retain personal and gameplay data only as long as necessary to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Maintain accounts</li>
              <li>Support gameplay and learning progress</li>
              <li>Store achievements and adventure history</li>
              <li>Meet legal obligations</li>
            </ul>
            <p>Location references used during GeoAdventures are not stored as continuous tracking data.</p>
            <p>Parents may request deletion at any time.</p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">9. Intellectual Property Notice</h2>
            <p>
              All maps, artwork, characters, educational systems, missions, and creative materials are the property of GeoQuest Games LLC.
            </p>
            <p>
              For usage restrictions, see our <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</a>.
            </p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Parents will be notified of material changes through the platform or by email.
            </p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">11. Contact Us</h2>
            <p><strong>GeoQuest Games LLC</strong></p>
            <p>
              Email: <ExternalLink href="mailto:support@geoquestgame.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@geoquestgame.com</ExternalLink>
            </p>

            <hr className="my-8 border-gray-200 dark:border-gray-700" />

            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">The GeoQuest Parent Promise</h2>
            <p>GeoQuest is built to be:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Parent-controlled</li>
              <li>Child-safe by default</li>
              <li>Free from behavioral advertising for children</li>
              <li>Focused on curiosity, learning, and exploration</li>
            </ul>
            <p>We do not sell children's data and design GeoQuest so kids can play safely without sharing personal information.</p>

          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>© 2026 GeoQuest Games LLC. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
