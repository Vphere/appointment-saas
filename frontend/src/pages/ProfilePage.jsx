import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../context/useAuth";
import "./ProfilePage.css";

// ─── helpers ──────────────────────────────────────────────────────────────────
function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Validation ───────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-().]{7,15}$/;

function validateProfileForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Full name cannot be empty.";
  if (!form.email.trim()) errors.email = "Email address cannot be empty.";
  else if (!EMAIL_REGEX.test(form.email.trim()))
    errors.email = "Please enter a valid email address (e.g. user@example.com).";
  if (form.phone && form.phone.trim()) {
    if (/[a-zA-Z]/.test(form.phone))
      errors.phone = "Phone number cannot contain letters. Enter digits only.";
    else if (!PHONE_REGEX.test(form.phone.trim()))
      errors.phone = "Enter a valid phone number (7–15 digits, optionally starting with +).";
  }
  return errors;
}

// ─── Password policy ─────────────────────────────────────────────────────────
function getPasswordPolicyErrors(password) {
  const errors = [];
  if (!password || password.length < 8)   errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password))            errors.push("One uppercase letter (A–Z)");
  if (!/[a-z]/.test(password))            errors.push("One lowercase letter (a–z)");
  if (!/\d/.test(password))               errors.push("One digit (0–9)");
  if (!/[^A-Za-z0-9]/.test(password))     errors.push("One special character (!@#$…)");
  return errors;
}

