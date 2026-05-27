import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosInstance";
import { getBusinessReviews } from "../api/reviews";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#080b14",
  surface:   "#0e1220",
  card:      "#111827",
  cardHover: "#141c2e",
  border:    "rgba(255,255,255,0.06)",
  borderHi:  "rgba(255,255,255,0.12)",
  muted:     "#4b5675",
  dim:       "#6b7a99",
  text:      "#d4daf0",
  bright:    "#eef0fb",
  indigo:    "#6574f8",
  violet:    "#7c6af7",
  sky:       "#38bdf8",
  teal:      "#2dd4bf",
  emerald:   "#34d399",
  amber:     "#fbbf24",
  rose:      "#fb7185",
  slate:     "#94a3b8",
};

const PIE_PALETTE = [
  "#6574f8","#38bdf8","#2dd4bf","#34d399","#a78bfa","#fbbf24","#94a3b8",
];

const STATUS_CFG = {
  COMPLETED: { color: C.emerald, bg: "rgba(52,211,153,0.08)",  label: "Completed" },
  PENDING:   { color: C.amber,   bg: "rgba(251,191,36,0.08)",   label: "Pending"   },
  CONFIRMED: { color: C.sky,     bg: "rgba(56,189,248,0.08)",   label: "Confirmed" },
  CANCELLED: { color: C.rose,    bg: "rgba(251,113,133,0.08)",  label: "Cancelled" },
};

