import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackBtn, BigBtn, ProgressDots } from "@/lib/onboardingAtoms";
import { F, G } from "@/lib/tokens";
import { useOnboarding, type Traveler } from "@/lib/onboardingContext";
import { useAuth, API_BASE } from "@/lib/authContext";

const AGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

const AVATAR_EMOJIS = [
  "\uD83E\uDD8A", "\uD83D\uDC3C", "\uD83E\uDD81", "\uD83D\uDC2F",
  "\uD83D\uDC28", "\uD83E\uDD8B", "\uD83E\uDD84", "\uD83D\uDC38",
  "\uD83D\uDC27", "\uD83E\uDD96", "\uD83D\uDC2C", "\uD83C\uDF1F",
];

const FALLBACK_COLORS = [
  "#F97316", "#8B5CF6", "#3B82F6", "#10B981", "#EC4899", "#F59E0B",
];

function isUrl(s: string | null | undefined): boolean {
  if (!s) return false;
  return s.startsWith("http") || s.startsWith("/") || s.startsWith("file:");
}

function isEmoji(s: string | null | undefined): boolean {
  if (!s) return false;
  return !isUrl(s);
}

function AvatarCircle({
  avatar, name, size = 52, adultStyle = false,
}: {
  avatar?: string | null;
  name: string;
  size?: number;
  adultStyle?: boolean;
}) {
  const r = size / 2;
  const baseStyle = { width: size, height: size, borderRadius: r, alignItems: "center" as const, justifyContent: "center" as const, overflow: "hidden" as const };

  if (adultStyle) {
    return (
      <View style={[baseStyle, { backgroundColor: "#2C3E6B" }]}>
        <Text style={{ fontSize: size * 0.38 }}>{"\uD83D\uDC64"}</Text>
      </View>
    );
  }
  if (isUrl(avatar)) {
    return <Image source={{ uri: avatar! }} style={[baseStyle, { borderWidth: 2, borderColor: "#E8692A" }]} contentFit="cover" />;
  }
  if (isEmoji(avatar)) {
    return (
      <View style={[baseStyle, { backgroundColor: "#FDF0E9" }]}>
        <Text style={{ fontSize: size * 0.52 }}>{avatar}</Text>
      </View>
    );
  }
  const idx = (name.charCodeAt(0) || 0) % FALLBACK_COLORS.length;
  return (
    <View style={[baseStyle, { backgroundColor: FALLBACK_COLORS[idx] }]}>
      <Text style={{ fontFamily: F.bold, fontSize: size * 0.38, color: "#fff" }}>
        {name[0]?.toUpperCase() ?? "?"}
      </Text>
    </View>
  );
}

