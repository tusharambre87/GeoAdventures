import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, FileText, Scale, HelpCircle, Info } from "lucide-react";
import { Link } from "wouter";

interface PrivacySettingsMenuProps {
  onClose: () => void;
  variant?: "geogames" | "geoadventures";
}

export function PrivacySettingsMenu({ onClose, variant = "geogames" }: PrivacySettingsMenuProps) {
  const [expanded, setExpanded] = useState(false);

  const isGeo = variant === "geogames";

  const containerClass = isGeo
    ? "w-full rounded-xl overflow-hidden"
    : "w-full rounded-xl overflow-hidden";

  const toggleClass = isGeo
    ? "w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 text-left transition-colors"
    : "w-full justify-start h-12 text-base flex items-center gap-3 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors";

  const labelClass = isGeo
    ? "font-bold text-gray-700 dark:text-gray-200"
    : "font-medium text-slate-700 dark:text-slate-200";

  const subLinkClass = isGeo
    ? "w-full flex items-center gap-3 px-3 py-2 pl-11 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors text-sm text-gray-600 dark:text-gray-300"
    : "w-full flex items-center gap-3 px-4 py-2.5 pl-12 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-left transition-colors text-sm text-slate-600 dark:text-slate-300";

  const links = [
    { href: "/privacy", icon: FileText, label: "Privacy Policy" },
    { href: "/terms", icon: Scale, label: "Terms of Service" },
    { href: "/support", icon: HelpCircle, label: "Support" },
    { href: "/about", icon: Info, label: "About Us" },
  ];

  return (
    <div className={containerClass} data-testid="privacy-settings-menu">
      <button
        onClick={() => setExpanded(!expanded)}
        className={toggleClass}
        data-testid="button-privacy-settings"
      >
        <Shield className={`w-5 h-5 ${isGeo ? "text-purple-500" : "mr-3 text-purple-500"}`} />
        <span className={labelClass}>Privacy & Settings</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 ml-auto text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="py-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={onClose}>
              <div className={subLinkClass} data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <link.icon className="w-4 h-4 text-gray-400" />
                <span>{link.label}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
