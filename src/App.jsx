import { useState, useEffect, useRef, useCallback, createContext, useContext, useReducer } from "react";

// ============================================================
// TYPES & CONSTANTS
// ============================================================
const ICONS = ["⚡","🔥","💎","🎯","📊","🧠","🚀","💡","🔬","📈","🌊","⚙️","🎨","📝","🔑","💰","📱","🌐","🏆","⭐"];
const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#a855f7"];
const ENTRY_TYPES = ["note","task","link","file","image"];

const genId = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
const now = () => new Date().toISOString();
const fmtDate = iso => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const fmtTime = iso => new Date(iso).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});

// ============================================================
// INITIAL SEED DATA
// ============================================================
const SEED_MODELS = [
  {
    id:"m1", name:"Research Hub", icon:"🧠", color:"#6366f1", description:"Deep research notes and discoveries",
    createdAt: now(), updatedAt: now(), pinned: true,
    folders:[
      {
        id:"f1", name:"SSMT Studies", collapsed:false, createdAt:now(),
        entries:[
          {id:"e1",type:"note",title:"NY AM SSMT Analysis",content:"Observed clean M15 SSMT into 4H FVG during 9:30 macro. Price delivered to -0.5 ext before reversing.",pinned:true,tags:["SSMT","NQ","NY AM"],createdAt:now(),updatedAt:now()},
          {id:"e2",type:"task",title:"Document Wednesday AMDX confluence",content:"Build out full documentation for Wednesday AMDX model with screenshots and statistical data.",pinned:false,tags:["AMDX","Task"],createdAt:now(),updatedAt:now(),done:false},
        ]
      },
      {
        id:"f2", name:"QT Sequences", collapsed:false, createdAt:now(),
        entries:[
          {id:"e3",type:"note",title:"Q3 Weekly → Q1 Daily Bearish",content:"When weekly Q3 aligns with daily Q1, bearish continuation is extremely high probability. Documented 14 examples.",pinned:false,tags:["QT","HTF"],createdAt:now(),updatedAt:now()},
        ]
      },
    ]
  },
  {
    id:"m2", name:"Trade Journal", icon:"📊", color:"#22c55e", description:"Daily trading log and performance tracking",
    createdAt: now(), updatedAt: now(), pinned: false,
    folders:[
      {
        id:"f3", name:"May 2025", collapsed:false, createdAt:now(),
        entries:[
          {id:"e4",type:"note",title:"NQ Long — May 6",content:"Entry: 19,840. Target: 19,920. SL: 19,800. Result: +80pts. SSMT confluence with 4H FVG.",pinned:true,tags:["NQ","Win"],createdAt:now(),updatedAt:now()},
          {id:"e5",type:"note",title:"ES Short — May 5",content:"Entry: 5,610. Target: 5,590. SL: 5,620. Result: +20pts. London sweep model.",pinned:false,tags:["ES","Win"],createdAt:now(),updatedAt:now()},
        ]
      },
      {
        id:"f4", name:"Statistics", collapsed:true, createdAt:now(),
        entries:[
          {id:"e6",type:"note",title:"Monthly Summary",content:"Win rate: 73%. Average win: 28pts NQ. Average loss: 12pts. Profit factor: 2.1. Best day: Wednesday.",pinned:false,tags:["Stats"],createdAt:now(),updatedAt:now()},
        ]
      },
    ]
  },
  {
    id:"m3", name:"Strategy Vault", icon:"🔑", color:"#f97316", description:"Proven setups and model documentation",
    createdAt: now(), updatedAt: now(), pinned: false,
    folders:[
      {
        id:"f5", name:"Entry Models", collapsed:false, createdAt:now(),
        entries:[
          {id:"e7",type:"note",title:"London Sweep Model",content:"Criteria: Asia range clear → London sweeps one side in first 30min → M5 displacement → FVG entry at 50% or OTE.",pinned:true,tags:["London","Entry"],createdAt:now(),updatedAt:now()},
          {id:"e8",type:"note",title:"Silver Bullet 10:00-11:00",content:"FVG delivery window. Best when London session created clear draw and displacement. Enter at 50% of M5 FVG.",pinned:false,tags:["Silver Bullet","M5"],createdAt:now(),updatedAt:now()},
        ]
      },
    ]
  },
];

const SEED_USER = {
  id:"user1", name:"Alex Trader", email:"alex@qtresearch.com",
  avatar:"AT", plan:"Pro", joinedAt: now(),
};

const SEED_ACTIVITY = [
  {id:"a1",action:"Created entry",target:"NY AM SSMT Analysis",model:"Research Hub",time:now()},
  {id:"a2",action:"Updated folder",target:"May 2025",model:"Trade Journal",time:now()},
  {id:"a3",action:"Pinned entry",target:"London Sweep Model",model:"Strategy Vault",time:now()},
];

// ============================================================
// STORE (Zustand-like reducer)
// ============================================================
const initialState = {
  user: null,
  authed: false,
  models: SEED_MODELS,
  activity: SEED_ACTIVITY,
  activeModelId: null,
  activeFolderId: null,
  activeEntryId: null,
  searchQuery: "",
  toast: null,
  modal: null,
  sidebarOpen: true,
  theme: "dark",
};

function reducer(state, action) {
  switch(action.type) {
    case "LOGIN": return {...state, user: action.payload, authed: true};
    case "LOGOUT": return {...state, user: null, authed: false, activeModelId: null};
    case "SET_ACTIVE_MODEL": return {...state, activeModelId: action.payload, activeFolderId: null, activeEntryId: null};
    case "SET_ACTIVE_FOLDER": return {...state, activeFolderId: action.payload, activeEntryId: null};
    case "SET_ACTIVE_ENTRY": return {...state, activeEntryId: action.payload};
    case "SET_SEARCH": return {...state, searchQuery: action.payload};
    case "TOGGLE_SIDEBAR": return {...state, sidebarOpen: !state.sidebarOpen};
    case "SET_TOAST": return {...state, toast: action.payload};
    case "CLEAR_TOAST": return {...state, toast: null};
    case "SET_MODAL": return {...state, modal: action.payload};
    case "CLOSE_MODAL": return {...state, modal: null};

    case "CREATE_MODEL": {
      const m = {id:genId(),name:"New Model",icon:"⚡",color:COLORS[0],description:"",createdAt:now(),updatedAt:now(),pinned:false,folders:[],...action.payload};
      return {...state, models:[...state.models,m], activeModelId:m.id, activity:[{id:genId(),action:"Created model",target:m.name,model:m.name,time:now()},...state.activity]};
    }
    case "UPDATE_MODEL": {
      const models = state.models.map(m => m.id===action.payload.id ? {...m,...action.payload,updatedAt:now()} : m);
      return {...state, models};
    }
    case "DELETE_MODEL": {
      const models = state.models.filter(m => m.id!==action.payload);
      return {...state, models, activeModelId: models[0]?.id||null};
    }
    case "PIN_MODEL": {
      const models = state.models.map(m => m.id===action.payload ? {...m,pinned:!m.pinned} : m);
      return {...state, models};
    }

    case "CREATE_FOLDER": {
      const f = {id:genId(),name:"New Folder",collapsed:false,createdAt:now(),entries:[],...action.payload.folder};
      const models = state.models.map(m => m.id===action.payload.modelId ? {...m,folders:[...m.folders,f],updatedAt:now()} : m);
      return {...state, models, activity:[{id:genId(),action:"Created folder",target:f.name,model:state.models.find(m=>m.id===action.payload.modelId)?.name||"",time:now()},...state.activity]};
    }
    case "UPDATE_FOLDER": {
      const models = state.models.map(m => m.id===action.payload.modelId
        ? {...m, folders: m.folders.map(f => f.id===action.payload.folderId ? {...f,...action.payload.data} : f), updatedAt:now()}
        : m);
      return {...state, models};
    }
    case "DELETE_FOLDER": {
      const models = state.models.map(m => m.id===action.payload.modelId
        ? {...m, folders: m.folders.filter(f => f.id!==action.payload.folderId), updatedAt:now()}
        : m);
      return {...state, models};
    }
    case "TOGGLE_FOLDER": {
      const models = state.models.map(m => m.id===action.payload.modelId
        ? {...m, folders: m.folders.map(f => f.id===action.payload.folderId ? {...f,collapsed:!f.collapsed} : f)}
        : m);
      return {...state, models};
    }
    case "REORDER_FOLDERS": {
      const models = state.models.map(m => m.id===action.payload.modelId ? {...m, folders: action.payload.folders} : m);
      return {...state, models};
    }

    case "CREATE_ENTRY": {
      const e = {id:genId(),type:"note",title:"Untitled",content:"",pinned:false,tags:[],createdAt:now(),updatedAt:now(),...action.payload.entry};
      const models = state.models.map(m => m.id===action.payload.modelId
        ? {...m, folders: m.folders.map(f => f.id===action.payload.folderId ? {...f,entries:[...f.entries,e]} : f), updatedAt:now()}
        : m);
      const modelName = state.models.find(m=>m.id===action.payload.modelId)?.name||"";
      return {...state, models, activeEntryId:e.id, activity:[{id:genId(),action:"Created entry",target:e.title,model:modelName,time:now()},...state.activity]};
    }
    case "UPDATE_ENTRY": {
      const models = state.models.map(m => m.id===action.payload.modelId
        ? {...m, folders: m.folders.map(f => f.id===action.payload.folderId
          ? {...f, entries: f.entries.map(e => e.id===action.payload.entryId ? {...e,...action.payload.data,updatedAt:now()} : e)}
          : f), updatedAt:now()}
        : m);
      return {...state, models};
    }
    case "DELETE_ENTRY": {
      const models = state.models.map(m => m.id===action.payload.modelId
        ? {...m, folders: m.folders.map(f => f.id===action.payload.folderId
          ? {...f, entries: f.entries.filter(e => e.id!==action.payload.entryId)}
          : f)}
        : m);
      return {...state, models, activeEntryId: state.activeEntryId===action.payload.entryId ? null : state.activeEntryId};
    }
    case "PIN_ENTRY": {
      const models = state.models.map(m => m.id===action.payload.modelId
        ? {...m, folders: m.folders.map(f => f.id===action.payload.folderId
          ? {...f, entries: f.entries.map(e => e.id===action.payload.entryId ? {...e,pinned:!e.pinned} : e)}
          : f)}
        : m);
      return {...state, models};
    }
    case "TOGGLE_TASK": {
      const models = state.models.map(m => m.id===action.payload.modelId
        ? {...m, folders: m.folders.map(f => f.id===action.payload.folderId
          ? {...f, entries: f.entries.map(e => e.id===action.payload.entryId ? {...e,done:!e.done,updatedAt:now()} : e)}
          : f)}
        : m);
      return {...state, models};
    }

    default: return state;
  }
}

