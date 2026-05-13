import { useState, useEffect, useRef, useCallback, createContext, useContext, useReducer } from "react";

// ============================================================
// FIREBASE CONFIG -- Replace with your own Firebase project keys
// Get them from: https://console.firebase.google.com
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// ============================================================
// FIREBASE AUTH SERVICE
// ============================================================
let firebaseApp = null;
let firebaseAuth = null;

async function initFirebase() {
  if (firebaseApp) return { app: firebaseApp, auth: firebaseAuth };
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
      signInWithEmailAndPassword, sendEmailVerification, signOut, onAuthStateChanged } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

    firebaseApp = initializeApp(FIREBASE_CONFIG);
    firebaseAuth = getAuth(firebaseApp);
    return { auth: firebaseAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
      signInWithEmailAndPassword, sendEmailVerification, signOut, onAuthStateChanged };
  } catch (e) {
    console.error("Firebase init failed:", e);
    return null;
  }
}

// ============================================================
// CONSTANTS
// ============================================================
const ICONS  = ["⚡","🔥","💎","🎯","📊","🧠","🚀","💡","🔬","📈","🌊","⚙️","🎨","📝","🔑","💰","📱","🌐","🏆","⭐"];
const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#a855f7"];
const ENTRY_TYPES = ["note","task","link","file","image"];

const genId   = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
const now     = () => new Date().toISOString();
const fmtDate = iso => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const fmtTime = iso => new Date(iso).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});

// ============================================================
// SEED DATA
// ============================================================
const SEED_MODELS = [
  {
    id:"m1", name:"Research Hub", icon:"🧠", color:"#6366f1",
    description:"Deep research notes and discoveries",
    createdAt:now(), updatedAt:now(), pinned:true,
    folders:[
      { id:"f1", name:"SSMT Studies", collapsed:false, createdAt:now(),
        entries:[
          {id:"e1",type:"note",title:"NY AM SSMT Analysis",content:"Observed clean M15 SSMT into 4H FVG during 9:30 macro. Price delivered to -0.5 ext before reversing.",pinned:true,tags:["SSMT","NQ","NY AM"],createdAt:now(),updatedAt:now()},
          {id:"e2",type:"task",title:"Document Wednesday AMDX confluence",content:"Build out full documentation for Wednesday AMDX model.",pinned:false,tags:["AMDX","Task"],createdAt:now(),updatedAt:now(),done:false},
        ]},
      { id:"f2", name:"QT Sequences", collapsed:false, createdAt:now(),
        entries:[
          {id:"e3",type:"note",title:"Q3 Weekly → Q1 Daily Bearish",content:"When weekly Q3 aligns with daily Q1, bearish continuation is extremely high probability.",pinned:false,tags:["QT","HTF"],createdAt:now(),updatedAt:now()},
        ]},
    ]
  },
  {
    id:"m2", name:"Trade Journal", icon:"📊", color:"#22c55e",
    description:"Daily trading log and performance tracking",
    createdAt:now(), updatedAt:now(), pinned:false,
    folders:[
      { id:"f3", name:"May 2025", collapsed:false, createdAt:now(),
        entries:[
          {id:"e4",type:"note",title:"NQ Long -- May 6",content:"Entry: 19,840. Target: 19,920. SL: 19,800. Result: +80pts.",pinned:true,tags:["NQ","Win"],createdAt:now(),updatedAt:now()},
          {id:"e5",type:"note",title:"ES Short -- May 5",content:"Entry: 5,610. Target: 5,590. SL: 5,620. Result: +20pts.",pinned:false,tags:["ES","Win"],createdAt:now(),updatedAt:now()},
        ]},
      { id:"f4", name:"Statistics", collapsed:true, createdAt:now(),
        entries:[
          {id:"e6",type:"note",title:"Monthly Summary",content:"Win rate: 73%. Average win: 28pts NQ. Profit factor: 2.1.",pinned:false,tags:["Stats"],createdAt:now(),updatedAt:now()},
        ]},
    ]
  },
  {
    id:"m3", name:"Strategy Vault", icon:"🔑", color:"#f97316",
    description:"Proven setups and model documentation",
    createdAt:now(), updatedAt:now(), pinned:false,
    folders:[
      { id:"f5", name:"Entry Models", collapsed:false, createdAt:now(),
        entries:[
          {id:"e7",type:"note",title:"London Sweep Model",content:"Criteria: Asia range clear → London sweeps one side in first 30min → M5 displacement → FVG entry.",pinned:true,tags:["London","Entry"],createdAt:now(),updatedAt:now()},
          {id:"e8",type:"note",title:"Silver Bullet 10:00-11:00",content:"FVG delivery window. Best when London created clear draw and displacement.",pinned:false,tags:["Silver Bullet","M5"],createdAt:now(),updatedAt:now()},
        ]},
    ]
  },
];

const SEED_ACTIVITY = [
  {id:"a1",action:"Created entry",target:"NY AM SSMT Analysis",model:"Research Hub",time:now()},
  {id:"a2",action:"Updated folder",target:"May 2025",model:"Trade Journal",time:now()},
  {id:"a3",action:"Pinned entry",target:"London Sweep Model",model:"Strategy Vault",time:now()},
];

const AI_RESPONSES = {
  default: "I'm your Vaultspace AI assistant. I can help you analyze your notes, find patterns, summarize research, and suggest connections between your models. What would you like to explore?",
  ssmt: "Based on your SSMT notes, I've identified 3 recurring patterns: (1) M15 SSMT aligns with 4H FVG in 84% of NY AM entries, (2) London session sweeps precede your highest-confidence setups, (3) Tuesday shows the most SSMT documented cases. Would you like me to create a discovery from this?",
  journal: "Your Trade Journal shows a 73% win rate with a 2.1 profit factor. Your best performance is on Wednesdays using the AMDX model. I notice you haven't logged any trades this week -- would you like to add an entry?",
  strategy: "Your Strategy Vault has 2 confirmed models. The London Sweep Model appears in 9 of your 14 winning entries. I recommend linking it to your SSMT studies as they share 4 common confluence factors.",
  summary: "Here's your workspace summary: 3 models, 5 folders, 8 entries total. 3 pinned items. Most active model: Research Hub. Strongest pattern: SSMT + NY AM confluence. Suggested action: Add more evidence to your QT Sequences folder.",
  help: "I can help you with: \n• Summarizing your notes\n• Finding patterns across models\n• Suggesting new entries\n• Analyzing your trade journal\n• Creating discovery connections\n\nJust ask me anything about your research!",
};

const getAIResponse = (msg) => {
  const lo = msg.toLowerCase();
  if (lo.includes("ssmt") || lo.includes("research")) return AI_RESPONSES.ssmt;
  if (lo.includes("journal") || lo.includes("trade") || lo.includes("win")) return AI_RESPONSES.journal;
  if (lo.includes("strategy") || lo.includes("london") || lo.includes("model")) return AI_RESPONSES.strategy;
  if (lo.includes("summary") || lo.includes("overview") || lo.includes("stats")) return AI_RESPONSES.summary;
  if (lo.includes("help") || lo.includes("what can")) return AI_RESPONSES.help;
  return AI_RESPONSES.default;
};

// ============================================================
// STORE
// ============================================================
const initialState = {
  user: null, authed: false, authLoading: true,
  models: SEED_MODELS, activity: SEED_ACTIVITY,
  activeModelId: null, activeEntryId: null,
  searchQuery: "", toast: null, modal: null,
  sidebarOpen: false,
};

function reducer(state, action) {
  switch(action.type) {
    case "LOGIN":           return {...state, user:action.payload, authed:true, authLoading:false};
    case "LOGOUT":          return {...state, user:null, authed:false, authLoading:false, activeModelId:null, sidebarOpen:false};
    case "SET_AUTH_LOADING":return {...state, authLoading:action.payload};
    case "SET_ACTIVE_MODEL":return {...state, activeModelId:action.payload, activeEntryId:null};
    case "SET_ACTIVE_ENTRY":return {...state, activeEntryId:action.payload};
    case "SET_SEARCH":      return {...state, searchQuery:action.payload};
    case "TOGGLE_SIDEBAR":  return {...state, sidebarOpen:!state.sidebarOpen};
    case "OPEN_SIDEBAR":    return {...state, sidebarOpen:true};
    case "CLOSE_SIDEBAR":   return {...state, sidebarOpen:false};
    case "SET_TOAST":       return {...state, toast:action.payload};
    case "CLEAR_TOAST":     return {...state, toast:null};
    case "SET_MODAL":       return {...state, modal:action.payload};
    case "CLOSE_MODAL":     return {...state, modal:null};

    case "CREATE_MODEL": {
      const m = {id:genId(),name:"New Model",icon:"⚡",color:COLORS[0],description:"",createdAt:now(),updatedAt:now(),pinned:false,folders:[],...action.payload};
      return {...state, models:[...state.models,m], activeModelId:m.id,
        activity:[{id:genId(),action:"Created model",target:m.name,model:m.name,time:now()},...state.activity]};
    }
    case "UPDATE_MODEL": {
      return {...state, models:state.models.map(m=>m.id===action.payload.id?{...m,...action.payload,updatedAt:now()}:m)};
    }
    case "DELETE_MODEL": {
      const models = state.models.filter(m=>m.id!==action.payload);
      return {...state, models, activeModelId:models[0]?.id||null};
    }
    case "PIN_MODEL": {
      return {...state, models:state.models.map(m=>m.id===action.payload?{...m,pinned:!m.pinned}:m)};
    }
    case "CREATE_FOLDER": {
      const f = {id:genId(),name:"New Folder",collapsed:false,createdAt:now(),entries:[],...action.payload.folder};
      return {...state, models:state.models.map(m=>m.id===action.payload.modelId?{...m,folders:[...m.folders,f],updatedAt:now()}:m),
        activity:[{id:genId(),action:"Created folder",target:f.name,model:state.models.find(m=>m.id===action.payload.modelId)?.name||"",time:now()},...state.activity]};
    }
    case "UPDATE_FOLDER": {
      return {...state, models:state.models.map(m=>m.id===action.payload.modelId
        ?{...m,folders:m.folders.map(f=>f.id===action.payload.folderId?{...f,...action.payload.data}:f),updatedAt:now()}:m)};
    }
    case "DELETE_FOLDER": {
      return {...state, models:state.models.map(m=>m.id===action.payload.modelId
        ?{...m,folders:m.folders.filter(f=>f.id!==action.payload.folderId),updatedAt:now()}:m)};
    }
    case "TOGGLE_FOLDER": {
      return {...state, models:state.models.map(m=>m.id===action.payload.modelId
        ?{...m,folders:m.folders.map(f=>f.id===action.payload.folderId?{...f,collapsed:!f.collapsed}:f)}:m)};
    }
    case "CREATE_ENTRY": {
      const e = {id:genId(),type:"note",title:"Untitled",content:"",pinned:false,tags:[],createdAt:now(),updatedAt:now(),...action.payload.entry};
      const modelName = state.models.find(m=>m.id===action.payload.modelId)?.name||"";
      return {...state,
        models:state.models.map(m=>m.id===action.payload.modelId
          ?{...m,folders:m.folders.map(f=>f.id===action.payload.folderId?{...f,entries:[...f.entries,e]}:f),updatedAt:now()}:m),
        activeEntryId:e.id,
        activity:[{id:genId(),action:"Created entry",target:e.title,model:modelName,time:now()},...state.activity]};
    }
    case "UPDATE_ENTRY": {
      return {...state, models:state.models.map(m=>m.id===action.payload.modelId
        ?{...m,folders:m.folders.map(f=>f.id===action.payload.folderId
          ?{...f,entries:f.entries.map(e=>e.id===action.payload.entryId?{...e,...action.payload.data,updatedAt:now()}:e)}:f),updatedAt:now()}:m)};
    }
    case "DELETE_ENTRY": {
      return {...state,
        models:state.models.map(m=>m.id===action.payload.modelId
          ?{...m,folders:m.folders.map(f=>f.id===action.payload.folderId
            ?{...f,entries:f.entries.filter(e=>e.id!==action.payload.entryId)}:f)}:m),
        activeEntryId:state.activeEntryId===action.payload.entryId?null:state.activeEntryId};
    }
    case "PIN_ENTRY": {
      return {...state, models:state.models.map(m=>m.id===action.payload.modelId
        ?{...m,folders:m.folders.map(f=>f.id===action.payload.folderId
          ?{...f,entries:f.entries.map(e=>e.id===action.payload.entryId?{...e,pinned:!e.pinned}:e)}:f)}:m)};
    }
    case "TOGGLE_TASK": {
      return {...state, models:state.models.map(m=>m.id===action.payload.modelId
        ?{...m,folders:m.folders.map(f=>f.id===action.payload.folderId
          ?{...f,entries:f.entries.map(e=>e.id===action.payload.entryId?{...e,done:!e.done,updatedAt:now()}:e)}:f)}:m)};
    }
    default: return state;
  }
}

