import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { travelAPI, type Trip, type TripStop } from "@/lib/apiClient";
import { API_BASE } from "@/lib/authContext";
import { CITY_IMGS, F, G } from "@/lib/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Constants ────────────────────────────────────────────────────────────────

const CITY_COLORS = ["#3b82f6", "#a855f7", "#14b8a6", "#f43f5e", "#f97316", "#84cc16"];

const TICKET_TYPES = ["museum", "zoo", "aquarium", "palace", "castle", "temple", "theater", "theatre", "observatory"];
const MEAL_TYPES = ["restaurant", "food", "cafe", "diner", "eatery"];

// ─── Helper functions ─────────────────────────────────────────────────────────

function cityColor(index: number): string {
  return CITY_COLORS[index % CITY_COLORS.length];
}

function needsTicket(stopType?: string | null): boolean {
  if (!stopType) return false;
  const t = stopType.toLowerCase();
  return TICKET_TYPES.some(k => t.includes(k));
}

function isMealStop(stopType?: string | null): boolean {
  if (!stopType) return false;
  const t = stopType.toLowerCase();
  return MEAL_TYPES.some(k => t.includes(k));
}

function estimatedMins(stopType?: string | null): number {
  if (!stopType) return 60;
  const t = stopType.toLowerCase();
  if (t.includes("zoo") || t.includes("aquarium") || t.includes("beach")) return 120;
  if (t.includes("museum") || t.includes("palace") || t.includes("castle") || t.includes("adventure")) return 90;
  if (t.includes("park") || t.includes("garden") || t.includes("nature") || t.includes("restaurant") || t.includes("food")) return 60;
  if (t.includes("landmark") || t.includes("monument") || t.includes("temple") || t.includes("church")) return 45;
  return 60;
}

function formatDuration(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function dayTheme(stops: TripStop[]): string {
  const content = stops.filter(s => !isMealStop(s.stopType));
  if (content.length === 0) return "🍽 Dining Day";
  const types = content.map(s => s.stopType?.toLowerCase() ?? "");
  const museums = types.filter(t => t.includes("museum") || t.includes("art") || t.includes("gallery")).length;
  const outdoor = types.filter(t => t.includes("park") || t.includes("garden") || t.includes("beach") || t.includes("nature")).length;
  const adventure = types.filter(t => t.includes("zoo") || t.includes("aquarium") || t.includes("adventure")).length;
  const landmarks = types.filter(t => t.includes("landmark") || t.includes("monument") || t.includes("street") || t.includes("neighborhood")).length;
  if (adventure >= 1) return "🎒 Adventure Day";
  if (museums >= 2) return "🏛 Museums & Culture";
  if (outdoor >= 2) return "🌿 Parks & Outdoors";
  if (landmarks >= 2) return "🏙 City Landmarks";
  return "🗺 Full Exploration";
}

function travelTime(stops: TripStop[]): string {
  const n = Math.max(0, stops.length - 1);
  const totalTravel = n * 18;
  if (totalTravel < 60) return `~${totalTravel}m travel`;
  return `~${Math.round(totalTravel / 60)}h travel`;
}

// ─── Grouped data helpers ─────────────────────────────────────────────────────

type DaySummary = {
  dayIndex: number;
  stops: TripStop[];
  stopCount: number;
  durationMins: number;
  ticketCount: number;
  hasLunch: boolean;
  city: string;
  isArrival: boolean;
  isDeparture: boolean;
};

type CityGroup = {
  city: string;
  color: string;
  days: DaySummary[];
};

function buildCityGroups(stops: TripStop[], totalDays: number): CityGroup[] {
  const maxDay = stops.reduce((m, s) => Math.max(m, s.dayIndex ?? 0), 0);
  const days = Math.max(totalDays - 1, maxDay);

  const byDay = new Map<number, TripStop[]>();
  for (const s of stops) {
    const d = s.dayIndex ?? 0;
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(s);
  }

  const cityOrder: string[] = [];
  const cityToColor = new Map<string, string>();

  for (let d = 0; d <= days; d++) {
    const dayStops = byDay.get(d) ?? [];
    const city = dayStops[0]?.cityGroup ?? "Unknown";
    if (!cityToColor.has(city)) {
      cityToColor.set(city, cityColor(cityOrder.length));
      cityOrder.push(city);
    }
  }

  const cityDays = new Map<string, DaySummary[]>();
  for (const city of cityOrder) cityDays.set(city, []);

  for (let d = 0; d <= days; d++) {
    const dayStops = (byDay.get(d) ?? []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const city = dayStops[0]?.cityGroup ?? (cityOrder[0] ?? "Unknown");
    const ticketCount = dayStops.filter(s => needsTicket(s.stopType)).length;
    const hasLunch = dayStops.some(s => isMealStop(s.stopType));
    const durationMins = dayStops.reduce((sum, s) => sum + estimatedMins(s.stopType), 0) + Math.max(0, dayStops.length - 1) * 18;

    cityDays.get(city)?.push({
      dayIndex: d,
      stops: dayStops,
      stopCount: dayStops.filter(s => !isMealStop(s.stopType)).length,
      durationMins,
      ticketCount,
      hasLunch,
      city,
      isArrival: d === 0,
      isDeparture: d === days,
    });
  }

  return cityOrder.map(city => ({
    city,
    color: cityToColor.get(city)!,
    days: cityDays.get(city) ?? [],
  }));
}

// ─── useStopImage hook ────────────────────────────────────────────────────────

function useStopImage(stopId: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const res = await fetch(`${API_BASE}/api/travel/stops/${stopId}/hero-image`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.url) setUrl(data.url);
        }
      } catch { /* silent */ }
    }
    load();
    return () => { cancelled = true; };
  }, [stopId]);
  return url;
}