const StoreContext = createContext(null);
function StoreProvider({children}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toast = useCallback((msg, type="success") => {
    dispatch({type:"SET_TOAST",payload:{msg,type,id:genId()}});
    setTimeout(()=>dispatch({type:"CLEAR_TOAST"}),3200);
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
  --ff:'DM Sans',sans-serif;--fm:'DM Mono',monospace;
  --r:10px;--r2:14px;--r3:20px;
  --shadow:0 4px 24px rgba(0,0,0,0.4);
  --shadow2:0 2px 8px rgba(0,0,0,0.3);
}
html,body,#root{height:100%;background:var(--bg);color:var(--t);font-family:var(--ff);overflow:hidden;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:4px;}
::-webkit-scrollbar-thumb:hover{background:var(--t4);}
input,textarea,select,button{font-family:var(--ff);}
button{cursor:pointer;}
a{color:inherit;text-decoration:none;}

/* ── LAYOUT ── */
.shell{display:flex;height:100vh;overflow:hidden;}
.sidebar{width:260px;flex-shrink:0;background:var(--bg1);border-right:1px solid var(--b);display:flex;flex-direction:column;transition:width .2s ease,opacity .2s ease;overflow:hidden;}
.sidebar.collapsed{width:0;opacity:0;}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);}
.topbar{height:54px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:10px;padding:0 16px;flex-shrink:0;background:var(--bg1);}
.workspace{flex:1;display:flex;overflow:hidden;}
.panel{flex:1;overflow-y:auto;padding:24px;}
.detail-panel{width:420px;flex-shrink:0;border-left:1px solid var(--b);background:var(--bg1);overflow-y:auto;display:flex;flex-direction:column;}
.detail-panel.hidden{display:none;}

/* ── AUTH ── */
.auth-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);background-image:radial-gradient(circle at 20% 50%,rgba(99,102,241,0.08) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(139,92,246,0.06) 0%,transparent 50%);}
.auth-card{background:var(--bg1);border:1px solid var(--b2);border-radius:var(--r3);padding:40px;width:100%;max-width:420px;box-shadow:var(--shadow);}
.auth-logo{font-size:28px;font-weight:700;background:var(--ag);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;}
.auth-sub{font-size:13px;color:var(--t3);margin-bottom:32px;}

/* ── SIDEBAR ── */
.sb-head{padding:16px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.sb-logo{font-size:15px;font-weight:700;background:var(--ag);-webkit-background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;}
.sb-section{padding:8px 12px 4px;font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--t3);}
.sb-item{display:flex;align-items:center;gap:9px;padding:7px 12px;border-radius:var(--r);margin:1px 8px;cursor:pointer;font-size:13px;color:var(--t2);transition:all .15s;border:1px solid transparent;user-select:none;}
.sb-item:hover{background:var(--bg2);color:var(--t);}
.sb-item.active{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.2);color:var(--a2);}
.sb-item .sb-icon{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;}
.sb-item .sb-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sb-item .sb-count{font-size:10px;font-family:var(--fm);background:var(--bg3);color:var(--t3);padding:1px 5px;border-radius:10px;flex-shrink:0;}
.sb-foot{margin-top:auto;border-top:1px solid var(--b);padding:12px;}
.sb-user{display:flex;align-items:center;gap:9px;padding:8px;border-radius:var(--r);cursor:pointer;transition:background .15s;}
.sb-user:hover{background:var(--bg2);}
.avatar{width:30px;height:30px;border-radius:8px;background:var(--ag);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;}

/* ── TOPBAR ── */
.tb-btn{width:32px;height:32px;border-radius:var(--r);background:transparent;border:1px solid transparent;color:var(--t3);display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
.tb-btn:hover{background:var(--bg2);color:var(--t);border-color:var(--b);}
.tb-search{flex:1;max-width:400px;display:flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:6px 12px;}
.tb-search input{flex:1;background:none;border:none;outline:none;color:var(--t);font-size:13px;}
.tb-search input::placeholder{color:var(--t3);}
.tb-actions{margin-left:auto;display:flex;gap:6px;align-items:center;}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--r);border:none;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:var(--ag);color:#fff;box-shadow:0 2px 12px rgba(99,102,241,.3);}
.btn-primary:hover{opacity:.9;transform:translateY(-1px);}
.btn-secondary{background:var(--bg2);border:1px solid var(--b2);color:var(--t2);}
.btn-secondary:hover{background:var(--bg3);color:var(--t);border-color:var(--b3);}
.btn-ghost{background:transparent;border:1px solid transparent;color:var(--t3);}
.btn-ghost:hover{background:var(--bg2);color:var(--t);border-color:var(--b);}
.btn-danger{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:var(--red);}
.btn-danger:hover{background:rgba(239,68,68,.2);}
.btn-sm{padding:5px 10px;font-size:12px;}
.btn-icon{width:30px;height:30px;padding:0;border-radius:var(--r);background:transparent;border:1px solid transparent;color:var(--t3);display:flex;align-items:center;justify-content:center;transition:all .15s;}
.btn-icon:hover{background:var(--bg3);color:var(--t);border-color:var(--b);}

/* ── CARDS ── */
.card{background:var(--bg2);border:1px solid var(--b);border-radius:var(--r2);padding:20px;transition:border-color .15s;}
.card:hover{border-color:var(--b2);}
.card-sm{padding:14px;}

/* ── MODEL GRID ── */
.model-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
.model-card{background:var(--bg2);border:1px solid var(--b);border-radius:var(--r2);padding:20px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.model-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:var(--r2) var(--r2) 0 0;}
.model-card:hover{border-color:var(--b2);transform:translateY(-2px);box-shadow:var(--shadow);}
.model-card.active{border-color:var(--a);background:rgba(99,102,241,.05);}
.model-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:14px;}
.model-name{font-size:15px;font-weight:600;margin-bottom:4px;}
.model-desc{font-size:12px;color:var(--t3);margin-bottom:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.model-meta{display:flex;gap:12px;font-size:11px;color:var(--t3);font-family:var(--fm);}

/* ── FOLDER ── */
.folder-wrap{margin-bottom:12px;}
.folder-head{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);cursor:pointer;transition:all .15s;user-select:none;}
.folder-head:hover{background:var(--bg3);border-color:var(--b2);}
.folder-name{font-size:13px;font-weight:500;flex:1;}
.folder-count{font-size:10px;font-family:var(--fm);color:var(--t3);}
.folder-actions{display:none;gap:2px;}
.folder-head:hover .folder-actions{display:flex;}
.folder-body{padding:6px 0 0 16px;}
.folder-collapsed .folder-body{display:none;}

/* ── ENTRIES ── */
.entry-card{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--bg3);border:1px solid transparent;border-radius:var(--r);margin-bottom:6px;cursor:pointer;transition:all .15s;}
.entry-card:hover{border-color:var(--b);background:var(--bg4);}
.entry-card.active{border-color:var(--a);background:rgba(99,102,241,.07);}
.entry-card.pinned{border-left:2px solid var(--gold);}
.entry-type{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;margin-top:1px;}
.entry-main{flex:1;min-width:0;}
.entry-title{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;}
.entry-preview{font-size:11px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.entry-footer{display:flex;gap:6px;margin-top:6px;align-items:center;}
.entry-tag{padding:1px 6px;background:var(--bg2);border:1px solid var(--b);border-radius:4px;font-size:9px;font-family:var(--fm);color:var(--t3);}
.entry-actions{display:none;gap:2px;flex-shrink:0;}
.entry-card:hover .entry-actions{display:flex;}

/* ── DETAIL PANEL ── */
.dp-head{padding:16px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:8px;flex-shrink:0;}
.dp-body{flex:1;padding:20px;overflow-y:auto;}
.dp-title{font-size:18px;font-weight:700;margin-bottom:16px;line-height:1.3;}
.dp-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;}
.dp-content{font-size:13.5px;color:var(--t2);line-height:1.72;white-space:pre-wrap;}
.dp-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:16px;}
.dp-tag{padding:3px 8px;background:var(--bg2);border:1px solid var(--b2);border-radius:5px;font-size:10px;font-family:var(--fm);color:var(--t2);}

