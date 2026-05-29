import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Check, Package } from "lucide-react";

type PackItem = {
  id: string;
  label: string;
  checked: boolean;
  custom?: boolean;
};

type PackSection = {
  id: string;
  title: string;
  emoji: string;
  items: PackItem[];
  collapsed: boolean;
};

function makeDaySpecificItems(destinations: string[]): PackItem[] {
  const dest = destinations.join(" ").toLowerCase();
  const items: PackItem[] = [];
  const push = (id: string, label: string) => items.push({ id, label, checked: false });

  push("d-sunscreen", "Sunscreen");
  push("d-hat", "Hat");

  const isBeachy = /beach|miami|hawaii|cancun|bahamas|caribbean|florida|san diego/.test(dest);
  const isCold = /chicago|boston|denver|seattle|portland|minneapolis|toronto|montreal/.test(dest);
  const isRainy = /seattle|london|portland|amsterdam|dublin/.test(dest);
  const isOutdoor = /national park|yellowstone|zion|grand canyon|yosemite|hiking|camping/.test(dest);
  const isUrban = /new york|chicago|london|paris|tokyo|rome|barcelona/.test(dest);

  if (isBeachy) {
    push("d-towel", "Beach towel");
    push("d-swimwear", "Swimwear");
    push("d-sandals", "Sandals");
  } else if (isCold) {
    push("d-jacket", "Warm jacket");
    push("d-layers", "Extra layers");
  } else {
    push("d-jacket", "Light jacket");
  }

  if (isRainy) push("d-umbrella", "Umbrella");
  if (isOutdoor) push("d-backpack", "Day backpack");
  if (isUrban) push("d-transit", "Transit card / Uber app");

  push("d-camera", "Camera / phone charged");
  push("d-medicines", "Any medications");

  return items;
}

function makeDefaultSections(destinations: string[]): PackSection[] {
  return [
    {
      id: "essentials",
      title: "Essentials",
      emoji: "🧳",
      collapsed: false,
      items: [
        { id: "e-clothes", label: "Clothes", checked: true },
        { id: "e-shoes", label: "Comfortable shoes", checked: true },
        { id: "e-charger", label: "Phone charger", checked: false },
        { id: "e-wallet", label: "Wallet / ID", checked: false },
        { id: "e-tickets", label: "Tickets / reservations", checked: false },
      ],
    },
    {
      id: "kids",
      title: "Kids",
      emoji: "🧒",
      collapsed: true,
      items: [
        { id: "k-snacks", label: "Snacks", checked: false },
        { id: "k-water", label: "Water bottle", checked: false },
        { id: "k-change", label: "Change of clothes", checked: false },
        { id: "k-toy", label: "Small toy / activity book", checked: false },
      ],
    },
    {
      id: "today",
      title: "Today's needs",
      emoji: "☀️",
      collapsed: true,
      items: makeDaySpecificItems(destinations),
    },
    {
      id: "custom",
      title: "My additions",
      emoji: "✏️",
      collapsed: true,
      items: [],
    },
  ];
}

interface PackingListProps {
  tripId: string;
  tripName?: string | null;
  destinations?: string[];
  onClose: () => void;
}