function EmojiPickerPanel({
  selected, onSelect, onPhotoPress,
}: {
  selected: string | null;
  onSelect: (e: string) => void;
  onPhotoPress: () => void;
}) {
  return (
    <View style={ep.panel}>
      <Text style={ep.title}>PICK AN AVATAR</Text>
      <View style={ep.grid}>
        {AVATAR_EMOJIS.map(e => (
          <Pressable
            key={e}
            onPress={() => onSelect(e)}
            style={[ep.circle, selected === e && ep.circleSelected]}
          >
            <Text style={ep.emoji}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <View style={ep.dividerRow}>
        <View style={ep.dividerLine} />
        <Text style={ep.dividerText}>or use a photo</Text>
        <View style={ep.dividerLine} />
      </View>
      <Pressable onPress={onPhotoPress} style={ep.photoBtn}>
        <Text style={ep.photoIcon}>{"\uD83D\uDCF7"}</Text>
        <View>
          <Text style={ep.photoText}>Upload a photo</Text>
          <Text style={ep.photoSub}>From camera roll</Text>
        </View>
      </Pressable>
    </View>
  );
}

const ep = StyleSheet.create({
  panel:         { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#EDE9E3" },
  title:         { fontFamily: F.bold, fontSize: 11, color: G.muted, letterSpacing: 0.8, marginBottom: 10 },
  grid:          { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  circle:        { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F5F2EE", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  circleSelected:{ borderColor: "#E8692A", backgroundColor: "#FDF0E9" },
  emoji:         { fontSize: 20 },
  dividerRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: "#EDE9E3" },
  dividerText:   { fontFamily: F.regular, fontSize: 11, color: G.muted },
  photoBtn:      { backgroundColor: "#F5F2EE", borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  photoIcon:     { fontSize: 20 },
  photoText:     { fontFamily: F.semibold, fontSize: 13, color: G.deep },
  photoSub:      { fontFamily: F.regular, fontSize: 11, color: G.muted },
});

export default function WhoScreen() {
  const insets = useSafeAreaInsets();
  const { data, set } = useOnboarding();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ editMode?: string }>();
  const isEditMode = params.editMode === "true";
  const [saving, setSaving] = useState(false);

  const [travelers, setTravelers] = useState<Traveler[]>(
    data.travelers.length > 0
      ? data.travelers
      : [{ id: 0, init: "Y", name: "You", isParent: true }]
  );

  useEffect(() => {
    if ((!data.returningUser && !isEditMode) || !token) return;
    fetch(`${API_BASE}/api/users/travelers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        const raw: any[] = json.travelers ?? [];
        if (raw.length > 0) {
          const fetched: Traveler[] = raw.map((tv: any, i: number) => ({
            id: typeof tv.id === "number" ? tv.id : Date.now() + i,
            init: ((tv.name as string)?.[0] ?? "T").toUpperCase(),
            name: tv.name ?? "Traveler",
            isParent: Boolean(tv.isParent ?? tv.is_parent),
            avatar: tv.avatar ?? null,
            ...(tv.age != null ? { age: Number(tv.age) } : {}),
          }));
          setTravelers(fetched);
        }
      })
      .catch(() => {});
  }, [data.returningUser, isEditMode, token]);

  const [addingType, setAddingType] = useState<"child" | "adult" | null>(null);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState<number | null>(null);
  const [newAvatar, setNewAvatar] = useState<string | null>(AVATAR_EMOJIS[0]);
  const [editingAvatarForId, setEditingAvatarForId] = useState<number | null>(null);

  function resetForm() {
    setAddingType(null);
    setNewName("");
    setNewAge(null);
    setNewAvatar(AVATAR_EMOJIS[0]);
    setEditingAvatarForId(null);
  }

  async function pickPhotoAndUpload(): Promise<string | null> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    const asset = res.assets[0];
    try {
      const uploadRes = await fetch(`${API_BASE}/api/users/avatar-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageBase64: asset.base64,
          mimeType: asset.mimeType ?? "image/jpeg",
        }),
      });
      if (uploadRes.ok) {
        const d = await uploadRes.json();
        return d.url as string;
      }
    } catch {}
    return asset.uri;
  }

  async function handlePickPhotoForNew() {
    const url = await pickPhotoAndUpload();
    if (url) setNewAvatar(url);
  }

  async function handlePickPhotoForExisting(id: number) {
    const url = await pickPhotoAndUpload();
    if (url) {
      setTravelers(prev => prev.map(t => t.id === id ? { ...t, avatar: url } : t));
      setEditingAvatarForId(null);
    }
  }

  function confirmAdd() {
    if (!newName.trim()) return;
    if (addingType === "child" && newAge === null) return;
    setTravelers(prev => [
      ...prev,
      {
        id: Date.now(),
        init: newName.trim()[0].toUpperCase(),
        name: newName.trim(),
        isParent: addingType === "adult",
        avatar: newAvatar,
        ...(addingType === "child" && newAge !== null ? { age: newAge } : {}),
      },
    ]);
    resetForm();
  }

  function remove(id: number) {
    setTravelers(prev => prev.filter(t => t.id !== id));
  }

  function handleContinue() {
    set({ travelers });
    router.push("/onboarding/when");
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    set({ travelers });
    try {
      await fetch(`${API_BASE}/api/users/travelers`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ travelers }),
      });
    } catch {}
    setSaving(false);
    router.back();
  }

  const children = travelers.filter(t => !t.isParent);
  const adults   = travelers.filter(t => t.isParent);
  const canConfirmAdd = newName.trim().length > 0 && (addingType === "adult" || newAge !== null);

  const kidAges = children.map(c => c.age).filter(Boolean);
  const agesStr =
    kidAges.length === 0 ? "" :
    kidAges.length === 1 ? `age ${kidAges[0]}` :
    kidAges.slice(0, -1).map(a => `age ${a}`).join(", ") + ` and ${kidAges[kidAges.length - 1]}`;

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={s.navRow}>
          <BackBtn onPress={() => router.back()} />
          {isEditMode
            ? <Text style={s.navTitle}>Travel crew</Text>
            : <View style={{ flex: 1, alignItems: "center" }}><ProgressDots total={4} cur={1} /></View>
          }
          <View style={{ width: 40 }} />
        </View>
        <Text style={s.sub}>Stops, pace, and Kids Zone adapt to your crew's ages.</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Crew rows */}
        <View style={s.crewList}>
          {travelers.map(t => {
            const isAdult = t.isParent;
            const isOnlyYou = isAdult && adults.length === 1 && t.name === "You";
            const editingThis = editingAvatarForId === t.id;
            return (
              <React.Fragment key={t.id}>
                <View style={[s.crewRow, isAdult && s.crewRowAdult]}>
                  <Pressable
                    style={s.avatarWrap}
                    onPress={!isAdult ? () => setEditingAvatarForId(editingThis ? null : t.id) : undefined}
                    hitSlop={4}
                  >
                    <AvatarCircle avatar={t.avatar} name={t.name} size={52} adultStyle={isAdult} />
                    {!isAdult && (
                      <View style={s.editBadge}>
                        <Text style={s.editBadgeText}>{"\u270F"}</Text>
                      </View>
                    )}
                  </Pressable>

                  <View style={s.crewInfo}>
                    <Text style={[s.crewName, isAdult && s.crewNameAdult]} numberOfLines={1}>{t.name}</Text>
                    <Text style={[s.crewMeta, isAdult && s.crewMetaAdult]}>
                      {isAdult ? "Adult \u00B7 Lead explorer" : `Age ${t.age} \u00B7 Explorer`}
                    </Text>
                  </View>

                  {!isOnlyYou && !isAdult && (
                    <Pressable onPress={() => remove(t.id)} style={s.removeBtn} hitSlop={8}>
                      <Text style={s.removeBtnText}>{"\u2715"}</Text>
                    </Pressable>
                  )}
                </View>

                {/* Inline avatar picker for this child */}
                {editingThis && !isAdult && (
                  <View style={s.inlinePicker}>
                    <EmojiPickerPanel
                      selected={isEmoji(t.avatar) ? t.avatar! : null}
                      onSelect={e => {
                        setTravelers(prev => prev.map(tv => tv.id === t.id ? { ...tv, avatar: e } : tv));
                        setEditingAvatarForId(null);
                      }}
                      onPhotoPress={() => handlePickPhotoForExisting(t.id)}
                    />
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Info banner */}
        {children.length > 0 && (
          <View style={s.infoBanner}>
            <Text style={s.infoBannerCheck}>{"\u2713"}</Text>
            <Text style={s.infoBannerText}>
              <Text style={{ color: "#3DAA6E", fontFamily: F.bold }}>Trips adapt to your crew</Text>
              {agesStr ? ` \u2014 content tuned for ${agesStr}.` : "."}
            </Text>
          </View>
        )}

        {/* Add form */}
        {addingType !== null && (
          <View style={s.addForm}>
            <View style={s.addFormTop}>
              <Pressable onPress={handlePickPhotoForNew} style={s.avatarPicker}>
                {newAvatar ? (
                  isUrl(newAvatar)
                    ? <Image source={{ uri: newAvatar }} style={{ width: 60, height: 60, borderRadius: 30 }} contentFit="cover" />
                    : <Text style={s.avatarPickerEmoji}>{newAvatar}</Text>
                ) : (
                  <Text style={{ fontSize: 22, color: G.orange }}>+</Text>
                )}
              </Pressable>
              <View style={s.addFormFields}>
                <Text style={s.addFormLabel}>NAME</Text>
                <TextInput
                  style={s.addFormInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={addingType === "child" ? "e.g. Emma" : "e.g. Partner"}
                  placeholderTextColor={G.muted}
                  autoFocus
                  returnKeyType="done"
                />
              </View>
            </View>

            {addingType === "child" && (
              <EmojiPickerPanel
                selected={isEmoji(newAvatar) ? newAvatar : null}
                onSelect={setNewAvatar}
                onPhotoPress={handlePickPhotoForNew}
              />
            )}

            {addingType === "child" && (
              <>
                <Text style={s.ageLabel}>AGE</Text>
                <View style={s.ageGrid}>
                  {AGES.map(a => (
                    <Pressable
                      key={a}
                      onPress={() => setNewAge(a)}
                      style={[s.ageBtn, newAge === a && s.ageBtnSelected]}
                    >
                      <Text style={[s.ageBtnText, newAge === a && s.ageBtnTextSelected]}>{a}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <View style={s.formActions}>
              <Pressable onPress={resetForm} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmAdd}
                disabled={!canConfirmAdd}
                style={[s.confirmBtn, !canConfirmAdd && s.confirmBtnDisabled]}
              >
                <Text style={s.confirmText}>
                  {newName.trim()
                    ? `Add ${newName.trim()} \u2192`
                    : addingType === "child" ? "Add child \u2192" : "Add adult \u2192"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Add buttons */}
        {addingType === null && (
          <>
            <Pressable onPress={() => setAddingType("child")} style={s.addBtnPrimary}>
              <View style={s.addBtnIconPrimary}>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>+</Text>
              </View>
              <View>
                <Text style={s.addBtnTitle}>Add a child</Text>
                <Text style={s.addBtnSub}>Name, age, and a fun avatar</Text>
              </View>
            </Pressable>
            {adults.length < 3 && (
              <Pressable onPress={() => setAddingType("adult")} style={s.addBtnSecondary}>
                <View style={s.addBtnIconSecondary}>
                  <Text style={{ fontSize: 18 }}>{"\uD83D\uDC64"}</Text>
                </View>
                <View>
                  <Text style={[s.addBtnTitle, { color: G.deep }]}>Add an adult</Text>
                  <Text style={s.addBtnSub}>Partner, grandparent\u2026</Text>
                </View>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {isEditMode
          ? <BigBtn label={saving ? "Saving\u2026" : "Save changes"} onPress={handleSave} />
          : <BigBtn label="Continue \u2192" onPress={handleContinue} />
        }
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1 },
  header:   { paddingHorizontal: 20, flexShrink: 0 },
  navRow:   { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  navTitle: { flex: 1, fontFamily: F.bold, fontSize: 17, fontWeight: "700", color: G.deep, textAlign: "center" },
  sub:      { fontFamily: F.regular, fontSize: 13, color: G.muted, marginBottom: 18, lineHeight: 20 },
  scroll:   { paddingHorizontal: 20 },

  crewList:      { gap: 10, marginBottom: 16 },
  crewRow:       { backgroundColor: "#fff", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderColor: "#EDE9E3" },
  crewRowAdult:  { backgroundColor: "#1A1F2E", borderColor: "#1A1F2E" },
  avatarWrap:    { position: "relative", flexShrink: 0 },
  editBadge:     { position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: "#E8692A", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#fff" },
  editBadgeText: { fontSize: 9, color: "#fff" },
  crewInfo:      { flex: 1, minWidth: 0 },
  crewName:      { fontFamily: F.bold, fontSize: 15, color: G.deep },
  crewNameAdult: { color: "#fff" },
  crewMeta:      { fontFamily: F.regular, fontSize: 12, color: G.muted, marginTop: 2 },
  crewMetaAdult: { color: "rgba(255,255,255,0.45)" },
  removeBtn:     { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F5F2EE", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  removeBtnText: { fontSize: 11, color: G.muted },
  inlinePicker:  { marginTop: -4, marginBottom: 4 },

  infoBanner:      { backgroundColor: "#E8F7EF", borderRadius: 12, padding: 12, flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 14 },
  infoBannerCheck: { fontSize: 14, color: "#3DAA6E" },
  infoBannerText:  { fontFamily: F.regular, fontSize: 12, color: G.deep, flex: 1, lineHeight: 18 },

  addForm:      { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: G.orange, marginBottom: 16 },
  addFormTop:   { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 16 },
  avatarPicker: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#FDF0E9", borderWidth: 2, borderStyle: "dashed", borderColor: G.orange, alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  avatarPickerEmoji: { fontSize: 30 },
  addFormFields: { flex: 1 },
  addFormLabel:  { fontFamily: F.bold, fontSize: 10, color: G.muted, letterSpacing: 0.8, marginBottom: 4 },
  addFormInput:  { backgroundColor: "#F5F2EE", borderRadius: 10, height: 40, paddingHorizontal: 12, fontFamily: F.regular, fontSize: 14, color: G.deep },
  ageLabel:      { fontFamily: F.bold, fontSize: 10, color: G.muted, letterSpacing: 0.8, marginBottom: 8 },
  ageGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  ageBtn:        { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F5F2EE", alignItems: "center", justifyContent: "center" },
  ageBtnSelected: { backgroundColor: G.orange },
  ageBtnText:    { fontFamily: F.semibold, fontSize: 12, color: G.muted },
  ageBtnTextSelected: { color: "#fff", fontFamily: F.bold },
  formActions:   { flexDirection: "row", gap: 8 },
  cancelBtn:     { flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: "#E0DDD8", alignItems: "center", justifyContent: "center" },
  cancelText:    { fontFamily: F.semibold, fontSize: 13, color: G.muted },
  confirmBtn:    { flex: 2, height: 40, borderRadius: 10, backgroundColor: G.orange, alignItems: "center", justifyContent: "center" },
  confirmBtnDisabled: { backgroundColor: "rgba(232,105,42,0.35)" },
  confirmText:   { fontFamily: F.bold, fontSize: 13, color: "#fff" },

  addBtnPrimary:     { backgroundColor: "#FDF0E9", borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: G.orange, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  addBtnSecondary:   { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#E0DDD8", padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  addBtnIconPrimary: { width: 36, height: 36, borderRadius: 18, backgroundColor: G.orange, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addBtnIconSecondary: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F5F2EE", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addBtnTitle:   { fontFamily: F.semibold, fontSize: 14, color: G.orange },
  addBtnSub:     { fontFamily: F.regular, fontSize: 12, color: G.muted },

  bottomBar: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: G.bg, borderTopWidth: 0.5, borderTopColor: "#E0DDD8" },
});
