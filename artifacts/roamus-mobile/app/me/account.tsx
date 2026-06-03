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
  totalXp?: number;
};

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
  const { logout } = useAuth();

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

  // Explorer editing state
  const [editingExplorerId, setEditingExplorerId] = useState<string | null>(null);
  const [editExpName, setEditExpName] = useState("");
  const [editExpAge, setEditExpAge] = useState("");
  const [savingExplorer, setSavingExplorer] = useState(false);

  // Add family member state
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberAge, setNewMemberAge] = useState("");
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
    } catch {
      showToast("Failed to save — try again");
    } finally {
      setSavingProfile(false);
    }
  }

  function startEditExplorer(exp: Explorer) {
    setEditingExplorerId(exp.id);
    setEditExpName(exp.name);
    setEditExpAge(exp.age ?? "");
    setAddingMember(false);
  }

  function cancelEditExplorer() {
    setEditingExplorerId(null);
    setEditExpName("");
    setEditExpAge("");
  }

  async function saveExplorer() {
    if (!editingExplorerId || !editExpName.trim()) return;
    setSavingExplorer(true);
    try {
      const ageValue = editExpAge.trim() || undefined;
      const res = await fetch(`${API_BASE}/api/explorers/${editingExplorerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editExpName.trim(),
          age: ageValue,
          ageRange: ageValue,
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
    setNewMemberAge("");
    setNewMemberIsParent(false);
    cancelEditExplorer();
  }

  function cancelAddMember() {
    setAddingMember(false);
    setNewMemberName("");
    setNewMemberAge("");
    setNewMemberIsParent(false);
  }

  async function saveNewMember() {
    if (!user?.id || !newMemberName.trim()) return;
    setSavingNewMember(true);
    try {
      const res = await fetch(`${API_BASE}/api/explorers/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: newMemberName.trim(),
          age: newMemberAge.trim() || "unknown",
          profileType: newMemberIsParent ? "adult" : "kid",
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
                      {exp.isParent ? "Parent" : `Explorer${exp.age ? ` · Age ${exp.age}` : ""}`}
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
                    <TextInput
                      style={s.input}
                      value={editExpAge}
                      onChangeText={setEditExpAge}
                      placeholder="Age (optional)"
                      placeholderTextColor={G.muted}
                      keyboardType="number-pad"
                    />
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
                <TextInput
                  style={s.input}
                  value={newMemberAge}
                  onChangeText={setNewMemberAge}
                  placeholder="Age (optional)"
                  placeholderTextColor={G.muted}
                  keyboardType="number-pad"
                />
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
                <Text style={{ fontSize: 18 }}>{"🔑"}</Text>
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
                  <Text style={{ fontSize: 18 }}>{"📧"}</Text>
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
                <Text style={{ fontSize: 18 }}>{"🗑️"}</Text>
              </View>
              <Text style={[s.settingsTitle, { color: "#DC2626" }]}>Delete account</Text>
              <Text style={s.rowArrow}>{"›"}</Text>
            </Pressable>
          </View>

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