// ─── StopCard (Day Detail) ────────────────────────────────────────────────────

function StopCard({
  stop,
  dayIndex,
  isLast,
  onReplace,
  onDetails,
}: {
  stop: TripStop;
  dayIndex: number;
  isLast: boolean;
  onReplace: (stopId: string) => void;
  onDetails: (stopId: string) => void;
}) {
  const heroImg = useStopImage(stop.id);
  const ticket = needsTicket(stop.stopType);
  const tip = (stop.metadata as any)?.tip ?? (stop.metadata as any)?.parentTip ?? null;
  const travelMins = (stop.metadata as any)?.travelMinutes as number | undefined;

  return (
    <View style={sd.row}>
      <View style={sd.timeline}>
        <View style={[sd.dot, ticket && sd.dotTicket]} />
        {!isLast && <View style={sd.line} />}
      </View>
      <View style={sd.card}>
        {heroImg ? (
          <Image source={{ uri: heroImg }} style={sd.img} contentFit="cover" />
        ) : (
          <View style={[sd.img, sd.imgPlaceholder]}>
            <Ionicons name="image-outline" size={22} color={G.muted} />
          </View>
        )}
        <View style={sd.body}>
          <Text style={sd.name} numberOfLines={2}>{stop.name}</Text>
          <View style={sd.meta}>
            {travelMins ? <Text style={sd.metaText}>🚗 {travelMins} min</Text> : null}
            <Text style={sd.metaText}>⏱ {estimatedMins(stop.stopType)} min</Text>
            {ticket && <Text style={sd.metaTicket}>🎟 Ticket needed</Text>}
          </View>
          {stop.stopType ? (
            <View style={sd.tags}>
              <View style={sd.tag}>
                <Text style={sd.tagText}>{stop.stopType.replace(/_/g, " ")}</Text>
              </View>
            </View>
          ) : null}
          {tip ? (
            <View style={sd.tipRow}>
              <Text style={sd.tip}>💡 {tip}</Text>
            </View>
          ) : null}
        </View>
        <View style={sd.actions}>
          <Pressable style={sd.action} onPress={() => onDetails(stop.id)}>
            <Text style={sd.actionText}>Details →</Text>
          </Pressable>
          <View style={sd.actionDivider} />
          <Pressable style={sd.action} onPress={() => onReplace(stop.id)}>
            <Text style={sd.actionText}>Replace</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── MealCard ─────────────────────────────────────────────────────────────────

function MealCard({ stop }: { stop: TripStop }) {
  return (
    <View style={mc.card}>
      <View>
        <Text style={mc.label}>🍽 Lunch Break · {estimatedMins(stop.stopType)}m</Text>
        <Text style={mc.sub}>{stop.name}</Text>
      </View>
      <Pressable style={mc.changeBtn}>
        <Text style={mc.changeBtnText}>Change</Text>
      </Pressable>
    </View>
  );
}

// ─── RouteMapCard ─────────────────────────────────────────────────────────────

function RouteMapCard({ stops }: { stops: TripStop[] }) {
  const content = stops.filter(s => !isMealStop(s.stopType));
  const totalTravel = Math.max(0, content.length - 1) * 18;

  return (
    <View style={rm.card}>
      <View style={rm.bg}>
        {content.slice(0, 5).map((s, i) => (
          <View
            key={s.id}
            style={[rm.pin, { left: 24 + i * 54, top: 30 + (i % 2 === 0 ? 20 : 50) }]}
          >
            <View style={rm.pinDot}>
              <Text style={rm.pinNum}>{i + 1}</Text>
            </View>
            {i < content.slice(0, 5).length - 1 && (
              <View style={rm.connector} />
            )}
          </View>
        ))}
      </View>
      <View style={rm.overlay}>
        <Text style={rm.info}>{content.length} stops · ~{formatDuration(totalTravel)} travel</Text>
        <Pressable style={rm.btn}>
          <Text style={rm.btnText}>Full map</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Run Day Sheet ────────────────────────────────────────────────────────────

type RunMode = "balanced" | "faster" | "easier";

const MODES: { key: RunMode; emoji: string; name: string; desc: string }[] = [
  { key: "balanced", emoji: "⚖️", name: "Balanced", desc: "Recommended" },
  { key: "faster", emoji: "⚡", name: "Faster", desc: "Skip breaks" },
  { key: "easier", emoji: "🌿", name: "Easier", desc: "Slow down" },
];

function RunDaySheet({
  visible,
  dayIndex,
  summary,
  onClose,
  onGo,
}: {
  visible: boolean;
  dayIndex: number;
  summary: DaySummary | null;
  onClose: () => void;
  onGo: (mode: RunMode) => void;
}) {
  const [mode, setMode] = useState<RunMode>("balanced");
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible && !summary) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={rs.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[rs.sheet, { transform: [{ translateY: slideAnim }] }]}>
              <View style={rs.handle} />
              <Pressable style={rs.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={16} color={G.muted} />
              </Pressable>
              <Text style={rs.title}>Start your day 🚀</Text>
              <Text style={rs.sub}>Pick your vibe for Day {dayIndex + 1}</Text>
              <View style={rs.modeRow}>
                {MODES.map(m => (
                  <Pressable
                    key={m.key}
                    style={[rs.modeBtn, mode === m.key && rs.modeBtnSelected]}
                    onPress={() => setMode(m.key)}
                  >
                    <Text style={rs.modeEmoji}>{m.emoji}</Text>
                    <Text style={rs.modeName}>{m.name}</Text>
                    <Text style={rs.modeDesc}>{m.desc}</Text>
                  </Pressable>
                ))}
              </View>
              {summary && (
                <View style={rs.summaryCard}>
                  <Text style={rs.summaryLabel}>TODAY'S PLAN</Text>
                  <Text style={rs.summaryText}>
                    {summary.stopCount} stops · {formatDuration(summary.durationMins)}
                    {summary.ticketCount > 0 ? ` · ${summary.ticketCount} ticket${summary.ticketCount > 1 ? "s" : ""}` : ""}
                  </Text>
                </View>
              )}
              <Pressable style={rs.cta} onPress={() => onGo(mode)}>
                <Text style={rs.ctaText}>Go to Today →</Text>
              </Pressable>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Day Detail ───────────────────────────────────────────────────────────────

function DayDetail({
  day,
  cityColor: color,
  totalDays,
  onBack,
  onRunDay,
}: {
  day: DaySummary;
  cityColor: string;
  totalDays: number;
  onBack: () => void;
  onRunDay: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [replacingStopId, setReplacingStopId] = useState<string | null>(null);
  const [viewingStopId, setViewingStopId] = useState<string | null>(null);
  const contentStops = day.stops.filter(s => !isMealStop(s.stopType));
  const mealStops = day.stops.filter(s => isMealStop(s.stopType));
  const ticketStops = day.stops.filter(s => needsTicket(s.stopType));

  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      {/* Sticky header */}
      <View style={[dh.header, { paddingTop: insets.top + 12 }]}>
        <View style={dh.headerRow}>
          <Pressable style={dh.iconBtn} onPress={onBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={G.deep} />
          </Pressable>
          <Pressable style={dh.iconBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={G.deep} />
          </Pressable>
        </View>
        <Text style={[dh.dayLabel, { color }]}>
          {day.city.toUpperCase()} · DAY {day.dayIndex + 1}
        </Text>
        <Text style={dh.dayTitle}>{dayTheme(day.stops)}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={dh.pills}
        >
          <View style={dh.pill}><Text style={dh.pillText}>{day.stopCount} stops</Text></View>
          <View style={dh.pill}><Text style={dh.pillText}>{formatDuration(day.durationMins)}</Text></View>
          <View style={dh.pill}><Text style={dh.pillText}>{travelTime(contentStops)}</Text></View>
          {day.ticketCount > 0 && (
            <View style={[dh.pill, dh.pillAlert]}>
              <Text style={[dh.pillText, dh.pillAlertText]}>🎟 {day.ticketCount} ticket{day.ticketCount > 1 ? "s" : ""}</Text>
            </View>
          )}
          {day.hasLunch && (
            <View style={dh.pill}><Text style={dh.pillText}>🍽 Lunch included</Text></View>
          )}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[dh.body, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Before You Go */}
        {ticketStops.length > 0 && (
          <View style={dh.beforeGoCard}>
            <Text style={dh.beforeGoTitle}>
              Before you go — {ticketStops.length} thing{ticketStops.length > 1 ? "s" : ""} to sort
            </Text>
            {ticketStops.map(s => (
              <View key={s.id} style={dh.beforeGoRow}>
                <Text style={dh.beforeGoText} numberOfLines={1}>{s.name}</Text>
                <Pressable style={dh.bookBtn}>
                  <Text style={dh.bookBtnText}>Book →</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Route Map */}
        <Text style={dh.sectionLabel}>ROUTE</Text>
        <RouteMapCard stops={contentStops} />

        {/* Stop by Stop */}
        <Text style={dh.sectionLabel}>STOP BY STOP</Text>

        {day.stops.length === 0 ? (
          <View style={dh.emptyDay}>
            <Ionicons name="map-outline" size={28} color={G.muted} />
            <Text style={dh.emptyDayText}>No stops planned for this day yet.</Text>
          </View>
        ) : (
          <>
            {contentStops.map((stop, i) => {
              const isLast = i === contentStops.length - 1 && mealStops.length === 0;
              return (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  dayIndex={day.dayIndex}
                  isLast={isLast}
                  onReplace={setReplacingStopId}
                  onDetails={setViewingStopId}
                />
              );
            })}

            {mealStops.map((stop, i) => (
              <View key={stop.id}>
                <MealCard stop={stop} />
                {i === mealStops.length - 1 && <View style={{ height: 8 }} />}
              </View>
            ))}
          </>
        )}

        {/* Add stop */}
        <Pressable style={dh.addStopBtn}>
          <Text style={dh.addStopText}>+ Add a stop</Text>
        </Pressable>

        {/* Run Day */}
        <Pressable style={dh.runDayBtn} onPress={onRunDay}>
          <Text style={dh.runDayText}>🚀 Run Day {day.dayIndex + 1}</Text>
        </Pressable>
        <Text style={dh.runDayHint}>Switches to Today tab — live mode</Text>
      </ScrollView>

      {/* Replace sheet placeholder */}
      <Modal transparent visible={!!replacingStopId} animationType="slide" onRequestClose={() => setReplacingStopId(null)}>
        <View style={rs.overlay}>
          <View style={[rs.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={rs.handle} />
            <Pressable style={rs.closeBtn} onPress={() => setReplacingStopId(null)}>
              <Ionicons name="close" size={16} color={G.muted} />
            </Pressable>
            <Text style={rs.title}>Replace Stop</Text>
            <Text style={rs.sub}>Alternative stops for this slot will appear here.</Text>
            <View style={[rs.summaryCard, { marginTop: 8 }]}>
              <ActivityIndicator size="small" color={G.orange} />
              <Text style={[rs.summaryText, { marginTop: 6 }]}>Loading suggestions…</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stop detail sheet */}
      <StopDetailSheet
        stop={day.stops.find(s => s.id === viewingStopId) ?? null}
        visible={!!viewingStopId}
        onClose={() => setViewingStopId(null)}
      />
    </View>
  );
}

// ─── StopDetailSheet ─────────────────────────────────────────────────────────

function StopDetailSheet({
  stop,
  visible,
  onClose,
}: {
  stop: TripStop | null;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const heroImg = useStopImage(stop?.id ?? "");
  if (!stop) return null;

  const storyPack = (stop as any).storyPack as { mainStory?: string } | null | undefined;
  const rawStory = storyPack?.mainStory ?? null;
  const mainStory = rawStory ? rawStory.slice(0, 300) : null;
  const showEllipsis = rawStory && rawStory.length > 300;
  const whyItWorks = (stop.metadata as any)?.whyItWorks as string | null | undefined;
  const bathroomNotes = (stop.metadata as any)?.bathroomNotes as string | null | undefined;
  const missions = stop.stopMissions?.slice(0, 3) ?? [];

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={ds.overlay} />
      </TouchableWithoutFeedback>
      <View style={[ds.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={ds.handle} />
        <Pressable style={ds.closeBtn} onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={16} color={G.muted} />
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ds.scrollBody}>
          {heroImg ? (
            <Image source={{ uri: heroImg }} style={ds.heroImg} contentFit="cover" />
          ) : (
            <View style={ds.heroPlaceholder}>
              <Ionicons name="image-outline" size={32} color={G.muted} />
            </View>
          )}

          <View style={ds.nameBlock}>
            <Text style={ds.stopName}>{stop.name}</Text>
            {stop.stopType ? (
              <Text style={ds.stopType}>{stop.stopType.replace(/_/g, " ")}</Text>
            ) : null}
          </View>

          {mainStory ? (
            <View style={ds.section}>
              <Text style={ds.sectionLabel}>THE STORY</Text>
              <Text style={ds.bodyText}>{mainStory}{showEllipsis ? "…" : ""}</Text>
            </View>
          ) : null}

          {whyItWorks ? (
            <View style={ds.section}>
              <Text style={ds.sectionLabel}>WHY IT WORKS FOR YOUR FAMILY</Text>
              <Text style={ds.bodyText}>{whyItWorks}</Text>
            </View>
          ) : null}

          {bathroomNotes ? (
            <View style={ds.section}>
              <Text style={ds.sectionLabel}>PRACTICAL NOTES</Text>
              <Text style={ds.bodyText}>{bathroomNotes}</Text>
            </View>
          ) : null}

          {missions.length > 0 ? (
            <View style={ds.section}>
              <Text style={ds.sectionLabel}>KID MISSIONS</Text>
              {missions.map((m, i) => (
                <View key={i} style={ds.missionRow}>
                  <View style={ds.missionBadge}>
                    <Text style={ds.missionBadgeText}>{i + 1}</Text>
                  </View>
                  <View style={ds.missionBody}>
                    <Text style={ds.missionType}>{m.type.toUpperCase()}</Text>
                    <Text style={ds.missionQ}>{m.question}</Text>
                    {m.options && m.options.length > 0 ? (
                      <View style={ds.optionsList}>
                        {m.options.map((opt, oi) => (
                          <Text key={oi} style={ds.optionText}>· {opt}</Text>
                        ))}
                      </View>
                    ) : null}
                    <Text style={ds.missionXp}>+{m.xpReward} XP</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {!mainStory && !whyItWorks && missions.length === 0 ? (
            <View style={ds.section}>
              <Text style={[ds.bodyText, { color: G.muted, fontStyle: "italic" }]}>
                {stop.description ?? "No additional details available for this stop."}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Trip Plan Overview ───────────────────────────────────────────────────────

function TripPlanOverview({
  trip,
  groups,
  onSelectDay,
  isGenerating,
}: {
  trip: Trip;
  groups: CityGroup[];
  onSelectDay: (dayIndex: number) => void;
  isGenerating: boolean;
}) {
  const insets = useSafeAreaInsets();
  const allDays = groups.flatMap(g => g.days);
  const totalStops = allDays.reduce((s, d) => s + d.stopCount, 0);
  const totalTickets = allDays.reduce((s, d) => s + d.ticketCount, 0);
  const totalDays = allDays.length;
  const readyDays = allDays.filter(d => d.stopCount >= 2 && d.hasLunch).length;
  const travelerCount = trip.travelers?.length ?? 0;

  const dateStr = [trip.startDate, trip.endDate]
    .filter(Boolean)
    .map(d => new Date(d!).toLocaleDateString("en-US", { month: "short", day: "numeric" }))
    .join(" – ");

  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      {/* Sticky header */}
      <View style={[ov.header, { paddingTop: insets.top + 12 }]}>
        <View style={ov.headerRow}>
          <Pressable style={ov.iconBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={G.deep} />
          </Pressable>
          <Pressable style={ov.iconBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={G.deep} />
          </Pressable>
        </View>
        <Text style={ov.title}>{trip.name}</Text>
        <Text style={ov.meta}>
          {totalDays} day{totalDays !== 1 ? "s" : ""}
          {dateStr ? ` · ${dateStr}` : ""}
          {travelerCount > 0 ? ` · ${travelerCount} traveler${travelerCount !== 1 ? "s" : ""}` : ""}
        </Text>

        {/* Health bar */}
        <View style={ov.healthBar}>
          <View style={ov.healthItem}>
            <Text style={ov.healthNum}>{totalStops}</Text>
            <Text style={ov.healthLabel}>STOPS</Text>
          </View>
          <View style={ov.healthDiv} />
          <View style={ov.healthItem}>
            <Text style={[ov.healthNum, totalTickets > 0 && ov.healthNumOrange]}>{totalTickets}</Text>
            <Text style={ov.healthLabel}>TICKETS</Text>
          </View>
          <View style={ov.healthDiv} />
          <View style={ov.healthItem}>
            <Text style={ov.healthNum}>{totalDays}</Text>
            <Text style={ov.healthLabel}>DAYS</Text>
          </View>
          <View style={ov.healthDiv} />
          <View style={ov.healthItem}>
            <Text style={[ov.healthNum, ov.healthNumGreen]}>{readyDays}</Text>
            <Text style={ov.healthLabel}>READY</Text>
          </View>
        </View>

        {/* Generating banner */}
        {isGenerating && (
          <View style={ov.generatingBanner}>
            <ActivityIndicator size="small" color={G.orange} style={{ marginRight: 8 }} />
            <Text style={ov.generatingText}>Building your stops…</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[ov.body, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group, gi) => (
          <View key={group.city} style={ov.citySection}>
            {/* City header */}
            <View style={ov.cityHeader}>
              <Text style={[ov.cityLabel, { color: group.color }]}>{group.city.toUpperCase()}</Text>
              <View style={ov.cityLine} />
              {gi < groups.length - 1 && (
                <Text style={ov.cityNext}>→ {groups[gi + 1].city}</Text>
              )}
            </View>

            {/* Day cards */}
            {group.days.map(day => {
              const flags: string[] = [];
              if (day.isArrival) flags.push("Arrival day");
              if (day.isDeparture) flags.push("Departure day");
              if (day.ticketCount > 0) flags.push(`${day.ticketCount} ticket${day.ticketCount > 1 ? "s" : ""} needed`);
              if (!day.hasLunch) flags.push("No lunch stop");

              return (
                <Pressable
                  key={day.dayIndex}
                  style={({ pressed }) => [
                    ov.dayCard,
                    flags.length > 0 && ov.dayCardFlagged,
                    { opacity: pressed ? 0.95 : 1 },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelectDay(day.dayIndex);
                  }}
                >
                  <View style={[ov.dayAccent, { backgroundColor: group.color }]} />
                  <View style={ov.dayInner}>
                    <Text style={ov.dayNum}>DAY {day.dayIndex + 1}</Text>
                    <Text style={ov.dayTheme}>{dayTheme(day.stops)}</Text>
                    <View style={ov.dayStat}>
                      <Text style={ov.dayStatText}>📍 {day.stopCount} stop{day.stopCount !== 1 ? "s" : ""}</Text>
                      <Text style={ov.dayStatText}>⏱ {formatDuration(day.durationMins)}</Text>
                      <Text style={ov.dayStatText}>{travelTime(day.stops.filter(s => !isMealStop(s.stopType)))}</Text>
                    </View>
                    {flags.length > 0 && (
                      <View style={ov.flags}>
                        {flags.map(f => (
                          <View key={f} style={ov.flagPill}>
                            <Text style={ov.flagPillText}>{f}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={G.muted} style={ov.dayArrow} />
                </Pressable>
              );
            })}
          </View>
        ))}

        {allDays.length === 0 && (
          <View style={ov.emptyCard}>
            <ActivityIndicator size="small" color={G.orange} />
            <Text style={ov.emptyText}>Building your itinerary…</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function TripPlanScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showRunSheet, setShowRunSheet] = useState(false);

  const { data: trip, isLoading, isError, refetch } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => travelAPI.getTrip(tripId!),
    enabled: !!tripId,
    retry: 1,
    // Poll every 4s while stops haven't arrived yet (async generation on server)
    refetchInterval: (query) => {
      const t = query.state.data as Trip | undefined;
      if (!t) return false;
      return (t.stops?.length ?? 0) === 0 ? 4000 : false;
    },
  });

  const stops: TripStop[] = trip?.stops ?? [];

  // Compute totalDays from trip dates (most reliable); fall back to plannerTripDays
  const totalDays = (() => {
    if (trip?.startDate && trip?.endDate) {
      return (
        Math.round(
          (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000
        ) + 1
      );
    }
    return (trip as any)?.plannerTripDays ?? 0;
  })();

  const groups = trip ? buildCityGroups(stops, totalDays) : [];
  const allDays = groups.flatMap(g => g.days);

  const activeDaySummary = selectedDay !== null ? allDays.find(d => d.dayIndex === selectedDay) ?? null : null;
  const activeCityGroup = activeDaySummary
    ? groups.find(g => g.city === activeDaySummary.city)
    : null;

  const handleGoToday = useCallback((mode: RunMode) => {
    setShowRunSheet(false);
    router.replace("/(tabs)/today" as any);
  }, []);

  if (isLoading) {
    return (
      <View style={[root.center, { backgroundColor: G.bg }]}>
        <ActivityIndicator size="large" color={G.orange} />
        <Text style={root.loadingText}>Loading your trip…</Text>
      </View>
    );
  }

  if (isError || !trip) {
    return (
      <View style={[root.center, { backgroundColor: G.bg }]}>
        <Ionicons name="wifi-outline" size={32} color="#DC2626" />
        <Text style={root.errorTitle}>Couldn't load trip</Text>
        <Pressable style={root.retryBtn} onPress={() => refetch()}>
          <Text style={root.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (selectedDay !== null && activeDaySummary) {
    return (
      <>
        <DayDetail
          day={activeDaySummary}
          cityColor={activeCityGroup?.color ?? G.orange}
          totalDays={allDays.length}
          onBack={() => setSelectedDay(null)}
          onRunDay={() => setShowRunSheet(true)}
        />
        <RunDaySheet
          visible={showRunSheet}
          dayIndex={selectedDay}
          summary={activeDaySummary}
          onClose={() => setShowRunSheet(false)}
          onGo={handleGoToday}
        />
      </>
    );
  }

  return (
    <TripPlanOverview
      trip={trip}
      groups={groups}
      onSelectDay={setSelectedDay}
      isGenerating={stops.length === 0}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ov = StyleSheet.create({
  header: {
    backgroundColor: G.card,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(26,31,46,0.1)",
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: G.bg, alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: F.bold, fontSize: 22, fontWeight: "700", color: G.deep, marginBottom: 4 },
  meta: { fontFamily: F.regular, fontSize: 13, color: G.muted, marginBottom: 14 },
  healthBar: {
    backgroundColor: G.bg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: "row", justifyContent: "space-around", alignItems: "center", marginBottom: 16,
  },
  healthItem: { alignItems: "center" },
  healthNum: { fontFamily: F.bold, fontSize: 18, fontWeight: "700", color: G.deep },
  healthNumOrange: { color: G.orange },
  healthNumGreen: { color: G.green },
  healthLabel: { fontFamily: F.medium, fontSize: 10, fontWeight: "500", color: G.muted, letterSpacing: 0.8, marginTop: 2 },
  healthDiv: { width: 0.5, height: 32, backgroundColor: "rgba(26,31,46,0.1)" },
  generatingBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "rgba(232,105,42,0.08)", borderTopWidth: 0.5, borderTopColor: "rgba(232,105,42,0.2)" },
  generatingText: { fontFamily: F.medium, fontSize: 13, color: G.orange },

  body: { paddingHorizontal: 20, paddingTop: 20 },
  citySection: { marginBottom: 24 },
  cityHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cityLabel: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  cityLine: { flex: 1, height: 0.5, backgroundColor: "rgba(26,31,46,0.1)" },
  cityNext: { fontFamily: F.regular, fontSize: 11, color: G.muted },

  dayCard: {
    backgroundColor: G.card, borderRadius: 16, borderWidth: 0.5, borderColor: "rgba(26,31,46,0.08)",
    paddingVertical: 16, paddingRight: 16, paddingLeft: 20,
    marginBottom: 10, flexDirection: "row", alignItems: "center", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  dayCardFlagged: { borderColor: "#fed7aa" },
  dayAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: 3 },
  dayInner: { flex: 1, paddingLeft: 4 },
  dayNum: { fontFamily: F.medium, fontSize: 10, fontWeight: "500", color: G.muted, letterSpacing: 0.6, marginBottom: 3 },
  dayTheme: { fontFamily: F.semibold, fontSize: 16, fontWeight: "600", color: G.deep, marginBottom: 8 },
  dayStat: { flexDirection: "row", gap: 12, marginBottom: 6, flexWrap: "wrap" },
  dayStatText: { fontFamily: F.regular, fontSize: 12, color: G.muted },
  flags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  flagPill: {
    backgroundColor: "#fff7ed", borderWidth: 0.5, borderColor: "#fed7aa",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  flagPillText: { fontFamily: F.medium, fontSize: 11, fontWeight: "500", color: G.orange },
  dayArrow: { marginLeft: 8 },

  emptyCard: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontFamily: F.regular, fontSize: 14, color: G.muted },
});

const dh = StyleSheet.create({
  header: {
    backgroundColor: G.card, borderBottomWidth: 0.5, borderBottomColor: "rgba(26,31,46,0.1)",
    paddingHorizontal: 20, paddingBottom: 0,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: G.bg, alignItems: "center", justifyContent: "center",
  },
  dayLabel: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 3 },
  dayTitle: { fontFamily: F.bold, fontSize: 22, fontWeight: "700", color: G.deep, marginBottom: 12 },
  pills: { gap: 8, paddingBottom: 14 },
  pill: {
    backgroundColor: G.bg, borderWidth: 0.5, borderColor: "rgba(26,31,46,0.1)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexShrink: 0,
  },
  pillAlert: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  pillText: { fontFamily: F.medium, fontSize: 12, fontWeight: "500", color: G.muted },
  pillAlertText: { color: G.orange },

  body: { paddingHorizontal: 20, paddingTop: 20, gap: 4 },
  sectionLabel: {
    fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: G.muted,
    letterSpacing: 1, marginTop: 16, marginBottom: 10,
  },

  beforeGoCard: {
    backgroundColor: "#fff7ed", borderWidth: 0.5, borderColor: "#fed7aa",
    borderRadius: 14, padding: 14, marginBottom: 4,
  },
  beforeGoTitle: { fontFamily: F.semibold, fontSize: 13, fontWeight: "600", color: "#92400e", marginBottom: 10 },
  beforeGoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  beforeGoText: { fontFamily: F.regular, fontSize: 13, color: "#78350f", flex: 1, marginRight: 8 },
  bookBtn: {
    backgroundColor: G.card, borderWidth: 0.5, borderColor: "#fed7aa",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  bookBtnText: { fontFamily: F.medium, fontSize: 11, fontWeight: "500", color: G.orange },

  emptyDay: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyDayText: { fontFamily: F.regular, fontSize: 14, color: G.muted },

  addStopBtn: {
    width: "100%", padding: 14,
    backgroundColor: G.card, borderWidth: 0.5, borderStyle: "dashed", borderColor: "rgba(26,31,46,0.2)",
    borderRadius: 14, alignItems: "center", marginTop: 8,
  },
  addStopText: { fontFamily: F.medium, fontSize: 13, fontWeight: "500", color: G.muted },
  runDayBtn: {
    width: "100%", padding: 16, backgroundColor: G.orange,
    borderRadius: 20, alignItems: "center", marginTop: 24,
  },
  runDayText: { fontFamily: F.bold, fontSize: 15, fontWeight: "700", color: G.card, letterSpacing: 0.2 },
  runDayHint: { fontFamily: F.regular, fontSize: 11, color: G.muted, textAlign: "center", marginTop: 8 },
});

const sd = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, marginBottom: 4 },
  timeline: { width: 10, alignItems: "center", paddingTop: 6, flexShrink: 0 },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "rgba(26,31,46,0.18)", marginBottom: 4,
  },
  dotTicket: { backgroundColor: G.orange },
  line: { flex: 1, width: 1, backgroundColor: "rgba(26,31,46,0.1)", marginTop: 2 },
  card: {
    flex: 1, backgroundColor: G.card, borderRadius: 14,
    borderWidth: 0.5, borderColor: "rgba(26,31,46,0.08)", overflow: "hidden", marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  img: { width: "100%", height: 120 },
  imgPlaceholder: { backgroundColor: G.bg, alignItems: "center", justifyContent: "center" },
  body: { padding: 12 },
  name: { fontFamily: F.semibold, fontSize: 15, fontWeight: "600", color: G.deep, marginBottom: 5 },
  meta: { flexDirection: "row", gap: 10, marginBottom: 6, flexWrap: "wrap" },
  metaText: { fontFamily: F.regular, fontSize: 12, color: G.muted },
  metaTicket: { fontFamily: F.medium, fontSize: 12, fontWeight: "500", color: G.orange },
  tags: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  tag: {
    backgroundColor: G.bg, borderWidth: 0.5, borderColor: "rgba(26,31,46,0.1)",
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  tagText: { fontFamily: F.regular, fontSize: 10, color: G.muted },
  tipRow: { borderTopWidth: 0.5, borderTopColor: "rgba(26,31,46,0.08)", paddingTop: 8, marginTop: 4 },
  tip: { fontFamily: F.regular, fontSize: 12, color: "#92400e", lineHeight: 18 },
  actions: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "rgba(26,31,46,0.08)" },
  action: { flex: 1, padding: 10, alignItems: "center" },
  actionText: { fontFamily: F.medium, fontSize: 12, fontWeight: "500", color: G.muted },
  actionDivider: { width: 0.5, backgroundColor: "rgba(26,31,46,0.08)" },
});

const mc = StyleSheet.create({
  card: {
    marginLeft: 22, marginBottom: 16, backgroundColor: "#f0faf4",
    borderWidth: 0.5, borderStyle: "dashed", borderColor: "#86efac",
    borderRadius: 12, padding: 12, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
  },
  label: { fontFamily: F.semibold, fontSize: 13, fontWeight: "600", color: "#16a34a", marginBottom: 2 },
  sub: { fontFamily: F.regular, fontSize: 12, color: G.muted },
  changeBtn: {
    backgroundColor: G.card, borderWidth: 0.5, borderColor: "#86efac",
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  changeBtnText: { fontFamily: F.medium, fontSize: 11, fontWeight: "500", color: "#16a34a" },
});

const rm = StyleSheet.create({
  card: {
    backgroundColor: "#e8f2e8", borderRadius: 14, borderWidth: 0.5,
    borderColor: "rgba(26,31,46,0.08)", height: 140, overflow: "hidden", marginBottom: 4,
    position: "relative",
  },
  bg: { position: "absolute", inset: 0 as any },
  pin: { position: "absolute", alignItems: "center" },
  pinDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: G.orange,
    alignItems: "center", justifyContent: "center",
    shadowColor: G.orange, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  pinNum: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: G.card },
  connector: { height: 2, width: 40, backgroundColor: G.orange, opacity: 0.4, marginTop: 4 },
  overlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  info: { fontFamily: F.medium, fontSize: 12, fontWeight: "500", color: G.card },
  btn: {
    backgroundColor: G.card, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  btnText: { fontFamily: F.medium, fontSize: 11, fontWeight: "500", color: G.orange },
});

const rs = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end", alignItems: "center",
  },
  sheet: {
    width: "100%", backgroundColor: G.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32,
    position: "relative",
  },
  handle: { width: 36, height: 4, backgroundColor: "rgba(26,31,46,0.15)", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  closeBtn: {
    position: "absolute", top: 20, right: 20,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: G.bg, alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: F.bold, fontSize: 20, fontWeight: "700", color: G.deep, marginBottom: 4 },
  sub: { fontFamily: F.regular, fontSize: 13, color: G.muted, marginBottom: 20 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  modeBtn: {
    flex: 1, padding: 12, borderRadius: 12,
    borderWidth: 0.5, borderColor: "rgba(26,31,46,0.1)",
    backgroundColor: G.bg, alignItems: "center",
  },
  modeBtnSelected: { borderColor: G.orange, backgroundColor: "#fff7ed" },
  modeEmoji: { fontSize: 18, marginBottom: 4 },
  modeName: { fontFamily: F.semibold, fontSize: 12, fontWeight: "600", color: G.deep },
  modeDesc: { fontFamily: F.regular, fontSize: 10, color: G.muted, marginTop: 1 },
  summaryCard: {
    backgroundColor: G.bg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
    alignItems: "center",
  },
  summaryLabel: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: G.muted, letterSpacing: 0.8, marginBottom: 4 },
  summaryText: { fontFamily: F.semibold, fontSize: 13, fontWeight: "600", color: G.deep },
  cta: {
    width: "100%", padding: 16, backgroundColor: G.orange,
    borderRadius: 16, alignItems: "center",
  },
  ctaText: { fontFamily: F.bold, fontSize: 14, fontWeight: "700", color: G.card },
});

const ds = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: G.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "88%",
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 8,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(26,31,46,0.15)", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  closeBtn: { position: "absolute", top: 14, right: 16, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(26,31,46,0.06)", alignItems: "center", justifyContent: "center" },
  scrollBody: { paddingBottom: 24 },
  heroImg: { width: "100%", height: 180, backgroundColor: "rgba(26,31,46,0.06)" },
  heroPlaceholder: { width: "100%", height: 180, backgroundColor: "rgba(26,31,46,0.06)", alignItems: "center", justifyContent: "center" },
  nameBlock: { paddingHorizontal: 20, marginTop: 16, marginBottom: 12 },
  stopName: { fontFamily: F.bold, fontSize: 20, fontWeight: "700", color: G.deep, marginBottom: 2 },
  stopType: { fontFamily: F.medium, fontSize: 12, color: G.muted, textTransform: "capitalize" },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { fontFamily: F.bold, fontSize: 10, fontWeight: "700", color: G.orange, letterSpacing: 1, marginBottom: 6 },
  bodyText: { fontFamily: F.regular, fontSize: 14, color: G.deep, lineHeight: 22 },
  missionRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  missionBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: G.orange + "18", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  missionBadgeText: { fontFamily: F.bold, fontSize: 13, fontWeight: "700", color: G.orange },
  missionBody: { flex: 1 },
  missionType: { fontFamily: F.bold, fontSize: 10, fontWeight: "700", color: G.muted, letterSpacing: 0.8, marginBottom: 2 },
  missionQ: { fontFamily: F.medium, fontSize: 13, fontWeight: "500", color: G.deep, lineHeight: 19, marginBottom: 4 },
  optionsList: { marginBottom: 4 },
  optionText: { fontFamily: F.regular, fontSize: 12, color: G.muted, lineHeight: 18 },
  missionXp: { fontFamily: F.semibold, fontSize: 11, fontWeight: "600", color: G.orange },
});

const root = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  loadingText: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  errorTitle: { fontFamily: F.bold, fontSize: 16, fontWeight: "700", color: "#DC2626", marginTop: 8 },
  retryBtn: { backgroundColor: G.orange, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  retryBtnText: { fontFamily: F.bold, fontSize: 14, fontWeight: "700", color: G.card },
});