const StoreContext = createContext(null);
function StoreProvider({children}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toast = useCallback((msg, type="success") => {
    dispatch({type:"SET_TOAST",payload:{msg,type,id:genId()}});
    setTimeout(()=>dispatch({type:"CLEAR_TOAST"}), 3500);
  },[]);
  return <StoreContext.Provider value={{state,dispatch,toast}}>{children}</StoreContext.Provider>;
}
const useStore = () => useContext(StoreContext);

// ============================================================
// CSS
// ============================================================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#0a0a0f;--bg1:#111118;--bg2:#18181f;--bg3:#1e1e28;--bg4:#252532;
  --b:rgba(255,255,255,0.06);--b2:rgba(255,255,255,0.1);--b3:rgba(255,255,255,0.16);
  --t:#f0f0ff;--t2:#a0a0b8;--t3:#606075;--t4:#3a3a50;
  --a:#6366f1;--a2:#818cf8;--ag:linear-gradient(135deg,#6366f1,#8b5cf6);
  --red:#ef4444;--green:#22c55e;--gold:#f59e0b;--cyan:#06b6d4;
  --ff:'DM Sans',system-ui,sans-serif;--fm:'DM Mono',monospace;
  --r:10px;--r2:14px;--r3:20px;
  --shadow:0 4px 24px rgba(0,0,0,0.5);
  --nav-w:260px;
}
html,body,#root{height:100%;background:var(--bg);color:var(--t);font-family:var(--ff);overflow:hidden;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:3px;}
input,textarea,select,button{font-family:var(--ff);}
button{cursor:pointer;}

/* ── SHELL ── */
.shell{display:flex;height:100vh;overflow:hidden;position:relative;}

/* ── SIDEBAR OVERLAY (mobile) ── */
.sidebar-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:90;
  backdrop-filter:blur(2px);cursor:pointer;
  animation:fadeIn .2s ease;
}

/* ── SIDEBAR ── */
.sidebar{
  width:var(--nav-w);flex-shrink:0;background:var(--bg1);
  border-right:1px solid var(--b);display:flex;flex-direction:column;
  position:fixed;top:0;left:0;height:100%;z-index:100;
  transform:translateX(-100%);transition:transform .25s ease;
  will-change:transform;
}
.sidebar.open{transform:translateX(0);}

/* ── MAIN ── */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);width:100%;}

/* ── TOPBAR ── */
.topbar{height:54px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:10px;padding:0 16px;flex-shrink:0;background:var(--bg1);}

/* ── WORKSPACE ── */
.workspace{flex:1;display:flex;overflow:hidden;}
.panel{flex:1;overflow-y:auto;padding:24px;}

/* ── DETAIL PANEL ── */
.detail-panel{width:400px;flex-shrink:0;border-left:1px solid var(--b);background:var(--bg1);overflow-y:auto;display:flex;flex-direction:column;}

/* ── AUTH ── */
.auth-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);background-image:radial-gradient(circle at 20% 50%,rgba(99,102,241,0.1) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(139,92,246,0.07) 0%,transparent 50%);padding:20px;}
.auth-card{background:var(--bg1);border:1px solid var(--b2);border-radius:var(--r3);padding:36px;width:100%;max-width:420px;box-shadow:var(--shadow);}

/* ── SIDEBAR INNER ── */
.sb-head{padding:16px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.sb-logo{font-size:15px;font-weight:700;background:var(--ag);-webkit-background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;flex:1;}
.sb-close{width:28px;height:28px;border-radius:8px;background:var(--bg2);border:none;display:flex;align-items:center;justify-content:center;color:var(--t3);cursor:pointer;flex-shrink:0;}
.sb-close:hover{background:var(--bg3);color:var(--t);}
.sb-section{padding:8px 12px 4px;font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--t3);}
.sb-item{display:flex;align-items:center;gap:9px;padding:7px 12px;border-radius:var(--r);margin:1px 8px;cursor:pointer;font-size:13px;color:var(--t2);transition:all .15s;border:1px solid transparent;user-select:none;}
.sb-item:hover{background:var(--bg2);color:var(--t);}
.sb-item.active{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.2);color:var(--a2);}
.sb-icon{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;}
.sb-count{font-size:10px;font-family:var(--fm);background:var(--bg3);color:var(--t3);padding:1px 5px;border-radius:10px;flex-shrink:0;}
.sb-foot{margin-top:auto;border-top:1px solid var(--b);padding:12px;}
.sb-user{display:flex;align-items:center;gap:9px;padding:8px;border-radius:var(--r);cursor:pointer;transition:background .15s;}
.sb-user:hover{background:var(--bg2);}
.avatar{width:30px;height:30px;border-radius:8px;background:var(--ag);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;}

/* ── TOPBAR BTNS ── */
.tb-btn{width:32px;height:32px;border-radius:var(--r);background:transparent;border:1px solid transparent;color:var(--t3);display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
.tb-btn:hover{background:var(--bg2);color:var(--t);border-color:var(--b);}
.tb-search{flex:1;max-width:420px;display:flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:6px 12px;}
.tb-search input{flex:1;background:none;border:none;outline:none;color:var(--t);font-size:13px;}
.tb-search input::placeholder{color:var(--t3);}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--r);border:none;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:var(--ag);color:#fff;box-shadow:0 2px 12px rgba(99,102,241,.3);}
.btn-primary:hover{opacity:.9;transform:translateY(-1px);}
.btn-secondary{background:var(--bg2);border:1px solid var(--b2);color:var(--t2);}
.btn-secondary:hover{background:var(--bg3);color:var(--t);}
.btn-ghost{background:transparent;border:1px solid transparent;color:var(--t3);}
.btn-ghost:hover{background:var(--bg2);color:var(--t);}
.btn-danger{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:var(--red);}
.btn-danger:hover{background:rgba(239,68,68,.2);}
.btn-google{background:#fff;color:#333;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:11px 14px;font-size:14px;font-weight:500;border-radius:var(--r);cursor:pointer;transition:all .15s;}
.btn-google:hover{background:#f5f5f5;box-shadow:0 2px 8px rgba(0,0,0,.15);}
.btn-sm{padding:5px 10px;font-size:12px;}
.btn-icon{width:28px;height:28px;padding:0;border-radius:var(--r);background:transparent;border:1px solid transparent;color:var(--t3);display:flex;align-items:center;justify-content:center;transition:all .15s;}
.btn-icon:hover{background:var(--bg3);color:var(--t);border-color:var(--b);}
.w-full{width:100%;}

/* ── CARDS ── */
.card{background:var(--bg2);border:1px solid var(--b);border-radius:var(--r2);padding:20px;transition:border-color .15s;}
.card:hover{border-color:var(--b2);}
.card-sm{padding:14px;}

/* ── MODEL GRID ── */
.model-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;}
.model-card{background:var(--bg2);border:1px solid var(--b);border-radius:var(--r2);padding:20px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.model-card:hover{border-color:var(--b2);transform:translateY(-2px);box-shadow:var(--shadow);}
.model-card.active{border-color:var(--a);background:rgba(99,102,241,.05);}
.model-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:14px;}
.model-meta{display:flex;gap:12px;font-size:11px;color:var(--t3);font-family:var(--fm);}

/* ── FOLDER ── */
.folder-wrap{margin-bottom:10px;}
.folder-head{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);cursor:pointer;transition:all .15s;user-select:none;}
.folder-head:hover{background:var(--bg3);border-color:var(--b2);}
.folder-actions{display:none;gap:2px;}
.folder-head:hover .folder-actions{display:flex;}
.folder-body{padding:6px 0 0 12px;}
.folder-collapsed .folder-body{display:none;}

