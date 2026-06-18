import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosInstance"; 

// ─── helpers ──────────────────────────────────────────────────────────────────
function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const T = {
  bg:          "var(--bg-primary, #0d0f19)",
  surface:     "var(--bg-secondary, #13151f)",
  card:        "var(--bg-card, #1a1d2e)",
  border:      "var(--border, rgba(255,255,255,0.08))",
  muted:       "var(--text-secondary, #64748b)",
  text:        "var(--text-primary, #e2e8f0)",
  accent:      "var(--primary, #6366f1)",
  accentBg:    "rgba(99,102,241,0.12)",
  accentHover: "rgba(99,102,241,0.2)",
};

// ─── Password policy ─────────────────────────────────────────────────────────
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function getPasswordPolicyErrors(password) {
  const errors = [];
  if (!password || password.length < 8)        errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password))                 errors.push("One uppercase letter (A–Z)");
  if (!/[a-z]/.test(password))                 errors.push("One lowercase letter (a–z)");
  if (!/\d/.test(password))                    errors.push("One digit (0–9)");
  if (!/[^A-Za-z0-9]/.test(password))          errors.push("One special character (!@#$…)");
  return errors;
}

function PasswordPolicyHints({ password }) {
  const checks = [
    { label: "At least 8 characters",                   ok: password.length >= 8 },
    { label: "One uppercase letter (A–Z)",               ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a–z)",               ok: /[a-z]/.test(password) },
    { label: "One digit (0–9)",                          ok: /\d/.test(password) },
    { label: "One special character (!@#$%^&*…)",        ok: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <div style={{
      marginTop: 10, padding: "10px 14px",
      background: "rgba(99,102,241,0.07)",
      borderRadius: 8, border: "1px solid rgba(99,102,241,0.18)",
    }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Password requirements
      </p>
      {checks.map(({ label, ok }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: ok ? "#4ade80" : "#6b7280" }}>{ok ? "✓" : "○"}</span>
          <span style={{ fontSize: 12, color: ok ? "#d1fae5" : "#9ca3af" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── atoms ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 72 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 800, color: "#fff",
      border: "3px solid rgba(99,102,241,0.35)",
    }}>
      {getInitials(name)}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <p style={{
      margin: "0 0 5px", fontSize: 11, fontWeight: 600,
      color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      {children}
    </p>
  );
}

function FieldValue({ children, placeholder }) {
  const empty = !children;
  return (
    <p style={{
      margin: 0, fontSize: 14, fontWeight: 500,
      color: empty ? T.muted : T.text,
      fontStyle: empty ? "italic" : "normal",
    }}>
      {empty ? placeholder || "—" : children}
    </p>
  );
}

function TextInput({ value, onChange, type = "text", placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        width: "100%", boxSizing: "border-box",
        background: T.surface,
        border: `1px solid ${focused ? T.accent : T.border}`,
        borderRadius: 8, padding: "10px 14px",
        color: T.text, fontSize: 14, outline: "none",
        transition: "border-color 0.15s",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ✅ PwInput defined at MODULE level — fixes the cursor bug
function PwInput({ value, onChange, placeholder, show, onToggle }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          background: T.surface,
          border: `1px solid ${focused ? T.accent : T.border}`,
          borderRadius: 8, padding: "10px 42px 10px 14px",
          color: T.text, fontSize: 14, outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button
        type="button"
        onClick={onToggle}
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: T.muted, fontSize: 16, padding: 0, lineHeight: 1,
        }}
        tabIndex={-1}
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  const ok = msg.type === "success";
  return (
    <div style={{
      padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
      background: ok ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
      color: ok ? "#4ade80" : "#f87171",
      border: `1px solid ${ok ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
    }}>
      {msg.text}
    </div>
  );
}

function PrimaryBtn({ children, type = "button", onClick, loading, disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        background: "linear-gradient(135deg,#6366f1,#7c3aed)",
        color: "#fff", border: "none", borderRadius: 8,
        padding: "9px 22px", fontWeight: 600, fontSize: 13,
        cursor: (loading || disabled) ? "not-allowed" : "pointer",
        opacity: (loading || disabled) ? 0.65 : 1,
        transition: "opacity 0.15s", whiteSpace: "nowrap",
      }}
    >
      {loading ? "Saving…" : children}
    </button>
  );
}

function GhostBtn({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "transparent", color: T.muted,
        border: `1px solid ${T.border}`,
        borderRadius: 8, padding: "9px 22px",
        fontWeight: 500, fontSize: 13, cursor: "pointer",
        transition: "border-color 0.15s, color 0.15s", whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.text; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
    >
      {children}
    </button>
  );
}

// ─── Role display helper ───────────────────────────────────────────────────────
const ROLE_LABELS = {
  CUSTOMER:       "Customer",
  BUSINESS_OWNER: "Business Owner",
};

const TABS = [
  { id: "Profile",  icon: "👤" },
  { id: "Security", icon: "🔒" },
];

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ══════════════════════════════════════════════════════════════════════════════
function ProfileTab({ user, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ name: "", email: "", phone: "", address: "", role: "CUSTOMER" });
  const [msg, setMsg]         = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name:    user.name    || "",
        email:   user.email   || "",
        phone:   user.phone   || "",
        address: user.address || "",
        role:    user.role    || "CUSTOMER",
      });
    }
  }, [user]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setMsg({ type: "error", text: "Full name cannot be empty." });
    if (!form.email.trim()) return setMsg({ type: "error", text: "Email cannot be empty." });
    setLoading(true);
    try {
      const { data } = await api.put("/api/users/profile", form);
      onSaved(data);
      setEditing(false);
      setMsg({ type: "success", text: "Profile updated successfully!" });
    } catch {
      setMsg({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 3500);
    }
  };

  const handleCancel = () => {
    setForm({
      name:    user?.name    || "",
      email:   user?.email   || "",
      phone:   user?.phone   || "",
      address: user?.address || "",
      role:    user?.role    || "CUSTOMER",
    });
    setEditing(false);
    setMsg(null);
  };

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: T.text }}>Personal Information</h2>
            <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Your account details as saved.</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: T.accentBg, border: `1px solid rgba(99,102,241,0.3)`,
              borderRadius: 8, padding: "8px 16px",
              color: "#a5b4fc", fontWeight: 600, fontSize: 13,
              cursor: "pointer", transition: "background 0.15s",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = T.accentHover}
            onMouseLeave={(e) => e.currentTarget.style.background = T.accentBg}
          >
            ✏️ Edit Profile
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 32px" }}>
          <div style={{ padding: "14px 16px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
            <FieldLabel>Full Name</FieldLabel>
            <FieldValue>{user?.name}</FieldValue>
          </div>

          <div style={{ padding: "14px 16px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
            <FieldLabel>Email Address</FieldLabel>
            <FieldValue>{user?.email}</FieldValue>
          </div>

          <div style={{ padding: "14px 16px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
            <FieldLabel>Phone Number</FieldLabel>
            <FieldValue placeholder="Not set">{user?.phone}</FieldValue>
          </div>

          <div style={{ padding: "14px 16px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
            <FieldLabel>Role</FieldLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                background: T.accentBg, color: "#a5b4fc", letterSpacing: "0.05em",
              }}>
                {ROLE_LABELS[user?.role] || user?.role || "—"}
              </span>
            </div>
          </div>

          <div style={{
            padding: "14px 16px", background: T.surface, borderRadius: 10,
            border: `1px solid ${T.border}`, gridColumn: "1 / -1",
          }}>
            <FieldLabel>Address</FieldLabel>
            <FieldValue placeholder="Not set">{user?.address}</FieldValue>
          </div>
        </div>

        {msg && <div style={{ marginTop: 20 }}><Toast msg={msg} /></div>}
      </div>
    );
  }

  // ── EDIT MODE ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: T.text }}>Edit Profile</h2>
        <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Update your details below.</p>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px" }}>

          {/* Full Name */}
          <div>
            <FieldLabel>Full Name</FieldLabel>
            <TextInput value={form.name} onChange={set("name")} placeholder="Your full name" autoFocus />
          </div>

          {/* Email */}
          <div>
            <FieldLabel>Email Address</FieldLabel>
            <TextInput value={form.email} onChange={set("email")} type="email" placeholder="you@example.com" />
          </div>

          {/* Phone */}
          <div>
            <FieldLabel>Phone Number</FieldLabel>
            <TextInput value={form.phone} onChange={set("phone")} type="tel" placeholder="+91 98765 43210" />
          </div>

          {/* Role */}
          <div>
            <FieldLabel>Role</FieldLabel>
            <select
              value={form.role}
              onChange={set("role")}
              style={{
                width: "100%", boxSizing: "border-box",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "10px 14px",
                color: T.text, fontSize: 14, outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="CUSTOMER">Customer</option>
              <option value="BUSINESS_OWNER">Business Owner</option>
            </select>
          </div>

          {/* Address — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Address</FieldLabel>
            <TextInput value={form.address} onChange={set("address")} placeholder="Your city, state, country" />
          </div>
        </div>

        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <PrimaryBtn type="submit" loading={loading}>Save Changes</PrimaryBtn>
          <GhostBtn onClick={handleCancel}>Cancel</GhostBtn>
          {msg && <Toast msg={msg} />}
        </div>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECURITY TAB
// ══════════════════════════════════════════════════════════════════════════════
function SecurityTab({ user }) {
  const provider = user?.provider ?? "LOCAL";
  const isOAuth  = provider !== "LOCAL";

  const [form, setForm]         = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [msg, setMsg]           = useState(null);
  const [loading, setLoading]   = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ── Validation ───────────────────────────────────────────────────────────
    if (!form.currentPassword) {
      return setMsg({ type: "error", text: "Please enter your current password." });
    }

    // BUG FIX: was `length < 4` — now correctly checks >= 8
    const policyErrors = getPasswordPolicyErrors(form.newPassword);
    if (policyErrors.length > 0) {
      return setMsg({
        type: "error",
        text: "New password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit, and a special character.",
      });
    }

    if (form.newPassword !== form.confirm) {
      return setMsg({ type: "error", text: "Passwords do not match." });
    }

    setLoading(true);
    try {
      await api.put("/api/users/change-password", {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
      });
      setMsg({ type: "success", text: "Password changed successfully!" });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to change password. Check your current password.";
      setMsg({ type: "error", text: errMsg });
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  // Strength meter (4 criteria: length, uppercase, digit, special)
  const strength = (() => {
    const p = form.newPassword;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#f87171", "#fb923c", "#facc15", "#4ade80"][strength];

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: T.text }}>Change Password</h2>
      <p style={{ margin: "0 0 28px", fontSize: 13, color: T.muted }}>
        {isOAuth
          ? `Your account is linked via ${provider}. Password management is handled by your provider.`
          : "Keep your account secure with a strong password."}
      </p>

      {isOAuth ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px", borderRadius: 10,
          background: T.surface, border: `1px solid ${T.border}`,
        }}>
          <span style={{ fontSize: 20 }}>🔗</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>Signed in with {provider}</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: T.muted }}>
              To change your password, visit your {provider} account settings.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 440 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div>
              <FieldLabel>Current Password</FieldLabel>
              <PwInput
                value={form.currentPassword}
                onChange={set("currentPassword")}
                placeholder="Enter current password"
                show={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
              />
            </div>

            <div>
              <FieldLabel>New Password</FieldLabel>
              <PwInput
                value={form.newPassword}
                onChange={set("newPassword")}
                placeholder="Min. 8 characters"
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />

              {/* Strength bar */}
              {form.newPassword && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map((i) => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength ? strengthColor : "rgba(255,255,255,0.08)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</p>
                </div>
              )}

              {/* Policy checklist — always visible so user knows requirements */}
              <PasswordPolicyHints password={form.newPassword} />
            </div>

            <div>
              <FieldLabel>Confirm New Password</FieldLabel>
              <PwInput
                value={form.confirm}
                onChange={set("confirm")}
                placeholder="Repeat new password"
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />
              {form.confirm && (
                <p style={{
                  margin: "5px 0 0", fontSize: 11, fontWeight: 600,
                  color: form.newPassword === form.confirm ? "#4ade80" : "#f87171",
                }}>
                  {form.newPassword === form.confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}
            </div>
          </div>

          <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <PrimaryBtn type="submit" loading={loading}>Update Password</PrimaryBtn>
            {msg && <Toast msg={msg} />}
          </div>
        </form>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const [user, setUser]             = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [tab, setTab]               = useState("Profile");

  useEffect(() => {
    api.get("/api/users/me")
      .then(({ data }) => setUser(data))
      .catch(console.error)
      .finally(() => setPageLoading(false));
  }, []);

  if (pageLoading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: T.muted, fontSize: 14 }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "32px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center",
          gap: 6, fontSize: 13, color: T.muted }}>
          <Link to="/dashboard" style={{ color: T.muted, textDecoration: "none" }}>Home</Link>
          <span>›</span>
          <span style={{ color: T.text }}>My Profile</span>
        </div>

        {/* Header card */}
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 16, padding: "24px 28px",
          display: "flex", alignItems: "center", gap: 20,
          marginBottom: 16, flexWrap: "wrap",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -60, right: -60, width: 220, height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <Avatar name={user?.name || ""} size={72} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>
                {user?.name || "—"}
              </h1>
              {user?.role && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                  background: T.accentBg, color: "#a5b4fc", letterSpacing: "0.05em",
                }}>
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              )}
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 13, color: T.muted }}>{user?.email}</p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {user?.phone   && <span style={{ fontSize: 12, color: T.muted }}>📞 {user.phone}</span>}
              {user?.address && <span style={{ fontSize: 12, color: T.muted }}>📍 {user.address}</span>}
            </div>
          </div>

          <div style={{
            textAlign: "center", padding: "12px 22px", flexShrink: 0,
            background: T.accentBg, borderRadius: 12,
            border: "1px solid rgba(99,102,241,0.2)",
          }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: T.muted,
              letterSpacing: "0.08em", textTransform: "uppercase" }}>Member Since</p>
            <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "#818cf8" }}>
              {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 2, marginBottom: 16,
          background: T.card, borderRadius: 12, padding: 4,
          border: `1px solid ${T.border}`,
        }}>
          {TABS.map(({ id, icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, padding: "9px 0", borderRadius: 9,
                border: "none", cursor: "pointer", fontSize: 14,
                fontWeight: active ? 600 : 500,
                transition: "background 0.18s, color 0.18s",
                background: active
                  ? "linear-gradient(135deg,rgba(99,102,241,0.28),rgba(124,58,237,0.28))"
                  : "transparent",
                color: active ? "#c7d2fe" : T.muted,
              }}>
                {icon} {id}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 16, padding: "28px 32px",
        }}>
          {tab === "Profile"  && <ProfileTab user={user} onSaved={setUser} />}
          {tab === "Security" && <SecurityTab user={user} />}
        </div>

      </div>
    </div>
  );
}