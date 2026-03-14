import { useState, useCallback, useEffect } from "react";
import * as api from "./api.js";

// ── Palette & Design Tokens ───────────────────────────────
const T = {
  bg:       "#0a0d12",
  surface:  "#111620",
  panel:    "#161c28",
  border:   "#1e2840",
  accent:   "#00d4ff",
  accentDim:"#0099bb",
  green:    "#00e5a0",
  amber:    "#f5a623",
  red:      "#ff4757",
  muted:    "#4a5568",
  text:     "#e2e8f0",
  textDim:  "#8892a4",
  font:     "'DM Mono', 'Fira Code', monospace",
  display:  "'Syne', 'DM Sans', sans-serif",
};

// ── Inline Styles ─────────────────────────────────────────
const S = {
  app: {
    display:"flex", height:"100vh", width:"100%",
    background: T.bg, color: T.text,
    fontFamily: T.font, fontSize:"13px",
    overflow:"hidden",
  },
  sidebar: {
    width:"220px", minWidth:"220px",
    background: T.surface,
    borderRight:`1px solid ${T.border}`,
    display:"flex", flexDirection:"column",
    padding:"0",
  },
  logo: {
    padding:"24px 20px 20px",
    borderBottom:`1px solid ${T.border}`,
    fontFamily: T.display,
    fontWeight:"800",
    fontSize:"15px",
    letterSpacing:"0.04em",
    color: T.text,
  },
  logoAccent: { color: T.accent },
  nav: { padding:"12px 8px", flex:1 },
  navItem: (active) => ({
    display:"flex", alignItems:"center", gap:"10px",
    padding:"9px 12px", borderRadius:"6px",
    marginBottom:"2px",
    cursor:"pointer",
    fontSize:"12px",
    fontFamily: T.font,
    color: active ? T.accent : T.textDim,
    background: active ? `${T.accent}12` : "transparent",
    border: active ? `1px solid ${T.accent}22` : "1px solid transparent",
    transition:"all 0.15s",
    userSelect:"none",
  }),
  sidebarBottom: {
    padding:"16px",
    borderTop:`1px solid ${T.border}`,
    fontSize:"11px",
    color: T.muted,
  },
  main: {
    flex:1, display:"flex", flexDirection:"column",
    overflow:"hidden",
  },
  topbar: {
    height:"56px", minHeight:"56px",
    background: T.surface,
    borderBottom:`1px solid ${T.border}`,
    display:"flex", alignItems:"center",
    justifyContent:"space-between",
    padding:"0 24px",
  },
  topbarTitle: {
    fontFamily: T.display,
    fontWeight:"700",
    fontSize:"16px",
    letterSpacing:"0.02em",
  },
  topbarActions: { display:"flex", gap:"10px", alignItems:"center" },
  content: {
    flex:1, overflow:"auto",
    padding:"24px",
  },
  btn: (variant="primary") => ({
    display:"inline-flex", alignItems:"center", gap:"6px",
    padding:"8px 16px", borderRadius:"6px",
    fontSize:"12px", fontFamily: T.font,
    fontWeight:"600", cursor:"pointer",
    border:"none", transition:"all 0.15s",
    ...(variant==="primary" ? {
      background: T.accent, color: T.bg,
    } : variant==="ghost" ? {
      background:"transparent", color: T.textDim,
      border:`1px solid ${T.border}`,
    } : variant==="danger" ? {
      background:`${T.red}22`, color: T.red,
      border:`1px solid ${T.red}44`,
    } : variant==="success" ? {
      background:`${T.green}22`, color: T.green,
      border:`1px solid ${T.green}44`,
    } : {}),
  }),
  card: {
    background: T.panel,
    border:`1px solid ${T.border}`,
    borderRadius:"10px",
    padding:"20px",
    marginBottom:"16px",
  },
  cardHeader: {
    display:"flex", alignItems:"center",
    justifyContent:"space-between",
    marginBottom:"16px",
  },
  cardTitle: {
    fontFamily: T.display, fontWeight:"700",
    fontSize:"14px", color: T.text,
  },
  label: {
    display:"block", fontSize:"11px",
    color: T.textDim, marginBottom:"6px",
    fontWeight:"600", letterSpacing:"0.06em",
    textTransform:"uppercase",
  },
  input: {
    width:"100%", background: T.surface,
    border:`1px solid ${T.border}`,
    borderRadius:"6px", padding:"9px 12px",
    color: T.text, fontFamily: T.font,
    fontSize:"12px", outline:"none",
    boxSizing:"border-box",
  },
  select: {
    width:"100%", background: T.surface,
    border:`1px solid ${T.border}`,
    borderRadius:"6px", padding:"9px 12px",
    color: T.text, fontFamily: T.font,
    fontSize:"12px", outline:"none",
    boxSizing:"border-box", cursor:"pointer",
  },
  textarea: {
    width:"100%", background: T.surface,
    border:`1px solid ${T.border}`,
    borderRadius:"6px", padding:"9px 12px",
    color: T.text, fontFamily: T.font,
    fontSize:"12px", outline:"none",
    boxSizing:"border-box", resize:"vertical",
    minHeight:"100px",
  },
  formRow: { marginBottom:"16px" },
  formGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" },
  badge: (color=T.accent) => ({
    display:"inline-flex", alignItems:"center",
    padding:"2px 8px", borderRadius:"4px",
    fontSize:"10px", fontWeight:"700",
    letterSpacing:"0.06em", textTransform:"uppercase",
    background:`${color}20`, color: color,
    border:`1px solid ${color}40`,
  }),
  table: { width:"100%", borderCollapse:"collapse", fontSize:"12px" },
  th: {
    padding:"10px 12px", textAlign:"left",
    color: T.textDim, fontWeight:"600",
    fontSize:"11px", letterSpacing:"0.06em",
    textTransform:"uppercase",
    borderBottom:`1px solid ${T.border}`,
  },
  td: {
    padding:"12px 12px",
    borderBottom:`1px solid ${T.border}22`,
    color: T.text,
  },
  tr: (hover) => ({
    background: hover ? `${T.accent}08` : "transparent",
    transition:"background 0.1s", cursor:"pointer",
  }),
  dot: (color) => ({
    width:"7px", height:"7px", borderRadius:"50%",
    background: color, display:"inline-block",
    boxShadow:`0 0 6px ${color}`,
  }),
  aiPanel: {
    background:`${T.accent}08`,
    border:`1px solid ${T.accent}22`,
    borderRadius:"8px", padding:"14px 16px",
    marginBottom:"16px",
    display:"flex", gap:"12px", alignItems:"flex-start",
  },
  aiIcon: { fontSize:"18px", marginTop:"1px", flexShrink:0 },
  aiContent: { flex:1 },
  aiTitle: {
    fontSize:"11px", fontWeight:"700",
    color: T.accent, letterSpacing:"0.06em",
    textTransform:"uppercase", marginBottom:"4px",
  },
  aiBody: { fontSize:"12px", color: T.textDim, lineHeight:"1.6" },
  fieldChip: (dragging=false, selected=false) => ({
    display:"inline-flex", alignItems:"center", gap:"6px",
    padding:"5px 10px", borderRadius:"5px",
    fontSize:"11px", cursor:"grab",
    fontFamily: T.font, userSelect:"none",
    background: selected ? `${T.accent}20` : T.surface,
    border: selected ? `1px solid ${T.accent}60` : `1px solid ${T.border}`,
    color: selected ? T.accent : T.textDim,
    opacity: dragging ? 0.5 : 1,
    transition:"all 0.12s",
    marginBottom:"4px",
    marginRight:"4px",
  }),
  reportCol: (highlight=false) => ({
    background: highlight ? `${T.accent}10` : T.surface,
    border: highlight ? `1px dashed ${T.accent}` : `1px solid ${T.border}`,
    borderRadius:"6px", padding:"10px",
    minWidth:"140px", maxWidth:"200px",
    cursor:"pointer",
    transition:"all 0.15s",
  }),
  reportColHeader: {
    fontSize:"11px", fontWeight:"700",
    color: T.text, marginBottom:"6px",
    display:"flex", alignItems:"center",
    justifyContent:"space-between",
  },
  reportColMeta: {
    fontSize:"10px", color: T.muted,
    display:"flex", flexDirection:"column", gap:"2px",
  },
};