const fmt  = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const fmtK = (n) => n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(1)}k`:`₹${n}`;
const pct  = (v,t) => t>0?((v/t)*100).toFixed(1)+"%":"0%";

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
};

// ── Shared components ─────────────────────────────────────────────────────────
function Card({ children, style={}, hover=false }) {
  const [hov,setHov] = useState(false);
  return (
    <div
      onMouseEnter={()=>hover&&setHov(true)}
      onMouseLeave={()=>hover&&setHov(false)}
      style={{
        background: hov?C.cardHover:C.card,
        border:`1px solid ${hov?C.borderHi:C.border}`,
        borderRadius:16,padding:"22px 26px",
        transition:"background 0.2s, border-color 0.2s",...style,
      }}
    >{children}</div>
  );
}

function SectionLabel({children}) {
  return (
    <p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,
      color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>
      {children}
    </p>
  );
}

function SectionTitle({children,sub}) {
  return (
    <div style={{marginBottom:22}}>
      <h3 style={{margin:0,fontSize:14,fontWeight:700,color:C.bright,letterSpacing:"-0.01em"}}>{children}</h3>
      {sub&&<p style={{margin:"3px 0 0",fontSize:12,color:C.dim}}>{sub}</p>}
    </div>
  );
}

function Badge({status}) {
  const cfg=STATUS_CFG[status]||{color:C.slate,bg:"rgba(148,163,184,0.08)",label:status};
  return (
    <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:6,
      background:cfg.bg,color:cfg.color,letterSpacing:"0.03em"}}>
      {cfg.label}
    </span>
  );
}

function KpiCard({label,value,sub,accent,icon,pctVal}) {
  return (
    <Card hover style={{position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
        background:accent,borderRadius:"16px 0 0 16px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{paddingLeft:4}}>
          <SectionLabel>{label}</SectionLabel>
          <p style={{margin:"8px 0 0",fontSize:28,fontWeight:800,color:accent,lineHeight:1}}>{value}</p>
          {sub&&<p style={{margin:"6px 0 0",fontSize:11,color:C.dim}}>{sub}</p>}
        </div>
        <div style={{fontSize:20,width:40,height:40,borderRadius:10,
          background:`${accent}18`,display:"flex",alignItems:"center",
          justifyContent:"center",flexShrink:0}}>
          {icon}
        </div>
      </div>
      {pctVal!==undefined&&(
        <div style={{marginTop:14}}>
          <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
            <div style={{height:"100%",width:pctVal+"%",background:accent,borderRadius:2,transition:"width 1s ease"}}/>
          </div>
        </div>
      )}
    </Card>
  );
}

function ChartTip({active,payload,label,money=false}) {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:"#1a2035",border:`1px solid ${C.borderHi}`,
      borderRadius:10,padding:"10px 16px",fontSize:12,boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
      <p style={{margin:"0 0 6px",color:C.dim,fontWeight:600}}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{margin:"2px 0",color:p.color||C.indigo,fontWeight:700}}>
          {p.name}: {money||p.name?.toLowerCase().includes("revenue")?fmt(p.value):p.value}
        </p>
      ))}
    </div>
  );
}

function DonutChart({data,total,centerLabel}) {
  return (
    <div style={{position:"relative"}}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name"
            cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={3} strokeWidth={0}>
            {data.map((_,i)=><Cell key={i} fill={PIE_PALETTE[i%PIE_PALETTE.length]}/>)}
          </Pie>
          <Tooltip formatter={(v,name)=>[name.toLowerCase().includes("revenue")?fmt(v):v,name]}
            contentStyle={{background:"#1a2035",border:`1px solid ${C.borderHi}`,borderRadius:10,fontSize:12}}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{position:"absolute",top:"50%",left:"50%",
        transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none"}}>
        <p style={{margin:0,fontSize:18,fontWeight:800,color:C.bright}}>{total}</p>
        <p style={{margin:0,fontSize:10,color:C.dim,fontWeight:600}}>{centerLabel}</p>
      </div>
    </div>
  );
}

function PieLegend({data,fmtValue}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
      {data.map(({name,value},i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:2,
              background:PIE_PALETTE[i%PIE_PALETTE.length],flexShrink:0}}/>
            <span style={{fontSize:12,color:C.dim}}>{name}</span>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:C.text}}>
            {fmtValue?fmtValue(value):value}
          </span>
        </div>
      ))}
    </div>
  );
}

function TabBtn({id,label,active,onClick,badge}) {
  return (
    <button onClick={onClick} style={{
      position:"relative",
      padding:"9px 20px",borderRadius:10,border:"none",cursor:"pointer",
      fontSize:13,fontWeight:active?600:500,
      background:active?"rgba(101,116,248,0.18)":"transparent",
      color:active?"#a5b4fc":C.muted,
      transition:"all 0.18s",whiteSpace:"nowrap",outline:"none",
    }}>
      {label}
      {badge!=null&&badge>0&&(
        <span style={{
          position:"absolute",top:4,right:6,
          background:C.indigo,color:"#fff",
          fontSize:9,fontWeight:800,
          padding:"1px 5px",borderRadius:99,lineHeight:1.5,
        }}>{badge}</span>
      )}
    </button>
  );
}

function downloadCSV(data) {
  if(!data?.recentCompletedAppointments?.length) return;
  const headers=["Date","Customer","Service","Business","Revenue (INR)","Status"];
  const rows=data.recentCompletedAppointments.map(r=>
    [r.date,`"${r.customerName}"`,`"${r.serviceName}"`,`"${r.businessName}"`,r.revenue,r.status].join(",")
  );
  const csv=[headers.join(","),...rows].join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`revenue_report_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data) {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`analytics_${new Date().toISOString().slice(0,10)}.json`;a.click();
  URL.revokeObjectURL(url);
}

function EmptyState({text}) {
  return (
    <div style={{padding:"32px 0",textAlign:"center"}}>
      <p style={{margin:0,fontSize:13,color:C.muted}}>{text}</p>
    </div>
  );
}

// ── Star display ──────────────────────────────────────────────────────────────
function Stars({rating,size=14}) {
  return (
    <span style={{fontSize:size,letterSpacing:1}}>
      {[1,2,3,4,5].map(s=>(
        <span key={s} style={{color:s<=rating?"#fbbf24":"rgba(255,255,255,0.12)"}}>★</span>
      ))}
    </span>
  );
}

