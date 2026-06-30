import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosInstance";
import { getBusinessReviews } from "../api/reviews";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import "./BusinessAnalytics.css";

// ── Palette (used only for dynamic values — colours for charts, accents) ──────
const C = {
  indigo:  "#6574f8", violet:  "#7c6af7", sky:     "#38bdf8",
  teal:    "#2dd4bf", emerald: "#34d399", amber:   "#fbbf24",
  rose:    "#fb7185", slate:   "#94a3b8", dim:     "#6b7a99",
  border:  "rgba(255,255,255,0.06)", borderHi: "rgba(255,255,255,0.12)",
};

const PIE_PALETTE = ["#6574f8","#38bdf8","#2dd4bf","#34d399","#a78bfa","#fbbf24","#94a3b8"];

const STATUS_CFG = {
  COMPLETED: { color: C.emerald, bg: "rgba(52,211,153,0.08)",  label: "Completed" },
  PENDING:   { color: C.amber,   bg: "rgba(251,191,36,0.08)",  label: "Pending"   },
  CONFIRMED: { color: C.sky,     bg: "rgba(56,189,248,0.08)",  label: "Confirmed" },
  CANCELLED: { color: C.rose,    bg: "rgba(251,113,133,0.08)", label: "Cancelled" },
};

const fmt  = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const fmtK = (n) => n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(1)}k`:`₹${n}`;
const pct  = (v,t) => t>0?((v/t)*100).toFixed(1)+"%":"0%";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Card({ children, className = "", hover = false }) {
  return (
    <div className={`ba-card${hover ? " ba-card--hover" : ""}${className ? " " + className : ""}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div className="ba-section-title-wrap">
      <h3 className="ba-section-title">{children}</h3>
      {sub && <p className="ba-section-sub">{sub}</p>}
    </div>
  );
}