/* ── FORMS ── */
.form-group{margin-bottom:16px;}
.form-label{display:block;font-size:11px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:var(--t3);margin-bottom:6px;}
.form-input{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:9px 12px;color:var(--t);font-size:13.5px;outline:none;transition:border-color .15s;}
.form-input:focus{border-color:var(--a);}
.form-textarea{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:9px 12px;color:var(--t);font-size:13px;outline:none;resize:none;line-height:1.6;transition:border-color .15s;}
.form-textarea:focus{border-color:var(--a);}
.form-select{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:9px 12px;color:var(--t);font-size:13px;outline:none;appearance:none;}

/* ── MODAL ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);}
.modal{background:var(--bg1);border:1px solid var(--b2);border-radius:var(--r3);padding:28px;width:100%;max-width:480px;box-shadow:var(--shadow);animation:modalIn .2s ease;}
.modal-sm{max-width:380px;}
.modal-lg{max-width:600px;}
@keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}
.modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.modal-title{font-size:17px;font-weight:700;}

/* ── TOAST ── */
.toast-wrap{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:300;}
.toast{display:flex;align-items:center;gap:10px;padding:12px 18px;background:var(--bg1);border:1px solid var(--b2);border-radius:var(--r2);box-shadow:var(--shadow);font-size:13px;animation:toastIn .25s ease;white-space:nowrap;}
.toast.success{border-color:rgba(34,197,94,.3);color:var(--green);}
.toast.error{border-color:rgba(239,68,68,.3);color:var(--red);}
.toast.info{border-color:rgba(99,102,241,.3);color:var(--a2);}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ── DASHBOARD OVERVIEW ── */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px;}
.stat-card{background:var(--bg2);border:1px solid var(--b);border-radius:var(--r2);padding:16px;}
.stat-val{font-size:28px;font-weight:700;font-family:var(--fm);margin-bottom:4px;}
.stat-label{font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;}
.stat-change{font-size:10px;font-family:var(--fm);margin-top:4px;}
.stat-change.up{color:var(--green);}
.stat-change.down{color:var(--red);}

/* ── ACTIVITY ── */
.activity-item{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--b);}
.activity-dot{width:8px;height:8px;border-radius:50%;background:var(--a);flex-shrink:0;margin-top:4px;}
.activity-text{font-size:12.5px;color:var(--t2);flex:1;}
.activity-time{font-size:10px;font-family:var(--fm);color:var(--t3);flex-shrink:0;}

/* ── EMPTY STATE ── */
.empty{text-align:center;padding:60px 24px;}
.empty-icon{font-size:40px;margin-bottom:14px;}
.empty-title{font-size:16px;font-weight:600;color:var(--t2);margin-bottom:6px;}
.empty-sub{font-size:13px;color:var(--t3);margin-bottom:20px;}

/* ── ICON PICKER ── */
.icon-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;}
.icon-opt{width:32px;height:32px;border-radius:6px;border:1px solid var(--b);background:var(--bg2);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.icon-opt:hover,.icon-opt.sel{background:var(--bg3);border-color:var(--a);}
.color-grid{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
.color-opt{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all .15s;}
.color-opt:hover,.color-opt.sel{transform:scale(1.2);border-color:#fff;}

/* ── SEARCH RESULTS ── */
.search-result{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r);cursor:pointer;transition:all .15s;}
.search-result:hover{background:var(--bg2);}
.sr-model{font-size:10px;font-family:var(--fm);color:var(--t3);}

/* ── TAGS INPUT ── */
.tags-input-wrap{display:flex;flex-wrap:wrap;gap:5px;padding:6px 8px;background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);min-height:38px;align-items:center;}
.tags-input-wrap:focus-within{border-color:var(--a);}
.tag-chip{display:flex;align-items:center;gap:3px;padding:2px 7px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:4px;font-size:10px;color:var(--a2);}
.tag-chip-x{cursor:pointer;opacity:.6;}
.tag-chip-x:hover{opacity:1;}
.tags-input{background:none;border:none;outline:none;color:var(--t);font-size:12px;min-width:80px;flex:1;}

/* ── INLINE EDIT ── */
.inline-edit{background:none;border:none;outline:none;color:inherit;font-family:inherit;font-size:inherit;font-weight:inherit;width:100%;}
.inline-edit:focus{background:var(--bg2);border-radius:4px;padding:0 4px;}

/* ── MISC ── */
.divider{height:1px;background:var(--b);margin:16px 0;}
.badge{padding:2px 7px;border-radius:4px;font-size:10px;font-family:var(--fm);font-weight:600;}
.badge-purple{background:rgba(99,102,241,.15);color:var(--a2);border:1px solid rgba(99,102,241,.25);}
.badge-green{background:rgba(34,197,94,.12);color:var(--green);border:1px solid rgba(34,197,94,.2);}
.badge-gold{background:rgba(245,158,11,.12);color:var(--gold);border:1px solid rgba(245,158,11,.2);}
.badge-red{background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.2);}
.chip{padding:3px 8px;border-radius:4px;font-size:10px;font-family:var(--fm);background:var(--bg3);color:var(--t3);border:1px solid var(--b);}
.flex{display:flex;align-items:center;}
.flex-1{flex:1;}
.gap-4{gap:4px;}
.gap-6{gap:6px;}
.gap-8{gap:8px;}
.gap-10{gap:10px;}
.gap-12{gap:12px;}
.gap-16{gap:16px;}
.mt-4{margin-top:4px;}
.mt-8{margin-top:8px;}
.mt-12{margin-top:12px;}
.mt-16{margin-top:16px;}
.mb-8{margin-bottom:8px;}
.mb-12{margin-bottom:12px;}
.mb-16{margin-bottom:16px;}
.mb-20{margin-bottom:20px;}
.text-sm{font-size:12px;}
.text-xs{font-size:10px;}
.text-muted{color:var(--t3);}
.text-2{color:var(--t2);}
.font-mono{font-family:var(--fm);}
.font-semibold{font-weight:600;}
.font-bold{font-weight:700;}
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.w-full{width:100%;}
.opacity-0{opacity:0;}
.drag-over{border-color:var(--a)!important;background:rgba(99,102,241,.05)!important;}

/* ── RESPONSIVE ── */
@media(max-width:768px){
  .sidebar{position:fixed;top:0;left:0;height:100%;z-index:100;width:260px!important;opacity:1!important;}
  .sidebar.collapsed{transform:translateX(-100%);}
  .detail-panel{position:fixed;right:0;top:0;height:100%;z-index:90;width:100%!important;}
  .panel{padding:16px;}
  .model-grid{grid-template-columns:1fr;}
}

/* ── ANIMATIONS ── */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-in{animation:fadeIn .2s ease;}
.slide-in{animation:slideIn .25s ease;}
.spin{animation:spin 1s linear infinite;}

/* ── SKELETON ── */
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.skeleton{background:linear-gradient(90deg,var(--bg2) 25%,var(--bg3) 50%,var(--bg2) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}

/* ── CONFIRMATION ── */
.confirm-modal .danger-zone{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:var(--r);padding:12px;margin:12px 0;font-size:12.5px;color:var(--t2);}

/* ── PROGRESS ── */
.progress{height:3px;background:var(--bg3);border-radius:2px;overflow:hidden;}
.progress-bar{height:100%;border-radius:2px;background:var(--ag);transition:width .4s ease;}

/* ── DRAG HANDLE ── */
.drag-handle{cursor:grab;color:var(--t4);display:flex;align-items:center;padding:0 2px;}
.drag-handle:hover{color:var(--t3);}
.drag-handle:active{cursor:grabbing;}

/* ── CONTEXT MENU ── */
.ctx-menu{position:fixed;background:var(--bg1);border:1px solid var(--b2);border-radius:var(--r2);padding:6px;min-width:160px;box-shadow:var(--shadow);z-index:500;animation:fadeIn .12s ease;}
.ctx-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:var(--r);font-size:12.5px;color:var(--t2);cursor:pointer;transition:all .1s;}
.ctx-item:hover{background:var(--bg2);color:var(--t);}
.ctx-item.danger:hover{background:rgba(239,68,68,.1);color:var(--red);}
.ctx-divider{height:1px;background:var(--b);margin:4px 0;}
`;

// ============================================================
// ICONS (SVG)
// ============================================================
const SVG = ({n,s=16,c="currentColor"}) => {
  const props = {width:s,height:s,viewBox:"0 0 24 24",fill:"none",stroke:c,strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round",style:{flexShrink:0}};
  const paths = {
    menu: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
    folder: <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></>,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></>,
    note: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></>,
    task: <><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
    link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></>,
    chevRight: <polyline points="9,18 15,12 9,6"/>,
    chevDown: <polyline points="6,9 12,15 18,9"/>,
    chevLeft: <polyline points="15,18 9,12 15,6"/>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    activity: <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    drag: <><circle cx="9" cy="7" r="1" fill={c}/><circle cx="9" cy="12" r="1" fill={c}/><circle cx="9" cy="17" r="1" fill={c}/><circle cx="15" cy="7" r="1" fill={c}/><circle cx="15" cy="12" r="1" fill={c}/><circle cx="15" cy="17" r="1" fill={c}/></>,
    star: <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>,
    check: <polyline points="20,6 9,17 4,12"/>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    google: null,
  };
  if(n==="google") return (
    <svg style={{width:s,height:s,flexShrink:0}} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
  return <svg {...props}>{paths[n]||null}</svg>;
};

// ============================================================
// UTILITY COMPONENTS
// ============================================================
function Toast() {
  const {state} = useStore();
  if(!state.toast) return null;
  const icons = {success:"✓", error:"✕", info:"ℹ"};
  return (
    <div className="toast-wrap">
      <div className={`toast ${state.toast.type||"info"}`}>
        <span>{icons[state.toast.type]||"ℹ"}</span>
        {state.toast.msg}
      </div>
    </div>
  );
}

function ConfirmModal({title,description,danger,onConfirm,onCancel}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm confirm-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="btn-icon" onClick={onCancel}><SVG n="x"/></button>
        </div>
        {description && <div className="danger-zone">{description}</div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger?"btn-danger":"btn-primary"}`} onClick={onConfirm}>
            {danger?"Delete":"Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TagsInput({value=[],onChange}) {
  const [inp,setInp] = useState("");
  const add = e => {
    if((e.key==="Enter"||e.key===",") && inp.trim()) {
      e.preventDefault();
      const tag = inp.trim().replace(/,/g,"");
      if(!value.includes(tag)) onChange([...value,tag]);
      setInp("");
    }
    if(e.key==="Backspace" && !inp && value.length) onChange(value.slice(0,-1));
  };
  return (
    <div className="tags-input-wrap">
      {value.map(t=>(
        <span key={t} className="tag-chip">
          {t}
          <span className="tag-chip-x" onClick={()=>onChange(value.filter(x=>x!==t))}>×</span>
        </span>
      ))}
      <input className="tags-input" value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={add} placeholder={value.length?"":"Add tags…"}/>
    </div>
  );
}