// ── Reviews tab component ─────────────────────────────────────────────────────
function ReviewsTab({businessId}) {
  const [reviews,setReviews]     = useState([]);
  const [loading,setLoading]     = useState(true);
  const [filterRating,setFilter] = useState("ALL");

  useEffect(()=>{
    if(!businessId) return;
    getBusinessReviews(businessId)
      .then(r=>setReviews(Array.isArray(r.data)?r.data:[]))
      .catch(()=>setReviews([]))
      .finally(()=>setLoading(false));
  },[businessId]);

  if(loading) return <EmptyState text="Loading reviews…"/>;

  // Only show non-removed reviews to business owner
  const visible = reviews.filter(r=>!r.removedByAdmin);

  const avgRating = visible.length>0
    ? (visible.reduce((s,r)=>s+r.rating,0)/visible.length)
    : 0;

  const ratingCounts = [1,2,3,4,5].reduce((acc,n)=>{
    acc[n]=visible.filter(r=>r.rating===n).length; return acc;
  },{});

  const filtered = filterRating==="ALL"
    ? visible
    : visible.filter(r=>r.rating===Number(filterRating));

  if(visible.length===0) return (
    <Card>
      <EmptyState text="No reviews yet. Reviews from customers will appear here after completed appointments."/>
    </Card>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Summary row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

        {/* Avg rating card */}
        <Card style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{textAlign:"center",flexShrink:0}}>
            <div style={{fontSize:48,fontWeight:800,color:C.amber,lineHeight:1}}>
              {avgRating.toFixed(1)}
            </div>
            <Stars rating={Math.round(avgRating)} size={18}/>
            <div style={{fontSize:11,color:C.dim,marginTop:4}}>
              {visible.length} review{visible.length!==1?"s":""}
            </div>
          </div>
          {/* Rating distribution bars */}
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
            {[5,4,3,2,1].map(n=>{
              const count=ratingCounts[n]||0;
              const pctVal=visible.length>0?Math.round((count/visible.length)*100):0;
              return (
                <div key={n} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:C.amber,width:52,flexShrink:0,letterSpacing:-1}}>
                    {"★".repeat(n)}
                  </span>
                  <div style={{flex:1,height:6,background:"rgba(255,255,255,0.06)",
                    borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pctVal}%`,
                      background:"linear-gradient(90deg,#fbbf24,#f59e0b)",
                      borderRadius:99,transition:"width 0.5s ease"}}/>
                  </div>
                  <span style={{fontSize:11,color:C.muted,width:18,textAlign:"right",flexShrink:0}}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Quick stats */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            {label:"5★ Reviews",  value:ratingCounts[5]||0, color:C.emerald},
            {label:"4★ Reviews",  value:ratingCounts[4]||0, color:C.teal},
            {label:"3★ or below", value:(ratingCounts[3]||0)+(ratingCounts[2]||0)+(ratingCounts[1]||0), color:C.rose},
          ].map(({label,value,color})=>(
            <div key={label} style={{
              background:C.card,border:`1px solid ${C.border}`,
              borderRadius:12,padding:"12px 16px",
              display:"flex",justifyContent:"space-between",alignItems:"center",
            }}>
              <span style={{fontSize:12,color:C.dim}}>{label}</span>
              <span style={{fontSize:16,fontWeight:800,color}}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {["ALL","5","4","3","2","1"].map(r=>{
          const count=r==="ALL"?visible.length:(ratingCounts[Number(r)]||0);
          const isActive=filterRating===r;
          return (
            <button key={r} onClick={()=>setFilter(r)} style={{
              padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",
              fontSize:12,fontWeight:isActive?700:500,
              background:isActive?"rgba(101,116,248,0.18)":"rgba(255,255,255,0.04)",
              color:isActive?"#a5b4fc":C.dim,
              transition:"all 0.15s",
            }}>
              {r==="ALL"?"All reviews":`${"★".repeat(Number(r))} (${count})`}
            </button>
          );
        })}
      </div>

      {/* Review cards */}
      {filtered.length===0?(
        <EmptyState text="No reviews with this rating."/>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(review=>(
            <Card key={review.id} hover style={{padding:"18px 22px"}}>
              {/* Top row */}
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
                {/* User info */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{
                    width:36,height:36,borderRadius:"50%",flexShrink:0,
                    background:"linear-gradient(135deg,#6574f8,#7c6af7)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:"#fff",fontWeight:800,fontSize:14,
                  }}>
                    {review.customerName?review.customerName.charAt(0).toUpperCase():"?"}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:C.bright}}>
                      {review.customerName||"Anonymous"}
                    </div>
                    {review.appointmentDate&&(
                      <div style={{fontSize:11,color:C.muted,marginTop:1}}>
                        📅 Appointment: {fmtDate(review.appointmentDate)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rating + meta chips */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <Stars rating={review.rating} size={16}/>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    {review.businessName&&(
                      <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:99,
                        background:"rgba(108,99,255,0.12)",color:"#a78bfa"}}>
                        🏢 {review.businessName}
                      </span>
                    )}
                    {review.serviceName&&(
                      <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:99,
                        background:"rgba(56,189,248,0.12)",color:"#38bdf8"}}>
                        ⚙️ {review.serviceName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Comment */}
              {review.comment&&(
                <p style={{
                  margin:0,fontSize:13,color:C.text,lineHeight:1.6,
                  fontStyle:"italic",
                  paddingLeft:12,
                  borderLeft:"3px solid rgba(101,116,248,0.3)",
                }}>
                  "{review.comment}"
                </p>
              )}
              {!review.comment&&(
                <p style={{margin:0,fontSize:12,color:C.muted,fontStyle:"italic"}}>
                  No written comment
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BusinessAnalytics() {
  const [data,setData]   = useState(null);
  const [loading,setLoad]= useState(true);
  const [error,setError] = useState(null);
  const [tab,setTab]     = useState("overview");

  // We need businessId for reviews tab — extract from analytics data
  const [businessId,setBusinessId] = useState(null);
  const [reviewCount,setReviewCount] = useState(0);

  useEffect(()=>{
    api.get("/api/business/analytics")
      .then(({data})=>{
        setData(data);
        // BusinessAnalyticsResponse likely has businessId — adjust field name if different
        if(data.businessId) setBusinessId(data.businessId);
        if(data.totalReviews!=null) setReviewCount(data.totalReviews);
      })
      .catch(()=>setError("Could not load analytics. Make sure you have an approved business."))
      .finally(()=>setLoad(false));
  },[]);

  if(loading) return (
    <div className="page-container" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:400}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:48,height:48,borderRadius:"50%",margin:"0 auto 16px",
          border:`3px solid ${C.border}`,borderTopColor:C.indigo,
          animation:"spin 0.8s linear infinite"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        <p style={{color:C.dim,fontSize:13}}>Loading analytics…</p>
      </div>
    </div>
  );

  if(error) return (
    <div className="page-container" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:400}}>
      <Card style={{maxWidth:380,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
        <p style={{color:C.rose,fontSize:14,marginBottom:16}}>{error}</p>
        <Link to="/dashboard" style={{color:C.indigo,fontSize:13}}>← Back to Dashboard</Link>
      </Card>
    </div>
  );

  const revenueByMonthData = Object.entries(data.revenueByMonth||{}).map(([month,rev])=>({
    month, Revenue:rev, Appointments:data.appointmentsByMonth?.[month]||0,
  }));
  const revenueByServiceData  = Object.entries(data.revenueByService||{}).map(([name,value])=>({name,value}));
  const revenueByBusinessData = Object.entries(data.revenueByBusiness||{}).map(([name,value])=>({name,value}));
  const statusData = [
    {name:"Completed",value:Number(data.totalCompleted)},
    {name:"Pending",  value:Number(data.totalPending)},
    {name:"Confirmed",value:Number(data.totalConfirmed)},
    {name:"Cancelled",value:Number(data.totalCancelled)},
  ].filter(d=>d.value>0);
  const total = data.totalAppointments;

  const TABS = [
    {id:"overview",     label:"Overview"},
    {id:"revenue",      label:"Revenue"},
    {id:"appointments", label:"Appointments"},
    {id:"reviews",      label:"Reviews",   badge:reviewCount},
    {id:"reports",      label:"Reports"},
  ];

  return (
    <div className="page-container">

        {/* Page header */}
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"flex-start",marginBottom:32,flexWrap:"wrap",gap:16}}>
          <div>
            <h1 className="page-title" style={{marginBottom:6}}>
              Business Analytics
            </h1>
            <p className="page-subtitle">
              Revenue insights · Appointment trends · Customer reviews
            </p>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>downloadCSV(data)} style={{
              display:"flex",alignItems:"center",gap:6,
              background:"rgba(52,211,153,0.08)",color:C.emerald,
              border:"1px solid rgba(52,211,153,0.2)",borderRadius:10,
              padding:"9px 16px",fontWeight:600,fontSize:12,cursor:"pointer",
            }}>↓ CSV</button>
            <button onClick={()=>downloadJSON(data)} style={{
              display:"flex",alignItems:"center",gap:6,
              background:"rgba(101,116,248,0.08)",color:"#a5b4fc",
              border:"1px solid rgba(101,116,248,0.2)",borderRadius:10,
              padding:"9px 16px",fontWeight:600,fontSize:12,cursor:"pointer",
            }}>↓ JSON</button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:28}}>
          <KpiCard label="Total Revenue"    value={fmtK(data.totalRevenue)} accent={C.emerald} icon="₹"
            sub={`from ${data.totalCompleted} completed`}/>
          <KpiCard label="All Appointments" value={data.totalAppointments}  accent={C.indigo}  icon="📅"/>
          <KpiCard label="Completed"        value={data.totalCompleted}     accent={C.emerald} icon="✓"
            pctVal={total>0?(data.totalCompleted/total)*100:0}/>
          <KpiCard label="Pending"          value={data.totalPending}       accent={C.amber}   icon="⏳"
            pctVal={total>0?(data.totalPending/total)*100:0}/>
          <KpiCard label="Confirmed"        value={data.totalConfirmed}     accent={C.sky}     icon="●"
            pctVal={total>0?(data.totalConfirmed/total)*100:0}/>
          <KpiCard label="Cancelled"        value={data.totalCancelled}     accent={C.rose}    icon="✕"
            pctVal={total>0?(data.totalCancelled/total)*100:0}/>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:2,marginBottom:24,background:C.surface,borderRadius:12,
          padding:"4px",border:`1px solid ${C.border}`,width:"fit-content",flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <TabBtn key={t.id} id={t.id} label={t.label} active={tab===t.id}
              onClick={()=>setTab(t.id)} badge={t.badge}/>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab==="overview"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card>
              <SectionTitle sub="Based on completed appointments only">Monthly Revenue</SectionTitle>
              {revenueByMonthData.length===0?<EmptyState text="No completed appointments to show revenue."/>:(
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenueByMonthData} margin={{top:4,right:4,left:0,bottom:0}} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="month" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK} width={52}/>
                    <Tooltip content={<ChartTip/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                    <Bar dataKey="Revenue" fill={C.indigo} radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <Card>
                <SectionTitle sub="Share of completed revenue">Revenue by Service</SectionTitle>
                {revenueByServiceData.length===0?<EmptyState text="No revenue data yet."/>:(
                  <><DonutChart data={revenueByServiceData} total={fmt(data.totalRevenue)} centerLabel="total"/>
                  <PieLegend data={revenueByServiceData} fmtValue={fmt}/></>
                )}
              </Card>
              <Card>
                <SectionTitle sub="Distribution across all statuses">Appointment Status</SectionTitle>
                {statusData.length===0?<EmptyState text="No appointment data yet."/>:(
                  <><DonutChart data={statusData} total={data.totalAppointments} centerLabel="total"/>
                  <PieLegend data={statusData}/></>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ══ REVENUE ══ */}
        {tab==="revenue"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {revenueByBusinessData.length>1&&(
              <Card>
                <SectionTitle sub="Completed revenue per business">Revenue by Business</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueByBusinessData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="name" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK} width={52}/>
                    <Tooltip content={<ChartTip/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                    <Bar dataKey="value" name="Revenue" fill={C.violet} radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
            <Card>
              <SectionTitle sub="Earnings broken down by service offered">Revenue by Service</SectionTitle>
              {revenueByServiceData.length===0?<EmptyState text="No completed appointments yet."/>:(
                <ResponsiveContainer width="100%" height={Math.max(180,revenueByServiceData.length*52)}>
                  <BarChart data={revenueByServiceData} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false}/>
                    <XAxis type="number" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                    <YAxis type="category" dataKey="name" tick={{fill:C.dim,fontSize:12}} axisLine={false} tickLine={false} width={110}/>
                    <Tooltip content={<ChartTip money/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                    <Bar dataKey="value" name="Revenue" fill={C.teal} radius={[0,6,6,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card>
              <SectionTitle sub="Complete revenue breakdown">Revenue Summary</SectionTitle>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr>
                    {["Service","Revenue","Share"].map(h=>(
                      <th key={h} style={{padding:"8px 14px",textAlign:"left",color:C.muted,
                        fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:"0.09em",
                        borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {revenueByServiceData.map(({name,value},i)=>(
                      <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                        <td style={{padding:"13px 14px",color:C.text,fontWeight:500}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:6,height:6,borderRadius:2,
                              background:PIE_PALETTE[i%PIE_PALETTE.length],flexShrink:0}}/>
                            {name}
                          </div>
                        </td>
                        <td style={{padding:"13px 14px",color:C.emerald,fontWeight:700}}>{fmt(value)}</td>
                        <td style={{padding:"13px 14px",color:C.dim}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{flex:1,maxWidth:80,height:4,borderRadius:2,
                              background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                              <div style={{height:"100%",width:pct(value,data.totalRevenue),
                                background:PIE_PALETTE[i%PIE_PALETTE.length],borderRadius:2}}/>
                            </div>
                            {pct(value,data.totalRevenue)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{borderTop:`1px solid ${C.borderHi}`}}>
                    <td style={{padding:"13px 14px",color:C.bright,fontWeight:700}}>Total</td>
                    <td style={{padding:"13px 14px",color:C.emerald,fontWeight:800,fontSize:15}}>{fmt(data.totalRevenue)}</td>
                    <td style={{padding:"13px 14px",color:C.dim}}>100%</td>
                  </tr></tfoot>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ══ APPOINTMENTS ══ */}
        {tab==="appointments"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card>
              <SectionTitle sub="All appointments across all statuses">Monthly Volume</SectionTitle>
              {revenueByMonthData.length===0?<EmptyState text="No appointment data yet."/>:(
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={revenueByMonthData} margin={{top:4,right:4,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="month" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} width={32}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Line type="monotone" dataKey="Appointments" stroke={C.sky} strokeWidth={2.5}
                      dot={{fill:C.sky,r:4,strokeWidth:0}} activeDot={{r:6,fill:C.sky}}/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
              {[
                {label:"Completed",value:data.totalCompleted,accent:C.emerald},
                {label:"Confirmed",value:data.totalConfirmed,accent:C.sky},
                {label:"Pending",  value:data.totalPending,  accent:C.amber},
                {label:"Cancelled",value:data.totalCancelled,accent:C.rose},
              ].map(({label,value,accent})=>(
                <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,
                  borderRadius:14,padding:"20px 22px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:accent}}/>
                  <p style={{margin:"0 0 10px",fontSize:10,fontWeight:700,color:C.muted,
                    textTransform:"uppercase",letterSpacing:"0.1em"}}>{label}</p>
                  <p style={{margin:"0 0 4px",fontSize:32,fontWeight:800,color:accent}}>{value}</p>
                  <p style={{margin:0,fontSize:11,color:C.dim}}>{pct(value,total)} of all appointments</p>
                </div>
              ))}
            </div>
            {revenueByMonthData.length>0&&(
              <Card>
                <SectionTitle sub="Revenue alongside appointment volume per month">Revenue vs Volume</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenueByMonthData} margin={{top:4,right:4,left:0,bottom:0}} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="month" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis yAxisId="rev" orientation="left" tick={{fill:C.muted,fontSize:11}}
                      axisLine={false} tickLine={false} tickFormatter={fmtK} width={52}/>
                    <YAxis yAxisId="apt" orientation="right" tick={{fill:C.muted,fontSize:11}}
                      axisLine={false} tickLine={false} width={28}/>
                    <Tooltip content={<ChartTip/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                    <Legend wrapperStyle={{fontSize:11,color:C.muted,paddingTop:8}}/>
                    <Bar yAxisId="rev" dataKey="Revenue"      fill={C.indigo} radius={[4,4,0,0]}/>
                    <Bar yAxisId="apt" dataKey="Appointments" fill={C.teal}   radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        )}

        {/* ══ REVIEWS ══ */}
        {tab==="reviews"&&(
          businessId
            ? <ReviewsTab businessId={businessId}/>
            : <Card>
                <EmptyState text="Business ID not available in analytics response. Ensure your BusinessAnalyticsResponse includes a 'businessId' field."/>
              </Card>
        )}

        {/* ══ REPORTS ══ */}
        {tab==="reports"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card>
              <SectionTitle sub="Download your business data in different formats">Export Reports</SectionTitle>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[
                  {label:"CSV — Completed Appointments",
                    desc:"Spreadsheet-ready export of all completed bookings with customer and revenue data.",
                    color:C.emerald,bg:"rgba(52,211,153,0.08)",border:"rgba(52,211,153,0.2)",icon:"📄",
                    action:()=>downloadCSV(data)},
                  {label:"JSON — Full Analytics Export",
                    desc:"Complete raw analytics data including all charts, KPIs, and breakdowns.",
                    color:"#a5b4fc",bg:"rgba(101,116,248,0.08)",border:"rgba(101,116,248,0.2)",icon:"📦",
                    action:()=>downloadJSON(data)},
                ].map(({label,desc,color,bg,border,icon,action})=>(
                  <button key={label} onClick={action} style={{background:bg,border:`1px solid ${border}`,
                    borderRadius:12,padding:"18px 20px",cursor:"pointer",textAlign:"left",transition:"opacity 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                    onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    <div style={{fontSize:22,marginBottom:8}}>{icon}</div>
                    <p style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color}}>{label}</p>
                    <p style={{margin:0,fontSize:11,color:C.dim,lineHeight:1.5}}>{desc}</p>
                  </button>
                ))}
              </div>
            </Card>
            <Card>
              <SectionTitle sub={`Last ${data.recentCompletedAppointments.length} completed appointments`}>
                Recent Completed Appointments
              </SectionTitle>
              {data.recentCompletedAppointments.length===0?<EmptyState text="No completed appointments yet."/>:(
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr>
                      {["Date","Customer","Service","Business","Revenue","Status"].map(h=>(
                        <th key={h} style={{padding:"8px 14px",textAlign:"left",color:C.muted,
                          fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:"0.09em",
                          borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {data.recentCompletedAppointments.map((r,i)=>(
                        <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.03)",transition:"background 0.12s"}}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{padding:"13px 14px",color:C.dim}}>{r.date}</td>
                          <td style={{padding:"13px 14px",color:C.text,fontWeight:500}}>{r.customerName}</td>
                          <td style={{padding:"13px 14px",color:C.dim}}>{r.serviceName}</td>
                          <td style={{padding:"13px 14px",color:C.dim}}>{r.businessName}</td>
                          <td style={{padding:"13px 14px",color:C.emerald,fontWeight:700}}>{fmt(r.revenue)}</td>
                          <td style={{padding:"13px 14px"}}><Badge status={r.status}/></td>
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