function Badge({ status }) {
  const cfg = STATUS_CFG[status] || { color: C.slate, bg: "rgba(148,163,184,0.08)", label: status };
  return (
    <span className="ba-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function KpiCard({ label, value, sub, accent, icon, pctVal }) {
  return (
    <Card hover className="ba-kpi-card">
      <div className="ba-kpi-accent-bar" style={{ background: accent }} />
      <div className="ba-kpi-inner">
        <div className="ba-kpi-body">
          <p className="ba-section-label">{label}</p>
          <p className="ba-kpi-value" style={{ color: accent }}>{value}</p>
          {sub && <p className="ba-kpi-sub">{sub}</p>}
        </div>
        <div className="ba-kpi-icon" style={{ background: `${accent}18` }}>{icon}</div>
      </div>
      {pctVal !== undefined && (
        <div className="ba-kpi-bar-track">
          <div className="ba-kpi-bar-fill" style={{ width: pctVal + "%", background: accent }} />
        </div>
      )}
    </Card>
  );
}

function ChartTip({ active, payload, label, money = false }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ba-tooltip">
      <p className="ba-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="ba-tooltip-row" style={{ color: p.color || C.indigo }}>
          {p.name}: {money || p.name?.toLowerCase().includes("revenue") ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function DonutChart({ data, total, centerLabel }) {
  return (
    <div className="ba-donut-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name"
            cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={3} strokeWidth={0}>
            {data.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
          </Pie>
          <Tooltip
            formatter={(v, name) => [name.toLowerCase().includes("revenue") ? fmt(v) : v, name]}
            contentStyle={{ background: "#1a2035", border: `1px solid ${C.borderHi}`, borderRadius: 10, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="ba-donut-center">
        <p className="ba-donut-center-value">{total}</p>
        <p className="ba-donut-center-label">{centerLabel}</p>
      </div>
    </div>
  );
}

function PieLegend({ data, fmtValue }) {
  return (
    <div className="ba-pie-legend">
      {data.map(({ name, value }, i) => (
        <div key={i} className="ba-pie-legend-row">
          <div className="ba-pie-legend-left">
            <div className="ba-pie-legend-dot" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
            <span className="ba-pie-legend-name">{name}</span>
          </div>
          <span className="ba-pie-legend-value">{fmtValue ? fmtValue(value) : value}</span>
        </div>
      ))}
    </div>
  );
}

function TabBtn({ id, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`ba-tab-btn${active ? " ba-tab-btn--active" : ""}`}>
      {label}
      {badge != null && badge > 0 && <span className="ba-tab-badge">{badge}</span>}
    </button>
  );
}

function EmptyState({ text }) {
  return <div className="ba-empty"><p>{text}</p></div>;
}

// ── CSV / JSON exports ────────────────────────────────────────────────────────
function downloadCSV(data) {
  if (!data) return;
  const lines = [];
  lines.push("BOOKEASE ANALYTICS REPORT");
  lines.push(`Generated,${new Date().toLocaleString("en-IN")}`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push(`Total Revenue (INR),${data.totalRevenue ?? 0}`);
  lines.push(`Total Appointments,${data.totalAppointments ?? 0}`);
  lines.push(`Completed,${data.totalCompleted ?? 0}`);
  lines.push(`Cancelled,${data.totalCancelled ?? 0}`);
  lines.push(`Pending,${data.totalPending ?? 0}`);
  lines.push(`Confirmed,${data.totalConfirmed ?? 0}`);
  lines.push("");
  lines.push("REVENUE BY MONTH");
  lines.push("Month,Revenue (INR)");
  if (data.revenueByMonth) Object.entries(data.revenueByMonth).sort(([a],[b])=>a.localeCompare(b)).forEach(([m,r])=>lines.push(`${m},${r}`));
  lines.push("");
  lines.push("APPOINTMENTS BY MONTH");
  lines.push("Month,Count");
  if (data.appointmentsByMonth) Object.entries(data.appointmentsByMonth).sort(([a],[b])=>a.localeCompare(b)).forEach(([m,c])=>lines.push(`${m},${c}`));
  lines.push("");
  lines.push("REVENUE BY BUSINESS");
  lines.push("Business,Revenue (INR)");
  if (data.revenueByBusiness) Object.entries(data.revenueByBusiness).sort(([,a],[,b])=>b-a).forEach(([n,r])=>lines.push(`"${n}",${r}`));
  lines.push("");
  lines.push("REVENUE BY SERVICE");
  lines.push("Service,Revenue (INR)");
  if (data.revenueByService) Object.entries(data.revenueByService).sort(([,a],[,b])=>b-a).forEach(([n,r])=>lines.push(`"${n}",${r}`));
  lines.push("");
  lines.push("ALL COMPLETED APPOINTMENTS");
  lines.push("Date,Customer,Service,Business,Revenue (INR),Status");
  if (data.recentCompletedAppointments?.length) {
    data.recentCompletedAppointments
      .sort((a,b)=>(b.date||"").localeCompare(a.date||""))
      .forEach(r=>lines.push([r.date,`"${r.customerName||""}"`,`"${r.serviceName||""}"`,`"${r.businessName||""}"`,r.revenue,r.status].join(",")));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `bookease_analytics_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `analytics_${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url);
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function Stars({ rating, size = 14 }) {
  return (
    <span className="ba-stars" style={{ fontSize: size }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} className={s <= rating ? "ba-star--on" : "ba-star--off"}>★</span>
      ))}
    </span>
  );
}

// ── Reviews tab ───────────────────────────────────────────────────────────────
function ReviewsTab({ businessId }) {
  const [reviews, setReviews]    = useState([]);
  const [loading, setLoading]    = useState(true);
  const [filterRating, setFilter]= useState("ALL");

  useEffect(() => {
    if (!businessId) return;
    getBusinessReviews(businessId)
      .then(r => setReviews(Array.isArray(r.data) ? r.data : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) return <EmptyState text="Loading reviews…" />;

  const visible = reviews.filter(r => !r.removedByAdmin);
  const avgRating = visible.length > 0 ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;
  const ratingCounts = [1,2,3,4,5].reduce((acc, n) => { acc[n] = visible.filter(r => r.rating === n).length; return acc; }, {});
  const filtered = filterRating === "ALL" ? visible : visible.filter(r => r.rating === Number(filterRating));

  if (visible.length === 0) return <Card><EmptyState text="No reviews yet. Reviews from customers will appear here after completed appointments." /></Card>;

  return (
    <div className="ba-reviews-col">
      <div className="ba-review-summary-grid">

        <Card className="ba-review-avg-card">
          <div className="ba-review-avg-left">
            <div className="ba-review-avg-number">{avgRating.toFixed(1)}</div>
            <Stars rating={Math.round(avgRating)} size={18} />
            <div className="ba-review-avg-count">{visible.length} review{visible.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="ba-review-bars">
            {[5,4,3,2,1].map(n => {
              const count = ratingCounts[n] || 0;
              const pctVal = visible.length > 0 ? Math.round((count / visible.length) * 100) : 0;
              return (
                <div key={n} className="ba-review-bar-row">
                  <span className="ba-review-bar-stars">{"★".repeat(n)}</span>
                  <div className="ba-review-bar-track">
                    <div className="ba-review-bar-fill" style={{ width: `${pctVal}%` }} />
                  </div>
                  <span className="ba-review-bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="ba-review-quick-stats">
          {[
            { label: "5★ Reviews",  value: ratingCounts[5] || 0, color: C.emerald },
            { label: "4★ Reviews",  value: ratingCounts[4] || 0, color: C.teal },
            { label: "3★ or below", value: (ratingCounts[3]||0)+(ratingCounts[2]||0)+(ratingCounts[1]||0), color: C.rose },
          ].map(({ label, value, color }) => (
            <div key={label} className="ba-review-quick-stat">
              <span className="ba-review-quick-stat-label">{label}</span>
              <span className="ba-review-quick-stat-value" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ba-review-filters">
        {["ALL","5","4","3","2","1"].map(r => {
          const count = r === "ALL" ? visible.length : (ratingCounts[Number(r)] || 0);
          return (
            <button key={r} onClick={() => setFilter(r)}
              className={`ba-review-filter-btn${filterRating === r ? " ba-review-filter-btn--active" : ""}`}>
              {r === "ALL" ? "All reviews" : `${"★".repeat(Number(r))} (${count})`}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No reviews with this rating." />
      ) : (
        <div className="ba-review-list">
          {filtered.map(review => (
            <Card key={review.id} hover className="ba-review-card">
              <div className="ba-review-card-header">
                <div className="ba-review-user-row">
                  <div className="ba-review-avatar">
                    {review.customerName ? review.customerName.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div>
                    <div className="ba-review-customer-name">{review.customerName || "Anonymous"}</div>
                    {review.appointmentDate && (
                      <div className="ba-review-appt-date">📅 Appointment: {fmtDate(review.appointmentDate)}</div>
                    )}
                  </div>
                </div>
                <div className="ba-review-meta-right">
                  <Stars rating={review.rating} size={16} />
                  <div className="ba-review-chips">
                    {review.businessName && <span className="ba-review-chip ba-review-chip--biz">🏢 {review.businessName}</span>}
                    {review.serviceName  && <span className="ba-review-chip ba-review-chip--svc">⚙️ {review.serviceName}</span>}
                  </div>
                </div>
              </div>
              {review.comment
                ? <p className="ba-review-comment">"{review.comment}"</p>
                : <p className="ba-review-no-comment">No written comment</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BusinessAnalytics() {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);
  const [tab, setTab]       = useState("overview");
  const [businessId, setBusinessId]   = useState(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    api.get("/api/business/analytics")
      .then(({ data }) => {
        setData(data);
        if (data.businessId)    setBusinessId(data.businessId);
        if (data.totalReviews != null) setReviewCount(data.totalReviews);
      })
      .catch(() => setError("Could not load analytics. Make sure you have an approved business."))
      .finally(() => setLoad(false));
  }, []);

  if (loading) return (
    <div className="page-container ba-root ba-center-screen">
      <div className="ba-spinner-wrap">
        <div className="ba-spinner" />
        <p className="ba-spinner-text">Loading analytics…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="page-container ba-root ba-center-screen">
      <Card className="ba-error-card">
        <div className="ba-error-icon">⚠️</div>
        <p className="ba-error-msg">{error}</p>
        <Link to="/dashboard" className="ba-error-link">← Back to Dashboard</Link>
      </Card>
    </div>
  );

  const revenueByMonthData    = Object.entries(data.revenueByMonth    || {}).map(([month, rev])   => ({ month, Revenue: rev, Appointments: data.appointmentsByMonth?.[month] || 0 }));
  const revenueByServiceData  = Object.entries(data.revenueByService  || {}).map(([name, value])  => ({ name, value }));
  const revenueByBusinessData = Object.entries(data.revenueByBusiness || {}).map(([name, value])  => ({ name, value }));
  const statusData = [
    { name: "Completed", value: Number(data.totalCompleted) },
    { name: "Pending",   value: Number(data.totalPending) },
    { name: "Confirmed", value: Number(data.totalConfirmed) },
    { name: "Cancelled", value: Number(data.totalCancelled) },
  ].filter(d => d.value > 0);
  const total = data.totalAppointments;

  const TABS = [
    { id: "overview",     label: "Overview" },
    { id: "revenue",      label: "Revenue" },
    { id: "appointments", label: "Appointments" },
    { id: "reviews",      label: "Reviews",  badge: reviewCount },
    { id: "reports",      label: "Reports" },
  ];

  const chartTooltipStyle = { background: "#1a2035", border: `1px solid ${C.borderHi}`, borderRadius: 10, fontSize: 12 };

  return (
    <div className="page-container ba-root">

      {/* Page header */}
      <div className="ba-page-header">
        <div>
          <h1 className="page-title ba-page-title">Business Analytics</h1>
          <p className="page-subtitle">Revenue insights · Appointment trends · Customer reviews</p>
        </div>
        <div className="ba-header-actions">
          <button className="ba-btn-csv"  onClick={() => downloadCSV(data)}>↓ CSV</button>
          <button className="ba-btn-json" onClick={() => downloadJSON(data)}>↓ JSON</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="ba-kpi-grid">
        <KpiCard label="Total Revenue"    value={fmtK(data.totalRevenue)} accent={C.emerald} icon="₹"  sub={`from ${data.totalCompleted} completed`} />
        <KpiCard label="All Appointments" value={data.totalAppointments}  accent={C.indigo}  icon="📅" />
        <KpiCard label="Completed"        value={data.totalCompleted}     accent={C.emerald} icon="✓"  pctVal={total > 0 ? (data.totalCompleted / total) * 100 : 0} />
        <KpiCard label="Pending"          value={data.totalPending}       accent={C.amber}   icon="⏳" pctVal={total > 0 ? (data.totalPending   / total) * 100 : 0} />
        <KpiCard label="Confirmed"        value={data.totalConfirmed}     accent={C.sky}     icon="●"  pctVal={total > 0 ? (data.totalConfirmed / total) * 100 : 0} />
        <KpiCard label="Cancelled"        value={data.totalCancelled}     accent={C.rose}    icon="✕"  pctVal={total > 0 ? (data.totalCancelled / total) * 100 : 0} />
      </div>

      {/* Tab bar */}
      <div className="ba-tabs">
        {TABS.map(t => (
          <TabBtn key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} badge={t.badge} />
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {tab === "overview" && (
        <div className="ba-col">
          <Card>
            <SectionTitle sub="Based on completed appointments only">Monthly Revenue</SectionTitle>
            {revenueByMonthData.length === 0 ? <EmptyState text="No completed appointments to show revenue." /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueByMonthData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={52} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="Revenue" fill={C.indigo} radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
          <div className="ba-grid-2">
            <Card>
              <SectionTitle sub="Share of completed revenue">Revenue by Service</SectionTitle>
              {revenueByServiceData.length === 0 ? <EmptyState text="No revenue data yet." /> : (
                <><DonutChart data={revenueByServiceData} total={fmt(data.totalRevenue)} centerLabel="total" />
                <PieLegend data={revenueByServiceData} fmtValue={fmt} /></>
              )}
            </Card>
            <Card>
              <SectionTitle sub="Distribution across all statuses">Appointment Status</SectionTitle>
              {statusData.length === 0 ? <EmptyState text="No appointment data yet." /> : (
                <><DonutChart data={statusData} total={data.totalAppointments} centerLabel="total" />
                <PieLegend data={statusData} /></>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ══ REVENUE ══ */}
      {tab === "revenue" && (
        <div className="ba-col">
          {revenueByBusinessData.length > 1 && (
            <Card>
              <SectionTitle sub="Completed revenue per business">Revenue by Business</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByBusinessData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={52} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="value" name="Revenue" fill={C.violet} radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
          <Card>
            <SectionTitle sub="Earnings broken down by service offered">Revenue by Service</SectionTitle>
            {revenueByServiceData.length === 0 ? <EmptyState text="No completed appointments yet." /> : (
              <ResponsiveContainer width="100%" height={Math.max(180, revenueByServiceData.length * 52)}>
                <BarChart data={revenueByServiceData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <YAxis type="category" dataKey="name" tick={{ fill: C.dim, fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<ChartTip money />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="value" name="Revenue" fill={C.teal} radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
          <Card>
            <SectionTitle sub="Complete revenue breakdown">Revenue Summary</SectionTitle>
            <div className="ba-table-wrap">
              <table className="ba-table">
                <thead><tr>
                  {["Service","Revenue","Share"].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {revenueByServiceData.map(({ name, value }, i) => (
                    <tr key={i}>
                      <td><div className="ba-table-name-cell">
                        <div className="ba-table-color-dot" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                        {name}
                      </div></td>
                      <td className="ba-table-revenue">{fmt(value)}</td>
                      <td><div className="ba-table-pct-cell">
                        <div className="ba-table-pct-bar-track">
                          <div className="ba-table-pct-bar-fill" style={{ width: pct(value, data.totalRevenue), background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                        </div>
                        {pct(value, data.totalRevenue)}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr>
                  <td className="ba-table-total-label">Total</td>
                  <td className="ba-table-total-revenue">{fmt(data.totalRevenue)}</td>
                  <td className="ba-table-total-pct">100%</td>
                </tr></tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══ APPOINTMENTS ══ */}
      {tab === "appointments" && (
        <div className="ba-col">
          <Card>
            <SectionTitle sub="All appointments across all statuses">Monthly Volume</SectionTitle>
            {revenueByMonthData.length === 0 ? <EmptyState text="No appointment data yet." /> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={revenueByMonthData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="Appointments" stroke={C.sky} strokeWidth={2.5}
                    dot={{ fill: C.sky, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: C.sky }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
          <div className="ba-stat-grid">
            {[
              { label: "Completed", value: data.totalCompleted, accent: C.emerald },
              { label: "Confirmed", value: data.totalConfirmed, accent: C.sky },
              { label: "Pending",   value: data.totalPending,   accent: C.amber },
              { label: "Cancelled", value: data.totalCancelled, accent: C.rose },
            ].map(({ label, value, accent }) => (
              <div key={label} className="ba-stat-card">
                <div className="ba-stat-card-top-bar" style={{ background: accent }} />
                <p className="ba-stat-card-label">{label}</p>
                <p className="ba-stat-card-value" style={{ color: accent }}>{value}</p>
                <p className="ba-stat-card-pct">{pct(value, total)} of all appointments</p>
              </div>
            ))}
          </div>
          {revenueByMonthData.length > 0 && (
            <Card>
              <SectionTitle sub="Revenue alongside appointment volume per month">Revenue vs Volume</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueByMonthData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rev" orientation="left"  tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={52} />
                  <YAxis yAxisId="apt" orientation="right" tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: C.dim, paddingTop: 8 }} />
                  <Bar yAxisId="rev" dataKey="Revenue"      fill={C.indigo} radius={[4,4,0,0]} />
                  <Bar yAxisId="apt" dataKey="Appointments" fill={C.teal}   radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* ══ REVIEWS ══ */}
      {tab === "reviews" && (
        businessId
          ? <ReviewsTab businessId={businessId} />
          : <Card><EmptyState text="Business ID not available in analytics response. Ensure your BusinessAnalyticsResponse includes a 'businessId' field." /></Card>
      )}

      {/* ══ REPORTS ══ */}
      {tab === "reports" && (
        <div className="ba-col">
          <Card>
            <SectionTitle sub="Download your business data in different formats">Export Reports</SectionTitle>
            <div className="ba-export-grid">
              {[
                { label: "CSV — Completed Appointments", desc: "Spreadsheet-ready export of all completed bookings with customer and revenue data.", color: C.emerald, bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)", icon: "📄", action: () => downloadCSV(data) },
                { label: "JSON — Full Analytics Export",  desc: "Complete raw analytics data including all charts, KPIs, and breakdowns.", color: "#a5b4fc", bg: "rgba(101,116,248,0.08)", border: "rgba(101,116,248,0.2)", icon: "📦", action: () => downloadJSON(data) },
              ].map(({ label, desc, color, bg, border, icon, action }) => (
                <button key={label} onClick={action} className="ba-export-btn"
                  style={{ background: bg, border: `1px solid ${border}` }}>
                  <div className="ba-export-icon">{icon}</div>
                  <p className="ba-export-label" style={{ color }}>{label}</p>
                  <p className="ba-export-desc">{desc}</p>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle sub={`Last ${data.recentCompletedAppointments.length} completed appointments`}>
              Recent Completed Appointments
            </SectionTitle>
            {data.recentCompletedAppointments.length === 0 ? <EmptyState text="No completed appointments yet." /> : (
              <div className="ba-table-wrap">
                <table className="ba-table">
                  <thead><tr>
                    {["Date","Customer","Service","Business","Revenue","Status"].map(h => <th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.recentCompletedAppointments.map((r, i) => (
                      <tr key={i}>
                        <td className="ba-table-date">{r.date}</td>
                        <td className="ba-table-customer">{r.customerName}</td>
                        <td className="ba-table-dim">{r.serviceName}</td>
                        <td className="ba-table-dim">{r.businessName}</td>
                        <td className="ba-table-revenue">{fmt(r.revenue)}</td>
                        <td><Badge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

    </div>
  );
}