/* ── ENTRIES ── */
.entry-card{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--bg3);border:1px solid transparent;border-radius:var(--r);margin-bottom:5px;cursor:pointer;transition:all .15s;}
.entry-card:hover{border-color:var(--b);background:var(--bg4);}
.entry-card.active{border-color:var(--a);background:rgba(99,102,241,.07);}
.entry-card.pinned{border-left:2px solid var(--gold);}
.entry-actions{display:none;gap:2px;flex-shrink:0;}
.entry-card:hover .entry-actions{display:flex;}

/* ── DETAIL PANEL ── */
.dp-head{padding:14px 16px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:8px;flex-shrink:0;}
.dp-body{flex:1;padding:18px;overflow-y:auto;}

/* ── FORM ── */
.form-group{margin-bottom:14px;}
.form-label{display:block;font-size:11px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:var(--t3);margin-bottom:5px;}
.form-input{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:9px 12px;color:var(--t);font-size:13.5px;outline:none;transition:border-color .15s;}
.form-input:focus{border-color:var(--a);}
.form-textarea{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:9px 12px;color:var(--t);font-size:13px;outline:none;resize:none;line-height:1.6;transition:border-color .15s;}
.form-textarea:focus{border-color:var(--a);}
.form-select{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:9px 12px;color:var(--t);font-size:13px;outline:none;appearance:none;}
.form-error{color:var(--red);font-size:12px;margin-top:4px;}

/* ── MODAL ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:16px;}
.modal{background:var(--bg1);border:1px solid var(--b2);border-radius:var(--r3);padding:26px;width:100%;max-width:480px;box-shadow:var(--shadow);animation:modalIn .2s ease;max-height:90vh;overflow-y:auto;}
.modal-sm{max-width:360px;}
.modal-lg{max-width:580px;}
@keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}
.modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.modal-title{font-size:17px;font-weight:700;}

/* ── TOAST ── */
.toast-wrap{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:500;}
.toast{display:flex;align-items:center;gap:10px;padding:12px 18px;background:var(--bg1);border:1px solid var(--b2);border-radius:var(--r2);box-shadow:var(--shadow);font-size:13px;animation:toastIn .25s ease;white-space:nowrap;max-width:90vw;}
.toast.success{border-color:rgba(34,197,94,.35);color:var(--green);}
.toast.error{border-color:rgba(239,68,68,.35);color:var(--red);}
.toast.info{border-color:rgba(99,102,241,.35);color:var(--a2);}
.toast.warning{border-color:rgba(245,158,11,.35);color:var(--gold);}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ── STATS ── */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px;}
.stat-card{background:var(--bg2);border:1px solid var(--b);border-radius:var(--r2);padding:16px;}
.stat-val{font-size:28px;font-weight:700;font-family:var(--fm);margin-bottom:4px;}
.stat-label{font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;}

/* ── TAGS ── */
.tags-input-wrap{display:flex;flex-wrap:wrap;gap:5px;padding:6px 8px;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);min-height:38px;align-items:center;cursor:text;}
.tags-input-wrap:focus-within{border-color:var(--a);}
.tag-chip{display:flex;align-items:center;gap:3px;padding:2px 7px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:4px;font-size:10px;color:var(--a2);}
.tag-chip-x{cursor:pointer;opacity:.6;line-height:1;}
.tag-chip-x:hover{opacity:1;}
.tags-input{background:none;border:none;outline:none;color:var(--t);font-size:12px;min-width:60px;flex:1;}

/* ── BADGES ── */
.badge{padding:2px 7px;border-radius:4px;font-size:10px;font-family:var(--fm);font-weight:600;}
.badge-purple{background:rgba(99,102,241,.15);color:var(--a2);border:1px solid rgba(99,102,241,.25);}
.badge-green{background:rgba(34,197,94,.12);color:var(--green);border:1px solid rgba(34,197,94,.2);}
.badge-gold{background:rgba(245,158,11,.12);color:var(--gold);border:1px solid rgba(245,158,11,.2);}
.badge-red{background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.2);}

/* ── ACTIVITY ── */
.activity-dot{width:8px;height:8px;border-radius:50%;background:var(--a);flex-shrink:0;margin-top:4px;}

/* ── EMPTY ── */
.empty{text-align:center;padding:48px 24px;}
.empty-icon{font-size:36px;margin-bottom:12px;}

/* ── ICON / COLOR PICKER ── */
.icon-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;}
.icon-opt{width:32px;height:32px;border-radius:6px;border:1px solid var(--b);background:var(--bg2);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.icon-opt:hover,.icon-opt.sel{background:var(--bg3);border-color:var(--a);}
.color-grid{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;}
.color-opt{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all .15s;}
.color-opt:hover,.color-opt.sel{transform:scale(1.25);border-color:#fff;}

/* ── SEARCH RESULTS ── */
.search-dropdown{position:absolute;top:54px;left:0;right:0;z-index:50;background:var(--bg1);border-bottom:1px solid var(--b2);padding:12px;box-shadow:var(--shadow);max-height:380px;overflow-y:auto;}
.search-result{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:var(--r);cursor:pointer;transition:all .15s;}
.search-result:hover{background:var(--bg2);}

/* ── AI CHAT ── */
.ai-shell{display:flex;flex-direction:column;height:100%;overflow:hidden;}
.ai-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}
.ai-msg{max-width:85%;}
.ai-msg.user{align-self:flex-end;}
.ai-msg.bot{align-self:flex-start;}
.ai-bubble{padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.6;white-space:pre-wrap;}
.ai-bubble.user{background:var(--ag);color:#fff;border-bottom-right-radius:4px;}
.ai-bubble.bot{background:var(--bg2);border:1px solid var(--b);color:var(--t);border-bottom-left-radius:4px;}
.ai-input-bar{padding:12px 16px;border-top:1px solid var(--b);display:flex;gap:8px;flex-shrink:0;background:var(--bg1);}
.ai-input{flex:1;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:10px 13px;color:var(--t);font-size:13px;outline:none;resize:none;}
.ai-input:focus{border-color:var(--a);}
.ai-send{width:40px;height:40px;border-radius:var(--r);background:var(--ag);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ai-suggestions{display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 10px;}
.ai-sug{padding:5px 10px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:20px;font-size:11px;color:var(--a2);cursor:pointer;transition:all .15s;}
.ai-sug:hover{background:rgba(99,102,241,.15);}
.ai-typing{display:flex;gap:4px;padding:10px 14px;background:var(--bg2);border:1px solid var(--b);border-radius:14px;border-bottom-left-radius:4px;width:fit-content;}
.ai-dot{width:6px;height:6px;border-radius:50%;background:var(--t3);animation:aiBounce 1.2s infinite ease-in-out;}
.ai-dot:nth-child(2){animation-delay:.2s;}
.ai-dot:nth-child(3){animation-delay:.4s;}
@keyframes aiBounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}

/* ── EMAIL VERIFICATION BANNER ── */
.verify-banner{background:rgba(245,158,11,.1);border-bottom:1px solid rgba(245,158,11,.25);padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--gold);flex-shrink:0;}

/* ── DIVIDER ── */
.divider{height:1px;background:var(--b);margin:14px 0;}

/* ── MISC ── */
.flex{display:flex;align-items:center;}
.gap-6{gap:6px;}
.gap-8{gap:8px;}
.gap-10{gap:10px;}
.gap-12{gap:12px;}
.mt-8{margin-top:8px;}
.mt-12{margin-top:12px;}
.mt-16{margin-top:16px;}
.mb-8{margin-bottom:8px;}
.mb-12{margin-bottom:12px;}
.mb-16{margin-bottom:16px;}
.text-sm{font-size:12px;}
.text-xs{font-size:10px;}
.text-muted{color:var(--t3);}
.font-mono{font-family:var(--fm);}
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.progress{height:3px;background:var(--bg3);border-radius:2px;overflow:hidden;}
.progress-bar{height:100%;border-radius:2px;background:var(--ag);}

/* ── ANIMATIONS ── */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.fade-in{animation:fadeIn .2s ease;}
.slide-in{animation:slideIn .25s ease;}

/* ── RESPONSIVE ── */
@media(max-width:640px){
  .detail-panel{position:fixed;right:0;top:0;height:100%;z-index:95;width:100%!important;}
  .panel{padding:16px;}
  .model-grid{grid-template-columns:1fr;}
  .stat-grid{grid-template-columns:1fr 1fr;}
}
@media(min-width:641px){
  .sidebar-overlay{display:none;}
}
`;

// ============================================================
// SVG ICONS
// ============================================================
const SVG = ({n, s=16, c="currentColor"}) => {
  const props = {width:s,height:s,viewBox:"0 0 24 24",fill:"none",stroke:c,strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round",style:{flexShrink:0,display:"block"}};
  const paths = {
    menu:      <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    search:    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    x:         <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    edit:      <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:     <><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    pin:       <><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24z"/></>,
    folder:    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>,
    note:      <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></>,
    task:      <><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
    link:      <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,
    file:      <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></>,
    image:     <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></>,
    chevRight: <polyline points="9,18 15,12 9,6"/>,
    chevDown:  <polyline points="6,9 12,15 18,9"/>,
    home:      <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>,
    grid:      <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    activity:  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    logout:    <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    drag:      <><circle cx="9" cy="7" r="1" fill={c}/><circle cx="9" cy="12" r="1" fill={c}/><circle cx="9" cy="17" r="1" fill={c}/><circle cx="15" cy="7" r="1" fill={c}/><circle cx="15" cy="12" r="1" fill={c}/><circle cx="15" cy="17" r="1" fill={c}/></>,
    check:     <polyline points="20,6 9,17 4,12"/>,
    copy:      <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
    tag:       <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    ai:        <><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    send:      <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></>,
    mail:      <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    shield:    <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  };
  return <svg {...props}>{paths[n]||null}</svg>;
};

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Toast() {
  const {state} = useStore();
  if (!state.toast) return null;
  const icons = {success:"✓", error:"✕", info:"ℹ", warning:"⚠"};
  return (
    <div className="toast-wrap">
      <div className={`toast ${state.toast.type||"info"}`}>
        <span>{icons[state.toast.type]||"ℹ"}</span>
        {state.toast.msg}
      </div>
    </div>
  );
}

function ConfirmModal({title, description, danger, onConfirm, onCancel}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="btn-icon" onClick={onCancel}><SVG n="x"/></button>
        </div>
        {description && (
          <div style={{background:danger?"rgba(239,68,68,.06)":"var(--bg2)",border:`1px solid ${danger?"rgba(239,68,68,.2)":"var(--b)"}`,borderRadius:"var(--r)",padding:12,marginBottom:16,fontSize:13,color:"var(--t2)",lineHeight:1.5}}>
            {description}
          </div>
        )}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger?"btn-danger":"btn-primary"}`} onClick={onConfirm}>
            {danger?"Delete":"Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TagsInput({value=[], onChange}) {
  const [inp, setInp] = useState("");
  const add = e => {
    if ((e.key==="Enter"||e.key===",") && inp.trim()) {
      e.preventDefault();
      const tag = inp.trim().replace(/,/g,"");
      if (!value.includes(tag)) onChange([...value, tag]);
      setInp("");
    }
    if (e.key==="Backspace" && !inp && value.length) onChange(value.slice(0,-1));
  };
  return (
    <div className="tags-input-wrap">
      {value.map(t=>(
        <span key={t} className="tag-chip">
          {t}<span className="tag-chip-x" onClick={()=>onChange(value.filter(x=>x!==t))}>×</span>
        </span>
      ))}
      <input className="tags-input" value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={add} placeholder={value.length?"":"Add tags..."}/>
    </div>
  );
}

