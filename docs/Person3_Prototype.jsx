import { useState, useEffect, useRef } from "react";

// ─── Google Fonts ────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Syne:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    ::-webkit-scrollbar { display: none; }
    * { scrollbar-width: none; }

    :root {
      --bg:       #080604;
      --bg2:      #110e09;
      --surface:  #1c1610;
      --amber:    #f5a623;
      --amber2:   #ffc654;
      --cream:    #f7efe0;
      --muted:    #7a6a55;
      --dim:      #3a3020;
      --danger:   #ff6b6b;
      --safe:     #6bcf8f;
      --font-display: 'Cormorant Garamond', serif;
      --font-ui:      'Syne', sans-serif;
    }

    body { background: var(--bg); color: var(--cream); font-family: var(--font-ui); overflow: hidden; }

    @keyframes fadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
    @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
    @keyframes scaleIn  { from { opacity:0; transform:scale(0.88) } to { opacity:1; transform:scale(1) } }
    @keyframes pulse    { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.6; transform:scale(.95) } }
    @keyframes glow     { 0%,100% { box-shadow:0 0 12px #f5a62355 } 50% { box-shadow:0 0 28px #f5a62388, 0 0 48px #f5a62322 } }
    @keyframes laser    { 0% { top:0% } 100% { top:100% } }
    @keyframes ping     { 0% { transform:scale(1); opacity:1 } 100% { transform:scale(2.4); opacity:0 } }
    @keyframes slideUp  { from { transform:translateY(100%) } to { transform:translateY(0) } }
    @keyframes shimmer  { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
    @keyframes letterIn { from { opacity:0; transform:translateY(32px) rotateX(-40deg) } to { opacity:1; transform:translateY(0) rotateX(0) } }
    @keyframes assemble { 0% { transform:translateY(-30px) rotate(-15deg); opacity:0 } 60% { transform:translateY(4px) rotate(2deg); opacity:1 } 100% { transform:translateY(0) rotate(0deg); opacity:1 } }
    @keyframes dotPulse { 0%,100% { transform:scale(1); opacity:.7 } 50% { transform:scale(1.5); opacity:1 } }
    @keyframes checkIn  { from { transform:scale(0) rotate(-30deg); opacity:0 } to { transform:scale(1) rotate(0); opacity:1 } }
    @keyframes cardFan  { from { opacity:0; transform:translateX(40px) } to { opacity:1; transform:translateX(0) } }
    @keyframes pinDrop  { 0% { transform:translateY(-20px) scale(0); opacity:0 } 70% { transform:translateY(4px) scale(1.15) } 100% { transform:translateY(0) scale(1); opacity:1 } }
    @keyframes scanline { 0%,100% { opacity:.04 } 50% { opacity:.09 } }
  `}</style>
);

// ─── Mock Data ───────────────────────────────────────────────────────────────
const RESTAURANTS = [
  { id:1, name:"Merchant",      cuisine:"Gastropub",       distance:"0.3 mi", open:true,  rating:4.7, price:"$$",   photo:"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80", desc:"Craft cocktails & elevated bar food on State St" },
  { id:2, name:"Graze",         cuisine:"Farm-to-Table",   distance:"0.5 mi", open:true,  rating:4.8, price:"$$$",  photo:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80", desc:"Local ingredients, seasonal menu on Capitol Square" },
  { id:3, name:"Nostrano",      cuisine:"Italian",         distance:"0.8 mi", open:false, rating:4.6, price:"$$$",  photo:"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80", desc:"Wood-fired Neapolitan pizzas & hand-made pasta" },
  { id:4, name:"Forequarter",   cuisine:"Eclectic",        distance:"1.1 mi", open:true,  rating:4.9, price:"$$$",  photo:"https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=600&q=80", desc:"Inventive small plates, intimate atmosphere" },
  { id:5, name:"Ha Long Bay",   cuisine:"Vietnamese",      distance:"1.4 mi", open:true,  rating:4.5, price:"$",    photo:"https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80", desc:"Authentic pho, fresh spring rolls & bánh mì" },
  { id:6, name:"Taqueria Guanajuato","cuisine":"Mexican",  distance:"0.9 mi", open:true,  rating:4.4, price:"$",    photo:"https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80", desc:"Street tacos, house-made tortillas, smoky salsas" },
];

const MAP_PINS = [
  { id:1, x:48, y:42 }, { id:2, x:52, y:38 }, { id:3, x:44, y:50 },
  { id:4, x:58, y:46 }, { id:5, x:36, y:54 }, { id:6, x:62, y:35 },
];

const AGENTS = [
  { id:"scanner",    label:"Reading menu",    icon:"⌖" },
  { id:"photo",      label:"Finding photos",  icon:"◈" },
  { id:"recommender",label:"Mining reviews",  icon:"◉" },
  { id:"nutrition",  label:"Estimating macros",icon:"◎" },
];

// ─── Shared UI pieces ────────────────────────────────────────────────────────
const Scanline = () => (
  <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:1,
    backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px)",
    animation:"scanline 3s ease-in-out infinite" }} />
);

// ─── SCREEN 1: SPLASH ────────────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0); // 0=icon, 1=title, 2=tagline, 3=cta
  const title = "MadisonBites";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 700);
    const t2 = setTimeout(() => setPhase(2), 1600);
    const t3 = setTimeout(() => setPhase(3), 2400);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, []);

  return (
    <div style={{ position:"relative", width:"100%", height:"100%", background:"var(--bg)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      overflow:"hidden" }}>
      <Scanline />

      {/* Ambient glow */}
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(245,166,35,.08) 0%, transparent 70%)",
        top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none" }} />

      {/* Icon */}
      <div style={{ fontSize:72, marginBottom:32,
        animation: phase>=0 ? "assemble .7s cubic-bezier(.34,1.56,.64,1) forwards" : "none",
        opacity: phase>=0 ? 1:0 }}>
        🍽
      </div>

      {/* Title — letter stagger */}
      <div style={{ display:"flex", gap:2, marginBottom:16, perspective:600 }}>
        {title.split("").map((ch, i) => (
          <span key={i} style={{
            fontFamily:"var(--font-display)", fontWeight:700, fontSize:42,
            color: i < 7 ? "var(--amber)" : "var(--cream)",
            display:"inline-block",
            animation: phase>=1 ? `letterIn .5s cubic-bezier(.34,1.56,.64,1) forwards` : "none",
            animationDelay: phase>=1 ? `${i*55}ms` : "0ms",
            opacity: phase>=1 ? 1:0,
          }}>{ch === " " ? "\u00A0" : ch}</span>
        ))}
      </div>

      {/* Tagline */}
      <p style={{ fontFamily:"var(--font-ui)", fontSize:13, color:"var(--muted)",
        letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:56,
        opacity: phase>=2 ? 1:0, animation: phase>=2 ? "fadeUp .6s ease forwards":"none" }}>
        Every menu. Every dish. Madison's best.
      </p>

      {/* CTA */}
      {phase >= 3 && (
        <button onClick={onDone} style={{
          background:"var(--amber)", color:"#000", border:"none",
          fontFamily:"var(--font-ui)", fontWeight:700, fontSize:14,
          letterSpacing:"0.1em", textTransform:"uppercase",
          padding:"16px 40px", borderRadius:100,
          cursor:"pointer", animation:"glow 2s ease-in-out infinite, fadeUp .5s ease forwards",
        }}>
          Find a Restaurant
        </button>
      )}

      {/* Corner labels */}
      <div style={{ position:"absolute", bottom:24, left:0, right:0, display:"flex",
        justifyContent:"center", gap:32, opacity: phase>=3 ? .4:0,
        transition:"opacity .4s", animation: phase>=3?"fadeIn .6s ease forwards":"none" }}>
        {["CheeseHacks 2025","Madison, WI","Google ADK"].map(t => (
          <span key={t} style={{ fontSize:10, fontFamily:"var(--font-ui)", color:"var(--muted)",
            letterSpacing:"0.12em", textTransform:"uppercase" }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── SCREEN 2: RESTAURANT BROWSER ────────────────────────────────────────────
function RestaurantBrowser({ onSelect }) {
  const [filter, setFilter] = useState("All");
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const filters = ["All","Gastropub","Farm-to-Table","Italian","Vietnamese","Mexican","Eclectic"];

  const filtered = RESTAURANTS.filter(r => {
    if (openOnly && !r.open) return false;
    if (filter !== "All" && r.cuisine !== filter) return false;
    return true;
  });

  return (
    <div style={{ width:"100%", height:"100%", background:"var(--bg)", display:"flex",
      flexDirection:"column", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ padding:"48px 20px 16px", animation:"fadeUp .5s ease forwards" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:4 }}>
          <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:32,
            color:"var(--amber)" }}>Madison</span>
          <span style={{ fontFamily:"var(--font-display)", fontWeight:400, fontSize:28,
            color:"var(--cream)", fontStyle:"italic" }}>Restaurants</span>
        </div>
        <p style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--font-ui)",
          letterSpacing:"0.1em" }}>{filtered.length} spots near you</p>
      </div>

      {/* Fake Map */}
      <div style={{ margin:"0 20px", height:180, borderRadius:16, overflow:"hidden",
        position:"relative", border:"1px solid var(--dim)",
        animation:"scaleIn .5s .1s ease forwards", opacity:0 }}>
        {/* Map bg — styled dark tile look */}
        <div style={{ position:"absolute", inset:0,
          background:"linear-gradient(135deg, #0a0d0f 0%, #111820 40%, #0d1510 100%)" }} />
        {/* Grid lines */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:.15 }}>
          {[0,1,2,3,4,5].map(i=><line key={i} x1={`${i*20}%`} y1="0%" x2={`${i*20}%`} y2="100%" stroke="#ffffff" strokeWidth=".4"/>)}
          {[0,1,2,3,4].map(i=><line key={i} x1="0%" y1={`${i*25}%`} x2="100%" y2={`${i*25}%`} stroke="#ffffff" strokeWidth=".4"/>)}
        </svg>
        {/* Road lines */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:.25 }}>
          <line x1="0%" y1="40%" x2="100%" y2="38%" stroke="#2a3a2a" strokeWidth="6"/>
          <line x1="0%" y1="60%" x2="100%" y2="58%" stroke="#2a3a2a" strokeWidth="4"/>
          <line x1="45%" y1="0%" x2="48%" y2="100%" stroke="#2a3a2a" strokeWidth="5"/>
          <line x1="65%" y1="0%" x2="62%" y2="100%" stroke="#2a3a2a" strokeWidth="3"/>
          <path d="M 20% 80% Q 50% 20% 80% 60%" stroke="#2a3a2a" strokeWidth="4" fill="none"/>
        </svg>
        {/* Lake Mendota blob */}
        <div style={{ position:"absolute", top:-20, left:-10, width:200, height:100,
          background:"rgba(20,40,60,.6)", borderRadius:"50% 50% 60% 40%", filter:"blur(8px)" }}/>

        {/* Pins */}
        {MAP_PINS.map((pin, i) => {
          const r = RESTAURANTS.find(r=>r.id===pin.id);
          const isFiltered = filtered.find(f=>f.id===pin.id);
          return (
            <div key={pin.id} onClick={()=>{ setSelectedPin(pin.id); onSelect(r); }}
              style={{ position:"absolute", left:`${pin.x}%`, top:`${pin.y}%`,
                transform:"translate(-50%,-100%)", cursor:"pointer",
                animation:`pinDrop .5s cubic-bezier(.34,1.56,.64,1) forwards`,
                animationDelay:`${i*80}ms`, opacity:0,
                filter: isFiltered ? "none":"brightness(.3) saturate(0)",
              }}>
              {/* Pin shape */}
              <div style={{ position:"relative" }}>
                <div style={{
                  width: selectedPin===pin.id ? 28:22,
                  height: selectedPin===pin.id ? 28:22,
                  borderRadius:"50% 50% 50% 0%", transform:"rotate(-45deg)",
                  background: selectedPin===pin.id ? "var(--amber)":"rgba(245,166,35,.7)",
                  border:`2px solid ${selectedPin===pin.id?"var(--amber2)":"rgba(245,166,35,.4)"}`,
                  transition:"all .2s",
                  boxShadow: selectedPin===pin.id?"0 0 16px rgba(245,166,35,.6)":"none",
                }} />
                {selectedPin===pin.id && (
                  <div style={{ position:"absolute", inset:-6, borderRadius:"50% 50% 50% 0%",
                    transform:"rotate(-45deg)", border:"2px solid rgba(245,166,35,.3)",
                    animation:"ping .8s ease-out infinite" }} />
                )}
              </div>
            </div>
          );
        })}

        {/* Map label */}
        <div style={{ position:"absolute", bottom:8, right:10, fontSize:9,
          color:"rgba(255,255,255,.2)", fontFamily:"var(--font-ui)", letterSpacing:"0.1em" }}>
          MADISON, WI
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display:"flex", gap:8, padding:"12px 20px", overflowX:"auto",
        animation:"fadeUp .4s .15s ease forwards", opacity:0 }}>
        <button onClick={()=>setOpenOnly(!openOnly)} style={{
          flexShrink:0, padding:"6px 14px", borderRadius:100, fontSize:11, fontWeight:600,
          fontFamily:"var(--font-ui)", letterSpacing:"0.06em", cursor:"pointer", border:"none",
          background: openOnly?"var(--safe)":"var(--surface)",
          color: openOnly?"#000":"var(--muted)", transition:"all .2s",
        }}>Open Now</button>
        {filters.map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{
            flexShrink:0, padding:"6px 14px", borderRadius:100, fontSize:11, fontWeight:600,
            fontFamily:"var(--font-ui)", letterSpacing:"0.06em", cursor:"pointer", border:"none",
            background: filter===f?"var(--amber)":"var(--surface)",
            color: filter===f?"#000":"var(--muted)", transition:"all .2s",
          }}>{f}</button>
        ))}
      </div>

      {/* Restaurant cards */}
      <div style={{ flex:1, overflowY:"auto", padding:"4px 20px 40px" }}>
        {filtered.map((r, i) => (
          <div key={r.id} onClick={()=>onSelect(r)}
            style={{ display:"flex", gap:14, padding:"14px 0",
              borderBottom:"1px solid var(--dim)", cursor:"pointer",
              animation:`cardFan .4s cubic-bezier(.34,1.56,.64,1) forwards`,
              animationDelay:`${i*60}ms`, opacity:0,
            }}>
            {/* Photo */}
            <div style={{ width:80, height:80, borderRadius:12, overflow:"hidden", flexShrink:0,
              border:"1px solid var(--dim)" }}>
              <img src={r.photo} alt={r.name} style={{ width:"100%", height:"100%",
                objectFit:"cover", filter: r.open?"none":"grayscale(.6) brightness(.7)" }} />
            </div>
            {/* Info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <span style={{ fontFamily:"var(--font-display)", fontWeight:600, fontSize:20,
                  color: r.open?"var(--cream)":"var(--muted)" }}>{r.name}</span>
                {!r.open && <span style={{ fontSize:10, color:"var(--danger)",
                  fontFamily:"var(--font-ui)", fontWeight:600 }}>CLOSED</span>}
              </div>
              <p style={{ fontSize:12, color:"var(--muted)", marginBottom:6,
                fontFamily:"var(--font-ui)", whiteSpace:"nowrap", overflow:"hidden",
                textOverflow:"ellipsis" }}>{r.desc}</p>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <span style={{ fontSize:12, color:"var(--amber)", fontWeight:700 }}>★ {r.rating}</span>
                <span style={{ fontSize:11, color:"var(--muted)" }}>{r.price}</span>
                <span style={{ fontSize:11, color:"var(--muted)" }}>{r.distance}</span>
                <span style={{ fontSize:11, color:"var(--muted)",
                  background:"var(--surface)", padding:"2px 8px", borderRadius:100 }}>{r.cuisine}</span>
              </div>
            </div>
            {/* Arrow */}
            <div style={{ color:"var(--dim)", fontSize:20, alignSelf:"center" }}>›</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SCREEN 3: RESTAURANT DETAIL ─────────────────────────────────────────────
function RestaurantDetail({ restaurant, onScan, onBack }) {
  const [tab, setTab] = useState("scan");
  const [heroLoaded, setHeroLoaded] = useState(false);

  return (
    <div style={{ width:"100%", height:"100%", background:"var(--bg)",
      display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Hero */}
      <div style={{ position:"relative", height:220, flexShrink:0 }}>
        <img src={restaurant.photo} alt={restaurant.name}
          onLoad={()=>setHeroLoaded(true)}
          style={{ width:"100%", height:"100%", objectFit:"cover",
            filter: heroLoaded ? "brightness(.55)":"brightness(0)",
            transition:"filter 1s ease" }} />

        {/* Gradient */}
        <div style={{ position:"absolute", inset:0,
          background:"linear-gradient(to bottom, rgba(8,6,4,.3) 0%, rgba(8,6,4,.0) 40%, rgba(8,6,4,1) 100%)" }} />

        {/* Back button */}
        <button onClick={onBack} style={{
          position:"absolute", top:48, left:16, width:38, height:38, borderRadius:"50%",
          background:"rgba(8,6,4,.6)", border:"1px solid var(--dim)",
          color:"var(--cream)", fontSize:18, cursor:"pointer", backdropFilter:"blur(8px)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>‹</button>

        {/* Name over hero */}
        <div style={{ position:"absolute", bottom:16, left:20, right:20 }}>
          <h1 style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:36,
            color:"var(--cream)", lineHeight:1.1, marginBottom:4 }}>{restaurant.name}</h1>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <span style={{ color:"var(--amber)", fontSize:13, fontWeight:700 }}>★ {restaurant.rating}</span>
            <span style={{ color:"var(--muted)", fontSize:12 }}>{restaurant.price}</span>
            <span style={{ color:"var(--muted)", fontSize:12 }}>{restaurant.cuisine}</span>
            <span style={{ color: restaurant.open ? "var(--safe)":"var(--danger)",
              fontSize:11, fontWeight:700 }}>{restaurant.open?"OPEN NOW":"CLOSED"}</span>
          </div>
        </div>
      </div>

      {/* Info row */}
      <div style={{ display:"flex", gap:0, padding:"12px 20px",
        borderBottom:"1px solid var(--dim)", animation:"fadeUp .4s ease forwards" }}>
        {[["📍","State Street, Madison"],["⏱","11am – 12am"],["☎","(608) 555-0142"]].map(([ic,t])=>(
          <div key={t} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <span style={{ fontSize:16 }}>{ic}</span>
            <span style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-ui)",
              textAlign:"center", letterSpacing:"0.04em" }}>{t}</span>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", padding:"12px 20px 0",
        borderBottom:"1px solid var(--dim)" }}>
        {[["scan","Scan Menu"],["browse","Browse Dishes"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1, padding:"10px 0", fontSize:13, fontWeight:600,
            fontFamily:"var(--font-ui)", letterSpacing:"0.06em",
            background:"none", border:"none", cursor:"pointer",
            color: tab===id?"var(--amber)":"var(--muted)",
            borderBottom: tab===id?"2px solid var(--amber)":"2px solid transparent",
            transition:"all .2s",
          }}>{label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", padding:24, gap:20 }}>
        {tab==="scan" ? (
          <>
            <div style={{ fontSize:56, animation:"pulse 2s ease infinite" }}>⌖</div>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontFamily:"var(--font-display)", fontWeight:600, fontSize:24,
                color:"var(--cream)", marginBottom:8 }}>Scan the menu</p>
              <p style={{ fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>
                Point your camera at any paper or digital menu.<br/>
                4 AI agents will extract every dish in real time.
              </p>
            </div>
            <button onClick={onScan} style={{
              background:"var(--amber)", color:"#000", border:"none",
              fontFamily:"var(--font-ui)", fontWeight:700, fontSize:14,
              letterSpacing:"0.1em", textTransform:"uppercase",
              padding:"16px 40px", borderRadius:100, cursor:"pointer",
              animation:"glow 2s ease-in-out infinite",
            }}>Open Camera</button>
          </>
        ) : (
          <>
            <div style={{ fontSize:48 }}>🍽</div>
            <p style={{ fontFamily:"var(--font-display)", fontWeight:600, fontSize:22,
              color:"var(--cream)", textAlign:"center" }}>Menu loaded from<br/>Google Maps</p>
            <button onClick={onScan} style={{
              background:"var(--surface)", color:"var(--cream)", border:"1px solid var(--dim)",
              fontFamily:"var(--font-ui)", fontWeight:600, fontSize:13,
              padding:"12px 28px", borderRadius:100, cursor:"pointer",
            }}>View All Dishes →</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SCREEN 4: MENU SCAN ─────────────────────────────────────────────────────
function MenuScan({ restaurant, onDone, onBack }) {
  const [scanPhase, setScanPhase]   = useState("idle"); // idle|scanning|processing|done
  const [agentStates, setAgentStates] = useState({ scanner:"pending", photo:"pending", recommender:"pending", nutrition:"pending" });
  const [dishCount, setDishCount]   = useState(0);

  const startScan = () => {
    setScanPhase("scanning");
    setTimeout(()=>setScanPhase("processing"), 2000);
    // Simulate agents completing one by one
    const seq = ["scanner","photo","recommender","nutrition"];
    seq.forEach((agent,i)=>{
      setTimeout(()=>{
        setAgentStates(prev=>({...prev,[agent]:"running"}));
        setTimeout(()=>{
          setAgentStates(prev=>({...prev,[agent]:"done"}));
          setDishCount(n=>n+(3+i));
        }, 1400);
      }, 2400+i*1600);
    });
    setTimeout(()=>setScanPhase("done"), 2400+4*1600+600);
  };

  const agentDoneCount = Object.values(agentStates).filter(s=>s==="done").length;

  return (
    <div style={{ width:"100%", height:"100%", background:"var(--bg)",
      display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"48px 20px 16px" }}>
        <button onClick={onBack} style={{ background:"none", border:"none",
          color:"var(--muted)", fontSize:22, cursor:"pointer", padding:0 }}>‹</button>
        <div>
          <p style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-ui)",
            letterSpacing:"0.1em", textTransform:"uppercase" }}>Scanning</p>
          <h2 style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:24,
            color:"var(--cream)" }}>{restaurant.name}</h2>
        </div>
      </div>

      {/* Camera viewport */}
      <div style={{ margin:"0 20px", flex:1, borderRadius:20, overflow:"hidden",
        position:"relative", border:"1px solid var(--dim)", background:"#050403",
        minHeight:280, maxHeight:360 }}>

        {/* Fake camera feed / menu image */}
        <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=50"
          alt="menu" style={{ width:"100%", height:"100%", objectFit:"cover",
            opacity: scanPhase==="idle"?.3:.5, transition:"opacity .5s",
            filter:"brightness(.4) blur(2px)" }} />

        {/* Scan frame corners */}
        {["top-left","top-right","bottom-left","bottom-right"].map(pos=>{
          const isTop = pos.includes("top"), isLeft = pos.includes("left");
          return (
            <div key={pos} style={{
              position:"absolute",
              top: isTop?16:undefined, bottom: !isTop?16:undefined,
              left: isLeft?16:undefined, right: !isLeft?16:undefined,
              width:28, height:28,
              borderTop: isTop?"2px solid var(--amber)":undefined,
              borderBottom: !isTop?"2px solid var(--amber)":undefined,
              borderLeft: isLeft?"2px solid var(--amber)":undefined,
              borderRight: !isLeft?"2px solid var(--amber)":undefined,
              opacity: scanPhase!=="idle"?1:.5,
              transition:"opacity .3s",
            }}/>
          );
        })}

        {/* Laser line */}
        {(scanPhase==="scanning"||scanPhase==="processing") && (
          <div style={{ position:"absolute", left:16, right:16, height:2,
            background:"linear-gradient(90deg, transparent, #ff4444, #ff6666, #ff4444, transparent)",
            boxShadow:"0 0 12px rgba(255,80,80,.8), 0 0 24px rgba(255,80,80,.4)",
            animation:"laser 1.8s ease-in-out infinite",
            top:0, zIndex:10 }} />
        )}

        {/* Idle state */}
        {scanPhase==="idle" && (
          <div style={{ position:"absolute", inset:0, display:"flex",
            flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
            <div style={{ fontSize:40, opacity:.4 }}>⌖</div>
            <p style={{ fontSize:12, color:"rgba(247,239,224,.3)", fontFamily:"var(--font-ui)",
              letterSpacing:"0.1em" }}>Point at any menu</p>
          </div>
        )}

        {/* Processing overlay */}
        {scanPhase==="processing"&&agentDoneCount===0 && (
          <div style={{ position:"absolute", inset:0, background:"rgba(8,6,4,.6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            backdropFilter:"blur(4px)" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:32, animation:"pulse 1s ease infinite", marginBottom:8 }}>⌖</div>
              <p style={{ fontSize:12, color:"var(--amber)", fontFamily:"var(--font-ui)",
                letterSpacing:"0.12em" }}>Parsing menu...</p>
            </div>
          </div>
        )}

        {/* Dish count badge */}
        {dishCount>0 && (
          <div style={{ position:"absolute", top:12, right:12,
            background:"var(--amber)", color:"#000", borderRadius:100,
            padding:"4px 12px", fontSize:12, fontWeight:700, fontFamily:"var(--font-ui)",
            animation:"scaleIn .3s cubic-bezier(.34,1.56,.64,1) forwards" }}>
            {dishCount} dishes found
          </div>
        )}
      </div>

      {/* Agent status bar */}
      <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:10 }}>
        <p style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-ui)",
          letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>AI Agents</p>

        {AGENTS.map((agent, i) => {
          const state = agentStates[agent.id];
          const isDone    = state==="done";
          const isRunning = state==="running";
          return (
            <div key={agent.id} style={{ display:"flex", alignItems:"center", gap:12,
              padding:"10px 14px", borderRadius:12,
              background: isDone?"rgba(245,166,35,.06)":isRunning?"rgba(245,166,35,.04)":"rgba(28,22,16,.5)",
              border: `1px solid ${isDone?"rgba(245,166,35,.25)":isRunning?"rgba(245,166,35,.15)":"var(--dim)"}`,
              transition:"all .4s",
            }}>
              {/* Status dot */}
              <div style={{ position:"relative", width:10, height:10, flexShrink:0 }}>
                <div style={{
                  width:10, height:10, borderRadius:"50%",
                  background: isDone?"var(--safe)":isRunning?"var(--amber)":"var(--dim)",
                  transition:"background .3s",
                  animation: isRunning?"dotPulse 1s ease infinite":undefined,
                }}/>
                {isRunning && (
                  <div style={{ position:"absolute", inset:-4, borderRadius:"50%",
                    border:"1px solid var(--amber)", animation:"ping .8s ease-out infinite",
                    opacity:.5 }} />
                )}
              </div>

              {/* Icon */}
              <span style={{ fontSize:14, color: isDone?"var(--amber)":isRunning?"var(--amber)":"var(--dim)",
                fontFamily:"monospace", transition:"color .3s" }}>{agent.icon}</span>

              {/* Label */}
              <span style={{ flex:1, fontSize:13, fontFamily:"var(--font-ui)",
                color: isDone?"var(--cream)":isRunning?"var(--cream)":"var(--muted)",
                transition:"color .3s" }}>{agent.label}</span>

              {/* Checkmark / waiting */}
              {isDone ? (
                <span style={{ color:"var(--safe)", fontSize:14, fontWeight:700,
                  animation:"checkIn .4s cubic-bezier(.34,1.56,.64,1) forwards" }}>✓</span>
              ) : isRunning ? (
                <span style={{ color:"var(--amber)", fontSize:10, fontFamily:"var(--font-ui)",
                  letterSpacing:"0.1em", animation:"pulse 1s ease infinite" }}>working</span>
              ) : (
                <span style={{ color:"var(--dim)", fontSize:12 }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div style={{ padding:"0 20px 32px" }}>
        {scanPhase==="idle" ? (
          <button onClick={startScan} style={{
            width:"100%", padding:16, background:"var(--amber)", color:"#000",
            border:"none", borderRadius:14, fontFamily:"var(--font-ui)", fontWeight:700,
            fontSize:14, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer",
            animation:"glow 2s ease-in-out infinite",
          }}>Start Scan</button>
        ) : scanPhase==="done" ? (
          <button onClick={onDone} style={{
            width:"100%", padding:16, background:"var(--amber)", color:"#000",
            border:"none", borderRadius:14, fontFamily:"var(--font-ui)", fontWeight:700,
            fontSize:14, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer",
            animation:"scaleIn .4s cubic-bezier(.34,1.56,.64,1) forwards, glow 2s 0.4s ease-in-out infinite",
          }}>View {dishCount} Dishes →</button>
        ) : (
          <div style={{ textAlign:"center", padding:16 }}>
            <p style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--font-ui)",
              letterSpacing:"0.1em" }}>
              {agentDoneCount}/4 agents complete
            </p>
            {/* Progress bar */}
            <div style={{ marginTop:10, height:2, background:"var(--dim)", borderRadius:1 }}>
              <div style={{ height:"100%", borderRadius:1, background:"var(--amber)",
                width:`${(agentDoneCount/4)*100}%`, transition:"width .6s ease" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NAV BAR ─────────────────────────────────────────────────────────────────
function NavBar({ screen, onNav }) {
  if (screen==="splash") return null;
  const tabs = [
    { id:"browser", icon:"◉", label:"Explore" },
    { id:"scan",    icon:"⌖", label:"Scan" },
    { id:"profile", icon:"◈", label:"Profile" },
  ];
  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:100,
      background:"rgba(8,6,4,.92)", backdropFilter:"blur(16px)",
      borderTop:"1px solid var(--dim)", display:"flex", padding:"8px 0 20px" }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onNav(t.id)} style={{
          flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          background:"none", border:"none", cursor:"pointer", padding:"8px 0",
        }}>
          <span style={{ fontSize:18, color: screen===t.id||
            (t.id==="browser"&&["browser","detail"].includes(screen))||
            (t.id==="scan"&&["scan","scanning"].includes(screen))
            ?"var(--amber)":"var(--dim)", transition:"color .2s" }}>{t.icon}</span>
          <span style={{ fontSize:9, fontFamily:"var(--font-ui)", letterSpacing:"0.1em",
            textTransform:"uppercase",
            color: screen===t.id||
              (t.id==="browser"&&["browser","detail"].includes(screen))||
              (t.id==="scan"&&["scan","scanning"].includes(screen))
              ?"var(--amber)":"var(--muted)", transition:"color .2s" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]             = useState("splash");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [prevScreen, setPrevScreen]     = useState(null);

  const navigate = (to) => {
    setPrevScreen(screen);
    setScreen(to);
  };

  const selectRestaurant = (r) => {
    setSelectedRestaurant(r);
    navigate("detail");
  };

  const navTo = (id) => {
    if (id==="browser") navigate("browser");
    if (id==="scan" && selectedRestaurant) navigate("scanning");
    else if (id==="scan") navigate("browser");
  };

  // Screen transition wrapper
  const screenStyle = {
    position:"absolute", inset:0,
    animation:"fadeIn .3s ease forwards",
    // leave room for nav bar
    paddingBottom: screen!=="splash"?72:0,
  };

  return (
    <div style={{ width:"100%", height:"100vh", background:"var(--bg)",
      position:"relative", overflow:"hidden", maxWidth:390, margin:"0 auto" }}>
      <FontLoader />

      <div style={screenStyle}>
        {screen==="splash" && (
          <SplashScreen onDone={()=>navigate("browser")} />
        )}
        {screen==="browser" && (
          <RestaurantBrowser onSelect={selectRestaurant} />
        )}
        {screen==="detail" && selectedRestaurant && (
          <RestaurantDetail
            restaurant={selectedRestaurant}
            onScan={()=>navigate("scanning")}
            onBack={()=>navigate("browser")}
          />
        )}
        {screen==="scanning" && selectedRestaurant && (
          <MenuScan
            restaurant={selectedRestaurant}
            onDone={()=>alert("🎉 Dishes ready! Connect MenuDisplay.jsx here (Person 4's component).")}
            onBack={()=>navigate("detail")}
          />
        )}
      </div>

      <NavBar screen={screen} onNav={navTo} />
    </div>
  );
}