function PasswordPolicyHints({ password }) {
  const checks = [
    { label: "At least 8 characters",            ok: password.length >= 8 },
    { label: "One uppercase letter (A–Z)",         ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a–z)",         ok: /[a-z]/.test(password) },
    { label: "One digit (0–9)",                   ok: /\d/.test(password) },
    { label: "One special character (!@#$%^&*…)", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <div className="pp-policy-hints">
      <p className="pp-policy-title">Password requirements</p>
      {checks.map(({ label, ok }) => (
        <div key={label} className="pp-policy-row">
          <span className="pp-policy-icon" style={{ color: ok ? "#4ade80" : "#6b7280" }}>{ok ? "✓" : "○"}</span>
          <span className="pp-policy-text"  style={{ color: ok ? "#d1fae5" : "#9ca3af" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 72 }) {
  return (
    <div className="pp-avatar" style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {getInitials(name)}
    </div>
  );
}

function FieldLabel({ children }) {
  return <p className="pp-field-label">{children}</p>;
}

function FieldValue({ children, placeholder }) {
  const empty = !children;
  return (
    <p className={`pp-field-value${empty ? " pp-field-value--empty" : ""}`}>
      {empty ? placeholder || "—" : children}
    </p>
  );
}

function TextInput({ value, onChange, type = "text", placeholder, autoFocus, hasError, onKeyDown }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      className={`pp-input${hasError ? " pp-input--error" : ""}`}
    />
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="pp-field-error">⚠ {msg}</p>;
}

function PwInput({ value, onChange, placeholder, show, onToggle, hasError }) {
  return (
    <div className="pp-pw-wrap">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`pp-pw-input${hasError ? " pp-pw-input--error" : ""}`}
      />
      <button type="button" onClick={onToggle} className="pp-pw-toggle" tabIndex={-1}>
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div className={`pp-toast pp-toast--${msg.type === "success" ? "success" : "error"}`}>
      {msg.text}
    </div>
  );
}

function PrimaryBtn({ children, type = "button", onClick, loading, disabled }) {
  return (
    <button type={type} onClick={onClick} disabled={loading || disabled} className="pp-btn-primary">
      {loading ? "Saving…" : children}
    </button>
  );
}

function GhostBtn({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="pp-btn-ghost">{children}</button>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_LABELS = { CUSTOMER: "Customer", BUSINESS_OWNER: "Business Owner" };
const TABS = [{ id: "Profile", icon: "👤" }, { id: "Security", icon: "🔒" }];

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ══════════════════════════════════════════════════════════════════════════════
function ProfileTab({ user, onSaved }) {
  const { loginUser } = useAuth();
  const [editing, setEditing]         = useState(false);
  const [form, setForm]               = useState({ name: "", email: "", phone: "", address: "", role: "CUSTOMER" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [msg, setMsg]                 = useState(null);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || "", email: user.email || "", phone: user.phone || "", address: user.address || "", role: user.role || "CUSTOMER" });
  }, [user]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handlePhoneKeyDown = (e) => {
    const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
    if (allowed.includes(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ['a','c','v','x','z'].includes(e.key.toLowerCase())) return;
    if (/^[0-9]$/.test(e.key)) return;
    if (['+', ' ', '-', '(', ')', '.'].includes(e.key)) return;
    e.preventDefault();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errors = validateProfileForm(form);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setLoading(true);
    try {
      const { data } = await api.put("/api/users/profile", form);
      if (data.newToken) loginUser(data.newToken);
      onSaved(data);
      setEditing(false);
      setFieldErrors({});
      setMsg({ type: "success", text: "Profile updated successfully!" });
    } catch {
      setMsg({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 3500);
    }
  };

  const handleCancel = () => {
    setForm({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "", address: user?.address || "", role: user?.role || "CUSTOMER" });
    setEditing(false); setFieldErrors({}); setMsg(null);
  };

  if (!editing) {
    return (
      <div>
        <div className="pp-view-header">
          <div>
            <h2 className="pp-view-title">Personal Information</h2>
            <p className="pp-view-sub">Your account details as saved.</p>
          </div>
          <button className="pp-edit-btn" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
        </div>

        <div className="pp-fields-grid">
          <div className="pp-field-box"><FieldLabel>Full Name</FieldLabel><FieldValue>{user?.name}</FieldValue></div>
          <div className="pp-field-box"><FieldLabel>Email Address</FieldLabel><FieldValue>{user?.email}</FieldValue></div>
          <div className="pp-field-box"><FieldLabel>Phone Number</FieldLabel><FieldValue placeholder="Not set">{user?.phone}</FieldValue></div>
          <div className="pp-field-box">
            <FieldLabel>Role</FieldLabel>
            <div className="pp-role-row"><span className="pp-role-badge">{ROLE_LABELS[user?.role] || user?.role || "—"}</span></div>
          </div>
          <div className="pp-field-box pp-field-box--full"><FieldLabel>Address</FieldLabel><FieldValue placeholder="Not set">{user?.address}</FieldValue></div>
        </div>

        {msg && <div style={{ marginTop: 20 }}><Toast msg={msg} /></div>}
      </div>
    );
  }

  return (
    <div>
      <div className="pp-edit-header">
        <h2 className="pp-edit-title">Edit Profile</h2>
        <p className="pp-edit-sub">Update your details below.</p>
      </div>
      <form onSubmit={handleSave} noValidate>
        <div className="pp-edit-grid">
          <div>
            <FieldLabel>Full Name <span className="pp-required">*</span></FieldLabel>
            <TextInput value={form.name} onChange={set("name")} placeholder="Your full name" autoFocus hasError={!!fieldErrors.name} />
            <FieldError msg={fieldErrors.name} />
          </div>
          <div>
            <FieldLabel>Email Address <span className="pp-required">*</span></FieldLabel>
            <TextInput value={form.email} onChange={set("email")} type="email" placeholder="you@example.com" hasError={!!fieldErrors.email} />
            <FieldError msg={fieldErrors.email} />
          </div>
          <div>
            <FieldLabel>Phone Number</FieldLabel>
            <TextInput value={form.phone} onChange={set("phone")} type="tel" placeholder="+91 98765 43210" hasError={!!fieldErrors.phone} onKeyDown={handlePhoneKeyDown} />
            <FieldError msg={fieldErrors.phone} />
            {!fieldErrors.phone && <p className="pp-field-hint">Digits only — letters are not allowed.</p>}
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <select value={form.role} onChange={set("role")} className="pp-select">
              <option value="CUSTOMER">Customer</option>
              <option value="BUSINESS_OWNER">Business Owner</option>
            </select>
          </div>
          <div className="pp-edit-grid-full">
            <FieldLabel>Address</FieldLabel>
            <TextInput value={form.address} onChange={set("address")} placeholder="Your city, state, country" />
          </div>
        </div>
        <div className="pp-form-actions">
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

  const [form, setForm]               = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [msg, setMsg]                 = useState(null);
  const [loading, setLoading]         = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword) return setMsg({ type: "error", text: "Please enter your current password." });
    const policyErrors = getPasswordPolicyErrors(form.newPassword);
    if (policyErrors.length > 0) return setMsg({ type: "error", text: "New password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit, and a special character." });
    if (form.newPassword !== form.confirm) return setMsg({ type: "error", text: "Passwords do not match." });
    setLoading(true);
    try {
      await api.put("/api/users/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setMsg({ type: "success", text: "Password changed successfully!" });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to change password. Check your current password." });
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const strength = (() => {
    const p = form.newPassword; if (!p) return 0;
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ["","Weak","Fair","Good","Strong"][strength];
  const strengthColor = ["","#f87171","#fb923c","#facc15","#4ade80"][strength];

  return (
    <div>
      <h2 className="pp-security-title">Change Password</h2>
      <p className="pp-security-sub">
        {isOAuth ? `Your account is linked via ${provider}. Password management is handled by your provider.` : "Keep your account secure with a strong password."}
      </p>

      {isOAuth ? (
        <div className="pp-oauth-notice">
          <span className="pp-oauth-icon">🔗</span>
          <div>
            <p className="pp-oauth-title">Signed in with {provider}</p>
            <p className="pp-oauth-desc">To change your password, visit your {provider} account settings.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="pp-pw-form">
          <div className="pp-pw-fields">
            <div>
              <FieldLabel>Current Password</FieldLabel>
              <PwInput value={form.currentPassword} onChange={set("currentPassword")} placeholder="Enter current password" show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
            </div>
            <div>
              <FieldLabel>New Password</FieldLabel>
              <PwInput value={form.newPassword} onChange={set("newPassword")} placeholder="Min. 8 characters" show={showNew} onToggle={() => setShowNew((v) => !v)} />
              {form.newPassword && (
                <div className="pp-strength-wrap">
                  <div className="pp-strength-bars">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="pp-strength-bar" style={{ background: i <= strength ? strengthColor : undefined }} />
                    ))}
                  </div>
                  <p className="pp-strength-label" style={{ color: strengthColor }}>{strengthLabel}</p>
                </div>
              )}
              <PasswordPolicyHints password={form.newPassword} />
            </div>
            <div>
              <FieldLabel>Confirm New Password</FieldLabel>
              <PwInput value={form.confirm} onChange={set("confirm")} placeholder="Repeat new password" show={showNew} onToggle={() => setShowNew((v) => !v)} />
              {form.confirm && (
                <p className={`pp-pw-match pp-pw-match--${form.newPassword === form.confirm ? "ok" : "bad"}`}>
                  {form.newPassword === form.confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}
            </div>
          </div>
          <div className="pp-form-actions" style={{ marginTop: 28 }}>
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
  const [user, setUser]               = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [tab, setTab]                 = useState("Profile");

  useEffect(() => {
    api.get("/api/users/me")
      .then(({ data }) => setUser(data))
      .catch(console.error)
      .finally(() => setPageLoading(false));
  }, []);

  if (pageLoading) {
    return (
      <div className="pp-loading pp-root">
        <p>Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="pp-page pp-root">
      <div className="pp-inner">

        <div className="pp-breadcrumb">
          <Link to="/dashboard">Home</Link>
          <span>›</span>
          <span className="pp-breadcrumb-current">My Profile</span>
        </div>

        <div className="pp-header-card">
          <div className="pp-header-glow" />
          <Avatar name={user?.name || ""} size={72} />
          <div className="pp-header-info">
            <div className="pp-header-name-row">
              <h1 className="pp-header-name">{user?.name || "—"}</h1>
              {user?.role && <span className="pp-role-badge">{ROLE_LABELS[user.role] || user.role}</span>}
            </div>
            <p className="pp-header-email">{user?.email}</p>
            <div className="pp-header-meta">
              {user?.phone   && <span className="pp-header-meta-item">📞 {user.phone}</span>}
              {user?.address && <span className="pp-header-meta-item">📍 {user.address}</span>}
            </div>
          </div>
          <div className="pp-header-since">
            <p className="pp-header-since-label">Member Since</p>
            <p className="pp-header-since-year">{new Date().getFullYear()}</p>
          </div>
        </div>

        <div className="pp-tabs">
          {TABS.map(({ id, icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`pp-tab-btn${tab === id ? " pp-tab-btn--active" : ""}`}>
              {icon} {id}
            </button>
          ))}
        </div>

        <div className="pp-content-card">
          {tab === "Profile"  && <ProfileTab user={user} onSaved={setUser} />}
          {tab === "Security" && <SecurityTab user={user} />}
        </div>

      </div>
    </div>
  );
}