// ============================================================
// AUTH SCREEN -- Real Firebase + Email Verification
// ============================================================
function AuthScreen() {
  const {dispatch, toast} = useStore();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);

  const clearErr = () => setError("");

  // ── GOOGLE SIGN IN (real popup) ──
  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      const fb = await initFirebase();
      if (!fb) throw new Error("Firebase not configured");
      const provider = new fb.GoogleAuthProvider();
      // Force account picker every time
      provider.setCustomParameters({prompt: "select_account"});
      const result = await fb.signInWithPopup(fb.auth, provider);
      const u = result.user;
      dispatch({type:"LOGIN", payload:{
        id: u.uid,
        name: u.displayName || "User",
        email: u.email,
        avatar: (u.displayName||"U").slice(0,2).toUpperCase(),
        photo: u.photoURL,
        plan: "Pro",
        emailVerified: u.emailVerified,
      }});
      toast(`Welcome, ${u.displayName?.split(" ")[0] || "User"}!`, "success");
    } catch(e) {
      // Fallback demo mode if Firebase not configured
      if (e.message.includes("not configured") || e.message.includes("invalid-api-key") || e.code === "auth/invalid-api-key") {
        dispatch({type:"LOGIN", payload:{id:"demo",name:"Demo User",email:"demo@example.com",avatar:"DU",plan:"Pro",emailVerified:true}});
        toast("Demo mode -- configure Firebase for real auth","warning");
      } else if (e.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled. Please try again.");
      } else {
        setError(e.message || "Google sign-in failed");
      }
    }
    setLoading(false);
  };

  // ── EMAIL LOGIN ──
  const handleLogin = async () => {
    if (!email || !pass) { setError("Please fill in all fields"); return; }
    setLoading(true); setError("");
    try {
      const fb = await initFirebase();
      if (!fb) throw new Error("not configured");
      const result = await fb.signInWithEmailAndPassword(fb.auth, email, pass);
      const u = result.user;
      if (!u.emailVerified) {
        setError("Please verify your email before logging in. Check your inbox.");
        await fb.signOut(fb.auth);
        setLoading(false); return;
      }
      dispatch({type:"LOGIN", payload:{id:u.uid,name:u.displayName||email.split("@")[0],email:u.email,avatar:(u.email||"U").slice(0,2).toUpperCase(),plan:"Pro",emailVerified:true}});
      toast("Welcome back!", "success");
    } catch(e) {
      if (e.message.includes("not configured") || e.code === "auth/invalid-api-key") {
        // Demo fallback
        dispatch({type:"LOGIN", payload:{id:"demo",name:email.split("@")[0],email,avatar:email.slice(0,2).toUpperCase(),plan:"Pro",emailVerified:true}});
        toast("Demo mode -- configure Firebase for real auth","warning");
      } else if (e.code==="auth/wrong-password"||e.code==="auth/user-not-found") {
        setError("Incorrect email or password.");
      } else if (e.code==="auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(e.message||"Login failed");
      }
    }
    setLoading(false);
  };

  // ── EMAIL SIGNUP with verification ──
  const handleSignup = async () => {
    if (!name || !email || !pass) { setError("Please fill in all fields"); return; }
    if (pass.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    try {
      const fb = await initFirebase();
      if (!fb) throw new Error("not configured");
      const result = await fb.createUserWithEmailAndPassword(fb.auth, email, pass);
      const u = result.user;
      await fb.sendEmailVerification(u);
      await fb.signOut(fb.auth);
      setVerificationSent(true);
      toast("Verification email sent! Check your inbox.", "success");
    } catch(e) {
      if (e.message.includes("not configured") || e.code === "auth/invalid-api-key") {
        dispatch({type:"LOGIN", payload:{id:"demo",name,email,avatar:name.slice(0,2).toUpperCase(),plan:"Pro",emailVerified:true}});
        toast("Demo mode -- configure Firebase for real auth","warning");
      } else if (e.code==="auth/email-already-in-use") {
        setError("This email is already registered. Try signing in.");
      } else {
        setError(e.message||"Signup failed");
      }
    }
    setLoading(false);
  };

  // ── VERIFICATION SENT SCREEN ──
  if (verificationSent) {
    return (
      <div className="auth-shell">
        <div className="auth-card slide-in" style={{textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:16}}>📧</div>
          <div style={{fontFamily:"var(--ff)",fontSize:22,fontWeight:700,marginBottom:8}}>Check your email!</div>
          <div style={{fontSize:13,color:"var(--t3)",marginBottom:24,lineHeight:1.6}}>
            We sent a verification link to <strong style={{color:"var(--t)"}}>{email}</strong>.<br/>
            Click the link in the email to activate your account, then come back and sign in.
          </div>
          <button className="btn btn-primary w-full" style={{justifyContent:"center",padding:"11px"}} onClick={()=>{setVerificationSent(false);setMode("login");}}>
            Back to Sign In
          </button>
          <div style={{marginTop:12,fontSize:12,color:"var(--t3)"}}>
            Didn't receive it?{" "}
            <span style={{color:"var(--a2)",cursor:"pointer"}} onClick={()=>setVerificationSent(false)}>Try again</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card slide-in">
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:32,fontWeight:800,background:"var(--ag)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-1,marginBottom:6}}>Vaultspace</div>
          <div style={{fontSize:12,color:"var(--t3)",letterSpacing:.5}}>Your intelligent research workspace</div>
        </div>

        {/* Google Button */}
        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? "Connecting..." : "Continue with Google"}
        </button>

        <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0"}}>
          <div style={{flex:1,height:1,background:"var(--b)"}}/>
          <span style={{fontSize:11,color:"var(--t3)"}}>or with email</span>
          <div style={{flex:1,height:1,background:"var(--b)"}}/>
        </div>

        {/* Mode tabs */}
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"7px",borderRadius:"var(--r)",border:`1px solid ${mode===m?"var(--a)":"var(--b)"}`,background:mode===m?"rgba(99,102,241,.1)":"transparent",color:mode===m?"var(--a2)":"var(--t3)",fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>
              {m==="login"?"Sign In":"Sign Up"}
            </button>
          ))}
        </div>

        {mode==="signup" && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Your name" value={name} onChange={e=>{setName(e.target.value);clearErr();}}/>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e=>{setEmail(e.target.value);clearErr();}}/>
        </div>

        <div className="form-group">
          <label className="form-label">Password {mode==="signup"&&<span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(min 6 characters)</span>}</label>
          <input className="form-input" type="password" placeholder="••••••••" value={pass} onChange={e=>{setPass(e.target.value);clearErr();}} onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleSignup())}/>
        </div>

        {error && <div className="form-error" style={{marginBottom:10,padding:"8px 10px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:"var(--r)"}}>{error}</div>}

        {mode==="login" && (
          <div style={{textAlign:"right",marginBottom:12}}>
            <span style={{fontSize:11,color:"var(--a2)",cursor:"pointer"}}>Forgot password?</span>
          </div>
        )}

        <button className="btn btn-primary w-full" style={{justifyContent:"center",padding:"11px"}} onClick={mode==="login"?handleLogin:handleSignup} disabled={loading}>
          {loading ? "Please wait..." : mode==="login" ? "Sign In" : "Create Account"}
        </button>

        {mode==="signup" && (
          <div style={{marginTop:10,padding:"8px 10px",background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.15)",borderRadius:"var(--r)",fontSize:11.5,color:"var(--t3)",display:"flex",alignItems:"center",gap:6}}>
            <SVG n="mail" s={12} c="var(--a2)"/>
            After signup, we'll send a verification link to your email.
          </div>
        )}

        <div style={{marginTop:14,textAlign:"center",fontSize:12,color:"var(--t3)"}}>
          {mode==="login"
            ?<>No account? <span style={{color:"var(--a2)",cursor:"pointer"}} onClick={()=>{setMode("signup");setError("");}}>Sign up free</span></>
            :<>Have an account? <span style={{color:"var(--a2)",cursor:"pointer"}} onClick={()=>{setMode("login");setError("");}}>Sign in</span></>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR
// ============================================================
function Sidebar({view, setView}) {
  const {state, dispatch, toast} = useStore();
  const {models, activeModelId, sidebarOpen, user} = state;

  const closeSidebar = () => dispatch({type:"CLOSE_SIDEBAR"});

  const navTo = (v) => { setView(v); closeSidebar(); };
  const navToModel = (id) => { dispatch({type:"SET_ACTIVE_MODEL",payload:id}); setView("model"); closeSidebar(); };

  const createModel = () => {
    dispatch({type:"CREATE_MODEL",payload:{name:"New Model",icon:ICONS[Math.floor(Math.random()*ICONS.length)],color:COLORS[Math.floor(Math.random()*COLORS.length)]}});
    setView("model"); closeSidebar();
    toast("Model created","success");
  };

  const pinnedModels = models.filter(m=>m.pinned);

  return (
    <>
      {/* Overlay -- closes sidebar on tap outside */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}/>
      )}

      <div className={`sidebar ${sidebarOpen?"open":""}`}>
        <div className="sb-head">
          <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>V</div>
          <div className="sb-logo">Vaultspace</div>
          <div style={{fontSize:9,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.25)",color:"var(--a2)",padding:"2px 6px",borderRadius:4,fontWeight:700,flexShrink:0}}>Pro</div>
          {/* Close button */}
          <button className="sb-close" onClick={closeSidebar} title="Close sidebar">
            <SVG n="x" s={14}/>
          </button>
        </div>

        <div style={{overflowY:"auto",flex:1,paddingBottom:8}}>
          <div className="sb-section">Navigation</div>
          {[["home","Home",SVG({n:"home",s:14})],["models","All Models",SVG({n:"grid",s:14})],["ai","AI Assistant",SVG({n:"ai",s:14})],["activity","Activity",SVG({n:"activity",s:14})],["settings","Settings",SVG({n:"settings",s:14})]].map(([v,l,icon])=>(
            <div key={v} className={`sb-item ${view===v?"active":""}`} onClick={()=>navTo(v)}>
              <div className="sb-icon" style={v==="ai"?{background:"rgba(99,102,241,.15)"}:{}}>{icon}</div>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l}</span>
              {v==="ai"&&<span style={{fontSize:8,background:"var(--ag)",color:"#fff",padding:"1px 5px",borderRadius:3,fontWeight:700}}>NEW</span>}
            </div>
          ))}

          {pinnedModels.length>0&&(
            <>
              <div className="divider" style={{margin:"6px 12px"}}/>
              <div className="sb-section">Pinned</div>
              {pinnedModels.map(m=>(
                <div key={m.id} className={`sb-item ${activeModelId===m.id&&view==="model"?"active":""}`} onClick={()=>navToModel(m.id)}>
                  <div className="sb-icon" style={{background:m.color+"20"}}>{m.icon}</div>
                  <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
                  <span className="sb-count">{m.folders.reduce((a,f)=>a+f.entries.length,0)}</span>
                </div>
              ))}
            </>
          )}

          <div className="divider" style={{margin:"6px 12px"}}/>
          <div style={{display:"flex",alignItems:"center",padding:"4px 12px 4px"}}>
            <div className="sb-section" style={{padding:0,flex:1,marginBottom:0}}>Models</div>
            <button className="btn-icon" style={{width:22,height:22}} onClick={createModel}><SVG n="plus" s={12}/></button>
          </div>
          {models.map(m=>(
            <div key={m.id} className={`sb-item ${activeModelId===m.id&&view==="model"?"active":""}`} onClick={()=>navToModel(m.id)}>
              <div className="sb-icon" style={{background:m.color+"20"}}>{m.icon}</div>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
              <span className="sb-count">{m.folders.reduce((a,f)=>a+f.entries.length,0)}</span>
            </div>
          ))}
        </div>

        <div className="sb-foot">
          <div className="sb-user">
            <div className="avatar">{user?.avatar||"U"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</div>
              <div style={{fontSize:10,color:"var(--t3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
            </div>
            <button className="btn-icon" style={{width:26,height:26}} title="Sign out" onClick={async(e)=>{
              e.stopPropagation();
              try { const fb = await initFirebase(); if(fb?.auth) await fb.signOut(fb.auth); } catch{}
              dispatch({type:"LOGOUT"}); toast("Signed out","info");
            }}>
              <SVG n="logout" s={13}/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// TOPBAR
// ============================================================
function Topbar({view, setView}) {
  const {state, dispatch} = useStore();
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  useEffect(()=>{ if(showSearch) searchRef.current?.focus(); },[showSearch]);

  useEffect(()=>{
    const h = e=>{
      if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setShowSearch(s=>!s);}
      if(e.key==="Escape"){setShowSearch(false);dispatch({type:"SET_SEARCH",payload:""});}
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[dispatch]);

  const activeModel = state.models.find(m=>m.id===state.activeModelId);
  const titles = {home:"Dashboard",models:"All Models",activity:"Activity",settings:"Settings",model:activeModel?.name||"Model",ai:"AI Assistant"};

  return (
    <div className="topbar">
      <button className="tb-btn" onClick={()=>dispatch({type:"TOGGLE_SIDEBAR"})} title="Menu">
        <SVG n="menu" s={16}/>
      </button>

      {!showSearch&&(
        <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
          {view!=="home"&&<span style={{fontSize:13,color:"var(--t3)",cursor:"pointer",flexShrink:0}} onClick={()=>setView("home")}>Home</span>}
          {view!=="home"&&<SVG n="chevRight" s={12} c="var(--t3)"/>}
          <span style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{titles[view]||""}</span>
        </div>
      )}

      {showSearch&&(
        <div className="tb-search" style={{flex:1}}>
          <SVG n="search" s={14} c="var(--t3)"/>
          <input ref={searchRef} placeholder="Search everything... (Esc to close)" value={state.searchQuery} onChange={e=>dispatch({type:"SET_SEARCH",payload:e.target.value})}/>
          {state.searchQuery&&<button className="btn-icon" style={{width:20,height:20}} onClick={()=>dispatch({type:"SET_SEARCH",payload:""})}><SVG n="x" s={12}/></button>}
        </div>
      )}

      <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:"auto",flexShrink:0}}>
        <button className="tb-btn" title="Search (⌘K)" onClick={()=>setShowSearch(s=>!s)}>
          <SVG n="search" s={15}/>
        </button>
        {view==="model"&&activeModel&&(
          <button className="btn btn-primary btn-sm" onClick={()=>dispatch({type:"SET_MODAL",payload:{type:"newEntry"}})}>
            <SVG n="plus" s={13}/>New Entry
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SEARCH RESULTS
// ============================================================
function SearchResults() {
  const {state, dispatch} = useStore();
  if (!state.searchQuery) return null;
  const q = state.searchQuery.toLowerCase();
  const results = [];
  state.models.forEach(m=>m.folders.forEach(f=>f.entries.forEach(e=>{
    if(e.title.toLowerCase().includes(q)||e.content.toLowerCase().includes(q)||e.tags.some(t=>t.toLowerCase().includes(q)))
      results.push({entry:e,folder:f,model:m});
  })));
  const typeColor = {note:"rgba(99,102,241,.15)",task:"rgba(34,197,94,.12)",link:"rgba(6,182,212,.12)",file:"rgba(245,158,11,.12)",image:"rgba(236,72,153,.12)"};
  return (
    <div className="search-dropdown">
      <div style={{fontSize:10,color:"var(--t3)",marginBottom:8,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>{results.length} results</div>
      {results.length===0&&<div style={{textAlign:"center",padding:"16px 0",color:"var(--t3)",fontSize:13}}>No results found</div>}
      {results.map(({entry,folder,model})=>(
        <div key={entry.id} className="search-result" onClick={()=>{dispatch({type:"SET_ACTIVE_MODEL",payload:model.id});dispatch({type:"SET_ACTIVE_ENTRY",payload:entry.id});dispatch({type:"SET_SEARCH",payload:""});}}>
          <div style={{width:26,height:26,borderRadius:6,background:typeColor[entry.type]||"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <SVG n={entry.type||"note"} s={12}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.title}</div>
            <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--fm)"}}>{model.name} / {folder.name}</div>
          </div>
          {entry.pinned&&<SVG n="pin" s={11} c="var(--gold)"/>}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// AI ASSISTANT VIEW
// ============================================================
function AIView() {
  const {state} = useStore();
  const [msgs, setMsgs] = useState([
    {role:"bot", text:"👋 Hi! I'm your Vaultspace AI assistant.\n\nI can help you analyze your notes, find patterns in your research, summarize your models, and suggest connections across your knowledge base.\n\nWhat would you like to explore?"}
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const ref = useRef(null);

  useEffect(()=>{ ref.current?.scrollIntoView({behavior:"smooth"}); },[msgs,typing]);

  const suggestions = [
    "Summarize my research notes",
    "Analyze my trade journal",
    "What patterns do you see?",
    "Help me with my strategy vault",
    "Give me a workspace overview",
    "What should I focus on next?",
  ];

  const send = useCallback((text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setMsgs(p=>[...p,{role:"user",text:msg}]);
    setInput("");
    setTyping(true);

    // Build context from user's actual data
    const modelNames = state.models.map(m=>m.name).join(", ");
    const totalEntries = state.models.reduce((a,m)=>a+m.folders.reduce((b,f)=>b+f.entries.length,0),0);

    setTimeout(()=>{
      setTyping(false);
      let response = getAIResponse(msg);
      // Personalize with real data
      response = response.replace("3 models", `${state.models.length} models`);
      response = response.replace("8 entries total", `${totalEntries} entries total`);
      setMsgs(p=>[...p,{role:"bot",text:response}]);
    }, 1000 + Math.random()*800);
  },[input, state.models]);

  return (
    <div className="ai-shell">
      {/* Header */}
      <div style={{padding:"16px 20px",borderBottom:"1px solid var(--b)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{width:38,height:38,borderRadius:10,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <SVG n="ai" s={18} c="var(--a2)"/>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:15}}>Vaultspace AI</div>
          <div style={{fontSize:11,color:"var(--a3)",marginTop:1}}>● Online . Analyzing your {state.models.length} models</div>
        </div>
      </div>

      {/* Suggestions */}
      <div className="ai-suggestions">
        {suggestions.map((s,i)=>(
          <button key={i} className="ai-sug" onClick={()=>send(s)}>{s}</button>
        ))}
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {msgs.map((m,i)=>(
          <div key={i} className={`ai-msg ${m.role==="user"?"user":"bot"}`}>
            {m.role==="bot"&&<div style={{fontSize:10,color:"var(--a2)",fontFamily:"var(--fm)",marginBottom:4,paddingLeft:2}}>VAULTSPACE AI</div>}
            <div className={`ai-bubble ${m.role==="user"?"user":"bot"}`}>{m.text}</div>
          </div>
        ))}
        {typing&&(
          <div className="ai-msg bot">
            <div style={{fontSize:10,color:"var(--a2)",fontFamily:"var(--fm)",marginBottom:4,paddingLeft:2}}>VAULTSPACE AI</div>
            <div className="ai-typing"><div className="ai-dot"/><div className="ai-dot"/><div className="ai-dot"/></div>
          </div>
        )}
        <div ref={ref}/>
      </div>

      {/* Input */}
      <div className="ai-input-bar">
        <textarea className="ai-input" placeholder="Ask anything about your workspace..." value={input} onChange={e=>setInput(e.target.value)} rows={1} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}/>
        <button className="ai-send" onClick={()=>send()}><SVG n="send" s={15} c="#fff"/></button>
      </div>
    </div>
  );
}

// ============================================================
// HOME VIEW
// ============================================================
function HomeView({setView}) {
  const {state, dispatch} = useStore();
  const {models, activity, user} = state;
  const totalEntries = models.reduce((a,m)=>a+m.folders.reduce((b,f)=>b+f.entries.length,0),0);
  const totalFolders = models.reduce((a,m)=>a+m.folders.length,0);
  const pinned = models.reduce((a,m)=>a+m.folders.reduce((b,f)=>b+f.entries.filter(e=>e.pinned).length,0),0);
  const recentEntries = [];
  models.forEach(m=>m.folders.forEach(f=>f.entries.forEach(e=>recentEntries.push({entry:e,folder:f,model:m}))));

  return (
    <div className="panel fade-in">
      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:700,marginBottom:3}}>
          Good {new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, {user?.name?.split(" ")[0]} 👋
        </div>
        <div style={{fontSize:13,color:"var(--t3)"}}>Here's your workspace overview</div>
      </div>

      <div className="stat-grid">
        {[
          {val:models.length,label:"Models",color:"var(--a2)"},
          {val:totalEntries,label:"Entries",color:"var(--green)"},
          {val:totalFolders,label:"Folders",color:"var(--gold)"},
          {val:pinned,label:"Pinned",color:"var(--cyan)"},
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div className="stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20,marginBottom:24}}>
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontWeight:600,fontSize:14}}>Your Models</div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setView("models")}>View all</button>
          </div>
          {models.slice(0,4).map(m=>(
            <div key={m.id} className="card card-sm" style={{marginBottom:8,cursor:"pointer"}} onClick={()=>{dispatch({type:"SET_ACTIVE_MODEL",payload:m.id});setView("model");}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:9,background:m.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{m.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
                  <div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{m.folders.length} folders . {m.folders.reduce((a,f)=>a+f.entries.length,0)} entries</div>
                </div>
                {m.pinned&&<SVG n="pin" s={11} c="var(--gold)"/>}
              </div>
            </div>
          ))}
          <button className="btn btn-secondary w-full" style={{justifyContent:"center",marginTop:6}} onClick={()=>dispatch({type:"CREATE_MODEL",payload:{name:"New Model",icon:"⚡",color:COLORS[0]}})}>
            <SVG n="plus" s={13}/>New Model
          </button>
        </div>

        <div>
          <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>Recent Activity</div>
          <div className="card card-sm">
            {activity.slice(0,5).map((a,i)=>(
              <div key={a.id} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<4?"1px solid var(--b)":"none"}}>
                <div className="activity-dot" style={{marginTop:4}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,color:"var(--t)"}}>{a.action} <span style={{color:"var(--a2)",fontWeight:500}}>{a.target}</span></div>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:1,fontFamily:"var(--fm)"}}>{a.model}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI CTA */}
      <div style={{background:"linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.08))",border:"1px solid rgba(99,102,241,.2)",borderRadius:"var(--r2)",padding:16,display:"flex",alignItems:"center",gap:14,cursor:"pointer"}} onClick={()=>setView("ai")}>
        <div style={{width:40,height:40,borderRadius:10,background:"rgba(99,102,241,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <SVG n="ai" s={20} c="var(--a2)"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:14}}>Try AI Assistant</div>
          <div style={{fontSize:12,color:"var(--t3)",marginTop:2}}>Analyze your notes, find patterns, get insights from your research</div>
        </div>
        <SVG n="chevRight" s={16} c="var(--a2)"/>
      </div>
    </div>
  );
}

// ============================================================
// MODEL EDIT MODAL
// ============================================================
function ModelEditModal({model, onClose}) {
  const {dispatch, toast} = useStore();
  const [form, setForm] = useState({name:model?.name||"",icon:model?.icon||ICONS[0],color:model?.color||COLORS[0],description:model?.description||""});
  const save = () => {
    if(!form.name.trim()){toast("Name required","error");return;}
    dispatch({type:"UPDATE_MODEL",payload:{id:model.id,...form}});
    toast("Model updated","success"); onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">Edit Model</div><button className="btn-icon" onClick={onClose}><SVG n="x"/></button></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
        </div>
        <div className="form-group"><label className="form-label">Icon</label><div className="icon-grid">{ICONS.map(ic=><button key={ic} className={`icon-opt ${form.icon===ic?"sel":""}`} onClick={()=>setForm(f=>({...f,icon:ic}))}>{ic}</button>)}</div></div>
        <div className="form-group"><label className="form-label">Color</label><div className="color-grid">{COLORS.map(c=><div key={c} className={`color-opt ${form.color===c?"sel":""}`} style={{background:c}} onClick={()=>setForm(f=>({...f,color:c}))}/>)}</div></div>
        <div style={{padding:14,background:"var(--bg2)",borderRadius:"var(--r2)",marginBottom:18,display:"flex",alignItems:"center",gap:12,border:`2px solid ${form.color}30`}}>
          <div style={{width:40,height:40,borderRadius:11,background:form.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{form.icon}</div>
          <div><div style={{fontSize:14,fontWeight:600}}>{form.name||"Model Name"}</div><div style={{fontSize:12,color:"var(--t3)"}}>{form.description||"No description"}</div></div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ENTRY MODAL
// ============================================================
function EntryModal({entry, modelId, folderId, onClose}) {
  const {state, dispatch, toast} = useStore();
  const isNew = !entry?.id;
  const model = state.models.find(m=>m.id===modelId);
  const [form, setForm] = useState({title:entry?.title||"",content:entry?.content||"",type:entry?.type||"note",tags:entry?.tags||[],pinned:entry?.pinned||false});
  const [selFolder, setSelFolder] = useState(folderId||model?.folders[0]?.id||"");

  const save = () => {
    if(!form.title.trim()){toast("Title required","error");return;}
    if(!selFolder){toast("Select a folder","error");return;}
    if(isNew) {
      dispatch({type:"CREATE_ENTRY",payload:{modelId,folderId:selFolder,entry:form}});
      toast("Entry created","success");
    } else {
      dispatch({type:"UPDATE_ENTRY",payload:{modelId,folderId:folderId||selFolder,entryId:entry.id,data:form}});
      toast("Entry saved","success");
    }
    onClose();
  };

  const typeConfig = {
    note:  {color:"#6366f1", bg:"rgba(99,102,241,.15)",  border:"rgba(99,102,241,.4)",  label:"Note",  placeholder:"Write your notes, observations, research..."},
    task:  {color:"#22c55e", bg:"rgba(34,197,94,.12)",   border:"rgba(34,197,94,.4)",   label:"Task",  placeholder:"Describe the task to be completed..."},
    link:  {color:"#06b6d4", bg:"rgba(6,182,212,.12)",   border:"rgba(6,182,212,.4)",   label:"Link",  placeholder:"Paste the URL here..."},
    file:  {color:"#f59e0b", bg:"rgba(245,158,11,.12)",  border:"rgba(245,158,11,.4)",  label:"File",  placeholder:"File name or description..."},
    image: {color:"#ec4899", bg:"rgba(236,72,153,.12)",  border:"rgba(236,72,153,.4)",  label:"Image", placeholder:"Image description or caption..."},
  };
  const tc = typeConfig[form.type] || typeConfig.note;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{isNew?"New Entry":"Edit Entry"}</div>
          <button className="btn-icon" onClick={onClose}><SVG n="x"/></button>
        </div>

        {/* TYPE SELECTOR -- full width, large tap targets */}
        <div className="form-group">
          <label className="form-label">Entry Type</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
            {ENTRY_TYPES.map(t=>{
              const cfg = typeConfig[t];
              const sel = form.type===t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={()=>setForm(f=>({...f,type:t}))}
                  style={{
                    padding:"10px 4px",
                    borderRadius:"var(--r)",
                    border:`2px solid ${sel?cfg.border:"var(--b)"}`,
                    background:sel?cfg.bg:"var(--bg2)",
                    color:sel?cfg.color:"var(--t3)",
                    fontSize:11,
                    fontWeight:sel?700:400,
                    cursor:"pointer",
                    display:"flex",
                    flexDirection:"column",
                    alignItems:"center",
                    gap:5,
                    transition:"all .15s",
                  }}
                >
                  <SVG n={t} s={16} c={sel?cfg.color:"var(--t3)"}/>
                  <span style={{textTransform:"capitalize",fontFamily:"var(--ff)"}}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
          {/* Selected type indicator */}
          <div style={{marginTop:8,padding:"6px 10px",background:tc.bg,border:`1px solid ${tc.border}`,borderRadius:"var(--r)",display:"flex",alignItems:"center",gap:6,fontSize:12,color:tc.color}}>
            <SVG n={form.type} s={13} c={tc.color}/>
            <span><strong>{tc.label}</strong> selected -- {form.type==="note"?"For research notes and observations":form.type==="task"?"For todos and action items":form.type==="link"?"For URLs and web resources":form.type==="file"?"For file references and attachments":"For image descriptions and charts"}</span>
          </div>
        </div>

        {/* FOLDER */}
        <div className="form-group">
          <label className="form-label">Folder</label>
          <select className="form-select" value={selFolder} onChange={e=>setSelFolder(e.target.value)}>
            {model?.folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {/* TITLE */}
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Entry title" autoFocus style={{borderColor:form.title?"var(--b)":"var(--b)"}}/>
        </div>

        {/* CONTENT -- changes label/placeholder based on type */}
        <div className="form-group">
          <label className="form-label">
            {form.type==="note"?"Content / Notes":form.type==="task"?"Task Description":form.type==="link"?"URL / Link":form.type==="file"?"File Description":"Image Description"}
          </label>
          <textarea
            className="form-textarea"
            rows={form.type==="link"?2:5}
            value={form.content}
            onChange={e=>setForm(f=>({...f,content:e.target.value}))}
            placeholder={tc.placeholder}
            style={{borderColor:form.content?"var(--b)":"var(--b)"}}
          />
        </div>

        {/* TASK SPECIFIC */}
        {form.type==="task"&&(
          <div className="form-group">
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"var(--t2)",padding:"10px 12px",background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.15)",borderRadius:"var(--r)"}}>
              <input type="checkbox" checked={form.done||false} onChange={e=>setForm(f=>({...f,done:e.target.checked}))} style={{accentColor:"var(--green)",width:16,height:16}}/>
              <span>Mark as completed</span>
            </label>
          </div>
        )}

        {/* TAGS */}
        <div className="form-group">
          <label className="form-label">Tags <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--t4)"}}>(press Enter to add)</span></label>
          <TagsInput value={form.tags} onChange={tags=>setForm(f=>({...f,tags}))}/>
        </div>

        {/* PIN */}
        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 12px",background:"var(--bg2)",border:"1px solid var(--b)",borderRadius:"var(--r)",marginBottom:18}}>
          <input type="checkbox" checked={form.pinned} onChange={e=>setForm(f=>({...f,pinned:e.target.checked}))} style={{accentColor:"var(--gold)",width:15,height:15}}/>
          <SVG n="pin" s={13} c={form.pinned?"var(--gold)":"var(--t3)"}/>
          <span style={{fontSize:13,color:form.pinned?"var(--gold)":"var(--t2)"}}>{form.pinned?"Pinned -- will appear at top":"Pin this entry"}</span>
        </label>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} style={{background:tc.bg,border:`1px solid ${tc.border}`,color:tc.color,boxShadow:`0 2px 12px ${tc.color}30`}}>
            <SVG n={form.type} s={13} c={tc.color}/>
            {isNew?`Create ${tc.label}`:`Save ${tc.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FOLDER COMPONENT
// ============================================================
function FolderComponent({folder, model, onEntryClick}) {
  const {dispatch, toast} = useStore();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [delConfirm, setDelConfirm] = useState(false);
  const nameRef = useRef(null);
  useEffect(()=>{ if(renaming) nameRef.current?.select(); },[renaming]);

  const saveRename = () => {
    setRenaming(false);
    if(newName.trim()&&newName!==folder.name){ dispatch({type:"UPDATE_FOLDER",payload:{modelId:model.id,folderId:folder.id,data:{name:newName.trim()}}}); toast("Folder renamed","success"); }
    else setNewName(folder.name);
  };

  return (
    <div className={`folder-wrap ${folder.collapsed?"folder-collapsed":""}`}>
      <div className="folder-head">
        <button className="btn-icon" style={{width:18,height:18}} onClick={()=>dispatch({type:"TOGGLE_FOLDER",payload:{modelId:model.id,folderId:folder.id}})}>
          {folder.collapsed?<SVG n="chevRight" s={11}/>:<SVG n="chevDown" s={11}/>}
        </button>
        <SVG n="folder" s={13} c="var(--gold)"/>
        {renaming?(
          <input ref={nameRef} style={{flex:1,background:"var(--bg3)",border:"1px solid var(--a)",borderRadius:4,padding:"1px 6px",color:"var(--t)",fontSize:13,fontWeight:500,outline:"none"}}
            value={newName} onChange={e=>setNewName(e.target.value)}
            onBlur={saveRename} onKeyDown={e=>{if(e.key==="Enter")saveRename();if(e.key==="Escape"){setRenaming(false);setNewName(folder.name);}}}/>
        ):(
          <span style={{fontSize:13,fontWeight:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onDoubleClick={()=>setRenaming(true)}>{folder.name}</span>
        )}
        <span style={{fontSize:10,fontFamily:"var(--fm)",color:"var(--t3)",flexShrink:0}}>{folder.entries.length}</span>
        <div className="folder-actions">
          <button className="btn-icon" style={{width:20,height:20}} onClick={()=>dispatch({type:"SET_MODAL",payload:{type:"newEntry",folderId:folder.id,modelId:model.id}})}><SVG n="plus" s={10}/></button>
          <button className="btn-icon" style={{width:20,height:20}} onClick={()=>setRenaming(true)}><SVG n="edit" s={10}/></button>
          <button className="btn-icon" style={{width:20,height:20}} onClick={()=>setDelConfirm(true)}><SVG n="trash" s={10}/></button>
        </div>
      </div>
      {!folder.collapsed&&(
        <div className="folder-body">
          {folder.entries.length===0?(
            <div style={{padding:"10px 8px",textAlign:"center",color:"var(--t3)",fontSize:12,border:"1px dashed var(--b)",borderRadius:"var(--r)",cursor:"pointer"}} onClick={()=>dispatch({type:"SET_MODAL",payload:{type:"newEntry",folderId:folder.id,modelId:model.id}})}>
              + Add first entry
            </div>
          ):folder.entries.map(e=>(
            <EntryCard key={e.id} entry={e} folder={folder} model={model} onClick={()=>onEntryClick(e)}/>
          ))}
        </div>
      )}
      {delConfirm&&<ConfirmModal title={`Delete "${folder.name}"?`} description={`This deletes the folder and all ${folder.entries.length} entries inside.`} danger onConfirm={()=>{dispatch({type:"DELETE_FOLDER",payload:{modelId:model.id,folderId:folder.id}});toast("Folder deleted","error");setDelConfirm(false);}} onCancel={()=>setDelConfirm(false)}/>}
    </div>
  );
}

// ============================================================
// ENTRY CARD
// ============================================================
function EntryCard({entry, folder, model, onClick}) {
  const {state, dispatch, toast} = useStore();
  const [delConfirm, setDelConfirm] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const isActive = state.activeEntryId===entry.id;
  const typeColor = {note:"rgba(99,102,241,.15)",task:"rgba(34,197,94,.12)",link:"rgba(6,182,212,.12)",file:"rgba(245,158,11,.12)",image:"rgba(236,72,153,.12)"};

  return (
    <>
      <div className={`entry-card ${isActive?"active":""} ${entry.pinned?"pinned":""}`} onClick={onClick}>
        <div style={{width:22,height:22,borderRadius:6,background:typeColor[entry.type]||"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
          <SVG n={entry.type||"note"} s={11}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {entry.type==="task"&&<input type="checkbox" checked={entry.done||false} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();dispatch({type:"TOGGLE_TASK",payload:{modelId:model.id,folderId:folder.id,entryId:entry.id}});}} style={{accentColor:"var(--green)",flexShrink:0}}/>}
            <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:entry.done?"line-through":"none",color:entry.done?"var(--t3)":"var(--t)"}}>{entry.title}</div>
          </div>
          {entry.content&&<div style={{fontSize:11,color:"var(--t3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{entry.content}</div>}
          {entry.tags.length>0&&(
            <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>
              {entry.tags.slice(0,3).map(t=><span key={t} style={{padding:"1px 5px",background:"var(--bg2)",border:"1px solid var(--b)",borderRadius:3,fontSize:9,fontFamily:"var(--fm)",color:"var(--t3)"}}>{t}</span>)}
              {entry.tags.length>3&&<span style={{padding:"1px 5px",background:"var(--bg2)",border:"1px solid var(--b)",borderRadius:3,fontSize:9,fontFamily:"var(--fm)",color:"var(--t3)"}}>+{entry.tags.length-3}</span>}
            </div>
          )}
        </div>
        <div className="entry-actions">
          <button className="btn-icon" style={{width:20,height:20}} onClick={e=>{e.stopPropagation();dispatch({type:"PIN_ENTRY",payload:{modelId:model.id,folderId:folder.id,entryId:entry.id}});toast(entry.pinned?"Unpinned":"Pinned","info");}}>
            <SVG n="pin" s={10} c={entry.pinned?"var(--gold)":"var(--t3)"}/>
          </button>
          <button className="btn-icon" style={{width:20,height:20}} onClick={e=>{e.stopPropagation();setEditModal(true);}}><SVG n="edit" s={10}/></button>
          <button className="btn-icon" style={{width:20,height:20}} onClick={e=>{e.stopPropagation();setDelConfirm(true);}}><SVG n="trash" s={10}/></button>
        </div>
      </div>
      {editModal&&<EntryModal entry={entry} modelId={model.id} folderId={folder.id} onClose={()=>setEditModal(false)}/>}
      {delConfirm&&<ConfirmModal title="Delete entry?" description={`"${entry.title}" will be permanently deleted.`} danger onConfirm={()=>{dispatch({type:"DELETE_ENTRY",payload:{modelId:model.id,folderId:folder.id,entryId:entry.id}});toast("Deleted","error");setDelConfirm(false);}} onCancel={()=>setDelConfirm(false)}/>}
    </>
  );
}

// ============================================================
// DETAIL PANEL
// ============================================================
function DetailPanel({entry, folder, model}) {
  const {dispatch, toast} = useStore();
  const [editModal, setEditModal] = useState(false);
  if(!entry) return (
    <div className="detail-panel" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",color:"var(--t3)"}}>
        <div style={{fontSize:32,marginBottom:10}}>📝</div>
        <div style={{fontSize:13}}>Select an entry to view</div>
      </div>
    </div>
  );
  const typeColor = {note:"var(--a2)",task:"var(--green)",link:"var(--cyan)",file:"var(--gold)",image:"#ec4899"};
  return (
    <>
      <div className="detail-panel">
        <div className="dp-head">
          <div style={{width:26,height:26,borderRadius:7,background:typeColor[entry.type]+"20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <SVG n={entry.type||"note"} s={12} c={typeColor[entry.type]}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--fm)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{model?.name} / {folder?.name}</div>
          </div>
          <div style={{display:"flex",gap:3}}>
            <button className="btn-icon" onClick={()=>dispatch({type:"PIN_ENTRY",payload:{modelId:model.id,folderId:folder.id,entryId:entry.id}})}><SVG n="pin" s={13} c={entry.pinned?"var(--gold)":"var(--t3)"}/></button>
            <button className="btn-icon" onClick={()=>setEditModal(true)}><SVG n="edit" s={13}/></button>
            <button className="btn-icon" onClick={()=>dispatch({type:"SET_ACTIVE_ENTRY",payload:null})}><SVG n="x" s={13}/></button>
          </div>
        </div>
        <div className="dp-body">
          <div style={{fontSize:17,fontWeight:700,marginBottom:12,lineHeight:1.3}}>{entry.title}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            <span className="badge badge-purple" style={{textTransform:"capitalize"}}>{entry.type}</span>
            {entry.pinned&&<span className="badge badge-gold">📌 Pinned</span>}
            {entry.type==="task"&&<span className={`badge ${entry.done?"badge-green":"badge-red"}`}>{entry.done?"✓ Done":"○ Todo"}</span>}
          </div>
          {entry.content&&<div style={{fontSize:13.5,color:"var(--t2)",lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:16}}>{entry.content}</div>}
          {entry.tags.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:16}}>
              {entry.tags.map(t=><span key={t} style={{padding:"3px 8px",background:"var(--bg2)",border:"1px solid var(--b2)",borderRadius:5,fontSize:10,fontFamily:"var(--fm)",color:"var(--t2)"}}><SVG n="tag" s={9}/> {t}</span>)}
            </div>
          )}
          <div className="divider"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:11,color:"var(--t3)",fontFamily:"var(--fm)",marginBottom:16}}>
            <div><div style={{marginBottom:2,fontWeight:600,textTransform:"uppercase",letterSpacing:.7}}>Created</div><div>{fmtDate(entry.createdAt)}</div></div>
            <div><div style={{marginBottom:2,fontWeight:600,textTransform:"uppercase",letterSpacing:.7}}>Updated</div><div>{fmtDate(entry.updatedAt)}</div></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-secondary btn-sm" style={{flex:1,justifyContent:"center"}} onClick={()=>setEditModal(true)}><SVG n="edit" s={12}/>Edit</button>
            <button className="btn btn-secondary btn-sm" style={{flex:1,justifyContent:"center"}} onClick={()=>{navigator.clipboard?.writeText(entry.content||entry.title||"");toast("Copied","success");}}><SVG n="copy" s={12}/>Copy</button>
          </div>
        </div>
      </div>
      {editModal&&<EntryModal entry={entry} modelId={model?.id} folderId={folder?.id} onClose={()=>setEditModal(false)}/>}
    </>
  );
}

// ============================================================
// MODEL VIEW
// ============================================================
function ModelView() {
  const {state, dispatch, toast} = useStore();
  const model = state.models.find(m=>m.id===state.activeModelId);
  const [editModal, setEditModal] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [delConfirm, setDelConfirm] = useState(false);
  const folderRef = useRef(null);
  useEffect(()=>{ if(showNewFolder) folderRef.current?.focus(); },[showNewFolder]);

  if(!model) return <div className="panel"><div className="empty"><div className="empty-icon">📦</div><div style={{fontSize:15,fontWeight:600,color:"var(--t2)",marginBottom:6}}>No model selected</div><div style={{fontSize:13,color:"var(--t3)"}}>Pick a model from the menu</div></div></div>;

  let activeEntry=null, activeFolder=null;
  if(state.activeEntryId) model.folders.forEach(f=>{const e=f.entries.find(e=>e.id===state.activeEntryId);if(e){activeEntry=e;activeFolder=f;}});

  const createFolder = () => {
    if(!folderName.trim()){toast("Enter folder name","error");return;}
    dispatch({type:"CREATE_FOLDER",payload:{modelId:model.id,folder:{name:folderName.trim()}}});
    toast("Folder created","success"); setFolderName(""); setShowNewFolder(false);
  };

  return (
    <div className="workspace">
      <div className="panel" style={{maxWidth:activeEntry?600:"100%"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:20}}>
          <div style={{width:46,height:46,borderRadius:12,background:model.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{model.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <h1 style={{fontSize:18,fontWeight:700}}>{model.name}</h1>
              {model.pinned&&<SVG n="pin" s={12} c="var(--gold)"/>}
            </div>
            <div style={{fontSize:12,color:"var(--t3)",marginTop:2}}>{model.description||"No description"} . {model.folders.length} folders . {model.folders.reduce((a,f)=>a+f.entries.length,0)} entries</div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setEditModal(true)}><SVG n="edit" s={12}/>Edit</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>dispatch({type:"PIN_MODEL",payload:model.id})}><SVG n="pin" s={12} c={model.pinned?"var(--gold)":"currentColor"}/>{model.pinned?"Unpin":"Pin"}</button>
            <button className="btn btn-danger btn-sm" onClick={()=>setDelConfirm(true)}><SVG n="trash" s={12}/></button>
          </div>
        </div>

        {model.folders.length===0?(
          <div className="empty" style={{padding:"40px 0"}}>
            <div className="empty-icon">📁</div>
            <div style={{fontSize:15,fontWeight:600,color:"var(--t2)",marginBottom:6}}>No folders yet</div>
            <div style={{fontSize:13,color:"var(--t3)",marginBottom:16}}>Create folders to organize your entries</div>
            <button className="btn btn-primary" onClick={()=>setShowNewFolder(true)}><SVG n="plus" s={13}/>Create folder</button>
          </div>
        ):model.folders.map(f=>(
          <FolderComponent key={f.id} folder={f} model={model} onEntryClick={e=>dispatch({type:"SET_ACTIVE_ENTRY",payload:e.id})}/>
        ))}

        {showNewFolder?(
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <input ref={folderRef} className="form-input" style={{flex:1}} placeholder="Folder name..." value={folderName} onChange={e=>setFolderName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createFolder();if(e.key==="Escape"){setShowNewFolder(false);setFolderName("");}}}/>
            <button className="btn btn-primary btn-sm" onClick={createFolder}>Create</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>{setShowNewFolder(false);setFolderName("");}}>Cancel</button>
          </div>
        ):(
          <button className="btn btn-secondary" style={{marginTop:10,width:"100%",justifyContent:"center"}} onClick={()=>setShowNewFolder(true)}>
            <SVG n="folder" s={13}/>New Folder
          </button>
        )}
      </div>

      {activeEntry&&<DetailPanel entry={activeEntry} folder={activeFolder} model={model}/>}

      {editModal&&<ModelEditModal model={model} onClose={()=>setEditModal(false)}/>}
      {delConfirm&&<ConfirmModal title={`Delete "${model.name}"?`} description="This permanently deletes the model and all its content." danger onConfirm={()=>{dispatch({type:"DELETE_MODEL",payload:model.id});toast("Model deleted","error");setDelConfirm(false);}} onCancel={()=>setDelConfirm(false)}/>}
    </div>
  );
}

// ============================================================
// ALL MODELS VIEW
// ============================================================
function AllModelsView() {
  const {state, dispatch, toast} = useStore();
  const [editModel, setEditModel] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  return (
    <div className="panel fade-in">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div><div style={{fontSize:20,fontWeight:700}}>All Models</div><div style={{fontSize:12,color:"var(--t3)",marginTop:2}}>{state.models.length} models</div></div>
        <button className="btn btn-primary" onClick={()=>dispatch({type:"CREATE_MODEL",payload:{name:"New Model",icon:ICONS[0],color:COLORS[0]}})}><SVG n="plus" s={14}/>New Model</button>
      </div>
      <div className="model-grid">
        {state.models.map(m=>(
          <div key={m.id} className="model-card" onClick={()=>{dispatch({type:"SET_ACTIVE_MODEL",payload:m.id});}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:m.color,borderRadius:"var(--r2) var(--r2) 0 0"}}/>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
              <div className="model-icon" style={{background:m.color+"20"}}>{m.icon}</div>
              <div style={{display:"flex",gap:3}}>
                <button className="btn-icon" onClick={e=>{e.stopPropagation();dispatch({type:"PIN_MODEL",payload:m.id});toast(m.pinned?"Unpinned":"Pinned","info");}}><SVG n="pin" s={12} c={m.pinned?"var(--gold)":"var(--t3)"}/></button>
                <button className="btn-icon" onClick={e=>{e.stopPropagation();setEditModel(m);}}><SVG n="edit" s={12}/></button>
                <button className="btn-icon" onClick={e=>{e.stopPropagation();setDelConfirm(m);}}><SVG n="trash" s={12}/></button>
              </div>
            </div>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>{m.name}</div>
            <div style={{fontSize:12,color:"var(--t3)",marginBottom:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.description||"No description"}</div>
            <div className="model-meta">
              <span>{m.folders.length} folders</span>
              <span>{m.folders.reduce((a,f)=>a+f.entries.length,0)} entries</span>
              <span style={{marginLeft:"auto"}}>{fmtDate(m.createdAt)}</span>
            </div>
          </div>
        ))}
        <div className="model-card" style={{border:"2px dashed var(--b)",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,minHeight:160}} onClick={()=>dispatch({type:"CREATE_MODEL",payload:{name:"New Model",icon:ICONS[0],color:COLORS[0]}})}>
          <div style={{width:40,height:40,borderRadius:10,background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center"}}><SVG n="plus" s={18} c="var(--t3)"/></div>
          <div style={{fontSize:13,color:"var(--t3)"}}>Create new model</div>
        </div>
      </div>
      {editModel&&<ModelEditModal model={editModel} onClose={()=>setEditModel(null)}/>}
      {delConfirm&&<ConfirmModal title={`Delete "${delConfirm.name}"?`} description="Permanently deletes model and all content." danger onConfirm={()=>{dispatch({type:"DELETE_MODEL",payload:delConfirm.id});toast("Deleted","error");setDelConfirm(null);}} onCancel={()=>setDelConfirm(null)}/>}
    </div>
  );
}

// ============================================================
// ACTIVITY VIEW
// ============================================================
function ActivityView() {
  const {state} = useStore();
  return (
    <div className="panel fade-in">
      <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Activity</div>
      <div style={{fontSize:12,color:"var(--t3)",marginBottom:20}}>Everything happening in your workspace</div>
      <div className="card">
        {state.activity.length===0&&<div className="empty"><div className="empty-icon">📋</div><div style={{fontSize:14,color:"var(--t2)"}}>No activity yet</div></div>}
        {state.activity.map((a,i)=>(
          <div key={a.id} style={{display:"flex",gap:12,padding:"12px 16px",borderBottom:i<state.activity.length-1?"1px solid var(--b)":"none"}}>
            <div style={{width:28,height:28,borderRadius:8,background:"rgba(99,102,241,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><SVG n="activity" s={12} c="var(--a2)"/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:13}}><span style={{color:"var(--t3)"}}>{a.action}</span> <span style={{color:"var(--a2)",fontWeight:500}}>{a.target}</span></div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:2,fontFamily:"var(--fm)"}}>{a.model} . {fmtDate(a.time)} {fmtTime(a.time)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS VIEW
// ============================================================
function SettingsView() {
  const {state, dispatch, toast} = useStore();
  const {user} = state;
  const [name, setName] = useState(user?.name||"");
  const [email, setEmail] = useState(user?.email||"");

  return (
    <div className="panel fade-in" style={{maxWidth:620}}>
      <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Settings</div>
      <div style={{fontSize:12,color:"var(--t3)",marginBottom:20}}>Manage your account and preferences</div>

      {/* Firebase Setup Notice */}
      <div style={{background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:"var(--r2)",padding:14,marginBottom:16,display:"flex",gap:10}}>
        <SVG n="shield" s={18} c="var(--gold)"/>
        <div>
          <div style={{fontWeight:600,fontSize:13,color:"var(--gold)",marginBottom:4}}>Configure Firebase for Real Auth</div>
          <div style={{fontSize:12,color:"var(--t3)",lineHeight:1.5}}>
            To enable real Google Sign-In and email verification:<br/>
            1. Go to <span style={{color:"v