// ── Shared Components ─────────────────────────────────────

function Badge({ label, color }) {
  return <span style={S.badge(color)}>{label}</span>;
}

function StatusDot({ status }) {
  const color = status==="active" ? T.green : status==="warning" ? T.amber : status==="paused" ? T.muted : T.red;
  return <span style={S.dot(color)} />;
}

function Btn({ children, variant, onClick, style={}, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      style={{
        ...S.btn(variant),
        ...(hover && variant==="primary" ? { background: T.accentDim } : {}),
        ...(hover && variant==="ghost" ? { color: T.text, borderColor: T.muted } : {}),
        ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
        ...style,
      }}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function AIPanel({ title, body, loading=false }) {
  return (
    <div style={S.aiPanel}>
      <div style={S.aiIcon}>✦</div>
      <div style={S.aiContent}>
        <div style={S.aiTitle}>{title}</div>
        <div style={S.aiBody}>
          {loading ? <span style={{ color: T.accent }}>Analyzing with Claude AI...</span> : body}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, width="580px" }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,0.7)",
      display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(4px)",
    }}>
      <div style={{
        background: T.panel, border:`1px solid ${T.border}`,
        borderRadius:"12px", width, maxHeight:"90vh",
        display:"flex", flexDirection:"column", overflow:"hidden",
        boxShadow:`0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${T.accent}20`,
      }}>
        <div style={{
          padding:"20px 24px", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <span style={{ fontFamily: T.display, fontWeight:"700", fontSize:"15px" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color: T.muted, cursor:"pointer", fontSize:"18px" }}>×</button>
        </div>
        <div style={{ padding:"24px", overflowY:"auto", flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const color = type === "error" ? T.red : type === "warning" ? T.amber : T.green;
  return (
    <div style={{
      position:"fixed", top:20, right:20, zIndex:2000,
      background: T.panel, border:`1px solid ${color}`,
      borderRadius:8, padding:"12px 20px",
      color, fontSize:12, fontFamily: T.font,
      boxShadow:`0 8px 32px rgba(0,0,0,0.4)`,
    }}>
      {message}
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.auth.login(email, password);
      api.setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      ...S.app, alignItems:"center", justifyContent:"center",
      background: `linear-gradient(135deg, ${T.bg} 0%, ${T.surface} 100%)`,
    }}>
      <form onSubmit={handleLogin} style={{
        ...S.card, width:380, textAlign:"center",
        boxShadow:`0 24px 80px rgba(0,0,0,0.5)`,
      }}>
        <div style={{ fontFamily: T.display, fontWeight:800, fontSize:24, marginBottom:8 }}>
          <span style={{ color: T.accent }}>◈</span> Nexus<span style={{ color: T.textDim, fontWeight:400 }}>MSP</span>
        </div>
        <div style={{ color: T.muted, fontSize:12, marginBottom:24 }}>Unified Reporting Platform</div>

        {error && <div style={{ color: T.red, fontSize:12, marginBottom:12 }}>{error}</div>}

        <div style={S.formRow}>
          <input style={S.input} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div style={S.formRow}>
          <input style={S.input} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <Btn variant="primary" style={{ width:"100%" }} disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Btn>
      </form>
    </div>
  );
}

// ── Page: Dashboard ───────────────────────────────────────
function DashboardPage({ connectorData, clientData, reportData, runData }) {
  const stats = [
    { label:"Active Connectors", value: String(connectorData.filter(c=>c.status==="active").length), sub:`${connectorData.length} total`, color: T.accent },
    { label:"Clients", value: String(clientData.length), sub:`${clientData.filter(c=>c.status==="active").length} active`, color: T.green },
    { label:"Report Templates", value: String(reportData.length), sub:"configured", color: T.amber },
    { label:"Recent Runs", value: String(runData.length), sub:"this period", color:"#a78bfa" },
  ];

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"16px", marginBottom:"24px" }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...S.card, marginBottom:0, borderTop:`3px solid ${s.color}` }}>
            <div style={{ fontSize:"28px", fontWeight:"800", fontFamily: T.display, color: s.color }}>{s.value}</div>
            <div style={{ fontSize:"12px", fontWeight:"600", color: T.text, marginTop:"4px" }}>{s.label}</div>
            <div style={{ fontSize:"11px", color: T.muted, marginTop:"2px" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <AIPanel
        title="Platform Intelligence — Today's Observations"
        body="Connect your first API connectors and run AI field discovery to get started. Claude AI will analyze your data and surface actionable insights here."
      />

      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Recent Report Activity</span>
          <Badge label="Live" color={T.green} />
        </div>
        {runData.length === 0 ? (
          <div style={{ color: T.muted, fontSize:12, textAlign:"center", padding:24 }}>
            No report runs yet. Create a template and run your first report.
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>{["Report","Client","Status","When"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {runData.slice(0,10).map((r,i)=>(
                <tr key={r.id || i}>
                  <td style={S.td}>{r.template_name}</td>
                  <td style={S.td}><span style={{ color: T.textDim }}>{r.client_name}</span></td>
                  <td style={S.td}>
                    <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <StatusDot status={r.status==="success"?"active":r.status==="failed"?"error":"warning"} />
                      <span style={{ fontSize:11, color: r.status==="success"?T.green:r.status==="failed"?T.red:T.amber }}>{r.status}</span>
                    </span>
                  </td>
                  <td style={{ ...S.td, color: T.muted, fontSize:11 }}>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Page: Connectors ──────────────────────────────────────
function ConnectorsPage({ data, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name:"", category:"RMM", baseUrl:"", authType:"apikey", headerName:"X-API-Key", apiKey:"", token:"", clientId:"", clientSecret:"", username:"", password:"" });
  const [docText, setDocText] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveredFields, setDiscoveredFields] = useState([]);
  const [hoverRow, setHoverRow] = useState(null);
  const [toast, setToast] = useState(null);

  const handleCreate = async () => {
    try {
      const authConfig = form.authType === "apikey" ? { headerName: form.headerName, apiKey: form.apiKey }
        : form.authType === "bearer" ? { token: form.token }
        : form.authType === "oauth" ? { clientId: form.clientId, clientSecret: form.clientSecret }
        : form.authType === "basic" ? { username: form.username, password: form.password }
        : undefined;

      const connector = await api.connectors.create({
        name: form.name, category: form.category,
        authType: form.authType, baseUrl: form.baseUrl,
        authConfig,
      });

      if (docText.trim()) {
        setDiscovering(true);
        const result = await api.connectors.discover(connector.id, { apiDocsText: docText });
        setDiscoveredFields(result.fields || []);
        setDiscovering(false);
        setStep(3);
      } else {
        setShowAdd(false);
        setToast({ message: `Connector "${form.name}" created`, type: "success" });
        onRefresh();
      }
    } catch (err) {
      setToast({ message: err.message, type: "error" });
      setDiscovering(false);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      // Find the connector we just created (or use first matching name)
      const latest = data.find(c => c.name === form.name) || data[data.length - 1];
      if (latest) {
        const result = await api.connectors.discover(latest.id, { apiDocsText: docText });
        setDiscoveredFields(result.fields || []);
      }
      setStep(3);
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setDiscovering(false);
    }
  };

  const handleSave = () => {
    setShowAdd(false);
    setToast({ message: "Connector saved with discovered fields", type: "success" });
    onRefresh();
  };

  const resetForm = () => {
    setForm({ name:"", category:"RMM", baseUrl:"", authType:"apikey", headerName:"X-API-Key", apiKey:"", token:"", clientId:"", clientSecret:"", username:"", password:"" });
    setDocText("");
    setStep(1);
    setDiscoveredFields([]);
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20, alignItems:"center" }}>
        <div>
          <div style={{ fontFamily: T.display, fontWeight:700, fontSize:18, marginBottom:4 }}>Integration Connectors</div>
          <div style={{ color: T.muted, fontSize:12 }}>Define SaaS platforms. Claude AI auto-discovers available fields from your API credentials and documentation.</div>
        </div>
        <Btn variant="primary" onClick={()=>{ setShowAdd(true); resetForm(); }}>+ Add Connector</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
        {data.map(c => (
          <div key={c.id} style={{
            ...S.card, marginBottom:0, borderLeft:`3px solid ${c.color || T.accent}`,
            cursor:"pointer", transition:"all 0.15s",
            ...(hoverRow===c.id ? { borderColor: c.color||T.accent, background:`${c.color||T.accent}08` } : {}),
          }}
          onMouseEnter={()=>setHoverRow(c.id)} onMouseLeave={()=>setHoverRow(null)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:22, marginBottom:6 }}>{c.icon || "🔌"}</div>
                <div style={{ fontFamily: T.display, fontWeight:700, fontSize:14 }}>{c.name}</div>
                <div style={{ color: T.muted, fontSize:11, marginTop:2 }}>{c.category}</div>
              </div>
              <StatusDot status={c.status} />
            </div>
            <div style={{ display:"flex", gap:12, marginTop:12, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:800, color: c.color||T.accent, fontFamily: T.display }}>{c.field_count || 0}</div>
                <div style={{ fontSize:10, color: T.muted }}>FIELDS</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:800, color: T.text, fontFamily: T.display }}>{c.client_count || 0}</div>
                <div style={{ fontSize:10, color: T.muted }}>CLIENTS</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:11, color: T.muted, paddingTop:4 }}>{(c.auth_type||"").toUpperCase()}</div>
                <div style={{ fontSize:10, color: T.muted }}>AUTH</div>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div style={{ ...S.card, marginBottom:0, gridColumn:"span 3", textAlign:"center", color: T.muted, padding:40 }}>
            No connectors yet. Click "Add Connector" to get started.
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="Add New Connector" onClose={()=>setShowAdd(false)} width="680px">
          <div style={{ display:"flex", gap:8, marginBottom:24 }}>
            {["Connection","Discover","Review"].map((s,i)=>(
              <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{
                  width:24, height:24, borderRadius:"50%",
                  background: step > i ? T.accent : step===i+1 ? `${T.accent}30` : T.border,
                  color: step > i ? T.bg : step===i+1 ? T.accent : T.muted,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700,
                }}>{step > i ? "✓" : i+1}</div>
                <span style={{ fontSize:11, color: step===i+1 ? T.accent : T.muted }}>{s}</span>
                {i < 2 && <span style={{ color: T.border, marginLeft:4 }}>→</span>}
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <div style={S.formGrid}>
                <div style={S.formRow}>
                  <label style={S.label}>Connector Name</label>
                  <input style={S.input} placeholder="e.g. Datto RMM" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
                </div>
                <div style={S.formRow}>
                  <label style={S.label}>Category</label>
                  <select style={S.select} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                    <option>RMM</option><option>PSA</option><option>Backup</option>
                    <option>Security</option><option>Productivity</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div style={S.formRow}>
                <label style={S.label}>Base API URL</label>
                <input style={S.input} placeholder="https://api.example.com/v1" value={form.baseUrl} onChange={e=>setForm({...form,baseUrl:e.target.value})} />
              </div>
              <div style={S.formRow}>
                <label style={S.label}>Authentication Type</label>
                <select style={S.select} value={form.authType} onChange={e=>setForm({...form,authType:e.target.value})}>
                  <option value="apikey">API Key (Header)</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="oauth">OAuth 2.0</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>
              {form.authType === "apikey" && (
                <div style={S.formGrid}>
                  <div style={S.formRow}>
                    <label style={S.label}>Header Name</label>
                    <input style={S.input} placeholder="X-API-Key" value={form.headerName} onChange={e=>setForm({...form,headerName:e.target.value})} />
                  </div>
                  <div style={S.formRow}>
                    <label style={S.label}>API Key</label>
                    <input style={S.input} type="password" placeholder="••••••••••••••••" value={form.apiKey} onChange={e=>setForm({...form,apiKey:e.target.value})} />
                  </div>
                </div>
              )}
              {form.authType === "bearer" && (
                <div style={S.formRow}>
                  <label style={S.label}>Bearer Token</label>
                  <input style={S.input} type="password" placeholder="••••••••••••••••" value={form.token} onChange={e=>setForm({...form,token:e.target.value})} />
                </div>
              )}
              {form.authType === "oauth" && (
                <div style={S.formGrid}>
                  <div style={S.formRow}>
                    <label style={S.label}>Client ID</label>
                    <input style={S.input} placeholder="Client ID" value={form.clientId} onChange={e=>setForm({...form,clientId:e.target.value})} />
                  </div>
                  <div style={S.formRow}>
                    <label style={S.label}>Client Secret</label>
                    <input style={S.input} type="password" placeholder="••••••••••••••••" value={form.clientSecret} onChange={e=>setForm({...form,clientSecret:e.target.value})} />
                  </div>
                </div>
              )}
              {form.authType === "basic" && (
                <div style={S.formGrid}>
                  <div style={S.formRow}>
                    <label style={S.label}>Username</label>
                    <input style={S.input} placeholder="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} />
                  </div>
                  <div style={S.formRow}>
                    <label style={S.label}>Password</label>
                    <input style={S.input} type="password" placeholder="••••••••••••••••" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
                  </div>
                </div>
              )}
              <div style={{ fontSize:10, color: T.muted, marginTop:4 }}>Encrypted with AES-256 at rest. Never logged or exposed in reports.</div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
                <Btn variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
                <Btn variant="primary" onClick={()=>setStep(2)} disabled={!form.name || !form.baseUrl}>Test Connection →</Btn>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <AIPanel
                title="Claude AI — Field Discovery"
                body={discovering ? null :
                  `Paste API documentation, a sample JSON response, or an OpenAPI/Swagger URL. Claude will extract all available fields, infer data types, and build your field catalog automatically.`}
                loading={discovering}
              />
              <div style={S.formRow}>
                <label style={S.label}>API Documentation / Sample Response</label>
                <textarea style={S.textarea} placeholder={`Paste API docs, JSON response, or describe the API...\n\nExamples:\n• { "devices": [{ "hostname": "...", "osName": "...", "lastContact": "..." }] }\n• Plain text endpoint documentation`}
                  value={docText} onChange={e=>setDocText(e.target.value)} />
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
                <Btn variant="ghost" onClick={()=>setStep(1)}>← Back</Btn>
                <Btn variant="primary" onClick={handleCreate} disabled={discovering}>
                  {discovering ? "✦ Discovering..." : docText.trim() ? "✦ Create & Discover Fields" : "Create Connector"}
                </Btn>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ marginBottom:12, fontSize:12, color: T.textDim }}>
                <strong style={{ color: T.green }}>{discoveredFields.length} fields discovered</strong>. Deselect any fields you don't want in reports.
              </div>
              <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius:8, maxHeight:280, overflowY:"auto" }}>
                <table style={S.table}>
                  <thead><tr><th style={S.th}>✓</th><th style={S.th}>Field Name</th><th style={S.th}>Label</th><th style={S.th}>Type</th><th style={S.th}>Endpoint</th></tr></thead>
                  <tbody>
                    {discoveredFields.map((f,i)=>(
                      <tr key={f.id||i}>
                        <td style={S.td}><input type="checkbox" defaultChecked style={{ accentColor: T.accent }} /></td>
                        <td style={{ ...S.td, fontFamily: T.font, color: T.accent, fontSize:11 }}>{f.field_name}</td>
                        <td style={S.td}>{f.display_label}</td>
                        <td style={S.td}><Badge label={f.data_type} color={T.muted} /></td>
                        <td style={{ ...S.td, color: T.muted, fontSize:11 }}>{f.endpoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:16 }}>
                <Btn variant="ghost" onClick={()=>setStep(2)}>← Back</Btn>
                <Btn variant="primary" onClick={handleSave}>Save Connector ✓</Btn>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── Page: Report Builder ──────────────────────────────────
function ReportBuilderPage({ connectorData, onRefresh }) {
  const [selectedConnectors, setSelectedConnectors] = useState([]);
  const [canvasColumns, setCanvasColumns] = useState([]);
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [nlQuery, setNlQuery] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [reportName, setReportName] = useState("New Report");
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [tab, setTab] = useState("filters");
  const [fields, setFields] = useState({});
  const [toast, setToast] = useState(null);

  // Load fields for selected connectors
  useEffect(() => {
    const loadFields = async () => {
      const newFields = {};
      for (const cid of selectedConnectors) {
        if (!fields[cid]) {
          try {
            const f = await api.connectors.fields(cid);
            newFields[cid] = f;
          } catch { newFields[cid] = []; }
        }
      }
      if (Object.keys(newFields).length) setFields(prev => ({...prev, ...newFields}));
    };
    if (selectedConnectors.length) loadFields();
  }, [selectedConnectors]);

  const availableFields = selectedConnectors.flatMap(cid =>
    (fields[cid] || []).map(f => ({
      ...f,
      source: connectorData.find(c=>c.id===cid)?.name || cid,
      connectorId: cid,
    }))
  );

  const addField = (field) => {
    if (canvasColumns.find(c=>c.fieldId===field.id)) return;
    setCanvasColumns(prev => [...prev, {
      id: `col${Date.now()}`, fieldId: field.id, fieldName: field.field_name,
      label: field.display_label, source: field.source,
      type: field.data_type, connectorId: field.connectorId, endpoint: field.endpoint,
    }]);
  };

  const removeColumn = (colId) => setCanvasColumns(prev => prev.filter(c=>c.id!==colId));

  const handleNLQuery = async () => {
    if (!nlQuery.trim()) return;
    setNlLoading(true);
    try {
      const result = await api.ai.nlQuery(nlQuery, selectedConnectors.length ? selectedConnectors : undefined);
      if (result.columns) {
        const newCols = result.columns.map(name => {
          const field = availableFields.find(f => f.field_name === name);
          return field ? {
            id: `col${Date.now()}_${name}`, fieldId: field.id, fieldName: field.field_name,
            label: field.display_label, source: field.source, type: field.data_type,
            connectorId: field.connectorId, endpoint: field.endpoint,
          } : null;
        }).filter(Boolean);
        setCanvasColumns(newCols);
      }
      setNlQuery("");
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setNlLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      await api.templates.create({
        name: reportName,
        columnLayout: canvasColumns,
        connectorIds: selectedConnectors,
        filters: [],
        settings: {},
      });
      setToast({ message: "Template saved", type: "success" });
      onRefresh();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
  };

  const typeColor = (t) => {
    if (t==="string") return T.accent;
    if (t==="number") return T.green;
    if (t==="datetime"||t==="date") return T.amber;
    if (t==="boolean") return "#a78bfa";
    if (t==="array") return "#f87171";
    return T.muted;
  };

  const usedFieldIds = canvasColumns.map(c=>c.fieldId);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:0 }}>
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}

      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:8 }}>
          <input style={{ ...S.input, fontFamily: T.display, fontWeight:700, fontSize:16, border:"none", background:"transparent", color: T.text, flex:1, padding:0 }}
            value={reportName} onChange={e=>setReportName(e.target.value)} />
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="ghost" onClick={()=>setShowPreview(true)}>⚡ Run Now</Btn>
            <Btn variant="ghost" onClick={()=>setShowSchedule(true)}>⏱ Schedule</Btn>
            <Btn variant="primary" onClick={handleSaveTemplate} disabled={!canvasColumns.length}>Save Template</Btn>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, background: T.panel, border:`1px solid ${T.border}`, borderRadius:8, padding:8 }}>
          <span style={{ color: T.accent, fontSize:14, alignSelf:"center" }}>✦</span>
          <input style={{ ...S.input, border:"none", background:"transparent", flex:1, padding:"4px 8px", fontSize:13 }}
            placeholder="Describe the report you want in plain English..."
            value={nlQuery} onChange={e=>setNlQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleNLQuery()} />
          <Btn variant="primary" onClick={handleNLQuery} style={{ padding:"6px 14px" }}>
            {nlLoading ? "Building..." : "Generate →"}
          </Btn>
        </div>
      </div>

      <div style={{ display:"flex", gap:16, flex:1, minHeight:0 }}>
        {/* Field palette */}
        <div style={{ width:260, minWidth:260, background: T.panel, border:`1px solid ${T.border}`, borderRadius:10, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:12, borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color: T.textDim, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Data Sources</div>
            {connectorData.map(c=>(
              <label key={c.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, cursor:"pointer", fontSize:12 }}>
                <input type="checkbox" checked={selectedConnectors.includes(c.id)}
                  onChange={()=>setSelectedConnectors(prev => prev.includes(c.id) ? prev.filter(x=>x!==c.id) : [...prev,c.id])}
                  style={{ accentColor: c.color||T.accent }} />
                <span style={{ fontSize:14 }}>{c.icon||"🔌"}</span>
                <span style={{ color: T.text }}>{c.name}</span>
              </label>
            ))}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color: T.textDim, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
              Available Fields ({availableFields.length})
            </div>
            {selectedConnectors.map(cid => {
              const conn = connectorData.find(c=>c.id===cid);
              const flds = fields[cid] || [];
              return (
                <div key={cid} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, color: conn?.color||T.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                    {conn?.icon||"🔌"} {conn?.name}
                  </div>
                  {flds.map(f=>{
                    const used = usedFieldIds.includes(f.id);
                    return (
                      <div key={f.id} onClick={()=>addField({...f, source: conn?.name, connectorId: cid})}
                        style={{ ...S.fieldChip(false, used), display:"flex", width:"100%", boxSizing:"border-box", justifyContent:"space-between", marginRight:0 }}>
                        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.display_label}</span>
                        <span style={{ ...S.badge(typeColor(f.data_type)), fontSize:9, padding:"1px 5px", marginLeft:4, flexShrink:0 }}>{f.data_type}</span>
                      </div>
                    );
                  })}
                  {flds.length === 0 && <div style={{ fontSize:11, color: T.muted }}>No fields discovered yet</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:16, minWidth:0 }}>
          <div style={{ background: T.panel, border:`1px solid ${T.border}`, borderRadius:10, padding:16, flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color: T.textDim, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>Report Columns ({canvasColumns.length})</span>
              <span style={{ color: T.muted, fontSize:10, fontWeight:400, textTransform:"none" }}>Click fields from palette to add</span>
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", minHeight:120, background: T.surface, border:`2px dashed ${T.border}`, borderRadius:8, padding:12 }}
              onDragOver={e=>{e.preventDefault();setDragOver("canvas")}} onDragLeave={()=>setDragOver(null)}
              onDrop={e=>{e.preventDefault();setDragOver(null)}}>
              {canvasColumns.length === 0 && <div style={{ color: T.muted, fontSize:12, margin:"auto" }}>Click fields in the palette to add them →</div>}
              {canvasColumns.map(col => (
                <div key={col.id} style={S.reportCol()}>
                  <div style={S.reportColHeader}>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 }}>{col.label}</span>
                    <button onClick={()=>removeColumn(col.id)} style={{ background:"none", border:"none", color: T.muted, cursor:"pointer", fontSize:14, padding:0, lineHeight:1 }}>×</button>
                  </div>
                  <div style={S.reportColMeta}>
                    <span style={{ color: T.muted }}>{col.source}</span>
                    <span style={S.badge(typeColor(col.type))}>{col.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: T.panel, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ display:"flex", borderBottom:`1px solid ${T.border}` }}>
              {["filters","settings"].map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={{
                  padding:"10px 20px", background:"none", border:"none", cursor:"pointer",
                  fontSize:12, fontFamily: T.font, color: tab===t ? T.accent : T.muted,
                  borderBottom: tab===t ? `2px solid ${T.accent}` : "2px solid transparent", textTransform:"capitalize",
                }}>{t}</button>
              ))}
            </div>
            <div style={{ padding:16 }}>
              {tab==="filters" && (
                <div style={{ fontSize:11, color: T.muted }}>Active filters will be applied to all data pulls for this report. Use the AI query bar above for natural language filtering.</div>
              )}
              {tab==="settings" && (
                <div style={S.formGrid}>
                  <div><label style={S.label}>Group By</label><select style={S.select}><option>None</option>{canvasColumns.map(c=><option key={c.id}>{c.label}</option>)}</select></div>
                  <div><label style={S.label}>Sort By</label><select style={S.select}>{canvasColumns.map(c=><option key={c.id}>{c.label}</option>)}</select></div>
                  <div><label style={S.label}>Max Rows</label><input style={S.input} defaultValue="1000" /></div>
                  <div><label style={S.label}>Include AI Insights</label><select style={S.select}><option>Yes — append to PDF</option><option>No</option></select></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page: Reports Library ─────────────────────────────────
function ReportsPage({ data, clientData, onRefresh }) {
  const [hoverRow, setHoverRow] = useState(null);
  const [toast, setToast] = useState(null);

  const handleRun = async (templateId) => {
    if (!clientData.length) {
      setToast({ message: "No clients configured", type: "warning" });
      return;
    }
    try {
      await api.templates.run(templateId, { clientId: clientData[0].id, outputTypes: ["pdf"] });
      setToast({ message: "Report queued", type: "success" });
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20, alignItems:"center" }}>
        <div>
          <div style={{ fontFamily: T.display, fontWeight:700, fontSize:18, marginBottom:4 }}>Report Templates</div>
          <div style={{ color: T.muted, fontSize:12 }}>Manage scheduled and on-demand reports across all clients.</div>
        </div>
      </div>

      <div style={S.card}>
        {data.length === 0 ? (
          <div style={{ color: T.muted, fontSize:12, textAlign:"center", padding:24 }}>No report templates yet. Use the Report Builder to create one.</div>
        ) : (
          <table style={S.table}>
            <thead><tr>{["Report Name","Last Run","Status",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.map(r=>(
                <tr key={r.id} style={S.tr(hoverRow===r.id)} onMouseEnter={()=>setHoverRow(r.id)} onMouseLeave={()=>setHoverRow(null)}>
                  <td style={S.td}>
                    <div style={{ fontWeight:600, marginBottom:2 }}>{r.name}</div>
                    <div style={{ fontSize:11, color: T.muted }}>{r.description}</div>
                  </td>
                  <td style={{ ...S.td, color: T.muted, fontSize:11 }}>{r.last_run ? new Date(r.last_run).toLocaleDateString() : "Never"}</td>
                  <td style={S.td}><Badge label={r.active_schedules > 0 ? "Scheduled" : "Manual"} color={r.active_schedules > 0 ? T.green : T.muted} /></td>
                  <td style={S.td}>
                    <div style={{ display:"flex", gap:6 }}>
                      <Btn variant="success" style={{ padding:"4px 10px", fontSize:11 }} onClick={()=>handleRun(r.id)}>⚡ Run</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Page: Clients ─────────────────────────────────────────
function ClientsPage({ data, connectorData, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [hoverRow, setHoverRow] = useState(null);
  const [form, setForm] = useState({ name:"", industry:"Finance", contactEmail:"", connectorIds:[] });
  const [toast, setToast] = useState(null);

  const handleCreate = async () => {
    try {
      await api.clients.create(form);
      setShowAdd(false);
      setToast({ message: `Client "${form.name}" created`, type: "success" });
      onRefresh();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20, alignItems:"center" }}>
        <div>
          <div style={{ fontFamily: T.display, fontWeight:700, fontSize:18, marginBottom:4 }}>Clients</div>
          <div style={{ color: T.muted, fontSize:12 }}>Assign connectors and credentials per client. All credentials are isolated and encrypted.</div>
        </div>
        <Btn variant="primary" onClick={()=>{ setShowAdd(true); setForm({ name:"", industry:"Finance", contactEmail:"", connectorIds:[] }); }}>+ Add Client</Btn>
      </div>

      <div style={S.card}>
        {data.length === 0 ? (
          <div style={{ color: T.muted, fontSize:12, textAlign:"center", padding:24 }}>No clients yet. Click "Add Client" to get started.</div>
        ) : (
          <table style={S.table}>
            <thead><tr>{["Client Name","Industry","Connectors","Contacts","Status",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.map(c=>(
                <tr key={c.id} style={S.tr(hoverRow===c.id)} onMouseEnter={()=>setHoverRow(c.id)} onMouseLeave={()=>setHoverRow(null)}>
                  <td style={S.td}><span style={{ fontWeight:600 }}>{c.name}</span></td>
                  <td style={{ ...S.td, color: T.textDim }}>{c.industry}</td>
                  <td style={S.td}>
                    <div style={{ display:"flex", gap:4 }}>
                      {(c.connector_ids||[]).map(cid=>{
                        const conn = connectorData.find(x=>x.id===cid);
                        return conn ? <span key={cid} title={conn.name} style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius:4, padding:"2px 6px", fontSize:12 }}>{conn.icon||"🔌"}</span> : null;
                      })}
                    </div>
                  </td>
                  <td style={{ ...S.td, color: T.text }}>{c.contact_count || 0}</td>
                  <td style={S.td}>
                    <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <StatusDot status={c.status} />
                      <span style={{ fontSize:11, color: c.status==="active" ? T.green : T.muted }}>{c.status}</span>
                    </span>
                  </td>
                  <td style={S.td}><Btn variant="ghost" style={{ padding:"4px 10px", fontSize:11 }}>Manage</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title="Add Client" onClose={()=>setShowAdd(false)}>
          <div style={S.formGrid}>
            <div style={S.formRow}>
              <label style={S.label}>Client Name</label>
              <input style={S.input} placeholder="Acme Corp" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Industry</label>
              <select style={S.select} value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}>
                <option>Finance</option><option>Healthcare</option><option>Legal</option>
                <option>Construction</option><option>Manufacturing</option><option>Other</option>
              </select>
            </div>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Assign Connectors</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {connectorData.map(c=>(
                <label key={c.id} style={{ display:"flex", alignItems:"center", gap:6, background: T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 10px", cursor:"pointer", fontSize:12 }}>
                  <input type="checkbox" style={{ accentColor: T.accent }}
                    checked={form.connectorIds.includes(c.id)}
                    onChange={()=>setForm({...form, connectorIds: form.connectorIds.includes(c.id) ? form.connectorIds.filter(x=>x!==c.id) : [...form.connectorIds, c.id]})} />
                  {c.icon||"🔌"} {c.name}
                </label>
              ))}
            </div>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Primary Contact Email</label>
            <input style={S.input} placeholder="contact@client.com" value={form.contactEmail} onChange={e=>setForm({...form,contactEmail:e.target.value})} />
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
            <Btn variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleCreate} disabled={!form.name}>Add Client</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Page: Settings ────────────────────────────────────────
function SettingsPage({ currentUser }) {
  const [showKey, setShowKey] = useState(false);
  const [settingsData, setSettingsData] = useState({});
  const [toast, setToast] = useState(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  useEffect(() => {
    api.settings.get().then(setSettingsData).catch(() => {});
  }, []);

  const handleSave = async (updates) => {
    try {
      await api.settings.update(updates);
      setToast({ message: "Settings saved", type: "success" });
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      setToast({ message: "Passwords do not match", type: "error" });
      return;
    }
    try {
      await api.users.changeMyPassword(currentPw, newPw);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setToast({ message: "Password changed successfully", type: "success" });
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
  };

  return (
    <div style={{ maxWidth:700 }}>
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
      <div style={{ fontFamily: T.display, fontWeight:700, fontSize:18, marginBottom:20 }}>Platform Settings</div>

      {/* Change Password */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Change Your Password</span>
          <Badge label={currentUser?.role || "user"} color={currentUser?.role === "admin" ? T.amber : T.accent} />
        </div>
        <div style={S.formRow}>
          <label style={S.label}>Current Password</label>
          <input style={S.input} type="password" value={currentPw} onChange={e=>setCurrentPw(e.target.value)} placeholder="Enter current password" />
        </div>
        <div style={S.formGrid}>
          <div style={S.formRow}>
            <label style={S.label}>New Password</label>
            <input style={S.input} type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Minimum 6 characters" />
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Confirm New Password</label>
            <input style={S.input} type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Re-enter new password" />
          </div>
        </div>
        {newPw && confirmPw && newPw !== confirmPw && (
          <div style={{ color: T.red, fontSize:11, marginBottom:8 }}>Passwords do not match</div>
        )}
        <Btn variant="primary" onClick={handleChangePassword} disabled={!currentPw || newPw.length < 6 || newPw !== confirmPw}>Update Password</Btn>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>✦ Anthropic AI Configuration</span>
          <Badge label="Core Service" color={T.accent} />
        </div>
        <AIPanel
          title="How Claude AI is Used in This Platform"
          body="Field Discovery: Claude parses API docs and sample responses to auto-build field catalogs. NL Report Builder: Maps plain English queries to available fields. Report Insights: Analyzes report output and appends an executive summary to PDFs."
        />
        <div style={S.formRow}>
          <label style={S.label}>Model</label>
          <select style={S.select} defaultValue={settingsData.ai_model || "claude-sonnet-4-20250514"}>
            <option value="claude-sonnet-4-20250514">claude-sonnet-4-20250514 (Recommended)</option>
            <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001 (Fast)</option>
          </select>
        </div>
        <div style={S.formGrid}>
          <div style={S.formRow}>
            <label style={S.label}>Max Tokens per Request</label>
            <input style={S.input} defaultValue={settingsData.ai_max_tokens || "4096"} />
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Insight Generation</label>
            <select style={S.select}>
              <option>Enabled — append to all PDFs</option>
              <option>Enabled — on demand only</option>
              <option>Disabled</option>
            </select>
          </div>
        </div>
        <Btn variant="primary" onClick={()=>handleSave({ai_model: "claude-sonnet-4-20250514"})}>Save AI Settings</Btn>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><span style={S.cardTitle}>Report Defaults</span></div>
        <div style={S.formGrid}>
          <div style={S.formRow}>
            <label style={S.label}>Default Output Format</label>
            <select style={S.select}><option>PDF + Email</option><option>CSV + Email</option><option>Email Only</option></select>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>PDF Branding</label>
            <select style={S.select}><option>MSP Logo + Colors</option><option>White Label</option><option>Minimal</option></select>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Default Timezone</label>
            <select style={S.select}><option>America/New_York</option><option>America/Chicago</option><option>America/Denver</option><option>America/Los_Angeles</option></select>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Data Retention (days)</label>
            <input style={S.input} defaultValue="90" />
          </div>
        </div>
        <Btn variant="primary" onClick={()=>handleSave({default_output_format:"pdf+email"})}>Save Defaults</Btn>
      </div>
    </div>
  );
}

// ── Page: Users ───────────────────────────────────────────
function UsersPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showResetPw, setShowResetPw] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"viewer" });
  const [newPassword, setNewPassword] = useState("");
  const [toast, setToast] = useState(null);

  const loadUsers = async () => {
    try { setUsers(await api.users.list()); } catch {}
  };
  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async () => {
    try {
      await api.users.create(form);
      setShowAdd(false);
      setToast({ message: `User "${form.name}" created`, type: "success" });
      loadUsers();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleUpdate = async () => {
    try {
      await api.users.update(showEdit.id, { name: showEdit.name, email: showEdit.email, role: showEdit.role });
      setShowEdit(null);
      setToast({ message: "User updated", type: "success" });
      loadUsers();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    try {
      await api.users.delete(user.id);
      setToast({ message: "User deleted", type: "success" });
      loadUsers();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleResetPassword = async () => {
    try {
      await api.users.resetPassword(showResetPw.id, newPassword);
      setShowResetPw(null);
      setNewPassword("");
      setToast({ message: "Password reset", type: "success" });
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div>
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20, alignItems:"center" }}>
        <div>
          <div style={{ fontFamily: T.display, fontWeight:700, fontSize:18, marginBottom:4 }}>User Management</div>
          <div style={{ color: T.muted, fontSize:12 }}>Manage platform users and roles. Admins can create reports and manage connectors. Viewers can only view reports.</div>
        </div>
        {isAdmin && <Btn variant="primary" onClick={()=>{ setShowAdd(true); setForm({ name:"", email:"", password:"", role:"viewer" }); }}>+ Add User</Btn>}
      </div>

      <div style={S.card}>
        {users.length === 0 ? (
          <div style={{ color: T.muted, fontSize:12, textAlign:"center", padding:24 }}>No users found.</div>
        ) : (
          <table style={S.table}>
            <thead><tr>{["Name","Email","Role","Created",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id} style={S.tr(hoverRow===u.id)} onMouseEnter={()=>setHoverRow(u.id)} onMouseLeave={()=>setHoverRow(null)}>
                  <td style={S.td}>
                    <span style={{ fontWeight:600 }}>{u.name}</span>
                    {u.id === currentUser?.id && <span style={{ ...S.badge(T.accent), marginLeft:8, fontSize:9 }}>You</span>}
                  </td>
                  <td style={{ ...S.td, color: T.textDim }}>{u.email}</td>
                  <td style={S.td}><Badge label={u.role} color={u.role==="admin" ? T.amber : T.accent} /></td>
                  <td style={{ ...S.td, color: T.muted, fontSize:11 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={S.td}>
                    {isAdmin && (
                      <div style={{ display:"flex", gap:6 }}>
                        <Btn variant="ghost" style={{ padding:"4px 10px", fontSize:11 }} onClick={()=>setShowEdit({...u})}>Edit</Btn>
                        <Btn variant="ghost" style={{ padding:"4px 10px", fontSize:11 }} onClick={()=>{ setShowResetPw(u); setNewPassword(""); }}>Reset PW</Btn>
                        {u.id !== currentUser?.id && <Btn variant="danger" style={{ padding:"4px 10px", fontSize:11 }} onClick={()=>handleDelete(u)}>Delete</Btn>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <Modal title="Add User" onClose={()=>setShowAdd(false)}>
          <div style={S.formGrid}>
            <div style={S.formRow}>
              <label style={S.label}>Full Name</label>
              <input style={S.input} placeholder="John Doe" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Role</label>
              <select style={S.select} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                <option value="viewer">Viewer — can view reports only</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" placeholder="user@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" placeholder="Minimum 6 characters" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
            <Btn variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleCreate} disabled={!form.name || !form.email || !form.password || form.password.length < 6}>Create User</Btn>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {showEdit && (
        <Modal title="Edit User" onClose={()=>setShowEdit(null)}>
          <div style={S.formGrid}>
            <div style={S.formRow}>
              <label style={S.label}>Full Name</label>
              <input style={S.input} value={showEdit.name} onChange={e=>setShowEdit({...showEdit,name:e.target.value})} />
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Role</label>
              <select style={S.select} value={showEdit.role} onChange={e=>setShowEdit({...showEdit,role:e.target.value})}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={showEdit.email} onChange={e=>setShowEdit({...showEdit,email:e.target.value})} />
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
            <Btn variant="ghost" onClick={()=>setShowEdit(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleUpdate}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {showResetPw && (
        <Modal title={`Reset Password — ${showResetPw.name}`} onClose={()=>setShowResetPw(null)} width="420px">
          <div style={S.formRow}>
            <label style={S.label}>New Password</label>
            <input style={S.input} type="password" placeholder="Minimum 6 characters" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
            <Btn variant="ghost" onClick={()=>setShowResetPw(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleResetPassword} disabled={newPassword.length < 6}>Reset Password</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Navigation Config ─────────────────────────────────────
const NAV = [
  { id:"dashboard", label:"Dashboard", icon:"◈" },
  { id:"connectors", label:"Connectors", icon:"⬡" },
  { id:"builder", label:"Report Builder", icon:"⊞" },
  { id:"reports", label:"Report Library", icon:"≡" },
  { id:"clients", label:"Clients", icon:"◉" },
  { id:"users", label:"Users", icon:"👤" },
  { id:"settings", label:"Settings", icon:"⚙" },
];

const PAGE_TITLES = {
  dashboard:"Dashboard", connectors:"Integration Connectors",
  builder:"Report Builder", reports:"Report Library",
  clients:"Client Management", users:"User Management", settings:"Settings",
};

// ── Root App ──────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [connectorData, setConnectorData] = useState([]);
  const [clientData, setClientData] = useState([]);
  const [templateData, setTemplateData] = useState([]);
  const [runData, setRunData] = useState([]);
  const [apiConnected, setApiConnected] = useState(false);

  // Check for existing session
  useEffect(() => {
    if (api.getToken()) {
      // Validate token by loading data
      loadAllData().then(() => setUser({ name: "User" })).catch(() => api.setToken(null));
    }
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      const [c, cl, t, r] = await Promise.all([
        api.connectors.list().catch(() => []),
        api.clients.list().catch(() => []),
        api.templates.list().catch(() => []),
        api.runs.list({ limit: 20 }).catch(() => []),
      ]);
      setConnectorData(c);
      setClientData(cl);
      setTemplateData(t);
      setRunData(r);
      setApiConnected(true);
    } catch {
      setApiConnected(false);
    }
  }, []);

  useEffect(() => { if (user) loadAllData(); }, [user, loadAllData]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
  };

  if (!user && !api.getToken()) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch(page) {
      case "dashboard": return <DashboardPage connectorData={connectorData} clientData={clientData} reportData={templateData} runData={runData} />;
      case "connectors": return <ConnectorsPage data={connectorData} onRefresh={loadAllData} />;
      case "builder": return <ReportBuilderPage connectorData={connectorData} onRefresh={loadAllData} />;
      case "reports": return <ReportsPage data={templateData} clientData={clientData} onRefresh={loadAllData} />;
      case "clients": return <ClientsPage data={clientData} connectorData={connectorData} onRefresh={loadAllData} />;
      case "users": return <UsersPage currentUser={user} />;
      case "settings": return <SettingsPage currentUser={user} />;
      default: return <DashboardPage connectorData={connectorData} clientData={clientData} reportData={templateData} runData={runData} />;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        input[type=checkbox] { cursor: pointer; }
        select option { background: ${T.panel}; color: ${T.text}; }
      `}</style>
      <div style={S.app}>
        <div style={S.sidebar}>
          <div style={S.logo}>
            <span style={S.logoAccent}>◈</span> Nexus<span style={{ fontWeight:400, color: T.textDim }}>MSP</span>
          </div>
          <nav style={S.nav}>
            {NAV.map(n => (
              <div key={n.id} style={S.navItem(page===n.id)} onClick={()=>setPage(n.id)}>
                <span style={{ fontSize:14 }}>{n.icon}</span>
                {n.label}
              </div>
            ))}
          </nav>
          <div style={S.sidebarBottom}>
            <div style={{ marginBottom:4, color: T.textDim }}>NexusMSP v0.1.0</div>
            <div style={{ color: T.border, marginBottom:8 }}>✦ AI-Powered Reporting</div>
            <button onClick={handleLogout} style={{ background:"none", border:"none", color: T.muted, cursor:"pointer", fontSize:11, fontFamily: T.font }}>Sign Out</button>
          </div>
        </div>

        <div style={S.main}>
          <div style={S.topbar}>
            <span style={S.topbarTitle}>{PAGE_TITLES[page]}</span>
            <div style={S.topbarActions}>
              <div style={{
                background: apiConnected ? `${T.green}15` : `${T.red}15`,
                border:`1px solid ${apiConnected ? T.green : T.red}30`,
                borderRadius:6, padding:"5px 12px", fontSize:11,
                color: apiConnected ? T.green : T.red,
                display:"flex", alignItems:"center", gap:6,
              }}>
                <span style={S.dot(apiConnected ? T.green : T.red)} />
                {apiConnected ? "API Connected" : "API Offline"}
              </div>
              <div style={{
                width:32, height:32, borderRadius:"50%",
                background: T.accent, color: T.bg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:13, fontFamily: T.display,
              }}>{(user?.name||user?.email||"U")[0].toUpperCase()}</div>
            </div>
          </div>
          <div style={S.content}>{renderPage()}</div>
        </div>
      </div>
    </>
  );
}