function InlineEdit({value,onSave,className="",placeholder="Untitled"}) {
  const [editing,setEditing] = useState(false);
  const [v,setV] = useState(value);
  const ref = useRef(null);
  useEffect(()=>{if(editing)ref.current?.select();},[editing]);
  useEffect(()=>{setV(value);},[value]);
  const done = () => { setEditing(false); if(v.trim()&&v!==value) onSave(v.trim()); else setV(value); };
  if(editing) return <input ref={ref} className={`inline-edit ${className}`} value={v} onChange={e=>setV(e.target.value)} onBlur={done} onKeyDown={e=>{if(e.key==="Enter")done();if(e.key==="Escape"){setV(value);setEditing(false);}}} />;
  return <span className={className} onDoubleClick={()=>setEditing(true)} title="Double-click to edit">{v||placeholder}</span>;
}

function SkeletonCard() {
  return (
    <div className="card card-sm" style={{marginBottom:8}}>
      <div className="skeleton" style={{height:14,width:"60%",marginBottom:8}}/>
      <div className="skeleton" style={{height:11,width:"90%",marginBottom:4}}/>
      <div className="skeleton" style={{height:11,width:"70%"}}/>
    </div>
  );
}

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen() {
  const {dispatch,toast} = useStore();
  const [mode,setMode] = useState("login");
  const [email,setEmail] = useState("");
  const [pass,setPass] = useState("");
  const [name,setName] = useState("");
  const [loading,setLoading] = useState(false);

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(()=>{
      dispatch({type:"LOGIN",payload:SEED_USER});
      toast("Signed in with Google successfully!","success");
      setLoading(false);
    },1200);
  };

  const handleSubmit = () => {
    if(!email||!pass){toast("Please fill in all fields","error");return;}
    setLoading(true);
    setTimeout(()=>{
      const user = {...SEED_USER, name:name||SEED_USER.name, email, avatar:(name||"U").slice(0,2).toUpperCase()};
      dispatch({type:"LOGIN",payload:user});
      toast(`Welcome back, ${user.name.split(" ")[0]}!`,"success");
      setLoading(false);
    },1000);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card slide-in">
        <div className="auth-logo">Vaultspace</div>
        <div className="auth-sub">Your intelligent workspace for research, notes, and knowledge.</div>

        <button className="btn btn-secondary w-full" style={{justifyContent:"center",gap:10,marginBottom:20,padding:"10px 14px"}} onClick={handleGoogle} disabled={loading}>
          <SVG n="google" s={16}/> {loading?"Signing in…":"Continue with Google"}
        </button>

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <div style={{flex:1,height:1,background:"var(--b)"}}/>
          <span style={{fontSize:11,color:"var(--t3)"}}>or with email</span>
          <div style={{flex:1,height:1,background:"var(--b)"}}/>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"7px",borderRadius:"var(--r)",border:`1px solid ${mode===m?"var(--a)":"var(--b)"}`,background:mode===m?"rgba(99,102,241,.1)":"transparent",color:mode===m?"var(--a2)":"var(--t3)",fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>
              {m==="login"?"Sign In":"Sign Up"}
            </button>
          ))}
        </div>

        {mode==="signup"&&(
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>

        {mode==="login"&&(
          <div style={{textAlign:"right",marginBottom:14}}>
            <span style={{fontSize:11,color:"var(--a2)",cursor:"pointer"}}>Forgot password?</span>
          </div>
        )}

        <button className="btn btn-primary w-full" style={{justifyContent:"center",padding:"11px"}} onClick={handleSubmit} disabled={loading}>
          {loading?"Please wait…":mode==="login"?"Sign In":"Create Account"}
        </button>

        <div style={{marginTop:16,textAlign:"center",fontSize:12,color:"var(--t3)"}}>
          {mode==="login"?<>No account? <span style={{color:"var(--a2)",cursor:"pointer"}} onClick={()=>setMode("signup")}>Sign up free</span></>:<>Have an account? <span style={{color:"var(--a2)",cursor:"pointer"}} onClick={()=>setMode("login")}>Sign in</span></>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR
// ============================================================
function Sidebar({view,setView}) {
  const {state,dispatch,toast} = useStore();
  const {models,activeModelId,sidebarOpen,user} = state;

  const pinnedModels = models.filter(m=>m.pinned);
  const allModels = models;

  const createModel = () => {
    dispatch({type:"CREATE_MODEL",payload:{name:"New Model",icon:ICONS[Math.floor(Math.random()*ICONS.length)],color:COLORS[Math.floor(Math.random()*COLORS.length)]}});
    setView("model");
    toast("Model created","success");
  };

  return (
    <div className={`sidebar ${sidebarOpen?"":"collapsed"}`}>
      {/* Header */}
      <div className="sb-head">
        <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>V</div>
        <div className="sb-logo">Vaultspace</div>
        <div className="badge badge-purple" style={{marginLeft:"auto",flexShrink:0}}>Pro</div>
      </div>

      {/* Nav */}
      <div style={{padding:"8px 0",overflowY:"auto",flex:1}}>
        <div className="sb-section">Navigation</div>
        {[["home","Home",SVG({n:"home",s:14})],["models","All Models",SVG({n:"grid",s:14})],["activity","Activity",SVG({n:"activity",s:14})],["settings","Settings",SVG({n:"settings",s:14})]].map(([v,l,icon])=>(
          <div key={v} className={`sb-item ${view===v?"active":""}`} onClick={()=>setView(v)}>
            <div className="sb-icon">{icon}</div>
            <span className="sb-label">{l}</span>
          </div>
        ))}

        {pinnedModels.length>0&&(
          <>
            <div className="divider" style={{margin:"8px 12px"}}/>
            <div className="sb-section">Pinned</div>
            {pinnedModels.map(m=>(
              <div key={m.id} className={`sb-item ${activeModelId===m.id&&view==="model"?"active":""}`}
                onClick={()=>{dispatch({type:"SET_ACTIVE_MODEL",payload:m.id});setView("model");}}>
                <div className="sb-icon" style={{background:m.color+"20"}}>{m.icon}</div>
                <span className="sb-label">{m.name}</span>
                <span className="sb-count">{m.folders.reduce((a,f)=>a+f.entries.length,0)}</span>
              </div>
            ))}
          </>
        )}

        <div className="divider" style={{margin:"8px 12px"}}/>
        <div style={{display:"flex",alignItems:"center",padding:"4px 12px 4px"}}>
          <div className="sb-section" style={{padding:0,flex:1}}>Models</div>
          <button className="btn-icon" style={{width:22,height:22}} onClick={createModel} title="New Model"><SVG n="plus" s={12}/></button>
        </div>

        {allModels.map(m=>(
          <div key={m.id} className={`sb-item ${activeModelId===m.id&&view==="model"?"active":""}`}
            onClick={()=>{dispatch({type:"SET_ACTIVE_MODEL",payload:m.id});setView("model");}}>
            <div className="sb-icon" style={{background:m.color+"20"}}>{m.icon}</div>
            <span className="sb-label">{m.name}</span>
            <span className="sb-count">{m.folders.reduce((a,f)=>a+f.entries.length,0)}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="sb-foot">
        <div className="sb-user" onClick={()=>setView("settings")}>
          <div className="avatar">{user?.avatar||"U"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</div>
            <div style={{fontSize:10,color:"var(--t3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
          </div>
          <button className="btn-icon" style={{width:26,height:26}} onClick={e=>{e.stopPropagation();dispatch({type:"LOGOUT"});toast("Signed out","info");}}>
            <SVG n="logout" s={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TOPBAR
// ============================================================
function Topbar({view,setView}) {
  const {state,dispatch} = useStore();
  const [showSearch,setShowSearch] = useState(false);
  const searchRef = useRef(null);

  useEffect(()=>{
    if(showSearch) searchRef.current?.focus();
  },[showSearch]);

  useEffect(()=>{
    const handler = e => {
      if(e.key==="k"&&(e.metaKey||e.ctrlKey)){e.preventDefault();setShowSearch(s=>!s);}
      if(e.key==="Escape"){setShowSearch(false);dispatch({type:"SET_SEARCH",payload:""});}
    };
    window.addEventListener("keydown",handler);
    return ()=>window.removeEventListener("keydown",handler);
  },[dispatch]);

  const activeModel = state.models.find(m=>m.id===state.activeModelId);

  const titles = {home:"Dashboard",models:"All Models",activity:"Activity",settings:"Settings",model:activeModel?.name||"Model"};

  return (
    <div className="topbar">
      <button className="tb-btn" onClick={()=>dispatch({type:"TOGGLE_SIDEBAR"})} title="Toggle sidebar (⌘B)">
        <SVG n="menu" s={16}/>
      </button>

      {!showSearch && (
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {view!=="home"&&<span style={{fontSize:13,color:"var(--t3)",cursor:"pointer"}} onClick={()=>setView("home")}>Dashboard</span>}
          {view!=="home"&&<SVG n="chevRight" s={12} c="var(--t3)"/>}
          <span style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>{titles[view]||""}</span>
        </div>
      )}

      {showSearch && (
        <div className="tb-search" style={{flex:1,maxWidth:"100%"}}>
          <SVG n="search" s={14} c="var(--t3)"/>
          <input ref={searchRef} placeholder="Search across all models… (Esc to close)" value={state.searchQuery} onChange={e=>dispatch({type:"SET_SEARCH",payload:e.target.value})}/>
          {state.searchQuery&&<button className="btn-icon" style={{width:20,height:20}} onClick={()=>dispatch({type:"SET_SEARCH",payload:""})}><SVG n="x" s={12}/></button>}
        </div>
      )}

      <div className="tb-actions">
        <button className="tb-btn" title="Search (⌘K)" onClick={()=>setShowSearch(s=>!s)}>
          <SVG n="search" s={15}/>
        </button>
        {activeModel&&view==="model"&&(
          <button className="btn btn-primary btn-sm" onClick={()=>dispatch({type:"SET_MODAL",payload:{type:"newEntry"}})}>
            <SVG n="plus" s={13}/>New Entry
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SEARCH OVERLAY
// ============================================================
function SearchResults() {
  const {state,dispatch,toast} = useStore();
  const {searchQuery,models} = state;
  if(!searchQuery) return null;

  const q = searchQuery.toLowerCase();
  const results = [];
  models.forEach(m=>{
    m.folders.forEach(f=>{
      f.entries.forEach(e=>{
        if(e.title.toLowerCase().includes(q)||e.content.toLowerCase().includes(q)||e.tags.some(t=>t.toLowerCase().includes(q))){
          results.push({entry:e,folder:f,model:m});
        }
      });
    });
  });

  const typeIcon = {note:"note",task:"task",link:"link",file:"file",image:"image"};
  const typeColor = {note:"rgba(99,102,241,.15)",task:"rgba(34,197,94,.12)",link:"rgba(6,182,212,.12)",file:"rgba(245,158,11,.12)",image:"rgba(236,72,153,.12)"};

  return (
    <div style={{position:"absolute",top:54,left:0,right:0,zIndex:50,background:"var(--bg1)",border:"1px solid var(--b2)",borderTop:"none",padding:"12px",boxShadow:"var(--shadow)",maxHeight:400,overflowY:"auto"}}>
      <div style={{fontSize:11,color:"var(--t3)",marginBottom:8,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>{results.length} results for "{searchQuery}"</div>
      {results.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:"var(--t3)",fontSize:13}}>No results found</div>}
      {results.map(({entry,folder,model})=>(
        <div key={entry.id} className="search-result" onClick={()=>{dispatch({type:"SET_ACTIVE_MODEL",payload:model.id});dispatch({type:"SET_ACTIVE_ENTRY",payload:entry.id});dispatch({type:"SET_SEARCH",payload:""});}}>
          <div style={{width:28,height:28,borderRadius:6,background:typeColor[entry.type]||"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <SVG n={typeIcon[entry.type]||"note"} s={13}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.title}</div>
            <div className="sr-model">{model.name} / {folder.name}</div>
          </div>
          {entry.pinned&&<SVG n="pin" s={12} c="var(--gold)"/>}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// HOME / DASHBOARD
// ============================================================
function HomeView({setView}) {
  const {state,dispatch} = useStore();
  const {models,activity,user} = state;

  const totalEntries = models.reduce((a,m)=>a+m.folders.reduce((b,f)=>b+f.entries.length,0),0);
  const totalFolders = models.reduce((a,m)=>a+m.folders.length,0);
  const pinnedEntries = models.reduce((a,m)=>a+m.folders.reduce((b,f)=>b+f.entries.filter(e=>e.pinned).length,0),0);

  const recentEntries = [];
  models.forEach(m=>m.folders.forEach(f=>f.entries.forEach(e=>recentEntries.push({entry:e,folder:f,model:m}))));
  recentEntries.sort((a,b)=>new Date(b.entry.createdAt)-new Date(a.entry.createdAt));

  return (
    <div className="panel fade-in">
      <div style={{marginBottom:24}}>
        <div style={{fontSize:22,fontWeight:700,marginBottom:4}}>Good {new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, {user?.name?.split(" ")[0]}! 👋</div>
        <div style={{fontSize:13,color:"var(--t3)"}}>Here's what's happening in your workspace</div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {[
          {val:models.length,label:"Models",change:"+1 this week",dir:"up",color:"var(--a2)"},
          {val:totalEntries,label:"Total Entries",change:"+8 this week",dir:"up",color:"var(--green)"},
          {val:totalFolders,label:"Folders",change:"Across all models",dir:"",color:"var(--gold)"},
          {val:pinnedEntries,label:"Pinned Items",change:"Important entries",dir:"",color:"var(--cyan)"},
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div className="stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-change ${s.dir}`}>{s.change}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        {/* Models overview */}
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:14}}>Your Models</div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setView("models")}>View all</button>
          </div>
          {models.slice(0,4).map(m=>(
            <div key={m.id} className="card card-sm" style={{marginBottom:8,cursor:"pointer"}} onClick={()=>{dispatch({type:"SET_ACTIVE_MODEL",payload:m.id});setView("model");}}>
              <div className="flex gap-10">
                <div style={{width:34,height:34,borderRadius:9,background:m.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{m.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
                  <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{m.folders.length} folders · {m.folders.reduce((a,f)=>a+f.entries.length,0)} entries</div>
                </div>
                {m.pinned&&<SVG n="pin" s={12} c="var(--gold)"/>}
              </div>
            </div>
          ))}
          <button className="btn btn-secondary w-full" style={{justifyContent:"center",marginTop:8}} onClick={()=>dispatch({type:"CREATE_MODEL",payload:{name:"New Model",icon:"⚡",color:COLORS[0]}})}>
            <SVG n="plus" s={13}/>Create new model
          </button>
        </div>

        {/* Recent activity */}
        <div>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>Recent Activity</div>
          <div className="card card-sm">
            {activity.slice(0,6).map((a,i)=>(
              <div key={a.id} className="activity-item" style={{borderBottom:i<Math.min(activity.length,6)-1?"1px solid var(--b)":"none"}}>
                <div className="activity-dot" style={{marginTop:5}}/>
                <div style={{flex:1}}>
                  <div className="activity-text"><span style={{color:"var(--t)"}}>{a.action}</span> <span style={{color:"var(--a2)"}}>{a.target}</span></div>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:2,fontFamily:"var(--fm)"}}>{a.model} · just now</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent entries */}
      {recentEntries.length>0&&(
        <div style={{marginTop:24}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>Recent Entries</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
            {recentEntries.slice(0,6).map(({entry,folder,model})=>(
              <div key={entry.id} className="card card-sm" style={{cursor:"pointer"}} onClick={()=>{dispatch({type:"SET_ACTIVE_MODEL",payload:model.id});dispatch({type:"SET_ACTIVE_ENTRY",payload:entry.id});setView("model");}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{fontSize:11,fontFamily:"var(--fm)",color:"var(--t3)"}}>{model.icon} {model.name}</span>
                  {entry.pinned&&<SVG n="pin" s={10} c="var(--gold)"/>}
                </div>
                <div style={{fontSize:13,fontWeight:500,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.title}</div>
                <div style={{fontSize:11,color:"var(--t3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ALL MODELS VIEW
// ============================================================
function AllModelsView() {
  const {state,dispatch,toast} = useStore();
  const [editModel,setEditModel] = useState(null);
  const [delConfirm,setDelConfirm] = useState(null);

  const createModel = () => {
    dispatch({type:"CREATE_MODEL",payload:{name:"New Model",icon:ICONS[0],color:COLORS[0],description:""}});
    toast("Model created","success");
  };

  return (
    <div className="panel fade-in">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{fontSize:20,fontWeight:700}}>All Models</div>
          <div style={{fontSize:12,color:"var(--t3)",marginTop:2}}>{state.models.length} models in your workspace</div>
        </div>
        <button className="btn btn-primary" onClick={createModel}>
          <SVG n="plus" s={14}/>New Model
        </button>
      </div>

      <div className="model-grid">
        {state.models.map(m=>(
          <div key={m.id} className="model-card" style={{"--model-color":m.color}} onClick={()=>{dispatch({type:"SET_ACTIVE_MODEL",payload:m.id});}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:m.color,borderRadius:"var(--r2) var(--r2) 0 0"}}/>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
              <div className="model-icon" style={{background:m.color+"20"}}>{m.icon}</div>
              <div style={{display:"flex",gap:4}}>
                <button className="btn-icon" title="Pin" onClick={e=>{e.stopPropagation();dispatch({type:"PIN_MODEL",payload:m.id});toast(m.pinned?"Unpinned":"Pinned to sidebar","info");}}>
                  <SVG n="pin" s={13} c={m.pinned?"var(--gold)":"var(--t3)"}/>
                </button>
                <button className="btn-icon" title="Edit" onClick={e=>{e.stopPropagation();setEditModel(m);}}>
                  <SVG n="edit" s={13}/>
                </button>
                <button className="btn-icon" title="Delete" onClick={e=>{e.stopPropagation();setDelConfirm(m);}}>
                  <SVG n="trash" s={13}/>
                </button>
              </div>
            </div>
            <div className="model-name">{m.name}</div>
            <div className="model-desc">{m.description||"No description"}</div>
            <div className="model-meta">
              <span>{m.folders.length} folders</span>
              <span>{m.folders.reduce((a,f)=>a+f.entries.length,0)} entries</span>
              <span style={{marginLeft:"auto"}}>{fmtDate(m.createdAt)}</span>
            </div>
          </div>
        ))}

        <div className="model-card" style={{border:"2px dashed var(--b)",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",minHeight:160}} onClick={createModel}>
          <div style={{width:40,height:40,borderRadius:10,background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <SVG n="plus" s={18} c="var(--t3)"/>
          </div>
          <div style={{fontSize:13,color:"var(--t3)"}}>Create new model</div>
        </div>
      </div>

      {editModel&&<ModelEditModal model={editModel} onClose={()=>setEditModel(null)}/>}
      {delConfirm&&(
        <ConfirmModal
          title={`Delete "${delConfirm.name}"?`}
          description="This will permanently delete the model and all its folders and entries. This action cannot be undone."
          danger
          onConfirm={()=>{dispatch({type:"DELETE_MODEL",payload:delConfirm.id});toast("Model deleted","error");setDelConfirm(null);}}
          onCancel={()=>setDelConfirm(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// MODEL EDIT MODAL
// ============================================================
function ModelEditModal({model,onClose}) {
  const {dispatch,toast} = useStore();
  const [form,setForm] = useState({name:model?.name||"",icon:model?.icon||ICONS[0],color:model?.color||COLORS[0],description:model?.description||""});
  const isNew = !model?.id;

  const save = () => {
    if(!form.name.trim()){toast("Name is required","error");return;}
    if(model?.id) {
      dispatch({type:"UPDATE_MODEL",payload:{id:model.id,...form}});
      toast("Model updated","success");
    } else {
      dispatch({type:"CREATE_MODEL",payload:form});
      toast("Model created","success");
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{isNew?"Create Model":"Edit Model"}</div>
          <button className="btn-icon" onClick={onClose}><SVG n="x"/></button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div className="form-group">
            <label className="form-label">Model Name</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Research Hub"/>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional description"/>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Icon</label>
          <div className="icon-grid">
            {ICONS.map(ic=>(
              <button key={ic} className={`icon-opt ${form.icon===ic?"sel":""}`} onClick={()=>setForm(f=>({...f,icon:ic}))}>{ic}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Color</label>
          <div className="color-grid">
            {COLORS.map(c=>(
              <div key={c} className={`color-opt ${form.color===c?"sel":""}`} style={{background:c}} onClick={()=>setForm(f=>({...f,color:c}))}/>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{padding:16,background:"var(--bg2)",borderRadius:"var(--r2)",marginBottom:20,display:"flex",alignItems:"center",gap:12,border:`2px solid ${form.color}30`}}>
          <div style={{width:44,height:44,borderRadius:12,background:form.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{form.icon}</div>
          <div>
            <div style={{fontSize:15,fontWeight:600}}>{form.name||"Model Name"}</div>
            <div style={{fontSize:12,color:"var(--t3)"}}>{form.description||"No description"}</div>
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>
            {isNew?"Create Model":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ENTRY MODAL (Create/Edit)
// ============================================================
function EntryModal({entry,modelId,folderId,onClose}) {
  const {state,dispatch,toast} = useStore();
  const isNew = !entry?.id;
  const model = state.models.find(m=>m.id===modelId);

  const [form,setForm] = useState({
    title: entry?.title||"",
    content: entry?.content||"",
    type: entry?.type||"note",
    tags: entry?.tags||[],
    pinned: entry?.pinned||false,
  });
  const [selFolderId,setSelFolderId] = useState(folderId||model?.folders[0]?.id||"");

  const save = () => {
    if(!form.title.trim()){toast("Title is required","error");return;}
    const targetFolderId = selFolderId;
    if(!targetFolderId){toast("Select a folder","error");return;}
    if(isNew) {
      dispatch({type:"CREATE_ENTRY",payload:{modelId,folderId:targetFolderId,entry:form}});
      toast("Entry created","success");
    } else {
      dispatch({type:"UPDATE_ENTRY",payload:{modelId,folderId:folderId||selFolderId,entryId:entry.id,data:form}});
      toast("Entry saved","success");
    }
    onClose();
  };

  const typeColors = {note:"rgba(99,102,241,.15)",task:"rgba(34,197,94,.12)",link:"rgba(6,182,212,.12)",file:"rgba(245,158,11,.12)",image:"rgba(236,72,153,.12)"};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{isNew?"New Entry":"Edit Entry"}</div>
          <button className="btn-icon" onClick={onClose}><SVG n="x"/></button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:4}}>
          {/* Type selector */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {ENTRY_TYPES.map(t=>(
                <button key={t} onClick={()=>setForm(f=>({...f,type:t}))} style={{padding:"5px 10px",borderRadius:"var(--r)",border:`1px solid ${form.type===t?"var(--a)":"var(--b)"}`,background:form.type===t?typeColors[t]:"transparent",color:form.type===t?"var(--t)":"var(--t3)",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                  <SVG n={t} s={11}/>{t}
                </button>
              ))}
            </div>
          </div>
          {/* Folder selector */}
          <div className="form-group">
            <label className="form-label">Folder</label>
            <select className="form-select" value={selFolderId} onChange={e=>setSelFolderId(e.target.value)}>
              {model?.folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Entry title"/>
        </div>

        <div className="form-group">
          <label className="form-label">Content</label>
          <textarea className="form-textarea" rows={5} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Write your notes here…"/>
        </div>

        <div className="form-group">
          <label className="form-label">Tags (press Enter to add)</label>
          <TagsInput value={form.tags} onChange={tags=>setForm(f=>({...f,tags}))}/>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,color:"var(--t2)"}}>
            <input type="checkbox" checked={form.pinned} onChange={e=>setForm(f=>({...f,pinned:e.target.checked}))} style={{accentColor:"var(--a)",width:14,height:14}}/>
            Pin this entry
          </label>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>
            {isNew?"Create Entry":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FOLDER COMPONENT
// ============================================================
function FolderComponent({folder,model,onEntryClick}) {
  const {state,dispatch,toast} = useStore();
  const [renaming,setRenaming] = useState(false);
  const [newName,setNewName] = useState(folder.name);
  const [delConfirm,setDelConfirm] = useState(false);
  const [dragOver,setDragOver] = useState(false);
  const nameRef = useRef(null);

  useEffect(()=>{if(renaming)nameRef.current?.select();},[renaming]);

  const saveRename = () => {
    setRenaming(false);
    if(newName.trim()&&newName!==folder.name) {
      dispatch({type:"UPDATE_FOLDER",payload:{modelId:model.id,folderId:folder.id,data:{name:newName.trim()}}});
      toast("Folder renamed","success");
    } else setNewName(folder.name);
  };

  const addEntry = () => dispatch({type:"SET_MODAL",payload:{type:"newEntry",folderId:folder.id,modelId:model.id}});

  return (
    <div className={`folder-wrap ${folder.collapsed?"folder-collapsed":""}`}>
      <div className={`folder-head ${dragOver?"drag-over":""}`}
        onDragOver={e=>{e.preventDefault();setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{e.preventDefault();setDragOver(false);}}>
        <div className="drag-handle"><SVG n="drag" s={14}/></div>
        <button className="btn-icon" style={{width:20,height:20,marginRight:2}} onClick={()=>dispatch({type:"TOGGLE_FOLDER",payload:{modelId:model.id,folderId:folder.id}})}>
          {folder.collapsed?<SVG n="chevRight" s={12}/>:<SVG n="chevDown" s={12}/>}
        </button>
        <SVG n="folder" s={13} c="var(--gold)"/>
        {renaming?(
          <input ref={nameRef} style={{flex:1,background:"var(--bg3)",border:"1px solid var(--a)",borderRadius:4,padding:"1px 6px",color:"var(--t)",fontSize:13,fontWeight:500,outline:"none"}}
            value={newName} onChange={e=>setNewName(e.target.value)}
            onBlur={saveRename} onKeyDown={e=>{if(e.key==="Enter")saveRename();if(e.key==="Escape"){setRenaming(false);setNewName(folder.name);}}}/>
        ):(
          <span className="folder-name" onDoubleClick={()=>setRenaming(true)} title="Double-click to rename">{folder.name}</span>
        )}
        <span className="folder-count">{folder.entries.length}</span>
        <div className="folder-actions">
          <button className="btn-icon" style={{width:22,height:22}} title="Add entry" onClick={addEntry}><SVG n="plus" s={11}/></button>
          <button className="btn-icon" style={{width:22,height:22}} title="Rename" onClick={()=>setRenaming(true)}><SVG n="edit" s={11}/></button>
          <button className="btn-icon" style={{width:22,height:22}} title="Delete" onClick={()=>setDelConfirm(true)}><SVG n="trash" s={11}/></button>
        </div>
      </div>

      {!folder.collapsed&&(
        <div className="folder-body">
          {folder.entries.length===0?(
            <div style={{padding:"12px 8px",textAlign:"center",color:"var(--t3)",fontSize:12,border:"1px dashed var(--b)",borderRadius:"var(--r)",cursor:"pointer"}} onClick={addEntry}>
              + Add first entry
            </div>
          ):folder.entries.map(e=>(
            <EntryCard key={e.id} entry={e} folder={folder} model={model} onClick={()=>onEntryClick(e)}/>
          ))}
        </div>
      )}

      {delConfirm&&(
        <ConfirmModal
          title={`Delete "${folder.name}"?`}
          description={`This will delete the folder and all ${folder.entries.length} entries inside it.`}
          danger
          onConfirm={()=>{dispatch({type:"DELETE_FOLDER",payload:{modelId:model.id,folderId:folder.id}});toast("Folder deleted","error");setDelConfirm(false);}}
          onCancel={()=>setDelConfirm(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// ENTRY CARD
// ============================================================
function EntryCard({entry,folder,model,onClick}) {
  const {state,dispatch,toast} = useStore();
  const [delConfirm,setDelConfirm] = useState(false);
  const [editModal,setEditModal] = useState(false);

  const isActive = state.activeEntryId===entry.id;
  const typeColor = {note:"rgba(99,102,241,.15)",task:"rgba(34,197,94,.12)",link:"rgba(6,182,212,.12)",file:"rgba(245,158,11,.12)",image:"rgba(236,72,153,.12)"};
  const typeIcon = {note:"note",task:"task",link:"link",file:"file",image:"image"};

  return (
    <>
      <div className={`entry-card ${isActive?"active":""} ${entry.pinned?"pinned":""}`} onClick={onClick} draggable>
        <div className="drag-handle" style={{marginTop:2}}><SVG n="drag" s={12}/></div>
        <div className="entry-type" style={{background:typeColor[entry.type]||"var(--bg2)"}}>
          <SVG n={typeIcon[entry.type]||"note"} s={11}/>
        </div>
        <div className="entry-main">
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {entry.type==="task"&&(
              <input type="checkbox" checked={entry.done||false} onChange={e=>{e.stopPropagation();dispatch({type:"TOGGLE_TASK",payload:{modelId:model.id,folderId:folder.id,entryId:entry.id}});}} style={{accentColor:"var(--green)",flexShrink:0}} onClick={e=>e.stopPropagation()}/>
            )}
            <div className="entry-title" style={{textDecoration:entry.done?"line-through":"none",color:entry.done?"var(--t3)":"var(--t)"}}>{entry.title}</div>
          </div>
          {entry.content&&<div className="entry-preview">{entry.content}</div>}
          {entry.tags.length>0&&(
            <div className="entry-footer">
              {entry.tags.slice(0,3).map(t=><span key={t} className="entry-tag">{t}</span>)}
              {entry.tags.length>3&&<span className="entry-tag">+{entry.tags.length-3}</span>}
            </div>
          )}
        </div>
        <div className="entry-actions">
          {entry.pinned&&<SVG n="pin" s={11} c="var(--gold)"/>}
          <button className="btn-icon" style={{width:22,height:22}} title="Pin" onClick={e=>{e.stopPropagation();dispatch({type:"PIN_ENTRY",payload:{modelId:model.id,folderId:folder.id,entryId:entry.id}});toast(entry.pinned?"Unpinned":"Pinned","info");}}>
            <SVG n="pin" s={11} c={entry.pinned?"var(--gold)":"var(--t3)"}/>
          </button>
          <button className="btn-icon" style={{width:22,height:22}} title="Edit" onClick={e=>{e.stopPropagation();setEditModal(true);}}>
            <SVG n="edit" s={11}/>
          </button>
          <button className="btn-icon" style={{width:22,height:22}} title="Delete" onClick={e=>{e.stopPropagation();setDelConfirm(true);}}>
            <SVG n="trash" s={11}/>
          </button>
        </div>
      </div>

      {editModal&&(
        <EntryModal entry={entry} modelId={model.id} folderId={folder.id} onClose={()=>setEditModal(false)}/>
      )}
      {delConfirm&&(
        <ConfirmModal
          title="Delete entry?"
          description={`"${entry.title}" will be permanently deleted.`}
          danger
          onConfirm={()=>{dispatch({type:"DELETE_ENTRY",payload:{modelId:model.id,folderId:folder.id,entryId:entry.id}});toast("Entry deleted","error");setDelConfirm(false);}}
          onCancel={()=>setDelConfirm(false)}
        />
      )}
    </>
  );
}

// ============================================================
// DETAIL PANEL
// ============================================================
function DetailPanel({entry,folder,model}) {
  const {dispatch,toast} = useStore();
  const [editing,setEditing] = useState(false);
  const [editModal,setEditModal] = useState(false);

  if(!entry) return (
    <div className="detail-panel" style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",color:"var(--t3)"}}>
        <div style={{fontSize:32,marginBottom:12}}>📝</div>
        <div style={{fontSize:13}}>Select an entry to view details</div>
      </div>
    </div>
  );

  const typeColor = {note:"var(--a2)",task:"var(--green)",link:"var(--cyan)",file:"var(--gold)",image:"#ec4899"};

  return (
    <>
      <div className="detail-panel">
        <div className="dp-head">
          <div style={{width:26,height:26,borderRadius:7,background:typeColor[entry.type]+"20",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <SVG n={entry.type||"note"} s={13} c={typeColor[entry.type]}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:"var(--t3)",fontFamily:"var(--fm)"}}>{model?.name} / {folder?.name}</div>
          </div>
          <div style={{display:"flex",gap:4}}>
            <button className="btn-icon" title="Pin" onClick={()=>{dispatch({type:"PIN_ENTRY",payload:{modelId:model.id,folderId:folder.id,entryId:entry.id}});toast(entry.pinned?"Unpinned":"Pinned","info");}}>
              <SVG n="pin" s={14} c={entry.pinned?"var(--gold)":"var(--t3)"}/>
            </button>
            <button className="btn-icon" title="Edit" onClick={()=>setEditModal(true)}>
              <SVG n="edit" s={14}/>
            </button>
            <button className="btn-icon" title="Close" onClick={()=>dispatch({type:"SET_ACTIVE_ENTRY",payload:null})}>
              <SVG n="x" s={14}/>
            </button>
          </div>
        </div>

        <div className="dp-body">
          <div className="dp-title">{entry.title}</div>

          <div className="dp-meta">
            <span className="badge badge-purple" style={{textTransform:"capitalize"}}>{entry.type}</span>
            {entry.pinned&&<span className="badge badge-gold">📌 Pinned</span>}
            {entry.type==="task"&&<span className={`badge ${entry.done?"badge-green":"badge-red"}`}>{entry.done?"✓ Done":"○ Todo"}</span>}
          </div>

          {entry.content&&<div className="dp-content">{entry.content}</div>}

          {entry.tags.length>0&&(
            <div className="dp-tags">
              {entry.tags.map(t=><span key={t} className="dp-tag"><SVG n="tag" s={9}/> {t}</span>)}
            </div>
          )}

          <div className="divider"/>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:11,color:"var(--t3)",fontFamily:"var(--fm)"}}>
            <div><div style={{marginBottom:3,fontWeight:600,textTransform:"uppercase",letterSpacing:.7}}>Created</div><div>{fmtDate(entry.createdAt)}</div><div>{fmtTime(entry.createdAt)}</div></div>
            <div><div style={{marginBottom:3,fontWeight:600,textTransform:"uppercase",letterSpacing:.7}}>Updated</div><div>{fmtDate(entry.updatedAt)}</div><div>{fmtTime(entry.updatedAt)}</div></div>
          </div>

          <div className="divider"/>

          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="btn btn-secondary btn-sm flex-1" style={{justifyContent:"center"}} onClick={()=>setEditModal(true)}>
              <SVG n="edit" s={12}/>Edit
            </button>
            <button className="btn btn-secondary btn-sm flex-1" style={{justifyContent:"center"}} onClick={()=>{navigator.clipboard?.writeText(entry.content||"");toast("Copied to clipboard","success");}}>
              <SVG n="copy" s={12}/>Copy
            </button>
          </div>
        </div>
      </div>

      {editModal&&<EntryModal entry={entry} modelId={model?.id} folderId={folder?.id} onClose={()=>setEditModal(false)}/>}
    </>
  );
}

// ============================================================
// MODEL VIEW (main workspace)
// ============================================================
function ModelView() {
  const {state,dispatch,toast} = useStore();
  const model = state.models.find(m=>m.id===state.activeModelId);
  const [editModelModal,setEditModelModal] = useState(false);
  const [newFolderName,setNewFolderName] = useState("");
  const [showNewFolder,setShowNewFolder] = useState(false);
  const newFolderRef = useRef(null);

  useEffect(()=>{if(showNewFolder)newFolderRef.current?.focus();},[showNewFolder]);

  if(!model) return (
    <div className="panel">
      <div className="empty"><div className="empty-icon">📦</div><div className="empty-title">No model selected</div><div className="empty-sub">Select a model from the sidebar or create a new one.</div></div>
    </div>
  );

  // Find active entry and its folder
  let activeEntry=null, activeFolder=null;
  if(state.activeEntryId) {
    model.folders.forEach(f=>{
      const e=f.entries.find(e=>e.id===state.activeEntryId);
      if(e){activeEntry=e;activeFolder=f;}
    });
  }

  const createFolder = () => {
    if(!newFolderName.trim()){toast("Enter a folder name","error");return;}
    dispatch({type:"CREATE_FOLDER",payload:{modelId:model.id,folder:{name:newFolderName.trim()}}});
    toast("Folder created","success");
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const totalEntries = model.folders.reduce((a,f)=>a+f.entries.length,0);

  return (
    <div className="workspace">
      {/* Left: folders + entries */}
      <div className="panel" style={{maxWidth:activeEntry?580:"100%"}}>
        {/* Model header */}
        <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:20}}>
          <div style={{width:48,height:48,borderRadius:12,background:model.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{model.icon}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <h1 style={{fontSize:20,fontWeight:700}}>{model.name}</h1>
              {model.pinned&&<SVG n="pin" s={13} c="var(--gold)"/>}
            </div>
            <div style={{fontSize:12,color:"var(--t3)",marginTop:2}}>{model.description||"No description"} · {model.folders.length} folders · {totalEntries} entries</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setEditModelModal(true)}><SVG n="edit" s={12}/>Edit</button>
            <button className="btn btn-primary btn-sm" onClick={()=>dispatch({type:"SET_MODAL",payload:{type:"newEntry",modelId:model.id,folderId:model.folders[0]?.id}})}>
              <SVG n="plus" s={12}/>Entry
            </button>
          </div>
        </div>

        {/* Folders */}
        {model.folders.length===0?(
          <div className="empty" style={{padding:"40px 0"}}>
            <div className="empty-icon">📁</div>
            <div className="empty-title">No folders yet</div>
            <div className="empty-sub">Create folders to organize your entries</div>
            <button className="btn btn-primary" onClick={()=>setShowNewFolder(true)}>
              <SVG n="plus" s={13}/>Create folder
            </button>
          </div>
        ):(
          model.folders.map(f=>(
            <FolderComponent key={f.id} folder={f} model={model} onEntryClick={e=>dispatch({type:"SET_ACTIVE_ENTRY",payload:e.id})}/>
          ))
        )}

        {/* New folder */}
        {showNewFolder?(
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <input ref={newFolderRef} className="form-input" style={{flex:1}} placeholder="Folder name…" value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createFolder();if(e.key==="Escape"){setShowNewFolder(false);setNewFolderName("");}}}/>
            <button className="btn btn-primary btn-sm" onClick={createFolder}>Create</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>{setShowNewFolder(false);setNewFolderName("");}}>Cancel</button>
          </div>
        ):(
          <button className="btn btn-secondary" style={{marginTop:10,width:"100%",justifyContent:"center"}} onClick={()=>setShowNewFolder(true)}>
            <SVG n="folder" s={13}/>New Folder
          </button>
        )}
      </div>

      {/* Right: detail panel */}
      {activeEntry&&<DetailPanel entry={activeEntry} folder={activeFolder} model={model}/>}

      {editModelModal&&<ModelEditModal model={model} onClose={()=>setEditModelModal(false)}/>}
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
        {state.activity.length===0&&<div className="empty"><div className="empty-icon">📋</div><div className="empty-title">No activity yet</div></div>}
        {state.activity.map((a,i)=>(
          <div key={a.id} style={{display:"flex",gap:12,padding:"12px 16px",borderBottom:i<state.activity.length-1?"1px solid var(--b)":"none"}}>
            <div style={{width:30,height:30,borderRadius:8,background:"rgba(99,102,241,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
              <SVG n="activity" s={13} c="var(--a2)"/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:"var(--t)"}}><span style={{color:"var(--t3)"}}>{a.action}</span> <span style={{color:"var(--a2)",fontWeight:500}}>{a.target}</span></div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:3,fontFamily:"var(--fm)"}}>{a.model} · {fmtDate(a.time)} at {fmtTime(a.time)}</div>
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
  const {state,dispatch,toast} = useStore();
  const {user} = state;
  const [name,setName] = useState(user?.name||"");
  const [email,setEmail] = useState(user?.email||"");

  return (
    <div className="panel fade-in" style={{maxWidth:640}}>
      <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Settings</div>
      <div style={{fontSize:12,color:"var(--t3)",marginBottom:24}}>Manage your account and workspace preferences</div>

      <div className="card" style={{marginBottom:16}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>Profile</div>
        <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:20}}>
          <div className="avatar" style={{width:52,height:52,borderRadius:14,fontSize:18}}>{user?.avatar||"U"}</div>
          <div>
            <div style={{fontSize:14,fontWeight:600}}>{user?.name}</div>
            <div style={{fontSize:12,color:"var(--t3)"}}>{user?.email}</div>
            <div style={{marginTop:4}}><span className="badge badge-purple">{user?.plan} Plan</span></div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="form-group"><label className="form-label">Display Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={email} onChange={e=>setEmail(e.target.value)}/></div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>{dispatch({type:"LOGIN",payload:{...user,name,email}});toast("Profile updated","success");}}>Save Changes</button>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>Workspace</div>
        {[
          {label:"Auto-save",desc:"Automatically save changes as you type",def:true},
          {label:"Keyboard shortcuts",desc:"Enable global keyboard shortcuts",def:true},
          {label:"Compact mode",desc:"Show more content with reduced spacing",def:false},
          {label:"Show timestamps",desc:"Display creation and update times on entries",def:true},
        ].map(s=>(
          <div key={s.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid var(--b)"}}>
            <div>
              <div style={{fontSize:13,fontWeight:500}}>{s.label}</div>
              <div style={{fontSize:11,color:"var(--t3)"}}>{s.desc}</div>
            </div>
            <label style={{position:"relative",display:"inline-block",width:38,height:22,cursor:"pointer"}}>
              <input type="checkbox" defaultChecked={s.def} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:"absolute",inset:0,background:"var(--a)",borderRadius:11,transition:".2s"}}/>
            </label>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{fontWeight:600,fontSize:14,marginBottom:8}}>Keyboard Shortcuts</div>
        <div style={{fontSize:12,color:"var(--t3)",marginBottom:12}}>Quick access shortcuts available throughout the app</div>
        {[["⌘K","Open search"],["⌘B","Toggle sidebar"],["⌘N","New entry"],["⌘S","Save changes"],["Esc","Close modal/panel"]].map(([key,desc])=>(
          <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--b)"}}>
            <span style={{fontSize:12,color:"var(--t2)"}}>{desc}</span>
            <kbd style={{padding:"2px 8px",background:"var(--bg3)",border:"1px solid var(--b2)",borderRadius:5,fontSize:11,fontFamily:"var(--fm)",color:"var(--t2)"}}>{key}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// GLOBAL MODAL HANDLER
// ============================================================
function GlobalModal() {
  const {state,dispatch} = useStore();
  const {modal} = state;
  if(!modal) return null;

  if(modal.type==="newEntry") {
    return <EntryModal modelId={modal.modelId||state.activeModelId} folderId={modal.folderId} onClose={()=>dispatch({type:"CLOSE_MODAL"})}/>;
  }
  return null;
}

// ============================================================
// APP SHELL
// ============================================================
function AppShell() {
  const {state} = useStore();
  const [view,setView] = useState("home");

  // Sync active model view
  useEffect(()=>{
    if(state.activeModelId&&view!=="model") setView("model");
  },[state.activeModelId]);

  return (
    <div className="shell">
      <Sidebar view={view} setView={setView}/>
      <div className="main">
        <div style={{position:"relative"}}>
          <Topbar view={view} setView={setView}/>
          {state.searchQuery&&<SearchResults/>}
        </div>
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {view==="home"&&<HomeView setView={setView}/>}
          {view==="models"&&<AllModelsView/>}
          {view==="model"&&<ModelView/>}
          {view==="activity"&&<ActivityView/>}
          {view==="settings"&&<SettingsView/>}
        </div>
      </div>
      <GlobalModal/>
      <Toast/>
    </div>
  );
}

// ============================================================
// ROOT
// ============================================================
export default function App() {
  return (
    <>
      <style>{CSS}</style>
      <StoreProvider>
        <AppRoot/>
      </StoreProvider>
    </>
  );
}

function AppRoot() {
  const {state} = useStore();
  return state.authed ? <AppShell/> : <AuthScreen/>;
}
