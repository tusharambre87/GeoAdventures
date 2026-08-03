import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "@/lib/authContext";
import { useAuth } from "@/lib/authContext";
import { F, G } from "@/lib/tokens";

type UserData = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
};

type Explorer = {
  id: string;
  name: string;
  isParent?: boolean;
  age?: string | null;
  birthday?: string | null;
  totalXp?: number;
};

function ageFromBirthday(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const d = new Date(birthday);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const mDiff = today.getMonth() - d.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

function formatBirthdayInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function birthdayToIso(mmddyyyy: string): string | null {
  const parts = mmddyyyy.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return null;
  const [mm, dd, yyyy] = parts;
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  if (isNaN(d.getTime())) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

const EXPLORER_COLORS = ["#7C3AED", "#E8692A", "#1A1F2E", "#DC2626", "#16A34A"];

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);
  return (
    <Animated.View style={[t.toast, { opacity }]} pointerEvents="none">
      <Text style={t.toastText}>{message}</Text>
    </Animated.View>
  );
}

const t = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "#1A1F2E",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 100,
  },
  toastText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: "#fff" },
});

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { logout, refreshUser } = useAuth();

  const [user, setUser] = useState<UserData | null>(null);
  const [explorers, setExplorers] = useState<Explorer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Dev-only: date override for home/today screen testing
  const [devDateValue, setDevDateValue] = useState<string>("");
  const [devDateSaved, setDevDateSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!__DEV__) return;
    AsyncStorage.getItem("dev_date_override").then(v => {
      setDevDateSaved(v);
      setDevDateValue(v ?? "");
    }).catch(() => {});
  }, []);

  // Explorer editing state
  const [editingExplorerId, setEditingExplorerId] = useState<string | null>(null);
  const [editExpName, setEditExpName] = useState("");
  const [editExpBirthday, setEditExpBirthday] = useState("");
  const [savingExplorer, setSavingExplorer] = useState(false);

  // Add family member state
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberBirthday, setNewMemberBirthday] = useState("");
  const [newMemberIsParent, setNewMemberIsParent] = useState(false);
  const [savingNewMember, setSavingNewMember] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const authHeaders = { Authorization: `Bearer ${token}` };

      const userRes = await fetch(`${API_BASE}/api/auth/user`, { headers: authHeaders });
      if (!userRes.ok) throw new Error("Failed to load user");
      const userData = await userRes.json();
      const u = userData.user ?? userData;

      const [, expRes] = await Promise.all([
        Promise.resolve(u),
        u.id ? fetch(`${API_BASE}/api/explorers/user/${u.id}`) : Promise.resolve(null),
      ]);

      setUser(u);
      setFirstName(u.firstName ?? "");
      setLastName(u.lastName ?? "");

      if (expRes && expRes.ok) {
        const expData = await expRes.json();
        setExplorers(Array.isArray(expData) ? expData : expData.explorers ?? []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function reloadExplorers() {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/explorers/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setExplorers(Array.isArray(data) ? data : data.explorers ?? []);
      }
    } catch {}
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
  }

  async function saveProfile() {
    if (!user) return;
    setSavingProfile(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/auth/user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName }),
      });
      if (!res.ok) throw new Error("Save failed");
      setUser((prev) => (prev ? { ...prev, firstName, lastName } : prev));
      setEditingProfile(false);
      showToast("Profile updated");
      await refreshUser();
    } catch {
      showToast("Failed to save — try again");
    } finally {
      setSavingProfile(false);
    }
  }

  function startEditExplorer(exp: Explorer) {
    setEditingExplorerId(exp.id);
    setEditExpName(exp.name);
    setEditExpBirthday(isoToDisplay(exp.birthday));
    setAddingMember(false);
  }

  function cancelEditExplorer() {
    setEditingExplorerId(null);
    setEditExpName("");
    setEditExpBirthday("");
  }

  async function saveExplorer() {
    if (!editingExplorerId || !editExpName.trim()) return;
    setSavingExplorer(true);
    try {
      const isoB = birthdayToIso(editExpBirthday);
      const calcAge = isoB ? String(ageFromBirthday(isoB) ?? "") : undefined;
      const res = await fetch(`${API_BASE}/api/explorers/${editingExplorerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editExpName.trim(),
          ...(isoB ? { birthday: isoB, age: calcAge } : {}),
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      cancelEditExplorer();
      await reloadExplorers();
      showToast("Explorer updated");
    } catch {
      showToast("Failed to save — try again");
    } finally {
      setSavingExplorer(false);
    }
  }

  function startAddMember() {
    setAddingMember(true);
    setNewMemberName("");
    setNewMemberBirthday("");
    setNewMemberIsParent(false);
    cancelEditExplorer();
  }

  function cancelAddMember() {
    setAddingMember(false);
    setNewMemberName("");
    setNewMemberBirthday("");
    setNewMemberIsParent(false);
  }

  async function saveNewMember() {
    if (!user?.id || !newMemberName.trim()) return;
    setSavingNewMember(true);
    try {
      const isoB = birthdayToIso(newMemberBirthday);
      const calcAge = isoB ? String(ageFromBirthday(isoB) ?? "") : undefined;
      const res = await fetch(`${API_BASE}/api/explorers/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: newMemberName.trim(),
          age: calcAge || "unknown",
          profileType: newMemberIsParent ? "adult" : "kid",
          ...(isoB ? { birthday: isoB } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Create failed");
      }
      cancelAddMember();
      await reloadExplorers();
      showToast("Family member added");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to add — try again");
    } finally {
      setSavingNewMember(false);
    }
  }

  function handleChangePassword() {
    if (!user) return;
    Alert.alert("Change Password", "Check your email — we'll send a reset link.", [
      { text: "OK" },
    ]);
    fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    }).catch(() => {});
  }

  async function handleSendEmailChange() {
    if (!user || !newEmail.trim()) return;
    setSendingEmail(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/email/change-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id, newEmail: newEmail.trim() }),
      });
      if (!res.ok) throw new Error("Server error");
      setEmailSent(true);
    } catch {
      showToast("Failed to send — try again");
    } finally {
      setSendingEmail(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all trip data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Contact Support",
              "Please contact support@roamus.app to complete account deletion."
            );
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    await logout();
    router.replace("/onboarding/splash");
  }

  async function saveDevDate(date: string) {
    const trimmed = date.trim();
    if (!trimmed) { await clearDevDate(); return; }
    // Accept YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      showToast("Format: YYYY-MM-DD"); return;
    }
    await AsyncStorage.setItem("dev_date_override", trimmed);
    setDevDateSaved(trimmed);
    setDevDateValue(trimmed);
    showToast("Dev date set to " + trimmed + " — reload Home");
  }

  async function clearDevDate() {
    await AsyncStorage.removeItem("dev_date_override");
    setDevDateSaved(null);
    setDevDateValue("");
    showToast("Dev date cleared — back to today");
  }

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Explorer";
  const initials = (user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Toast message={toastMsg} visible={toastVisible} />

      <View style={s.topBar}>
        <Pressable style={s.backPill} onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backPillText}>{"← Me"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={G.orange} size="large" />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        >
          <View style={s.subHeader}>
            <Text style={s.subH}>Account</Text>
            <Text style={s.subS}>Family & traveler profiles</Text>
          </View>

          {/* Profile card */}
          <View style={s.profileCard}>
            <View style={s.avatarWrap}>
              <LinearGradient colors={[G.orange, G.amber]} style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </LinearGradient>
            </View>

            {editingProfile ? (
              <View style={s.editForm}>
                <TextInput
                  style={s.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={G.muted}
                />
                <TextInput
                  style={s.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={G.muted}
                />
                <View style={s.editBtns}>
                  <Pressable
                    style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => setEditingProfile(false)}
                  >
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.85 }]}
                    onPress={saveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.saveBtnText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Text style={s.profileName}>{displayName}</Text>
                <Text style={s.profileEmail}>{user?.email}</Text>
                <Pressable
                  style={({ pressed }) => [s.editProfileBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => setEditingProfile(true)}
                >
                  <Text style={s.editProfileBtnText}>Edit profile</Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Family explorers */}
          <Text style={s.secLbl}>FAMILY EXPLORERS</Text>
          <View style={s.card}>
            {explorers.map((exp, i) => (
              <View key={exp.id}>
                <View style={[s.travRow, (i < explorers.length - 1 || editingExplorerId !== exp.id) && s.travBorder]}>
                  <View style={[s.travAvatar, { backgroundColor: EXPLORER_COLORS[i % EXPLORER_COLORS.length] }]}>
                    <Text style={s.travInitial}>{exp.name[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.travName}>{exp.name}</Text>
                    <Text style={s.travRole}>
                      {exp.isParent ? "Parent" : (() => {
                        const bAge = ageFromBirthday(exp.birthday);
                        const displayAge = bAge != null ? bAge : (exp.age && exp.age !== "unknown" ? exp.age : null);
                        return `Explorer${displayAge != null ? ` · Age ${displayAge}` : ""}`;
                      })()}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      editingExplorerId === exp.id ? cancelEditExplorer() : startEditExplorer(exp)
                    }
                    hitSlop={8}
                  >
                    <Text style={[s.travEdit, editingExplorerId === exp.id && { color: G.muted }]}>
                      {editingExplorerId === exp.id ? "Cancel" : "Edit"}
                    </Text>
                  </Pressable>
                </View>

                {editingExplorerId === exp.id && (
                  <View style={s.explorerForm}>
                    <TextInput
                      style={s.input}
                      value={editExpName}
                      onChangeText={setEditExpName}
                      placeholder="Name"
                      placeholderTextColor={G.muted}
                      autoFocus
                    />
                    <View>
                      <TextInput
                        style={s.input}
                        value={editExpBirthday}
                        onChangeText={v => setEditExpBirthday(formatBirthdayInput(v))}
                        placeholder="Birthday  MM/DD/YYYY"
                        placeholderTextColor={G.muted}
                        keyboardType="number-pad"
                        maxLength={10}
                      />
                      {(() => {
                        const iso = birthdayToIso(editExpBirthday);
                        const a = ageFromBirthday(iso);
                        return a != null ? (
                          <Text style={s.ageHint}>Age {a}</Text>
                        ) : null;
                      })()}
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        s.saveBtn,
                        pressed && { opacity: 0.85 },
                        !editExpName.trim() && s.disabledBtn,
                      ]}
                      onPress={saveExplorer}
                      disabled={savingExplorer || !editExpName.trim()}
                    >
                      {savingExplorer ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={s.saveBtnText}>Save changes</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            ))}

            {/* Add family member row */}
            {!addingMember ? (
              <Pressable style={s.addTravRow} onPress={startAddMember}>
                <View style={s.addTravIcon}>
                  <Text style={{ fontSize: 18, color: G.orange }}>{"+"}</Text>
                </View>
                <Text style={s.addTravLabel}>Add family member</Text>
              </Pressable>
            ) : (
              <View style={s.explorerForm}>
                <Text style={s.formTitle}>New family member</Text>
                <TextInput
                  style={s.input}
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                  placeholder="Name"
                  placeholderTextColor={G.muted}
                  autoFocus
                />
                <View>
                  <TextInput
                    style={s.input}
                    value={newMemberBirthday}
                    onChangeText={v => setNewMemberBirthday(formatBirthdayInput(v))}
                    placeholder="Birthday  MM/DD/YYYY"
                    placeholderTextColor={G.muted}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  {(() => {
                    const iso = birthdayToIso(newMemberBirthday);
                    const a = ageFromBirthday(iso);
                    return a != null ? (
                      <Text style={s.ageHint}>Age {a}</Text>
                    ) : null;
                  })()}
                </View>
                <View style={s.toggleRow}>
                  <Text style={s.toggleLabel}>Parent / adult</Text>
                  <Switch
                    value={newMemberIsParent}
                    onValueChange={setNewMemberIsParent}
                    trackColor={{ false: "rgba(26,31,46,0.15)", true: G.orange }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={s.editBtns}>
                  <Pressable
                    style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
                    onPress={cancelAddMember}
                  >
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      s.saveBtn,
                      pressed && { opacity: 0.85 },
                      !newMemberName.trim() && s.disabledBtn,
                    ]}
                    onPress={saveNewMember}
                    disabled={savingNewMember || !newMemberName.trim()}
                  >
                    {savingNewMember ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.saveBtnText}>Add member</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Account settings */}
          <Text style={s.secLbl}>ACCOUNT SETTINGS</Text>
          <View style={s.card}>
            <Pressable
              style={[s.settingsRow, s.rowBorder]}
              onPress={handleChangePassword}
            >
              <View style={[s.settingsIcon, { backgroundColor: "#EFF6FF" }]}>
                <Text style={{ fontSize: 18 }}>{"\uD83D\uDD11"}</Text>
              </View>
              <Text style={s.settingsTitle}>Change password</Text>
              <Text style={s.rowArrow}>{"›"}</Text>
            </Pressable>

            {/* Change email */}
            <View style={[s.settingsRow, s.rowBorder, { flexDirection: "column", alignItems: "stretch", paddingVertical: 12 }]}>
              <Pressable
                style={s.settingsRowInner}
                onPress={() => { setChangingEmail((v) => !v); setEmailSent(false); setNewEmail(""); }}
              >
                <View style={[s.settingsIcon, { backgroundColor: G.oLt }]}>
                  <Text style={{ fontSize: 18 }}>{"\uD83D\uDCE7"}</Text>
                </View>
                <Text style={s.settingsTitle}>Change email</Text>
                <Text style={s.rowArrow}>{"›"}</Text>
              </Pressable>
              {changingEmail && !emailSent && (
                <View style={s.emailForm}>
                  <TextInput
                    style={s.input}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="New email address"
                    placeholderTextColor={G.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Pressable
                    style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleSendEmailChange}
                    disabled={sendingEmail || !newEmail.trim()}
                  >
                    {sendingEmail ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.saveBtnText}>{"Send verification →"}</Text>
                    )}
                  </Pressable>
                </View>
              )}
              {changingEmail && emailSent && (
                <Text style={s.emailSentMsg}>
                  {"Check your inbox to confirm the change."}
                </Text>
              )}
            </View>

            <Pressable
              style={s.settingsRow}
              onPress={handleDeleteAccount}
            >
              <View style={[s.settingsIcon, { backgroundColor: "#FEF2F1" }]}>
                <Text style={{ fontSize: 18 }}>{"\uD83D\uDDD1\uFE0F"}</Text>
              </View>
              <Text style={[s.settingsTitle, { color: "#DC2626" }]}>Delete account</Text>
              <Text style={s.rowArrow}>{"›"}</Text>
            </Pressable>
          </View>

          {/* Dev Tools — __DEV__ only */}
          {__DEV__ && (
            <>
              <Text style={s.secLbl}>{"DEV TOOLS \u2014 DATE OVERRIDE"}</Text>
              <View style={[s.card, { paddingHorizontal: 16, paddingVertical: 14, gap: 10 }]}>
                <Text style={{ fontFamily: F.regular, fontSize: 12, color: G.muted, lineHeight: 17 }}>
                  {"Set a fake \u2018today\u2019 so Home shows a specific state. Shake to reload after setting."}
                </Text>
                {devDateSaved ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1, backgroundColor: "#F0FDF4", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#BBF7D0" }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 13, color: "#16A34A" }}>
                        {"\u2713 Active: " + devDateSaved}
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [{ backgroundColor: "#FEF2F2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#FECACA" }, pressed && { opacity: 0.7 }]}
                      onPress={clearDevDate}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 13, color: "#DC2626" }}>Clear</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ backgroundColor: "#F9F9FB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(26,31,46,0.08)" }}>
                    <Text style={{ fontFamily: F.regular, fontSize: 12, color: G.muted }}>{"No override — using today"}</Text>
                  </View>
                )}

                {/* Custom date input */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0 }]}
                    value={devDateValue}
                    onChangeText={setDevDateValue}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={G.muted}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={() => saveDevDate(devDateValue)}
                  />
                  <Pressable
                    style={({ pressed }) => [{ backgroundColor: G.orange, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.85 }]}
                    onPress={() => saveDevDate(devDateValue)}
                  >
                    <Text style={{ fontFamily: F.bold, fontSize: 13, color: "#fff" }}>Set</Text>
                  </Pressable>
                </View>

                {/* Quick-set buttons */}
                <Text style={{ fontFamily: F.bold, fontSize: 11, color: G.muted, letterSpacing: 0.5, marginTop: 2 }}>QUICK SET</Text>
                <View style={{ gap: 6 }}>
                  {[
                    { label: "State 1 — Active (Aug 3)", date: "2026-08-03" },
                    { label: "State 2 — Just completed (Aug 5)", date: "2026-08-05" },
                    { label: "State 2 — Just completed (Aug 6)", date: "2026-08-06" },
                  ].map(({ label, date }) => (
                    <Pressable
                      key={date}
                      style={({ pressed }) => [{
                        flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
                        backgroundColor: devDateSaved === date ? "#FDF0E9" : "#F5F5F7",
                        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                        borderWidth: 1, borderColor: devDateSaved === date ? G.orange : "rgba(26,31,46,0.08)",
                        opacity: pressed ? 0.75 : 1,
                      }]}
                      onPress={() => saveDevDate(date)}
                    >
                      <Text style={{ fontFamily: F.regular, fontSize: 13, color: G.deep, flex: 1 }}>{label}</Text>
                      <Text style={{ fontFamily: F.bold, fontSize: 12, color: devDateSaved === date ? G.orange : G.muted }}>{date}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Sign out */}
          <Pressable
            style={({ pressed }) => [s.signOutBtn, pressed && { opacity: 0.8 }]}
            onPress={handleSignOut}
          >
            <Text style={s.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: G.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { fontFamily: F.regular, fontSize: 14, color: G.muted, marginBottom: 16, textAlign: "center" },
  retryBtn: { backgroundColor: G.orange, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { fontFamily: F.bold, fontSize: 14, color: "#fff" },
  topBar: { paddingHorizontal: 16, paddingVertical: 10 },
  backPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26,31,46,0.08)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  backPillText: { fontFamily: F.bold, fontSize: 13, color: G.deep },
  subHeader: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
  subH: { fontFamily: F.bold, fontSize: 26, color: G.deep, letterSpacing: -0.5, marginBottom: 3 },
  subS: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(26,31,46,0.08)",
    padding: 22,
    alignItems: "center",
  },
  avatarWrap: { marginBottom: 14 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: F.bold, fontSize: 32, color: "#fff" },
  profileName: { fontFamily: F.bold, fontSize: 20, color: G.deep, marginBottom: 4, textAlign: "center" },
  profileEmail: { fontFamily: F.regular, fontSize: 14, color: G.muted, marginBottom: 16, textAlign: "center" },
  editProfileBtn: {
    width: "100%",
    backgroundColor: G.bg,
    borderWidth: 1.5,
    borderColor: "rgba(26,31,46,0.13)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  editProfileBtnText: { fontFamily: F.bold, fontSize: 14, color: G.deep },
  editForm: { width: "100%", gap: 10 },
  input: {
    backgroundColor: G.bg,
    borderWidth: 1.5,
    borderColor: "rgba(26,31,46,0.13)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: F.regular,
    fontSize: 14,
    color: G.deep,
  },
  editBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    backgroundColor: G.bg,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(26,31,46,0.12)",
  },
  cancelBtnText: { fontFamily: F.semibold, fontSize: 14, color: G.muted },
  saveBtn: {
    flex: 1,
    backgroundColor: G.orange,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnText: { fontFamily: F.bold, fontSize: 14, color: "#fff" },
  disabledBtn: { opacity: 0.45 },
  secLbl: {
    fontFamily: F.bold,
    fontSize: 11,
    color: G.muted,
    letterSpacing: 0.8,
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 16,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(26,31,46,0.08)",
  },
  travRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12 },
  travBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(26,31,46,0.08)" },
  travAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  travInitial: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  travName: { fontFamily: F.bold, fontSize: 14, color: G.deep, marginBottom: 1 },
  travRole: { fontFamily: F.regular, fontSize: 12, color: G.muted },
  travEdit: { fontFamily: F.bold, fontSize: 12, color: G.orange },
  explorerForm: {
    backgroundColor: G.bg,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(26,31,46,0.08)",
  },
  formTitle: { fontFamily: F.bold, fontSize: 13, color: G.deep, marginBottom: 2 },
  ageHint: { fontFamily: F.regular, fontSize: 11, color: G.orange, marginTop: 4, marginLeft: 2 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  toggleLabel: { fontFamily: F.regular, fontSize: 14, color: G.deep },
  addTravRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  addTravIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: G.oLt,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: G.orange,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  addTravLabel: { fontFamily: F.bold, fontSize: 14, color: G.orange },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  settingsRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(26,31,46,0.08)" },
  settingsIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  settingsTitle: { fontFamily: F.bold, fontSize: 15, color: G.deep, flex: 1 },
  rowArrow: { fontFamily: F.regular, fontSize: 20, color: "#C4C8D8" },
  emailForm: { paddingHorizontal: 18, paddingBottom: 10, gap: 10 },
  emailSentMsg: {
    fontFamily: F.regular,
    fontSize: 13,
    color: G.green,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: "rgba(220,38,38,0.25)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: { fontFamily: F.bold, fontSize: 14, color: "#DC2626" },
});