export function PackingList({ tripId, tripName, destinations = [], onClose }: PackingListProps) {
  const storageKey = `geoquest_packing_${tripId}`;
  const [sections, setSections] = useState<PackSection[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return makeDefaultSections(destinations);
  });
  const [newItemText, setNewItemText] = useState("");
  const [showMarkAll, setShowMarkAll] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sections));
    } catch {}
  }, [sections, storageKey]);

  const allItems = sections.flatMap(s => s.items);
  const totalItems = allItems.length;
  const checkedItems = allItems.filter(i => i.checked).length;
  const allPacked = totalItems > 0 && checkedItems === totalItems;

  const progressPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const statusHeadline = allPacked
    ? "You're ready for your trip! ✅"
    : checkedItems >= Math.ceil(totalItems * 0.6)
    ? "You're almost ready"
    : checkedItems > 0
    ? "Getting there..."
    : "Let's get packing";

  const statusSub = allPacked
    ? "Everything's packed — enjoy your adventure!"
    : `${checkedItems} of ${totalItems} items packed`;

  function toggleItem(sectionId: string, itemId: string) {
    setSections(prev => {
      const next = prev.map(s => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          items: s.items.map(it =>
            it.id === itemId ? { ...it, checked: !it.checked } : it
          ),
        };
      });
      const nowAll = next.flatMap(s => s.items).every(i => i.checked);
      if (nowAll && !allPacked) {
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 3000);
      }
      return next;
    });
  }

  function toggleSection(sectionId: string) {
    setSections(prev =>
      prev.map(s => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
    );
  }

  function addCustomItem() {
    const label = newItemText.trim();
    if (!label) return;
    setSections(prev =>
      prev.map(s => {
        if (s.id !== "custom") return s;
        return {
          ...s,
          collapsed: false,
          items: [
            ...s.items,
            { id: `c-${Date.now()}`, label, checked: false, custom: true },
          ],
        };
      })
    );
    setNewItemText("");
  }

  function markAllPacked() {
    setSections(prev =>
      prev.map(s => ({ ...s, items: s.items.map(it => ({ ...it, checked: true })) }))
    );
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 3000);
    setShowMarkAll(false);
  }

  function removeCustomItem(itemId: string) {
    setSections(prev =>
      prev.map(s => {
        if (s.id !== "custom") return s;
        return { ...s, items: s.items.filter(it => it.id !== itemId) };
      })
    );
  }

  const tripTitle = tripName || "Your trip";

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-[500] flex flex-col"
      style={{ background: "#FAFAF8" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top,16px)+8px)] pb-3"
        style={{ background: "#FAFAF8", borderBottom: "1px solid #F0EDE8" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          data-testid="button-packing-back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-900 leading-tight">Packing for your trip</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">We've suggested what you'll need</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Package className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-semibold text-orange-500">{checkedItems}/{totalItems}</span>
        </div>
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 pt-4 space-y-3">
          {/* Smart Status Card */}
          <AnimatePresence mode="wait">
            {justCompleted ? (
              <motion.div
                key="complete"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 18, stiffness: 200 }}
                className="rounded-2xl p-4 text-center"
                style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FEF3E2 100%)", border: "1.5px solid #FDBA74" }}
              >
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-base font-bold text-orange-700">You're ready for today!</p>
                <p className="text-xs text-orange-500 mt-1">All packed — let the adventure begin</p>
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                className="rounded-2xl p-4"
                style={{ background: "#F7F3EC", border: "none" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-900">{statusHeadline}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{statusSub}</p>
                  </div>
                  {allPacked && (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#E67E22" }}>
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                {/* Progress bar */}
                {!allPacked && (
                  <div className="mt-3">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "#EDE9E0" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: progressPct > 60 ? "#E67E22" : "#F4A663" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sections */}
          {sections.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: "#FFFFFF", border: "1px solid #F0EDE8" }}
            >
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                data-testid={`button-packing-section-${section.id}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg leading-none">{section.emoji}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{section.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {section.items.filter(i => i.checked).length} of {section.items.length} packed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {section.items.length > 0 && section.items.every(i => i.checked) && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#E67E22" }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {section.collapsed
                    ? <ChevronRight className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </button>

              {/* Section items */}
              <AnimatePresence>
                {!section.collapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="px-4 pb-2" style={{ borderTop: "1px solid #F7F4F0" }}>
                      {section.items.length === 0 && section.id !== "custom" && (
                        <p className="text-xs text-gray-400 py-3 text-center">No items yet</p>
                      )}
                      {section.items.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          className="flex items-center gap-3 py-2.5"
                          style={{ borderBottom: "1px solid #F7F4F0" }}
                        >
                          <button
                            onClick={() => toggleItem(section.id, item.id)}
                            className="shrink-0 transition-all active:scale-90"
                            data-testid={`checkbox-packing-${item.id}`}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              border: item.checked ? "none" : "2px solid #D1CCC4",
                              background: item.checked ? "#E67E22" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {item.checked && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 14, stiffness: 280 }}
                              >
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              </motion.div>
                            )}
                          </button>
                          <span
                            className="flex-1 text-sm"
                            style={{
                              color: item.checked ? "#9CA3AF" : "#1F2937",
                              textDecoration: item.checked ? "line-through" : "none",
                              transition: "color 0.2s",
                            }}
                          >
                            {item.label}
                          </span>
                          {item.custom && (
                            <button
                              onClick={() => removeCustomItem(item.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none px-1"
                              data-testid={`button-remove-custom-${item.id}`}
                            >
                              ×
                            </button>
                          )}
                        </motion.div>
                      ))}

                      {/* Custom section add input */}
                      {section.id === "custom" && (
                        <div className="flex items-center gap-2 pt-2 pb-1">
                          <div
                            className="flex-1 flex items-center gap-2 px-3 rounded-xl"
                            style={{ background: "#F7F4F0", height: 40 }}
                          >
                            <Plus className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                              ref={addInputRef}
                              type="text"
                              placeholder="Add item..."
                              value={newItemText}
                              onChange={e => setNewItemText(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomItem(); } }}
                              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                              data-testid="input-packing-custom"
                            />
                          </div>
                          <button
                            onClick={addCustomItem}
                            disabled={!newItemText.trim()}
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                            style={{ background: newItemText.trim() ? "#E67E22" : "#F0EDE8" }}
                            data-testid="button-packing-add-custom"
                          >
                            <Plus className="w-4 h-4" style={{ color: newItemText.trim() ? "#FFFFFF" : "#9CA3AF" }} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Add item quick shortcut */}
          <button
            onClick={() => {
              setSections(prev => prev.map(s => s.id === "custom" ? { ...s, collapsed: false } : s));
              setTimeout(() => addInputRef.current?.focus(), 200);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors hover:bg-gray-50 active:bg-gray-100 text-left"
            style={{ border: "1.5px dashed #D1CCC4", background: "transparent" }}
            data-testid="button-packing-quick-add"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#FFF3E8" }}>
              <Plus className="w-4 h-4 text-orange-500" />
            </div>
            <span className="text-sm font-medium text-gray-500">Add your own item</span>
          </button>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]"
        style={{ background: "#FAFAF8", borderTop: "1px solid #F0EDE8" }}
      >
        {allPacked ? (
          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl font-bold text-white text-sm transition-all active:scale-[0.98]"
            style={{ background: "#E67E22" }}
            data-testid="button-packing-done"
          >
            Done — let's go! 🎒
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={markAllPacked}
              className="flex-1 h-12 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]"
              style={{ background: "#FFF3E8", color: "#E67E22", border: "1.5px solid #FDBA74" }}
              data-testid="button-packing-mark-all"
            >
              Mark all packed
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]"
              style={{ background: "#E67E22", color: "#FFFFFF" }}
              data-testid="button-packing-close"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
