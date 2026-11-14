const $=id=>document.getElementById(id);

const API_SETTING="aonwiki-api",TOKEN_SETTING="aonwiki-key",NAME_SETTING="aonwiki-username";
const DEFAULT_API_URL="https://aon.hiakdhs323.workers.dev";
const apiBase=()=> (localStorage.getItem(API_SETTING)||DEFAULT_API_URL).replace(/\/$/,"");
function aonWikiMediaUrl(id,version=id){
 const key=String(id||"").trim();
 if(!key)return "";
 const url=new URL("/media/"+encodeURIComponent(key),apiBase()+"/");
 url.searchParams.set("aonwiki_image",String(version||key));
 return url.href;
}
function aonWikiVersionedAssetUrl(raw,version=""){
 try{
  const url=new URL(String(raw||""),apiBase()+"/");
  if(["/media/","/files/","/image/"].some(prefix=>url.pathname.startsWith(prefix)))
   url.searchParams.set("aonwiki_image",String(version||url.pathname));
  return url.href;
 }catch{return String(raw||"")}
}
const aonThemeMedia=window.matchMedia?.("(prefers-color-scheme: dark)");
function syncAonWikiTheme(){
 document.documentElement.dataset.theme=aonThemeMedia?.matches?"dark":"light";
}
syncAonWikiTheme();
aonThemeMedia?.addEventListener?.("change",syncAonWikiTheme);
const initialSsrState=(()=>{const node=document.getElementById("aonwiki-ssr-state");if(!node)return null;try{return JSON.parse(node.textContent||"null")}catch(error){console.warn("AonWiki SSR state parsing failed",error);return null}})();
let currentTitle=initialSsrState?.title||"",currentContent=initialSsrState?.content||"",currentProtection=initialSsrState?.protection||{level:"none",reason:""},currentOfficial=Boolean(initialSsrState?.official),currentCanEdit=initialSsrState?.canEdit===true?true:null,loggedInName=sessionStorage.getItem(NAME_SETTING)||"";
let currentVisitorIp="",editorRequestMode=false;
const currentDisplayName=()=>loggedInName||(currentVisitorIp?"IP "+currentVisitorIp:"IP 알 수 없음");
let currentDiscussionView=false;
const isHomeRoute=()=>location.pathname==="/"||location.pathname==="/index.html"||location.hash==="#"||location.hash==="#/";
function routeFor(title,anchor=""){
 const name=String(title||"").trim();
 if(!name||name==="대문")return "/";
 return "/w/"+encodeURIComponent(name)+(anchor?"#"+encodeURIComponent(anchor):"");
}
async function api(path,options={}){
 const headers=new Headers(options.headers||{});
 const token=sessionStorage.getItem(TOKEN_SETTING);
 if(token)headers.set("Authorization","Bearer "+token);
 const method=String(options.method||"GET").toUpperCase();
 if(method!=="GET"&&method!=="HEAD"&&method!=="OPTIONS")headers.set("X-AonWiki-Request","1");
 if(options.body&&!(options.body instanceof FormData))headers.set("Content-Type","application/json");
 const target=new URL(path,apiBase()+"/");
 if(target.origin!==new URL(apiBase()+"/").origin)throw new Error("허용되지 않은 API 주소입니다.");
 const canRetry=["GET","HEAD"].includes(method);
 let lastError=null;
 for(let attempt=0;attempt<(canRetry?3:1);attempt++){
  try{
   const requestOptions={...options,headers};
   if(canRetry&&attempt>0)requestOptions.cache="no-store";
   const res=await fetch(target.href,requestOptions);
   const raw=await res.text();
   let data={};
   try{data=raw?JSON.parse(raw):{}}catch{
    if(res.ok&&attempt+1<(canRetry?3:1)){await new Promise(resolve=>setTimeout(resolve,150*(attempt+1)));continue}
   }
   if(!res.ok){
    const transient=[429,502,503,504].includes(res.status);
    const retryAfter=Math.min(2000,Math.max(100,Number(res.headers.get("Retry-After")||0)*1000));
    if(transient&&canRetry&&attempt+1<3){
     await new Promise(resolve=>setTimeout(resolve,retryAfter||200*(attempt+1)));
     continue;
    }
    const detail=[data.error,data.detail].filter(Boolean).join(" — ");
    throw new Error(detail||("요청 실패 ("+res.status+")"));
   }
   return data;
  }catch(error){
   lastError=error;
   if(canRetry&&attempt+1<3){
    await new Promise(resolve=>setTimeout(resolve,150*(attempt+1)));
    continue;
   }
   throw error;
  }
 }
 throw lastError||new Error("요청 실패");
}
let isWikiAdmin=false;
let currentRole="anonymous";
let identityResolved=false;
const AON_UI_ICON_SHAPES = {
  lock: [
    ["rect",{x:"3.2",y:"7",width:"9.6",height:"7.1",rx:"1.3"}],
    ["path",{d:"M5.4 7V5.1a2.6 2.6 0 0 1 5.2 0V7"}],
    ["path",{d:"M8 9.5v2"}]
  ],
  "shield-lock": [
    ["path",{d:"M8 1.5 13 3.4v3.5c0 3.1-1.9 5.6-5 7.6-3.1-2-5-4.5-5-7.6V3.4z"}],
    ["rect",{x:"5.7",y:"6.5",width:"4.6",height:"4",rx:"0.8"}],
    ["path",{d:"M6.9 6.5V5.6a1.1 1.1 0 0 1 2.2 0v.9"}]
  ],
  shield: [
    ["path",{d:"M8 1.5 13 3.4v3.5c0 3.1-1.9 5.6-5 7.6-3.1-2-5-4.5-5-7.6V3.4z"}],
    ["path",{d:"m5.5 7.7 1.6 1.6 3.5-3.5"}]
  ],
  user: [
    ["circle",{cx:"8",cy:"5.2",r:"2.5"}],
    ["path",{d:"M2.8 14c.5-2.5 2.4-3.9 5.2-3.9s4.7 1.4 5.2 3.9"}]
  ],
  edit: [
    ["path",{d:"m3 11.7-.6 2.2 2.2-.6 8.2-8.2-1.6-1.6z"}],
    ["path",{d:"m9.9 4.1 1.7 1.7"}]
  ],
  history: [
    ["circle",{cx:"8",cy:"8",r:"6"}],
    ["path",{d:"M8 4.5v3.8l2.5 1.5"}]
  ],
  message: [
    ["path",{d:"M2 2.8h12v8.1H7L3 13.2v-2.3H2z"}],
    ["path",{d:"M4.7 5.6h6.6M4.7 8h4.8"}]
  ],
  link: [
    ["path",{d:"m6.4 9.6-1.2 1.2a2.1 2.1 0 0 1-3-3l2.1-2.1a2.1 2.1 0 0 1 3 0"}],
    ["path",{d:"m9.6 6.4 1.2-1.2a2.1 2.1 0 0 1 3 3l-2.1 2.1a2.1 2.1 0 0 1-3 0"}],
    ["path",{d:"m5.8 10.2 4.4-4.4"}]
  ],
  upload: [
    ["path",{d:"M8 10V2.5m-3 3 3-3 3 3"}],
    ["path",{d:"M3 9.5v4h10v-4"}]
  ],
  folder: [
    ["path",{d:"M1.8 4h4l1.6 1.7h6.8v7.1H1.8z"}]
  ],
  trash: [
    ["path",{d:"M2.5 4.5h11M6 4.5V2.8h4v1.7"}],
    ["path",{d:"m4.1 4.5.6 9h6.6l.6-9M6.5 6.5v4.7M9.5 6.5v4.7"}]
  ],
  external: [
    ["path",{d:"M9 2.5h4.5V7"}],
    ["path",{d:"M13.2 2.8 7.1 8.9"}],
    ["path",{d:"M11.8 8.8v4.4H2.8V4.2h4.4"}]
  ],
  file: [
    ["path",{d:"M4 1.8h5l3.2 3.1v9.3H4z"}],
    ["path",{d:"M9 1.8v3.3h3.2M6 8h4.3M6 10.5h4.3"}]
  ]
};
const ENTRYWIKI_ICON_PATHS={
 clock:{d:"M6.11484 19.2188C7.32682 19.7396 8.62188 20 10 20C11.3844 20 12.6853 19.7396 13.9029 19.2188C15.1204 18.6979 16.1806 17.9818 17.0833 17.0703C17.9861 16.1589 18.6979 15.0971 19.2188 13.8852C19.7396 12.6732 20 11.3781 20 10C20 8.61667 19.7378 7.31667 19.2133 6.1C18.6888 4.88333 17.9771 3.825 17.0781 2.925C16.179 2.025 15.1218 1.3125 13.9065 0.7875C12.6911 0.2625 11.3929 0 10.012 0C8.63108 0 7.33333 0.260417 6.11875 0.78125C4.90417 1.30208 3.84115 2.01389 2.92969 2.91667C2.01823 3.81944 1.30208 4.87847 0.78125 6.09375C0.260417 7.30903 0 8.60712 0 9.98802C0 11.3689 0.260417 12.6667 0.78125 13.8813C1.30208 15.0958 2.01823 16.1589 2.92969 17.0703C3.84115 17.9818 4.90286 18.6979 6.11484 19.2188ZM14.8177 13.099L13.4896 14.4271L9.0625 10V3.75H10.9375V9.21875L14.8177 13.099Z",rule:"evenodd"},
 discussion:{d:"M20 20L16.25 16.25H6.875C6.35938 16.25 5.91797 16.0664 5.55078 15.6992C5.18359 15.332 5 14.8906 5 14.375V13.125H15C15.5156 13.125 15.957 12.9414 16.3242 12.5742C16.6914 12.207 16.875 11.7656 16.875 11.25V5H18.125C18.6406 5 19.082 5.18359 19.4492 5.55078C19.8164 5.91797 20 6.35938 20 6.875V13.4375V20ZM0 15V1.875C0 1.35938 0.183594 0.917969 0.550781 0.550782C0.917969 0.183594 1.35938 0 1.875 0H13.125C13.6406 0 14.082 0.183594 14.4492 0.550781C14.8164 0.917969 15 1.35938 15 1.875V9.375C15 9.89062 14.8164 10.332 14.4492 10.6992C14.082 11.0664 13.6406 11.25 13.125 11.25H3.75L0 15Z"},
 archive:{d:"M0.000129937 12.6792V18H20V12.6875H15.7143V13.75H13.5715V12.6875H6.42866V13.75H4.28582V12.6875L0.000129937 12.6792ZM0.000129937 10.5542L4.28582 10.5625V9.5H6.42866V10.5625H13.5715V9.5H15.7143V10.5625H19.9999L20 7.375C20 6.79062 19.7902 6.29037 19.3705 5.87422C18.9509 5.45807 18.4464 5.25 17.8572 5.25H15V3.125C15 2.54062 14.7902 2.04037 14.3706 1.62422C13.9509 1.20807 13.4465 1 12.8572 1H7.14294C6.55366 1 6.04919 1.2066 5.62956 1.61979C5.20992 2.03299 5.0001 2.53266 5.0001 3.1188V5.25H2.14297C1.5537 5.25 1.04923 5.4566 0.62959 5.86979C0.209953 6.28299 0.000129937 6.78197 0.000129937 7.36674V10.5542ZM12.8572 5.25H7.14294V3.125H12.8572V5.25Z",rule:"evenodd"},
 user:{d:"M10 10.1A4.05 4.05 0 1 0 10 2a4.05 4.05 0 0 0 0 8.1ZM2 18.2c.55-3.7 3.45-5.8 8-5.8s7.45 2.1 8 5.8H2Z",rule:"evenodd"},
 plus:{d:"M9 2.25h2v6.75h6.75v2H11v6.75H9V11H2.25V9H9V2.25Z"},
 search:{d:"M8.7 2a6.7 6.7 0 1 0 4.13 11.98l4.2 4.2 1.42-1.42-4.2-4.2A6.7 6.7 0 0 0 8.7 2Zm0 2a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4Z",rule:"evenodd"},
 grid:{d:"M2 2h6.5v6.5H2V2Zm9.5 0H18v6.5h-6.5V2ZM2 11.5h6.5V18H2v-6.5Zm9.5 0H18V18h-6.5v-6.5Z"},
 document:{d:"M4 1.5h7l5 5V18.5H4V1.5Zm2 2v13h8V7.4h-4.2V3.5H6Zm5.8.4v1.5h1.5l-1.5-1.5ZM8 10h5v1.5H8V10Zm0 3h5v1.5H8V13Z",rule:"evenodd"},
 edit:{d:"M15.2 2.4a1.8 1.8 0 0 1 2.5 2.5l-9.3 9.3-4.1 1.1 1.1-4.1 9.8-8.8ZM6.1 12.9l-.4 1.1 1.1-.4 8.6-8.6-.7-.7-8.6 8.6Z"},
 upload:{d:"M9 13V5.8L6.2 8.6 4.8 7.2 10 2l5.2 5.2-1.4 1.4L11 5.8V13H9Zm-5 2h12v2H4v-2Z"},
 link:{d:"M7.1 13.9 5.7 15.3a3.3 3.3 0 0 1-4.7-4.7l3.1-3.1a3.3 3.3 0 0 1 4.7 0l.4.4-1.4 1.4-.4-.4a1.3 1.3 0 0 0-1.9 0l-3.1 3.1a1.3 1.3 0 0 0 1.9 1.9l1.4-1.4 1.4 1.4Zm5.8-7.8 1.4-1.4a3.3 3.3 0 0 1 4.7 4.7l-3.1 3.1a3.3 3.3 0 0 1-4.7 0l-.4-.4 1.4-1.4.4.4a1.3 1.3 0 0 0 1.9 0l3.1-3.1a1.3 1.3 0 0 0-1.9-1.9l-1.4 1.4-1.4-1.4Zm-6.2 3h6.6v2H6.7v-2Z"},
 trash:{d:"M6 2h8l.7 2H18v2H2V4h3.3L6 2Zm-1.5 5h11l-.8 11H5.3L4.5 7Zm3 2 .4 7h1.5L9 9H7.5Zm4.5 0-.4 7h1.5l.4-7H12Z",rule:"evenodd"},
 file:{d:"M4 1.5h7l5 5V18.5H4V1.5Zm2 2v13h8V7.4h-4.2V3.5H6Z",rule:"evenodd"},
 shield:{d:"M10 1 17 3.7v5.2c0 4.2-2.8 7.5-7 10.1-4.2-2.6-7-5.9-7-10.1V3.7L10 1Zm0 2.2L5 5.1v3.8c0 3.1 1.9 5.7 5 7.9 3.1-2.2 5-4.8 5-7.9V5.1l-5-1.9Z",rule:"evenodd"},
 lock:{d:"M5 8V6a5 5 0 0 1 10 0v2h1.5v10h-13V8H5Zm2 0h6V6a3 3 0 0 0-6 0v2Zm2 3v4h2v-4H9Z",rule:"evenodd"},
 settings:{d:"M10 2.2 12 3l1.3-1 2.1 2.1-1 1.3.8 2 1.6.3v3l-1.6.3-.8 2 1 1.3-2.1 2.1-1.3-1-2 .8-.3 1.6h-3L6.4 16l-2-.8-1.3 1L1 14.1l1-1.3-.8-2-1.6-.3v-3l1.6-.3.8-2-1-1.3L3 1.8l1.3 1 2-.8L6.6.4h3L10 2.2Zm-1 4.3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",rule:"evenodd"},
 shuffle:{d:"M15 3h3v3h-2V5.7l-3.8 3.8-1.4-1.4 3.8-3.8H15V3ZM2 5h3.2c1.2 0 2.2.5 3.1 1.4l6.4 6.4c.4.4.8.6 1.3.6H16v-1.5l2.5 2.5L16 17v-1.6h-.3c-1.1 0-2.1-.5-3-1.3L6.3 7.7c-.4-.4-.8-.7-1.3-.7H2V5Zm0 10v-2h3c.5 0 .9-.2 1.3-.6l1.2-1.2 1.4 1.4-1.2 1.2A3.8 3.8 0 0 1 5 15H2Z"}
};
function createAonUiIcon(name,className="aon-ui-icon"){
 const filledName=name==="history"?"clock":name==="message"?"discussion":name==="folder"?"archive":name;
 const filled=ENTRYWIKI_ICON_PATHS[filledName];
 const ns="http://www.w3.org/2000/svg";
 const svg=document.createElementNS(ns,"svg");
 svg.setAttribute("class",className);svg.setAttribute("viewBox",filled?"0 0 20 20":"0 0 16 16");
 svg.setAttribute("width","14");svg.setAttribute("height","14");
 svg.setAttribute("aria-hidden","true");svg.setAttribute("focusable","false");
 if(filled){
  svg.setAttribute("fill","currentColor");
  const path=document.createElementNS(ns,"path");
  path.setAttribute("d",filled.d);path.setAttribute("fill","currentColor");
  if(filled.rule)path.setAttribute("fill-rule",filled.rule);
  svg.append(path);return svg;
 }
 svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");
 svg.setAttribute("stroke-width","1.45");svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");
 for(const [tag,attributes] of (AON_UI_ICON_SHAPES[name]||AON_UI_ICON_SHAPES.external)){
  const shape=document.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attributes))shape.setAttribute(key,value);
  svg.append(shape);
 }
 return svg;
}
function setAonIconLabel(element,iconName,label){
 if(!element)return;
 const icon=createAonUiIcon(iconName);
 const text=document.createElement("span");
 text.className="aon-icon-label";
 text.textContent=String(label||"");
 element.replaceChildren(icon,text);
 element.classList.add("aon-has-icon");
 if(element.tagName==="BUTTON")element.setAttribute("aria-label",String(label||""));
}
const EDIT_REQUEST_ICON="data:image/svg+xml,%3csvg%20width='20'%20height='20'%20viewBox='0%200%2020%2020'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M0%2016.6923V14.0769C0%2013.6592%200.115741%2013.2642%200.347222%2012.8918C0.578704%2012.5195%200.898148%2012.2062%201.30556%2011.9519C2.32407%2011.3707%203.40148%2010.9257%204.53778%2010.617C5.67407%2010.3082%206.82815%2010.1538%208%2010.1538C8.69778%2010.1538%209.38611%2010.2083%2010.065%2010.3173C10.7439%2010.4263%2011.4074%2010.5807%2012.0556%2010.7804L10.4444%2012.3606C10.037%2012.2698%209.63315%2012.2062%209.23278%2012.1699C8.83241%2012.1335%208.42148%2012.1154%208%2012.1154C6.98148%2012.1154%205.99074%2012.2425%205.02778%2012.4968C4.06482%2012.7511%203.15741%2013.1325%202.30556%2013.641C2.21296%2013.7137%202.13889%2013.7838%202.08333%2013.8513C2.02778%2013.9191%202%2013.9943%202%2014.0769V14.7308H8.66667V16.6923H0ZM10.6667%2018V14.9215L16.5%209.22756C16.6344%209.09298%2016.7838%208.99572%2016.9481%208.93579C17.1123%208.87603%2017.2756%208.84615%2017.4378%208.84615C17.6146%208.84615%2017.7842%208.87794%2017.9464%208.94151C18.1086%209.00508%2018.2561%209.10043%2018.3889%209.22756L19.6111%2010.4535C19.7331%2010.5854%2019.8284%2010.7319%2019.8969%2010.893C19.9656%2011.0541%2020%2011.2142%2020%2011.3733C20%2011.5324%2019.9695%2011.6951%2019.9086%2011.8615C19.8475%2012.0277%2019.7483%2012.1759%2019.6111%2012.3061L13.8056%2018H10.6667ZM5.16667%207.70192C4.38889%206.9391%204%206.01282%204%204.92308C4%203.83333%204.38889%202.90705%205.16667%202.14423C5.94444%201.38141%206.88889%201%208%201C9.11111%201%2010.0556%201.38141%2010.8333%202.14423C11.6111%202.90705%2012%203.83333%2012%204.92308C12%206.01282%2011.6111%206.9391%2010.8333%207.70192C10.0556%208.46474%209.11111%208.84615%208%208.84615C6.88889%208.84615%205.94444%208.46474%205.16667%207.70192Z'%20fill='white'/%3e%3c/svg%3e";
function setEditRequestAction(element){
 if(!element)return;
 const icon=document.createElement("img");icon.className="edit-request-icon";icon.src=EDIT_REQUEST_ICON;icon.alt="";
 const label=document.createElement("span");label.className="aon-icon-label";label.textContent="편집요청";
 element.replaceChildren(icon,label);element.classList.add("aon-has-icon","edit-request-button");
 element.setAttribute("aria-label","편집요청");
}
function applyEntryWikiStaticIcons(){
 document.querySelectorAll("[data-entry-icon]").forEach(slot=>{
  const icon=createAonUiIcon(slot.dataset.entryIcon,"aon-ui-icon entrywiki-filled-icon");
  slot.replaceChildren(icon);slot.classList.add("entrywiki-icon-slot");
 });
}
applyEntryWikiStaticIcons();
function applyDocumentActionIcons(){
 const controls=[
  ["page-protection","shield-lock","편집 보호"],
  ["official-document","file","공식 문서 지정"],
  ["heading-edit","edit","편집"],
  ["edit","edit",($("edit")?.textContent||"편집").trim()||"편집"],
  ["discussion-tab","discussion","토론"],
  ["history-tab","clock","역사"],
  ["backlinks-tab","link","역링크"],
  ["upload","upload","파일 올리기"],
  ["file-manager","archive","파일 관리"],
  ["delete-page","trash","삭제"]
 ];
 controls.forEach(([id,icon,label])=>setAonIconLabel($(id),icon,label));
 const status=$("protection-status");
 if(status&&!status.hidden&&currentProtection.level!=="none"){
  const level=currentProtection.level;
  setAonIconLabel(status,level==="admin"?"shield-lock":"lock",level==="admin"?"관리자 편집 보호":"회원 편집 보호");
 }
 const official=$("official-status");
 if(official&&!official.hidden)setAonIconLabel(official,"file","공식 문서");
 const template=$("template-status");
 if(template&&!template.hidden)setAonIconLabel(template,"file","공식 틀 문서");
 const role=$("role-label");
 if(role&&!role.hidden){
  const label=(role.textContent||"회원").trim()||"회원";
  setAonIconLabel(role,isWikiAdmin?"shield":"user",label);
 }
}
function decorateExternalLinks(root){
 if(!root)return;
 root.querySelectorAll('a.opennamu_link_out:not([data-aon-external-decorated])').forEach(link=>{
  let url;
  try{url=new URL(link.getAttribute("href")||"",location.href)}catch{return}
  if(!/^https?:$/.test(url.protocol))return;
  const linkedImage=link.classList.contains("wiki-link-external-image") ||
   Boolean(link.querySelector('img,picture,figure,.wiki-image,.wiki-file-image,a.wiki-link-internal[title^="파일:"],a.wiki-link-internal[title^="file:"]'));
  if(linkedImage)link.classList.add("wiki-external-image-link");
  if(!linkedImage){
   const icon=createAonUiIcon("link","wiki-external-link-icon");
   icon.setAttribute("aria-label","외부 링크");
   icon.setAttribute("title","외부 사이트로 이동");
   link.prepend(icon);
  }
  link.classList.add("wiki-external-link");
  link.dataset.aonExternalDecorated="true";
  link.setAttribute("target","_blank");
  link.setAttribute("rel","noopener noreferrer");
  if(!link.hasAttribute("aria-label")){
   const label=(link.textContent||"").trim();
   link.setAttribute("aria-label",(label||url.hostname)+" (외부 링크, 새 창에서 열림)");
  }
 });
}
function syncDocumentEditControls(){
 const hasDocument=Boolean(currentTitle&&!isHomeRoute()&&!$("document-view").hidden);
 const authenticated=Boolean(loggedInName||sessionStorage.getItem(TOKEN_SETTING)||isWikiAdmin);
 let canEdit=false;
 if(currentCanEdit===true)canEdit=true;
 else if(currentCanEdit===false)canEdit=false;
 else if(currentTitle==="대문")canEdit=Boolean(isWikiAdmin);
 else if(currentProtection.level==="admin")canEdit=Boolean(isWikiAdmin);
 else if(currentProtection.level==="registered")canEdit=authenticated;
 else canEdit=true;
 applyDocumentActionIcons();
 const setAction=element=>{
  if(!element)return;element.hidden=!hasDocument;if(!hasDocument)return;
  if(canEdit){setAonIconLabel(element,"edit","편집");element.classList.remove("edit-request-button");element.onclick=()=>editPage(currentTitle,currentContent);}
  else{setEditRequestAction(element);element.onclick=()=>startEditRequest();}
 };
 setAction($("edit"));setAction($("heading-edit"));
 const requestButton=$("edit-requests");if(requestButton)requestButton.hidden=!isWikiAdmin;
}
async function refreshIdentity(){
 try{
  const me=await api("/api/me");
  currentVisitorIp=me.authenticated?"":String(me.ip||"");
  isWikiAdmin=Boolean(me.isAdmin);
  currentRole=me.role||"anonymous";
  loggedInName=me.authenticated?(me.username||""):"";
  if(loggedInName)sessionStorage.setItem(NAME_SETTING,loggedInName);
  else if(identityResolved)sessionStorage.removeItem(NAME_SETTING);
 }catch{
  // Keep the browser session identity on transient API/network failures.
  // Clearing it here caused the edit button to disappear after refresh.
  isWikiAdmin=false;
  currentRole="anonymous";
  if(!loggedInName) loggedInName=sessionStorage.getItem(NAME_SETTING)||"";
 }
 setAonIconLabel($("login"),"user",loggedInName?"로그아웃 · "+loggedInName:"로그인");
  setAonIconLabel($("settings"),"settings","설정");
  setAonIconLabel($("labs"),"file","엔진 정보");
  setAonIconLabel($("change-password"),"lock","비밀번호");
 const roleLabel=$("role-label");
 roleLabel.hidden=!loggedInName;
 roleLabel.textContent=isWikiAdmin?"위키 관리자":"회원";
 roleLabel.classList.toggle("admin",isWikiAdmin);
 $("change-password").hidden=!(loggedInName && currentRole==="user");
 $("home-admin-tools").hidden=!isWikiAdmin;
 $("file-manager").hidden=!loggedInName;
 $("upload").hidden=false;
 $("delete-page").hidden=!isWikiAdmin||!currentTitle;
  const protectionButton=$("page-protection");
  const isArticleView=!$("document-view").hidden&&!$("backlinks-tab").hidden&&!/^(?:분류|category):/i.test(currentTitle)&&!$("message").textContent.includes("이 문서는 아직 존재하지 않습니다");
  if(protectionButton)protectionButton.hidden=!isWikiAdmin||!currentTitle||isHomeRoute()||!isArticleView;
  identityResolved=true;
  syncDocumentEditControls();
}

function addText(parent,tag,text){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el}
const liveWatchStartedAt=new Date().toISOString();
const liveSeenTitles=new Set();
let livePollBusy=false;
function showNewPageNotice(page){
 let host=$("live-notice-host");
 if(!host){host=document.createElement("div");host.id="live-notice-host";host.className="live-notice-host";host.setAttribute("aria-live","polite");document.body.append(host)}
 const card=document.createElement("div");card.className="live-notice";
 const info=document.createElement("div");info.className="live-notice-info";
 addText(info,"strong","새 문서 등록");
 addText(info,"span",page.title+" 문서가 새로 올라왔습니다.");
 const open=document.createElement("button");open.type="button";open.className="button button-primary";open.textContent="열기";
 open.addEventListener("click",()=>{card.remove();openPage(page.title)});
 const close=document.createElement("button");close.type="button";close.className="live-notice-close";close.textContent="×";close.setAttribute("aria-label","알림 닫기");
 close.addEventListener("click",()=>card.remove());
 card.append(info,open,close);host.prepend(card);
 while(host.children.length>5)host.lastElementChild.remove();
}
async function checkForNewPages(){
 if(livePollBusy)return;
 livePollBusy=true;
 try{
  const data=await api("/api/pages?created_after="+encodeURIComponent(liveWatchStartedAt));
  const pages=data.pages||[];
  const fresh=pages.filter(page=>page.title&&!liveSeenTitles.has(page.title));
  pages.forEach(page=>liveSeenTitles.add(page.title));
  fresh.sort((a,b)=>String(a.created_at||"").localeCompare(String(b.created_at||"")));
  fresh.forEach(showNewPageNotice);
  if(fresh.length)invalidateNamuDatabaseCache();
  if(fresh.length&&isHomeRoute())await loadHome();
 }catch(error){console.warn("새 문서 실시간 확인 실패:",error)}
 finally{livePollBusy=false}
}
function startLivePageWatcher(){
 if(window.aonWikiLiveTimer)return;
 checkForNewPages();
 window.aonWikiLiveTimer=window.setInterval(checkForNewPages,60000);
}
let pageNavigationSequence = 0;
let breadcrumbTrail = [];
function ensureDocumentViewTargets(){
 const view=$("document-view");
 if(!view)throw new Error("문서 화면 컨테이너(#document-view)를 찾을 수 없습니다.");
 let title=$("title");
 if(!title){const bar=view.querySelector(".article-titlebar")||view;title=document.createElement("h1");title.id="title";title.className="article-title";bar.prepend(title)}
 let crumb=$("crumb");
 if(!crumb){let nav=view.querySelector(".breadcrumbs");if(!nav){nav=document.createElement("nav");nav.className="breadcrumbs";view.prepend(nav)}crumb=document.createElement("span");crumb.id="crumb";nav.append(crumb)}
 let message=$("message");
 if(!message){message=document.createElement("div");message.id="message";message.className="notice";message.setAttribute("role","status");view.append(message)}
 let article=$("article");
 if(!article){article=document.createElement("article");article.id="article";article.className="namumark-content-host";view.append(article)}
 return {title,crumb,message,article,protection:$("page-protection"),headingEdit:$("heading-edit")};
}
function setArticleTitleLink(host,title,label){
 if(!host)return;
 const link=document.createElement("a");
 link.className="article-title-link";
 link.href=routeFor(title);
 link.textContent=String(label||title);
 link.addEventListener("click",event=>{
  event.preventDefault();
  openPage(title);
 });
 host.replaceChildren(link);
}
function renderBreadcrumbTrail(){
 const host=document.querySelector("#document-view .breadcrumbs");
 if(!host)return;
 host.replaceChildren();
 const home=document.createElement("a");home.href="/";home.textContent="AonWiki";
 home.addEventListener("click",event=>{event.preventDefault();breadcrumbTrail=[];showHome(true)});
 host.append(home);
 breadcrumbTrail.forEach((title,index)=>{
  const sep=document.createElement("span");sep.textContent="›";sep.setAttribute("aria-hidden","true");host.append(sep);
  const isCurrent=index===breadcrumbTrail.length-1;
  const label=document.createElement("a");
  label.href=routeFor(title);
  label.textContent=title;
  if(isCurrent){label.id="crumb";label.setAttribute("aria-current","page");label.className="breadcrumb-current-link"}
  label.addEventListener("click",event=>{
   event.preventDefault();
   breadcrumbTrail=breadcrumbTrail.slice(0,index+1);
   openPage(title);
  });
  host.append(label);
 });
}
function showHome(push=true){
 currentDiscussionView=false;
 document.title="AonWiki";
 breadcrumbTrail=[];
 pageNavigationSequence++;
 if(push)history.pushState(null,"","/");
 currentTitle="";currentContent="";
 $("search-view").hidden=true;
 $("home-view").hidden=false;$("document-view").hidden=true;$("editor-view").hidden=true;
 document.body.classList.remove("editor-active");
 $("home").classList.add("active");$("edit").hidden=true;$("history").hidden=true;$("upload").hidden=false;$("delete-page").hidden=true;
 $("new").classList.remove("active");loadHome()
}
async function loadHome(){
  const list=$("page-list");
  const changesHost=$("home-recent-changes");
  const categoriesHost=$("home-category-list");
  list.replaceChildren();
  changesHost?.replaceChildren();
  categoriesHost?.replaceChildren();
  $("page-count").textContent="";

  const formatHomeDate=value=>{
    if(!value)return "";
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return "";
    return date.toLocaleString("ko-KR",{
      month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"
    });
  };
  const makeHomeLink=(title,label=title)=>{
    const link=document.createElement("a");
    link.href=routeFor(title);
    link.textContent=label;
    link.addEventListener("click",event=>{
      event.preventDefault();
      openPage(title);
    });
    return link;
  };
  const makeHomeEmpty=(host,message)=>{
    if(!host)return;
    host.replaceChildren();
    addText(host,"p",message).className="empty-list";
  };

  try{
    const [pageData,homeData,recentData,categoryData,pageIndexData]=await Promise.all([
      api("/api/pages"),
      api("/api/home").catch(()=>({settings:{}})),
      api("/api/recent").catch(()=>({changes:[]})),
      api("/api/categories").catch(()=>({categories:[],total:0})),
      api("/api/page-index").catch(()=>({pages:[]}))
    ]);
    const settings=homeData.settings||{};
    $("home-title").textContent=settings.title||"AonWiki";
    $("home-tagline").textContent=settings.tagline||"함께 만드는 지식 백과사전";

    const hint=$("home-search-hint");
    if(hint)hint.textContent=settings.searchHint||"상단 검색창에서 문서 제목이나 본문 내용을 검색할 수 있습니다.";
    $("home-list-title").textContent=settings.listTitle||"최근 수정된 문서";
    $("home-bottom-title").textContent=settings.bottomTitle||"AonWiki에 함께 참여해 보세요";
    $("home-bottom-text").textContent=settings.bottomText||"새 문서를 만들거나 기존 문서를 보완해 지식을 함께 쌓을 수 있습니다.";

    const notice=$("home-notice");
    notice.replaceChildren();
    notice.hidden=!settings.notice;
    if(settings.notice){
      try{await renderNamuMarkup(settings.notice,notice,"공지");}
      catch(error){notice.textContent=settings.notice;console.warn("공지 문법 렌더링 실패",error)}
    }

    const content=settings.content||"";
    if(content)await renderNamuMarkup(content,$("home-content"),"대문");
    else $("home-content").replaceChildren();

    $("home-admin-tools").hidden=!isWikiAdmin;
    const linkColorHelp=$("editor-linkcolor-help");
    const linkColorExample=$("editor-linkcolor-example");
    if(linkColorHelp)linkColorHelp.hidden=!isWikiAdmin;
    if(linkColorExample)linkColorExample.hidden=!isWikiAdmin;

    const pages=(pageData.pages||[])
      .filter(page=>page.title!=="대문"&&!/^(?:분류|category):/i.test(page.title||""));
    const categories=categoryData.categories||[];
    const changes=(recentData.changes||[]).filter(change=>change.title&&change.title!=="대문");

    const allTitles=(pageIndexData.pages||[]).map(page=>String(page.title||""));
    const documentCount=allTitles.length
      ?allTitles.filter(title=>title!=="대문"&&!/^(?:분류|category):/i.test(title)).length
      :pages.length;
    $("home-doc-count").textContent=documentCount.toLocaleString("ko-KR");
    $("home-category-count").textContent=Number(categoryData.total??categories.length).toLocaleString("ko-KR");
    $("home-latest-updated").textContent=pages.length&&pages[0].updated_at
      ?formatHomeDate(pages[0].updated_at)
      :"아직 기록이 없습니다";

    $("page-count").textContent=pages.length.toLocaleString("ko-KR")+"개 문서";
    if(!pages.length){
      makeHomeEmpty(list,"아직 등록된 문서가 없습니다. 로그인 후 첫 문서를 만들어 보세요.");
    }else{
      pages.slice(0,8).forEach(page=>{
        const row=document.createElement("div");
        row.className="page-row";
        const main=makeHomeLink(page.title);
        const date=document.createElement("time");
        date.dateTime=page.updated_at||"";
        date.textContent=formatHomeDate(page.updated_at);
        row.append(main,date);
        list.append(row);
      });
    }

    if(!changes.length){
      makeHomeEmpty(changesHost,"아직 표시할 편집 기록이 없습니다.");
    }else{
      changes.slice(0,8).forEach(change=>{
        const row=document.createElement("div");
        row.className="home-change-row";
        const main=document.createElement("div");
        main.className="home-change-main";
        main.append(makeHomeLink(change.title));
        const summary=addText(main,"p",change.summary||"문서 내용 수정");
        summary.className="home-change-summary";
        const meta=document.createElement("div");
        meta.className="home-change-meta";
        addText(meta,"span",change.editor||"알 수 없음");
        const time=document.createElement("time");
        time.dateTime=change.created_at||"";
        time.textContent=formatHomeDate(change.created_at);
        meta.append(time);
        row.append(main,meta);
        changesHost.append(row);
      });
    }

    if(!categories.length){
      makeHomeEmpty(categoriesHost,"아직 분류가 없습니다. 문서에 [[분류:분류명]]을 추가하면 주제별로 모아 볼 수 있습니다.");
    }else{
      categories.slice(0,7).forEach(category=>{
        const row=document.createElement("div");
        row.className="home-category-row";
        const link=makeHomeLink("분류:"+category.name,category.name);
        const count=addText(row,"span",Number(category.count||0).toLocaleString("ko-KR")+"개 문서");
        count.className="home-category-count";
        row.append(link,count);
        categoriesHost.append(row);
      });
      if(categories.length>7){
        const more=makeHomeLink("분류 목록","전체 분류 "+Number(categoryData.total||categories.length).toLocaleString("ko-KR")+"개 보기");
        more.className="home-category-more";
        categoriesHost.append(more);
      }
    }
  }catch(error){
    makeHomeEmpty(list,error.message||"문서 목록을 불러오지 못했습니다.");
    makeHomeEmpty(changesHost,"최근 변경 기록을 불러오지 못했습니다.");
    makeHomeEmpty(categoriesHost,"분류 목록을 불러오지 못했습니다.");
  }
}
function openPage(title,anchor=""){title=String(title||"").trim();if(!title)return;if(title==="대문"){showHome(true);return}if(title===currentTitle&&!currentDiscussionView){if(anchor)scrollToAnchor(anchor);return}currentDiscussionView=false;loadPage(title,true,anchor)}
function readRoute(){
 const hash=location.hash||"";
 if(location.pathname.toLowerCase()==="/search"){
  const params=new URLSearchParams(location.search);
  loadSearchPage(params.get("q")||"",params.get("scope")||"all",false);return;
 }
 $("search-view").hidden=true;
 // Legacy hash-based URLs remain readable, but all new links use /w/<title>.
 if(hash.startsWith("#/")){
  if(hash==="#"||hash==="#/"||hash==="#/home"){history.replaceState(null,"","/");showHome(false);return}
  if(hash==="#/categories"){loadCategoryIndex(false);return}
  if(hash==="#/recent"){loadRecentChanges(false);return}
  if(hash.startsWith("#/special/")){
   let type=hash.slice("#/special/".length);try{type=decodeURIComponent(type)}catch{}
   loadSpecialPage(type,false);return
  }
  if(hash==="#/discussions"||hash.startsWith("#/discussions?")){
   const query=hash.includes("?")?hash.slice(hash.indexOf("?")+1):"";
   const params=new URLSearchParams(query);
   const pageTitle=params.get("title")||"";
   loadDiscussionList(false,pageTitle,{q:params.get("q")||"",status:params.get("status")||"all"});return
  }
  if(hash.startsWith("#/discussion/")){
   const id=Number(hash.slice("#/discussion/".length));
   loadDiscussionDetail(id,false);return
  }
  if(hash.startsWith("#/backlinks/")){let target=hash.slice("#/backlinks/".length);try{target=decodeURIComponent(target)}catch{}loadBacklinks(target,false);return}
  let title="",anchor="";
  if(hash.startsWith("#/w/")){
   const parts=hash.slice(4).split("#");
   try{title=decodeURIComponent(parts[0]);anchor=parts[1]?decodeURIComponent(parts[1]):""}
   catch{title=parts[0];anchor=parts[1]||""}
  }else{
   try{title=decodeURIComponent(hash.slice(2))}
   catch{title=hash.slice(2)}
  }
  if(!title||title==="대문"){history.replaceState(null,"","/");showHome(false);return}
  history.replaceState(null,"",routeFor(title,anchor));
  if(title===currentTitle){if(anchor)scrollToAnchor(anchor);return}
  loadPage(title,false,anchor);
  return;
 }
 if(location.pathname==="/"||location.pathname==="/index.html"){showHome(false);return}
 if(location.pathname.startsWith("/w/")){
  let title="";
  try{title=decodeURIComponent(location.pathname.slice(3))}
  catch{title=location.pathname.slice(3)}
  title=title.trim();
  if(!title||title==="대문"){showHome(false);return}
  let anchor="";
  if(hash)try{anchor=decodeURIComponent(hash.slice(1))}catch{anchor=hash.slice(1)}
  if(title===currentTitle){if(anchor)scrollToAnchor(anchor);return}
  loadPage(title,false,anchor);
  return;
 }
 showHome(false);
}
function navigateInternal(target){
 const raw=String(target||"").trim();
 if(raw.startsWith("#")){scrollToAnchor(raw.slice(1));return}
 const split=raw.split("#");const title=split.shift().trim();const anchor=split.join("#");
 if(!title){scrollToAnchor(anchor);return}
 if(title===currentTitle){if(anchor)scrollToAnchor(anchor);return}
 openPage(title,anchor)
}
function scrollToAnchor(anchor){
 let id=String(anchor||"").replace(/^#/,"");try{id=decodeURIComponent(id)}catch{}
 let el=document.getElementById(id);
 if(!el){
  const normalize=value=>String(value||"").replace(/^\s*\d+(?:\.\d+)*\.\s*/,"").replace(/\s+/g," ").trim();
  const wanted=normalize(id);
  if(wanted)el=[...$("article").querySelectorAll("h1,h2,h3,h4,h5,h6")].find(h=>normalize(h.textContent)===wanted);
 }
 if(el)el.scrollIntoView({behavior:"smooth",block:"start"})
}
function cleanStyleValue(value){const v=String(value||"").trim();if(!v||/[;{}<>]|url\s*\(|expression|javascript/i.test(v))return "";return v}
function applyWikiStyles(element,raw){
 const entries=String(raw||"").split(";");for(const entry of entries){const at=entry.indexOf(":");if(at<1)continue;const key=entry.slice(0,at).trim().toLowerCase(),value=cleanStyleValue(entry.slice(at+1));if(!value)continue;
  const map={color:"color",background:"backgroundColor","background-color":"backgroundColor","text-align":"textAlign","font-size":"fontSize","font-weight":"fontWeight","width":"width","max-width":"maxWidth","min-width":"minWidth","margin":"margin","padding":"padding","border":"border","border-color":"borderColor","border-radius":"borderRadius","float":"float","display":"display"};
  if(map[key])element.style[map[key]]=value;
 }
}
const wikiFileLookupCache=new Map();
const wikiFileLookupPending=new Map();
const renderedDocumentCache=new Map();
const renderedDocumentPending=new Map();
async function ensureCurrentContentForEdit(){
 if(currentContent)return currentContent;
 if(!currentTitle)return "";
 const data=await api("/api/page?title="+encodeURIComponent(currentTitle));
 if(!data.page)throw new Error("문서를 찾을 수 없습니다.");
 currentContent=String(data.page.content||"");
 return currentContent;
}
async function getRenderedDocument(title){
 const key=String(title||"").trim();
 if(!key)return null;
 const cached=renderedDocumentCache.get(key);
 if(cached&&cached.expiresAt>Date.now())return cached.value;
 if(cached)renderedDocumentCache.delete(key);
 if(renderedDocumentPending.has(key))return renderedDocumentPending.get(key);
 const pending=api("/api/render?title="+encodeURIComponent(key),{cache:"no-store"}).then(data=>{
  renderedDocumentCache.set(key,{value:data,expiresAt:Date.now()+45000});
  while(renderedDocumentCache.size>120){
   const oldest=renderedDocumentCache.keys().next().value;
   if(oldest)renderedDocumentCache.delete(oldest);else break;
  }
  return data;
 }).finally(()=>renderedDocumentPending.delete(key));
 renderedDocumentPending.set(key,pending);
 return pending;
}
function invalidateNamuDatabaseCache(){
 wikiFileLookupCache.clear();
 wikiFileLookupPending.clear();
 renderedDocumentCache.clear();
 renderedDocumentPending.clear();
}
async function resolveWikiFile(filename){
 const raw=String(filename||"").trim();
 const names=[...new Set([raw,raw.replace(/^(?:파일|file):/i,"").trim()])].filter(Boolean);
 const key=apiBase()+"|"+names.map(name=>name.toLocaleLowerCase()).join("|");
 const cached=wikiFileLookupCache.get(key);
 if(cached&&cached.expires>Date.now()){
  if(cached.url)return {url:cached.url};
  throw new Error("파일을 찾을 수 없습니다.");
 }
 if(wikiFileLookupPending.has(key))return wikiFileLookupPending.get(key);
 const pending=(async()=>{
  let lastError=null;
  for(const name of names){
   try{
    const data=await api("/api/file?name="+encodeURIComponent(name));
    if(!data.image||!data.image.url)continue;
    const mediaUrl=data.image.key
      ? aonWikiMediaUrl(data.image.key,data.image.key)
      : aonWikiVersionedAssetUrl(data.image.url,raw);
    wikiFileLookupCache.set(key,{url:mediaUrl,expires:Date.now()+5*60*1000});
    return {url:mediaUrl};
   }catch(error){lastError=error}
  }
  throw lastError||new Error("파일을 찾을 수 없습니다.");
 })().catch(error=>{
  wikiFileLookupCache.set(key,{url:"",expires:Date.now()+20*1000});
  throw error;
 }).finally(()=>wikiFileLookupPending.delete(key));
 wikiFileLookupPending.set(key,pending);
 return pending;
}
function createImage(parent,fileSpec,state,markdownAlt=""){
 const parts=String(fileSpec||"").split("|"),filename=parts.shift().trim(),params={};
 parts.join("|").split("&").forEach(pair=>{const at=pair.indexOf("=");if(at>0)params[pair.slice(0,at).trim().toLowerCase()]=pair.slice(at+1).trim();else if(pair.trim())params[pair.trim().toLowerCase()]="true"});
 const inTable=!!parent.closest("td,th");
 const align=(params.align||(inTable?"left":"center")).toLowerCase();
 const figure=document.createElement("figure");figure.className="wiki-image"+(align==="right"?" align-right":align==="left"?" align-left":"");
 if(inTable){figure.style.display="inline-block";figure.style.verticalAlign="top";figure.style.maxWidth="100%";figure.style.margin="0 4px 4px 0"}
 const img=document.createElement("img");img.alt=params.alt||markdownAlt||filename;img.loading="lazy";img.decoding="async";
 let width=params.width||params["width"];if(width){width=width.replace(/px$/i,"");if(/^\d+(\.\d+)?$/.test(width))width+="px";if(/^\d+(\.\d+)?(px|%)$/.test(width))figure.style.width=width}
 let height=params.height;if(height){height=height.replace(/px$/i,"");if(/^\d+(\.\d+)?$/.test(height))height+="px";if(/^\d+(\.\d+)?px$/.test(height))img.style.height=height}
 if(width)img.style.width=width;if(params.border==="true")img.style.border="1px solid #a2a9b1";
 const link=document.createElement("a");
 const imageLink=params.link||params["링크"]||"";
 link.append(img);
 if(imageLink){
  if(/^https?:\/\//i.test(imageLink)){
   link.href=imageLink;link.target="_blank";link.rel="noopener noreferrer";
  }else if(imageLink.startsWith("#")){
   link.href=imageLink;
  }else{
   link.href=routeFor(imageLink.split("#")[0],imageLink.includes("#")?imageLink.split("#").slice(1).join("#"):"");
   link.onclick=e=>{e.preventDefault();navigateInternal(imageLink)};
  }
 }else{
  link.href="#";
  link.setAttribute("aria-label",img.alt+" 원본 파일 열기");
  link.onclick=e=>{e.preventDefault();if(img.src)window.open(img.src,"_blank","noopener,noreferrer")};
 }
 figure.append(link);
 if(params.caption)addText(figure,"figcaption",params.caption);
 parent.append(figure);
 let imageFailed=false;
 const fail=()=>{if(imageFailed)return;imageFailed=true;const broken=document.createElement("span");broken.className="broken-image";broken.textContent="[이미지 파일을 불러오지 못함: "+filename+"]";figure.replaceWith(broken)};
 img.addEventListener("error",fail,{once:true});
 if(/^https?:\/\//i.test(filename))img.src=filename;else if(filename.startsWith("/media/"))img.src=aonWikiVersionedAssetUrl(filename);else if(filename.startsWith("/"))img.src=new URL(filename,apiBase()).href;else if(/^[a-f0-9-]{36}$/i.test(filename))img.src=aonWikiMediaUrl(filename);
 else resolveWikiFile(filename).then(file=>{if(!imageFailed)img.src=file.url}).catch(fail);
}

function safeWikiStyle(raw) {
  const allowed = new Set([
    "color","background","background-color","font-size","font-weight","font-style",
    "text-align","text-decoration","text-transform","line-height","letter-spacing",
    "word-spacing","width","max-width","min-width","height","max-height","min-height",
    "margin","margin-left","margin-right","margin-top","margin-bottom","padding",
    "border","border-top","border-right","border-bottom","border-left",
    "border-color","border-top-color","border-right-color","border-bottom-color","border-left-color",
    "border-width","border-top-width","border-right-width","border-bottom-width","border-left-width",
    "border-style","border-top-style","border-right-style","border-bottom-style","border-left-style","border-radius","border-collapse",
    "float","clear","display","vertical-align","white-space","list-style-type",
    "image-rendering","object-fit","overflow","overflow-wrap","box-shadow","opacity"
  ]);
  const themeVariable = /^--aonwiki-table-(?:(?:bg|fg|border)-(?:light|dark)|auto-fg-(?:light|dark))$/;
  const safeColor = /^(?:#[0-9a-f]{3,8}|[a-z]{1,24}|(?:rgba?|hsla?)\([\d.%+\-/ ,]+\))$/i;
  const output = [];
  String(raw || "").split(";").forEach(entry => {
    const at = entry.indexOf(":");
    if (at < 1) return;
    const key = entry.slice(0, at).trim().toLowerCase();
    const value = entry.slice(at + 1).trim();
    const isThemeVariable = themeVariable.test(key);
    if ((!allowed.has(key) && !isThemeVariable) || !value || /url\s*\(|expression|javascript|@import|[<>{}]/i.test(value)) return;
    if (isThemeVariable && !safeColor.test(value)) return;
    output.push(key + ":" + value);
  });
  return output.join(";");
}
function parseWikiRgbColor(value){
 const match=String(value||"").match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
 if(!match)return null;
 return [Number(match[1]),Number(match[2]),Number(match[3]),match[4]===undefined?1:Number(match[4])];
}
function blendWikiColor(foreground,background){
 const alpha=Math.max(0,Math.min(1,foreground[3]??1));
 return [
  foreground[0]*alpha+background[0]*(1-alpha),
  foreground[1]*alpha+background[1]*(1-alpha),
  foreground[2]*alpha+background[2]*(1-alpha),
  1
 ];
}
function wikiRelativeLuminance(rgb){
 const channel=value=>{
  const normalized=Math.max(0,Math.min(255,value))/255;
  return normalized<=0.04045?normalized/12.92:Math.pow((normalized+0.055)/1.055,2.4);
 };
 return 0.2126*channel(rgb[0])+0.7152*channel(rgb[1])+0.0722*channel(rgb[2]);
}
function wikiContrastRatio(a,b){
 const first=wikiRelativeLuminance(a),second=wikiRelativeLuminance(b);
 return (Math.max(first,second)+0.05)/(Math.min(first,second)+0.05);
}
function getWikiEffectiveBackground(element){
 const ancestry=[];
 for(let node=element;node&&node!==document.documentElement;node=node.parentElement)ancestry.push(node);
 ancestry.reverse();
 let background=parseWikiRgbColor(getComputedStyle(document.body).backgroundColor);
 if(!background)background=document.documentElement.dataset.theme==="dark"?[17,19,21,1]:[255,255,255,1];
 for(const node of ancestry){
  if(node===document.body)continue;
  const layer=parseWikiRgbColor(getComputedStyle(node).backgroundColor);
  if(layer&&layer[3]>0)background=blendWikiColor(layer,background);
 }
 return background;
}
function hasAuthoredWikiTableColor(cell, table, wasAutoColor) {
 for(let node=cell;node;node=node.parentElement){
  if(!(node===cell&&wasAutoColor)){
   const inlineColor=node.style?.getPropertyValue("color");
   if(inlineColor&&inlineColor.trim())return true;
  }
  if(node===table)break;
 }
 return false;
}
function refreshWikiTableContrast(){ /* Namu_test-main owns table colors. */ }

function sanitizeNamuStylesheet(raw) {
  const allowedSelectorPart = /^(?:\*|[a-z][a-z0-9-]*|[.#][a-z_][a-z0-9_-]*)(?::(?:hover|focus|active|visited|first-child|last-child|only-child|nth-child\(\d+(?:n[+-]\d+)?\)|nth-of-type\(\d+(?:n[+-]\d+)?\)))?$/i;
  const rules = String(raw || "").replace(/\/\*[\s\S]*?\*\//g, "").match(/[^{}]+\{[^{}]*\}/g) || [];
  const safeRules = [];
  for (const rule of rules) {
    const brace = rule.indexOf("{");
    const selectorText = rule.slice(0, brace).trim();
    const declarations = safeWikiStyle(rule.slice(brace + 1, rule.lastIndexOf("}")));
    if (!declarations) continue;
    const selectors = selectorText.split(",").map(value => value.trim());
    if (!selectors.length || selectors.length > 20) continue;
    const safeSelectors = selectors.filter(selector => {
      const parts = selector.split(/\s*>\s*|\s+/).filter(Boolean);
      return parts.length > 0 && parts.length <= 8 && parts.every((part,index) =>
        allowedSelectorPart.test(part)
      );
    });
    if (!safeSelectors.length) continue;
    safeRules.push(safeSelectors.map(selector => {
      const parts = selector.split(/\s*>\s*|\s+/).filter(Boolean);
      return ".wiki-content " + selector;
    }).join(",") + "{" + declarations + "}");
  }
  return safeRules.join("\n");
}
function sanitizeNamuOutput(root, docTitle) {
  const allowedTags = new Set(("A ABBR B BDI BDO BLOCKQUOTE BR CAPTION CENTER CODE COL COLGROUP DD DEL DETAILS DIV DL DT EM FIGCAPTION FIGURE FONT FOOTNOTE_TITLE H1 H2 H3 H4 H5 H6 HR I IFRAME IMG INS KBD LI MARK OL P PRE Q RUBY RT RP S SAMP SMALL SPAN STRIKE STRONG STYLE SUB SUMMARY SUP TABLE TBODY TD TFOOT TH THEAD TR TT U UL VAR VIDEO AUDIO SOURCE").split(" "));
  const allowedAttrs = new Set(("alt allow allowfullscreen class colspan data-namumark-action fn_target frameborder height href id lang loading open referrerpolicy rel rowspan src style target title type width align valign controls loop muted poster start").split(" "));
  [...root.querySelectorAll("*")].forEach(node => {
    const tag = node.tagName;
    if (["SCRIPT","OBJECT","EMBED","FORM","INPUT","BUTTON","LINK","META"].includes(tag)) {
      node.remove();
      return;
    }
    if (!allowedTags.has(tag)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    if (tag === "STYLE") {
      node.textContent = sanitizeNamuStylesheet(node.textContent || "");
      return;
    }
    const parserAction = node.getAttribute("data-namumark-action") || node.getAttribute("onclick") || "";
    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || !allowedAttrs.has(name)) {
        node.removeAttribute(attr.name);
        return;
      }
      if (name === "style") {
        const style = safeWikiStyle(attr.value);
        if (style) node.setAttribute("style", style);
        else node.removeAttribute("style");
      }
      if ((name === "href" || name === "src" || name === "poster") && /^\s*(javascript|data|vbscript):/i.test(attr.value)) {
        node.removeAttribute(attr.name);
      }
    });
    if (tag === "IFRAME") {
      const src = node.getAttribute("src") || "";
      const embedHosts = new Set(["www.youtube.com","youtube.com","www.instagram.com","www.facebook.com","www.tiktok.com","twitframe.com","tv.kakao.com","tv.naver.com","embed.nicovideo.jp","player.vimeo.com"]);
      try {
        const embedUrl = new URL(src, location.href);
        if (embedUrl.protocol !== "https:" || !embedHosts.has(embedUrl.hostname)) {
          node.remove();
          return;
        }
        node.setAttribute("src", embedUrl.href);
        node.setAttribute("loading", "lazy");
        node.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        node.setAttribute("allowfullscreen", "");
      } catch {
        node.remove();
        return;
      }
    }
    if (tag === "A") {
      const legacyHeadingFold = /^javascript:namumark_heading_folding\('[a-f0-9_]+', this\);?$/i.test(parserAction);
      if (parserAction === "heading-fold" || legacyHeadingFold) {
        const heading = node.closest("h1,h2,h3,h4,h5,h6");
        const section = heading ? heading.nextElementSibling : null;
        if (section && section.id && section.id.includes("namumark_heading_")) {
          node.removeAttribute("href");
          node.removeAttribute("data-namumark-action");
          node.setAttribute("role", "button");
          node.setAttribute("tabindex", "0");
          const toggleSection = event => {
            event.preventDefault();
            const collapsed = section.style.display === "none";
            section.style.display = collapsed ? "block" : "none";
            node.textContent = collapsed ? "⊖" : "⊕";
            node.setAttribute("aria-expanded", String(collapsed));
          };
          node.setAttribute("aria-expanded", String(section.style.display !== "none"));
          node.addEventListener("click", toggleSection);
          node.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") toggleSection(event);
          });
        } else {
          node.removeAttribute("data-namumark-action");
        }
      }
      const href = node.getAttribute("href") || "";
      // Footnote markers are UI popups, never ordinary hash-navigation links.
      const footnoteTarget = node.getAttribute("fn_target") ||
        (href.startsWith("#") ? (() => { try { return decodeURIComponent(href.slice(1)); } catch { return href.slice(1); } })() : "");
      const isFootnoteMarker = node.classList.contains("wiki-fn-content") ||
        Boolean(node.querySelector?.('[id^="rfn-"], [id^="rfn_"]'));
      if (isFootnoteMarker && footnoteTarget) {
        node.setAttribute("data-wiki-footnote-target", footnoteTarget);
        // Keep the engine's original #footnote href and class.
        return;
      }
      if (href.startsWith("/edit_section/")) {
        node.remove();
        return;
      }
      if (href.startsWith("#")) {
        let anchor = href.slice(1);
        try { anchor = decodeURIComponent(anchor); } catch {}
        node.setAttribute("href", routeFor(docTitle, anchor));
        node.addEventListener("click", event => {
          event.preventDefault();
          history.replaceState(null, "", routeFor(docTitle, anchor));
          scrollToAnchor(anchor);
        });
      } else if (href.startsWith("/w/") || href.startsWith("/wiki/")) {
        const path = href.slice(href.startsWith("/w/") ? 3 : 6).split("#");
        let page = path[0], anchor = path[1] || "";
        try { page = decodeURIComponent(page); anchor = decodeURIComponent(anchor); } catch {}
        node.setAttribute("href", routeFor(page, anchor));
        node.addEventListener("click", event => { event.preventDefault(); navigateInternal(page + (anchor ? "#" + anchor : "")); });
      } else if (/^https?:\/\//i.test(href)) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      } else if (href.startsWith("/image/") || href.startsWith("/media/") || href.startsWith("/files/")) {
        node.setAttribute("href", apiBase() + href);
      }
    }
    if (tag === "IMG") {
      const src = node.getAttribute("src") || "";
      // Server-rendered media paths are relative to the Worker, while the wiki UI is hosted on GitHub Pages.
      if (src.startsWith("/image/") || src.startsWith("/media/") || src.startsWith("/files/")) node.setAttribute("src", new URL(src, apiBase() + "/").href);
      node.setAttribute("loading", "lazy");
      node.setAttribute("decoding", "async");
      node.addEventListener("error", () => {
        const label = document.createElement("span");
        label.className = "broken-image";
        label.textContent = "[이미지를 불러오지 못했습니다]";
        node.replaceWith(label);
      }, { once: true });
    }
  });
}
function enhanceFootnoteHover(root) {
  const closeOpenFootnotes = () => {
    document.querySelectorAll(".wiki-footnote-tooltip.visible").forEach(openTip => {
      openTip.classList.remove("visible", "mobile-fixed");
      openTip.style.left = "";
      openTip.style.top = "";
      openTip.style.bottom = "";
      openTip.closest(".wiki-footnote-trigger")?.classList.remove("tooltip-open");
    });
  };
  root.querySelectorAll('a[id*="rfn_"]').forEach(link => {
    if (link.classList.contains("wiki-footnote-trigger")) return;
    const targetId = link.getAttribute("data-wiki-footnote-target") || "";
    const noteElement = targetId
      ? [...root.querySelectorAll("[id]")].find(element => element.id === targetId + "_title")
      : null;
    const note = (link.getAttribute("title") || noteElement?.textContent || "").trim();
    if (!note) return;
    link.classList.add("wiki-footnote-trigger");
    const tooltipId = "wiki-footnote-tip-" + Math.random().toString(36).slice(2);
    link.setAttribute("aria-label", "각주 " + link.textContent.trim() + ": " + note);
    link.setAttribute("aria-describedby", tooltipId);
    link.setAttribute("role", "button");
    link.setAttribute("tabindex", "0");
    // Remove the fragment URL itself so mobile browsers cannot navigate to the footnote list.
    link.removeAttribute("href");
    const tooltip = document.createElement("span");
    tooltip.className = "wiki-footnote-tooltip";
    tooltip.id = tooltipId;
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = note;
    link.append(tooltip);
    link.removeAttribute("title");
    const show = () => {
      closeOpenFootnotes();
      tooltip.classList.add("visible");
      link.classList.add("tooltip-open");
      if (window.matchMedia("(max-width: 560px)").matches) {
        tooltip.classList.add("mobile-fixed");
        const anchor = link.getBoundingClientRect();
        const tip = tooltip.getBoundingClientRect();
        const margin = 12;
        const left = Math.max(margin, Math.min(
          anchor.left + anchor.width / 2 - tip.width / 2,
          window.innerWidth - tip.width - margin
        ));
        let top = anchor.top - tip.height - 9;
        if (top < margin) top = anchor.bottom + 9;
        if (top + tip.height > window.innerHeight - margin) {
          top = Math.max(margin, (window.innerHeight - tip.height) / 2);
        }
        tooltip.style.left = Math.round(left) + "px";
        tooltip.style.top = Math.round(top) + "px";
        tooltip.style.bottom = "auto";
      }
    };
    const hide = () => {
      tooltip.classList.remove("visible", "mobile-fixed");
      tooltip.style.left = "";
      tooltip.style.top = "";
      tooltip.style.bottom = "";
      link.classList.remove("tooltip-open");
    };
    link.addEventListener("mouseenter", show);
    link.addEventListener("mouseleave", () => {
      if (document.activeElement !== link && !window.matchMedia("(max-width: 560px)").matches) hide();
    });
    link.addEventListener("focus", show);
    link.addEventListener("blur", hide);
    // On touch screens, handle the press before the browser can apply any anchor behavior.
    link.addEventListener("pointerdown", event => {
      if (event.pointerType !== "touch") return;
      event.preventDefault();
      event.stopPropagation();
      show();
      link.focus({ preventScroll: true });
    }, { passive: false });
    link.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      show();
    });
    link.addEventListener("keydown", event => {
      if (event.key === "Escape") hide();
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        link.click();
      }
    });
  });
  if (!window.aonWikiFootnoteDismissBound) {
    window.aonWikiFootnoteDismissBound = true;
    document.addEventListener("click", event => {
      if (event.target.closest?.(".wiki-footnote-trigger")) return;
      closeOpenFootnotes();
    });
  }
}

function getExplicitWikiTextColor(element, root) {
  for (let node = element; node && node !== root; node = node.parentElement) {
    // Worker marks cells only when a foreground color was explicitly authored.
    // Use the computed theme-specific color for those cells, not the automatic
    // contrast variable that is injected into every table cell.
    if (node.hasAttribute?.("data-aonwiki-authored-fg")) {
      const authoredColor = getComputedStyle(node).color;
      if (authoredColor) return authoredColor;
    }
    const inlineColor = node.style?.getPropertyValue("color")?.trim();
    if (inlineColor && !inlineColor.includes("--aonwiki-table-auto-fg-")) return inlineColor;
    if (node.tagName === "FONT" && node.hasAttribute("color")) {
      const fontColor = String(node.getAttribute("color") || "").trim();
      if (fontColor) return fontColor;
    }
  }
  return "";
}
function hasExplicitWikiTextColor(element, root) {
  return Boolean(getExplicitWikiTextColor(element, root));
}
function applyFinalWikiTypographyAndLinkColors(root){
  if(!root)return;
  root.querySelectorAll(".wiki-macro-toc").forEach(toc=>{
    const summary=toc.querySelector(":scope > summary");
    const contents=toc.querySelector(":scope > details");
    if(!summary)return;
    summary.setAttribute("aria-expanded",String(toc.open));
    if(contents){
      if(!contents.id)contents.id="toc-contents-"+Math.random().toString(36).slice(2,9);
      summary.setAttribute("aria-controls",contents.id);
    }
    const syncExpanded=()=>summary.setAttribute("aria-expanded",String(toc.open));
    if(!toc.dataset.aonTocToggleBound){
      toc.addEventListener("toggle",syncExpanded);
      toc.dataset.aonTocToggleBound="true";
    }
  });
  root.dataset.aonFinalPresentation="applied";
}
function prepareServerRenderedMarkup(root,docTitle){
  root.classList.add("namumark-wasm-content");
  sanitizeNamuOutput(root,docTitle);
  decorateExternalLinks(root);
  const tableScrollSelector=".table_safe,.wiki-table-scroll,.wiki-table,.wiki-table-wrap";
  root.querySelectorAll("table").forEach(table=>{
    if(table.closest("td,th"))return;
    let floatHost=(table.style.float==="left"||table.style.float==="right")?table:null;
    if(!floatHost){
      for(let parent=table.parentElement;parent&&parent!==root;parent=parent.parentElement){
        const direction=(parent.style.float||"").toLowerCase();
        if(direction==="left"||direction==="right"){floatHost=parent;break}
        if(parent.matches(tableScrollSelector))break;
      }
    }
    if(floatHost){
      floatHost.classList.add(floatHost===table?"wiki-float-table":"wiki-float-host");
      // Keep following content beside the floated infobox. The document's
      // explicit [clearfix] marker is responsible for clearing the float.
      return;
    }
    let wrapper=table.parentElement?.closest(tableScrollSelector)||null;
    if(!wrapper){wrapper=document.createElement("div");wrapper.className="wiki-table-wrap";table.before(wrapper);wrapper.append(table);}
    else wrapper.classList.add("wiki-table-wrap");
    // Preserve widths and display modes authored by <tablewidth> / <tablealign=center>.
    if (!wrapper.style.getPropertyValue("display").trim()) wrapper.style.setProperty("display","block");
    if (!wrapper.style.getPropertyValue("width").trim()) wrapper.style.setProperty("width","100%");
    wrapper.style.setProperty("max-width","100%");
    wrapper.style.setProperty("min-width","0");
    wrapper.style.setProperty("overflow-x","auto");
    wrapper.style.setProperty("overflow-y","hidden");
    for(let parent=wrapper.parentElement;parent&&parent!==root;parent=parent.parentElement){
      if(parent.matches(tableScrollSelector)){
        parent.style.setProperty("overflow-x","visible");parent.style.setProperty("overflow-y","visible");parent.style.setProperty("min-width","0");
      }
    }
  });
  root.querySelectorAll(".wiki-fold,.wiki-macro-toc,.wiki-fold-content").forEach(element=>{
    element.style.setProperty("max-width","100%");element.style.setProperty("min-width","0");
  });
  refreshWikiTableContrast(root);
  root.classList.add("namumark-rendered");
   // Footnote previews are owned by Namu_test-main/interactions.js.
  applyFinalWikiTypographyAndLinkColors(root);
  if(window.katex){
    root.querySelectorAll('span[id*="opennamu_math_"]').forEach(element=>{
      try{window.katex.render(element.textContent||"",element,{throwOnError:false,strict:"ignore"})}
      catch(error){console.warn("KaTeX rendering skipped",error)}
    });
    root.querySelectorAll(".namu-latex-block").forEach(element=>{
      try{window.katex.render(element.textContent||"",element,{displayMode:true,throwOnError:false,strict:"ignore"})}
      catch(error){console.warn("LaTeX block rendering skipped",error)}
    });
  }
  if(window.hljs){
    root.querySelectorAll("pre code").forEach(code=>{
      const language=(code.className||"").trim().split(/\\s+/)[0];
      if(language&&!language.startsWith("language-"))code.classList.add("language-"+language);
      window.hljs.highlightElement(code);
    });
  }
}
let aonNamuWasmPromise = null;

async function getAonNamuWasm() {
 if(!aonNamuWasmPromise){
  aonNamuWasmPromise = import("./namumark-wasm.js").then(async mod => {
   await mod.initWasm();
   return mod;
  }).catch(error => {
   aonNamuWasmPromise = null;
   throw error;
  });
 }
 return aonNamuWasmPromise;
}

let aonNamuInteractionModulePromise = null;
const aonNamuInteractionInstances = new WeakMap();
async function activateAonWikiInteractions(root) {
 if(!root || !(root instanceof Element)) return;
 if(!aonNamuInteractionModulePromise) {
  aonNamuInteractionModulePromise = import("./Namu_test-main/interactions.js?v=20261114-single-footnote-preview-v1")
   .catch(error => { aonNamuInteractionModulePromise = null; throw error; });
 }
 try {
  const mod = await aonNamuInteractionModulePromise;
  let instance = aonNamuInteractionInstances.get(root);
  if(!instance) {
   instance = mod.setupWikiInteractions(root);
   aonNamuInteractionInstances.set(root, instance);
  } else {
   instance.reset();
  }
  instance.refresh();
 } catch(error) {
  console.warn("AonWiki NamuMark interactions could not be initialized:", error);
 }
}

async function renderClientParsedDocument(clientRender, target, docTitle) {
 const renderer = await getAonNamuWasm();
 const records = Array.isArray(clientRender?.records) ? clientRender.records : [];
 const lookup = new Map();
 const normalizedLookup = new Map();
 const normalizeLookupKey = name => {
  const raw=String(name||"").trim();
  if(/^(?:\uD30C\uC77C|file):/i.test(raw))return "file:"+raw.replace(/^(?:\uD30C\uC77C|file):/i,"").trim().toLocaleLowerCase();
  if(/^(?:\uBD84\uB958|category):/i.test(raw))return "category:"+raw.replace(/^(?:\uBD84\uB958|category):/i,"").trim().toLocaleLowerCase();
  return raw.toLocaleLowerCase();
 };
 for(const record of records){
  if(record && typeof record.title === "string" && record.title){
   const row={title:record.title,data:String(record.data||"")};
   lookup.set(record.title,row);
   normalizedLookup.set(normalizeLookupKey(record.title),row);
  }
 }
 const pageCount = Math.max(0,Math.min(100000,Number(clientRender?.pageCount)||0));
 const callbacks = {
  documentExists(name){
   const raw=String(name||"").trim();
   const key=raw.replace(/^(?:\uD30C\uC77C|file):/i,"");
   return lookup.has(raw) || lookup.has(key) || lookup.has("\uD30C\uC77C:"+key) || lookup.has("file:"+key) || lookup.has("category:"+key) || normalizedLookup.has(normalizeLookupKey(raw));
  },
  getDocumentContent(name){
   const raw=String(name||"").trim();
   const key=raw.replace(/^(?:\uD30C\uC77C|file):/i,"");
   const row=lookup.get(raw)||lookup.get(key)||lookup.get("\uD30C\uC77C:"+key)||lookup.get("file:"+key)||lookup.get("category:"+key)||normalizedLookup.get(normalizeLookupKey(raw));
   return row ? row.data : "";
  },
  getPagecount(){ return pageCount; }
 };
 const options = new renderer.RendererOptions();
 options.document_url_prefix = "/w/";
 options.document_query_prefix = "/w/";
 options.dark_class = "dark";
 const source=String(clientRender?.source||"");
 let html="";
 const categories=new Set();
 const backlinks=new Set();
 const parseResults=[];
 const consumeResult=result=>{
  parseResults.push(result);
  (result?.categories||[]).forEach(value=>{if(String(value||"").trim())categories.add(String(value).trim())});
  (result?.backlinks||[]).forEach(value=>{if(String(value||"").trim())backlinks.add(String(value).trim())});
  return result;
 };
 const result=consumeResult(renderer.renderWithMetadata(source,{options,callbacks}));
 html=result?.html||"";
 appendSanitizedServerHtml(target,html);
 rewriteClientNamuImageUrls(target, clientRender?.imageMap);
 prepareServerRenderedMarkup(target,docTitle);
 // Rebuild the TOC only when the engine did not emit one and the source
 // explicitly asks for it.
 ensureClientDocumentToc(target, source);
 target.dataset.renderEngine="namumark-wasm";
 for(const result of parseResults) {
  try { result.free?.(); } catch {}
 }
 return { categories:[...categories], backlinks:[...backlinks] };
}

function ensureClientDocumentToc(root, source, forcePrepend=false){
 if(!root || !/\[\s*목차\s*\]/i.test(String(source||""))) return;
 if(root.querySelector(".wiki-macro-toc")) return;
 const headings=[...root.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(h=>h.textContent.trim());
 if(!headings.length) return;
 const toc=document.createElement("details");
 toc.className="wiki-macro-toc";
 toc.open=true;
 const summary=document.createElement("summary");
 summary.textContent="목차";
 const contents=document.createElement("div");
 contents.className="wiki-toc-contents";
 const list=document.createElement("ol");
 let previousLevel=0;
 headings.forEach((heading,index)=>{
  const level=Number(heading.tagName.slice(1));
  const id=heading.id || ("aon-toc-heading-"+index);
  heading.id=id;
  const item=document.createElement("li");
  item.className="wiki-toc-item wiki-toc-level-"+level;
  const link=document.createElement("a");
  link.href="#"+encodeURIComponent(id);
  link.textContent=heading.textContent.trim().replace(/^\s*\d+(?:\.\d+)*\.\s*/,"");
  link.addEventListener("click",event=>{event.preventDefault();heading.scrollIntoView({behavior:"smooth",block:"start"});});
  item.append(link);
  list.append(item);
  previousLevel=level;
 });
 contents.append(list);
 toc.append(summary,contents);
 // Place the generated TOC at the beginning of the article when needed.
 if(forcePrepend || !root.querySelector(".wiki-macro-toc")) root.prepend(toc);
 applyFinalWikiTypographyAndLinkColors(root);
}
function rewriteClientNamuImageUrls(root, imageMap) {
 const map = imageMap && typeof imageMap === "object" ? imageMap : {};
 if (!root) return;
 const hashImageName = value => {
  let hash = 2166136261;
  const input = String(value || "");
  for (let i = 0; i < input.length; i++) {
   hash ^= input.charCodeAt(i);
   hash = Math.imul(hash, 16777619);
  }
  const parts = [];
  for (let i = 0; i < 7; i++) {
   const mixed = Math.imul(hash ^ (2654435769 * (i + 1)), 2246822507);
   parts.push((mixed >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 56);
 };
 const decode = value => {
  const area = document.createElement("textarea");
  area.innerHTML = String(value || "");
  return area.value;
 };
 const imageIdForFilename = rawValue => {
  let filename = decode(rawValue).replace(/^\uD30C\uC77C:|^file:/i, "").trim();
  try { filename = decodeURIComponent(filename); } catch {}
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : "jpg";
  return {
   filename,
   id: map["name:" + filename.toLocaleLowerCase()] || map[hashImageName(base).toLowerCase() + "." + ext]
  };
 };
 // Flatten the invalid nested-anchor output produced by
 // [[https://example|[[파일:icon.png|width=20]]]]. The external link must
 // remain the only anchor, with the file rendered directly as its image.
 root.querySelectorAll("a.wiki-link-external").forEach(external => {
  const fileAnchor = external.querySelector('a.wiki-link-internal[title^="\uD30C\uC77C:"],a.wiki-link-internal[title^="file:"]');
  if (!fileAnchor) return;
  const resolved = imageIdForFilename(fileAnchor.getAttribute("title") || "");
  const image = document.createElement("img");
  image.className = "wiki-image";
  image.src = resolved.id
   ? aonWikiMediaUrl(resolved.id,resolved.filename)
   : apiBase()+"/files/"+encodeURIComponent(resolved.filename)+"?aonwiki_image="+encodeURIComponent(resolved.filename);
  image.alt = resolved.filename;
  image.loading = "lazy";
  image.decoding = "async";
  const width = String(fileAnchor.textContent || "").match(/(?:^|[|&\s])width\s*=\s*(\d+(?:\.\d+)?)/i)?.[1];
  if (width) image.style.width = width + "px";
  fileAnchor.replaceWith(image);
 });
 root.querySelectorAll("img[src]").forEach(img => {
  const src = String(img.getAttribute("src") || "");
  const match = src.match(/\/image\/([a-f0-9]{56})\.([a-z0-9]+)\.cache_v[0-9]+(?:[?#].*)?$/i);
  if (match) {
   const id = map[(match[1] + "." + match[2]).toLowerCase()];
   if (id) img.setAttribute("src", aonWikiMediaUrl(id,match[1]+"."+match[2]));
   return;
  }
  const fileMatch = src.match(/\/files\/([^/?#]+)(?:[?#].*)?$/i);
  if (!fileMatch) return;
  let filename = fileMatch[1];
  try { filename = decodeURIComponent(filename); } catch {}
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : "jpg";
  const id = map["name:" + filename.toLocaleLowerCase()] || map[hashImageName(base).toLowerCase() + "." + ext];
  if (id) {
   img.setAttribute("src", aonWikiMediaUrl(id,filename));
   return;
  }
  resolveWikiFile(filename).then(file => {
   if (img.isConnected) img.setAttribute("src", file.url);
  }).catch(() => {});
 });
 // Match the SSR fallback produced when [[파일:...]] was emitted as a
 // missing-document anchor instead of an <img>. The same imageMap is already
 // returned by the Worker, so no extra database request is needed.
 root.querySelectorAll('a.wiki-link-internal[title^="\uD30C\uC77C:"]').forEach(anchor => {
  const raw = decode(anchor.getAttribute("title") || "").replace(/^\uD30C\uC77C:/i, "").trim();
  const dot = raw.lastIndexOf(".");
  const base = dot > 0 ? raw.slice(0, dot) : raw;
  const ext = dot > 0 ? raw.slice(dot + 1).toLowerCase() : "jpg";
  const id = map[(hashImageName(base).toLowerCase() + "." + ext)];
  if (!id) return;
  const span = document.createElement("span");
  span.className = "wiki-image-align-normal";
  const wrapper = document.createElement("span");
  wrapper.className = "wiki-image-wrapper";
  const link = document.createElement("a");
  link.href = aonWikiMediaUrl(id,raw);
  link.rel = "nofollow";
  const img = document.createElement("img");
  img.className = "wiki-image";
  img.src = aonWikiMediaUrl(id,raw);
  img.alt = raw;
  img.loading = "lazy";
  img.decoding = "async";
  link.append(img);
  wrapper.append(link);
  span.append(wrapper);
  anchor.replaceWith(span);
 });
}
function appendSanitizedServerHtml(target,html){
 const parsed=new DOMParser().parseFromString(String(html||""),"text/html");
 const allowedTags=new Set(["A","ABBR","B","BDI","BDO","BLOCKQUOTE","BR","CAPTION","CENTER","CODE","COL","COLGROUP","DD","DEL","DETAILS","DIV","DL","DT","EM","FIGCAPTION","FIGURE","FONT","FOOTNOTE_TITLE","H1","H2","H3","H4","H5","H6","HR","I","IFRAME","IMG","INS","KBD","LI","MARK","OL","P","PRE","Q","RUBY","RT","RP","S","SAMP","SMALL","SPAN","STRIKE","STRONG","SUB","SUMMARY","SUP","TABLE","TBODY","TD","TFOOT","TH","THEAD","TR","TT","U","UL","VAR","VIDEO","AUDIO","SOURCE"]);
 const blockedTags=new Set(["SCRIPT","STYLE","OBJECT","EMBED","FORM","INPUT","BUTTON","LINK","META","BASE","SVG","MATH","APPLET"]);
 const allowedFrameHosts=new Set(["www.youtube.com","youtube.com","www.instagram.com","www.facebook.com","www.tiktok.com","twitframe.com","tv.kakao.com","tv.naver.com","embed.nicovideo.jp","player.vimeo.com"]);
 const urlAttrs=new Set(["href","src","poster"]);
 const safeUrl=(value,tag,name)=>{
  const raw=String(value||"").trim();
  if(!raw||/^(?:javascript|vbscript|data|file|blob):/i.test(raw))return false;
  try{
   const parsed=new URL(raw,location.href);
   if(name==="href"){
    return raw.startsWith("#")||["http:","https:","mailto:","tel:"].includes(parsed.protocol);
   }
   if(tag==="IFRAME")return parsed.protocol==="https:"&&allowedFrameHosts.has(parsed.hostname);
   return parsed.protocol==="http:"||parsed.protocol==="https:"||raw.startsWith("/");
  }catch{return false}
 };
 const walk=root=>{
  for(const node of [...root.children]){
   const tag=node.tagName;
   if(blockedTags.has(tag)){node.remove();continue}
   if(!allowedTags.has(tag)){node.replaceWith(...node.childNodes);continue}
   for(const attr of [...node.attributes]){
    const name=attr.name.toLowerCase(),value=attr.value;
    if(name.startsWith("on")||name==="srcdoc"||name==="formaction"||name==="action"||name==="xlink:href"||!["alt","allow","allowfullscreen","class","colspan","data-namumark-action","fn_target","frameborder","height","href","id","lang","loading","open","poster","referrerpolicy","rel","rowspan","src","style","tabindex","target","title","type","width","align","valign","controls","loop","muted"].includes(name)){node.removeAttribute(attr.name);continue}
    if(urlAttrs.has(name)&&!safeUrl(value,tag,name)){node.removeAttribute(attr.name);continue}
   }
   if(tag==="IFRAME"){
    const src=node.getAttribute("src")||"";
    if(!safeUrl(src,tag,"src")){node.remove();continue}
    node.setAttribute("loading","lazy");node.setAttribute("referrerpolicy","strict-origin-when-cross-origin");node.setAttribute("allowfullscreen","");
   }
   if(tag==="A"){
    const href=node.getAttribute("href")||"";
    if(/^https?:\/\//i.test(href)){node.setAttribute("target","_blank");node.setAttribute("rel","noopener noreferrer")}
   }
   if(node.hasAttribute("id")&&/^(?:__proto__|constructor|prototype|location|top|parent|frames|self|opener|name|length)$/i.test(node.getAttribute("id")||""))node.removeAttribute("id");
   if(node.hasAttribute("name"))node.removeAttribute("name");
   walk(node);
  }
 };
 walk(parsed.body);
 const fragment=document.createDocumentFragment();
 while(parsed.body.firstChild)fragment.appendChild(parsed.body.firstChild);
 target.replaceChildren(fragment);
}
const serverRenderVersions = new WeakMap();
async function renderNamuMarkup(source, target, docTitle = currentTitle || "대문") {
  if (!target || !(target instanceof Element)) throw new TypeError("SSR 대상 요소가 필요합니다.");
  const version = (serverRenderVersions.get(target) || 0) + 1;
  serverRenderVersions.set(target, version);
  target.setAttribute("aria-busy", "true");
  try {
    const data = await api("/api/render", {
      method: "POST",
      body: JSON.stringify({
        title: String(docTitle || "미리보기").slice(0, 120),
        content: String(source || "")
      })
    });
    if (serverRenderVersions.get(target) !== version) return;
    let clientMetadata = null;
    if (data.clientRender) {
      const staging = document.createElement("article");
      clientMetadata = await renderClientParsedDocument(data.clientRender, staging, docTitle);
      if (serverRenderVersions.get(target) !== version) return;
      target.replaceChildren(...staging.childNodes);
      // renderClientParsedDocument prepares the temporary article. Mirror the
      // exact document-root classes on the preview host after moving its nodes.
      target.classList.remove("namumark-content-host", "wiki-content");
      target.classList.add("namumark-wasm-content", "namumark-rendered");
      target.dataset.namumarkWasm = "true";
    } else {
      appendSanitizedServerHtml(target,data.html);
      rewriteClientNamuImageUrls(target,data.imageMap);
      prepareServerRenderedMarkup(target, docTitle);
      // The normal GET document route applies this same TOC fallback after SSR.
      ensureClientDocumentToc(target, source, true);
    }
    target.classList.remove("namumark-content-host", "wiki-content");
    target.classList.add("namumark-wasm-content", "namumark-rendered");
    target.dataset.namumarkWasm = "true";
    await activateAonWikiInteractions(target);
    if (serverRenderVersions.get(target) !== version) return;
    target.dataset.renderEngine = data.engine || (data.clientRender ? "namumark-client" : "namumark-worker");
    const serverMetadata = data.metadata || {};
    return {
      ...serverMetadata,
      categories: Array.isArray(serverMetadata.categories) && serverMetadata.categories.length
        ? serverMetadata.categories
        : (clientMetadata?.categories || []),
      backlinks: Array.isArray(serverMetadata.backlinks) && serverMetadata.backlinks.length
        ? serverMetadata.backlinks
        : (clientMetadata?.backlinks || [])
    };
  } catch (error) {
    if (serverRenderVersions.get(target) !== version) return;
    target.replaceChildren();
    const message = document.createElement("p");
    message.className = "wiki-engine-warning";
    message.textContent = "서버 문서 렌더링에 실패했습니다: " + String(error.message || error);
    target.append(message);
    throw error;
  } finally {
    if (serverRenderVersions.get(target) === version) target.removeAttribute("aria-busy");
  }
}
async function loadRecentChanges(pushRoute=true){
 const requestId=++pageNavigationSequence;
 if(pushRoute)history.pushState(null,"","#/recent");
 currentTitle="최근 변경";currentContent="";
 $("home-view").hidden=true;$("document-view").hidden=false;$("editor-view").hidden=true;
 $("home").classList.remove("active");$("new").classList.remove("active");
 $("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;$("delete-page").hidden=true;$("heading-edit").hidden=true;$("backlinks-tab").hidden=true;$("discussion-tab").hidden=true;
 $("title").textContent="최근 변경";$("crumb").textContent="최근 변경";$("message").textContent="";
 const article=$("article");article.replaceChildren();
 try{
  const data=await api("/api/recent");if(requestId!==pageNavigationSequence)return;const changes=data.changes||[];
  if(!changes.length){addText(article,"p","아직 편집 기록이 없습니다.").className="empty-list";return}
  const list=document.createElement("div");list.className="recent-change-list";
  changes.forEach(change=>{const row=document.createElement("div");row.className="recent-change-row";const link=document.createElement("a");link.href=routeFor(change.title);link.textContent=change.title;link.onclick=e=>{e.preventDefault();openPage(change.title)};const meta=addText(row,"span",[(change.editor||"알 수 없음"),change.created_at?new Date(change.created_at).toLocaleString("ko-KR"):"",change.summary||""].filter(Boolean).join(" · "));row.append(link,meta);list.append(row)});article.append(list);
 }catch(error){if(requestId===pageNavigationSequence)addText(article,"p",error.message).className="empty-list"}
}
async function loadBacklinks(title,pushRoute=true){
 const requestId=++pageNavigationSequence;
 title=String(title||"").trim();if(!title)return;
 if(pushRoute)history.pushState(null,"","#/backlinks/"+encodeURIComponent(title));
 currentTitle=title;currentContent="";
 $("home-view").hidden=true;$("document-view").hidden=false;$("editor-view").hidden=true;
 $("home").classList.remove("active");$("new").classList.remove("active");
 $("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;$("delete-page").hidden=true;$("heading-edit").hidden=true;$("backlinks-tab").hidden=true;$("backlinks-tab").hidden=true;
 $("title").textContent=title+" — 역링크";$("crumb").textContent=title+" — 역링크";$("message").textContent="";
 const article=$("article");article.replaceChildren();
 try{
  const data=await api("/api/backlinks?title="+encodeURIComponent(title));if(requestId!==pageNavigationSequence)return;const backlinks=data.backlinks||[];
  addText(article,"p","‘"+title+"’ 문서를 링크한 문서 목록입니다.");
  if(!backlinks.length){addText(article,"p","이 문서를 링크한 문서가 없습니다.").className="empty-list";return}
  const list=document.createElement("div");list.className="backlink-list";
  backlinks.forEach(page=>{const row=document.createElement("div");row.className="backlink-row";const link=document.createElement("a");link.href=routeFor(page.title);link.textContent=page.title;link.onclick=e=>{e.preventDefault();openPage(page.title)};const meta=addText(row,"span",page.count+"회 참조");row.append(link,meta);list.append(row)});article.append(list);
 }catch(error){if(requestId===pageNavigationSequence)addText(article,"p",error.message).className="empty-list"}
}


function discussionDate(value){
 const date=value?new Date(value):null;
 return date&&!Number.isNaN(date.getTime())?date.toLocaleString("ko-KR"):"시간 정보 없음";
}
function discussionText(host,value,className="discussion-body",docTitle="토론"){
 const box=document.createElement("div");
 box.className=className+" wiki-content discussion-wiki-content discussion-render-pending";
 box.setAttribute("aria-busy","true");
 const pending=document.createElement("span");
 pending.className="discussion-render-pending-label";
 pending.setAttribute("role","status");
 pending.textContent="토론 내용을 불러오는 중…";
 box.append(pending);
 host.append(box);
 const source=String(value||"");
 renderNamuMarkup(source,box,docTitle).then(()=>{
  box.classList.remove("discussion-render-pending");
 }).catch(error=>{
  box.classList.remove("discussion-render-pending");
  box.replaceChildren();
  const fallback=document.createElement("p");
  fallback.className="discussion-render-warning";
  fallback.textContent="토론 내용을 문법으로 표시하지 못했습니다: "+String(error?.message||error);
  box.append(fallback);
 }).finally(()=>{
  box.removeAttribute("aria-busy");
 });
 return box;
}
function prepareDiscussionView(title,route,pushRoute){
 currentDiscussionView=true;
 const requestId=++pageNavigationSequence;
 if(pushRoute)history.pushState(null,"",route);
 breadcrumbTrail=[];
 $("home-view").hidden=true;$("document-view").hidden=false;$("editor-view").hidden=true;
 document.body.classList.remove("editor-active");
 $("home").classList.remove("active");
 $("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;
 $("file-manager").hidden=true;$("delete-page").hidden=true;
 $("heading-edit").hidden=true;$("page-protection").hidden=true;$("official-document").hidden=true;
 $("backlinks-tab").hidden=true;$("discussion-tab").hidden=true;
 $("template-status").hidden=true;$("protection-status").hidden=true;$("protection-notice").hidden=true;
 $("title").textContent=title;$("crumb").textContent=title;$("message").textContent="";
 $("article").replaceChildren();
 window.scrollTo({top:0,behavior:"auto"});
 loadGlobalRail();
 return requestId;
}
function makeDiscussionNotice(host,text){
 const notice=document.createElement("p");
 notice.className="discussion-empty";
 notice.textContent=text;
 host.append(notice);
 return notice;
}
function discussionLink(title,label){
 const link=document.createElement("a");
 link.href=routeFor(title);link.textContent=label||title;
 link.addEventListener("click",event=>{event.preventDefault();openPage(title)});
 return link;
}
function buildDiscussionCreateForm(pageTitle=""){
 const form=document.createElement("form");
 form.className="discussion-create-form";
 form.hidden=true;
 const heading=addText(form,"h3","새 토론 시작");
 heading.className="discussion-form-heading";
 const titleLabel=document.createElement("label");
 titleLabel.className="discussion-field";
 titleLabel.append(document.createTextNode("토론 제목"));
 const titleInput=document.createElement("input");
 titleInput.type="text";titleInput.maxLength=120;titleInput.required=true;
 titleInput.placeholder="토론 주제를 입력하세요.";
 titleLabel.append(titleInput);
 const pageLabel=document.createElement("label");
 pageLabel.className="discussion-field";
 pageLabel.append(document.createTextNode("연결할 문서 (선택)"));
 const pageInput=document.createElement("input");
 pageInput.type="text";pageInput.maxLength=120;pageInput.value=pageTitle;
 pageInput.placeholder="예: AonWiki";
 if(pageTitle)pageInput.readOnly=true;
 pageLabel.append(pageInput);
 const bodyLabel=document.createElement("label");
 bodyLabel.className="discussion-field";
 bodyLabel.append(document.createTextNode("토론 내용"));
 const bodyEditor=createDiscussionSyntaxEditor({
  required:true,maxLength:10000,rows:6,
  placeholder:"토론을 시작하게 된 이유와 논의할 내용을 작성하세요."
 });
 const bodyInput=bodyEditor.textarea;
 bodyLabel.append(bodyEditor.wrap);
 const footer=document.createElement("div");footer.className="discussion-form-actions";
 const cancel=document.createElement("button");cancel.type="button";cancel.className="title-button";cancel.textContent="취소";
 const submit=document.createElement("button");submit.type="submit";submit.className="primary-button";submit.textContent="토론 생성";
 cancel.addEventListener("click",()=>{form.hidden=true;});
 footer.append(cancel,submit);
 const status=addText(form,"p","");status.className="discussion-form-status";
 form.append(titleLabel,pageLabel,bodyLabel,footer,status);
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  submit.disabled=true;status.textContent="토론을 생성하고 있습니다…";
  try{
   const result=await api("/api/discussions",{method:"POST",body:JSON.stringify({title:titleInput.value,pageTitle:pageInput.value,body:bodyInput.value})});
   await loadDiscussionDetail(result.id,true);
   loadGlobalRail();
  }catch(error){status.textContent=error.message;submit.disabled=false}
 });
 return form;
}
let lastDiscussionListState={pageTitle:"",q:"",status:"all"};
async function loadDiscussionList(pushRoute=true,pageTitle="",filters={}){
 const query=String(filters.q||"").trim().slice(0,80);
 lastDiscussionListState={pageTitle:String(pageTitle||""),q:query,status:filters.status==="open"||filters.status==="closed"?filters.status:"all"};
 const status=filters.status==="open"||filters.status==="closed"?filters.status:"all";
 const title=pageTitle?pageTitle+" — 문서 토론":"최근 토론";
 document.title=title+" - AonWiki";
 const routeParams=new URLSearchParams();
 if(pageTitle)routeParams.set("title",pageTitle);
 if(query)routeParams.set("q",query);
 if(status!=="all")routeParams.set("status",status);
 const route="#/discussions"+(routeParams.toString()?"?"+routeParams.toString():"");
 const requestId=prepareDiscussionView(title,route,pushRoute);
 const article=$("article");
 const head=document.createElement("div");head.className="discussion-page-heading";
 const copy=document.createElement("div");
 addText(copy,"p","AONWIKI COMMUNITY").className="discussion-eyebrow";
 addText(copy,"h2",title);
 addText(copy,"p",pageTitle?"이 문서에 연결된 토론을 확인하고 의견을 나눌 수 있습니다.":"최근 활동이 있는 토론을 검색하고 의견을 나눌 수 있습니다.").className="discussion-intro";
 head.append(copy);
 const actions=document.createElement("div");actions.className="discussion-page-actions";
 const create=document.createElement("button");create.type="button";create.className="primary-button";create.textContent="새 토론 시작";
 const form=buildDiscussionCreateForm(pageTitle);
 create.addEventListener("click",()=>{form.hidden=!form.hidden;if(!form.hidden)form.querySelector("input")?.focus()});
 actions.append(create);head.append(actions);article.append(head,form);
 const listWrap=document.createElement("section");listWrap.className="discussion-list-section";
 const listTitle=addText(listWrap,"h3","토론 목록");listTitle.className="discussion-section-title";
 const totalLabel=addText(listTitle,"span","");totalLabel.className="discussion-total";
 const toolbar=document.createElement("form");toolbar.className="discussion-search-toolbar";
 const search=document.createElement("input");search.type="search";search.maxLength=80;search.value=query;search.placeholder="토론 제목 또는 본문 검색";search.setAttribute("aria-label","토론 검색어");
 const statusLabel=document.createElement("label");statusLabel.className="discussion-filter-label";
 const statusSelect=document.createElement("select");statusSelect.setAttribute("aria-label","토론 상태");
 [["all","전체 토론"],["open","진행 중"],["closed","종료"]].forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;option.selected=status===value;statusSelect.append(option)});
 statusLabel.append(statusSelect);
 const submit=document.createElement("button");submit.type="submit";submit.className="discussion-search-submit";submit.textContent="검색";
 toolbar.append(search,statusLabel,submit);
 toolbar.addEventListener("submit",event=>{event.preventDefault();loadDiscussionList(true,pageTitle,{q:search.value,status:statusSelect.value})});
 listWrap.append(toolbar);
 const list=document.createElement("div");list.className="discussion-list";listWrap.append(list);article.append(listWrap);
 const params=new URLSearchParams({limit:"40",offset:"0",status});if(pageTitle)params.set("title",pageTitle);if(query)params.set("q",query);
 try{
  const data=await api("/api/discussions?"+params.toString());if(requestId!==pageNavigationSequence)return;
  const topics=data.discussions||[];const discussionTotal=Number(data.total||0);totalLabel.textContent=discussionTotal.toLocaleString("ko-KR")+"개";
  if(!topics.length){makeDiscussionNotice(list,query||status!=="all"?"검색 조건에 맞는 토론이 없습니다. 검색어 또는 상태 필터를 변경해 보세요.":pageTitle?"이 문서에 등록된 토론이 없습니다. 첫 토론을 시작해 보세요.":"아직 등록된 토론이 없습니다. 첫 토론을 시작해 보세요.");return}
  const appendTopics=items=>items.forEach(topic=>{
   const row=document.createElement("article");row.className="discussion-list-item";
   const main=document.createElement("div");main.className="discussion-list-main";
   const link=document.createElement("a");link.href="#/discussion/"+topic.id;link.textContent=topic.title;link.addEventListener("click",event=>{event.preventDefault();loadDiscussionDetail(topic.id,true)});
   main.append(link);
   const meta=addText(main,"div","#"+topic.id+" · "+(topic.author||"알 수 없음")+" · "+discussionDate(topic.last_post_at));meta.className="discussion-list-meta";
   if(topic.page_title){meta.append(document.createTextNode(" · "));meta.append(discussionLink(topic.page_title,"문서: "+topic.page_title))}
   const side=document.createElement("div");side.className="discussion-list-side";
   const state=addText(side,"span",topic.status==="closed"?"종료":"진행 중");state.className="discussion-state "+(topic.status==="closed"?"is-closed":"is-open");
   const count=addText(side,"span","답글 "+Number(topic.reply_count||0));count.className="discussion-reply-count";
   side.append(state,count);row.append(main,side);list.append(row);
  });
  appendTopics(topics);let discussionOffset=topics.length;
  if(discussionOffset<discussionTotal){
   const more=document.createElement("button");more.type="button";more.className="discussion-load-more";more.textContent="이전 토론 더 보기";
   more.addEventListener("click",async()=>{
    if(more.disabled)return;more.disabled=true;more.textContent="불러오는 중…";
    try{const nextParams=new URLSearchParams({limit:"40",offset:String(discussionOffset),status});if(pageTitle)nextParams.set("title",pageTitle);if(query)nextParams.set("q",query);
     const next=await api("/api/discussions?"+nextParams.toString());if(requestId!==pageNavigationSequence)return;
     const rows=next.discussions||[];appendTopics(rows);discussionOffset+=rows.length;
     if(discussionOffset>=Number(next.total??discussionTotal)||!rows.length)more.remove();else{more.disabled=false;more.textContent="이전 토론 더 보기"}
    }catch(error){more.disabled=false;more.textContent="다시 시도";makeDiscussionNotice(list,error.message)}
   });listWrap.append(more);
  }
 }catch(error){makeDiscussionNotice(list,error.message)}
}
function buildDiscussionPostCard(post,index=0,docTitle="토론",allowQuote=true){
 const card=document.createElement("article");card.className="discussion-post-card";
 const header=document.createElement("div");header.className="discussion-post-header";
 const number=addText(header,"span",String(index+1));number.className="discussion-post-number";
 const author=addText(header,"strong",post.author||"알 수 없음");
 const meta=addText(header,"span",discussionDate(post.created_at)+(post.edited_at?" · 수정됨":""));
 header.append(author,meta);card.append(header);
 if(Number(post.is_deleted)){discussionText(card,"삭제된 답글입니다.","discussion-body is-deleted",docTitle);return card}
 discussionText(card,post.body,"discussion-body",docTitle);
 const actions=document.createElement("div");actions.className="discussion-post-actions";
 if(allowQuote){
  const quote=document.createElement("button");quote.type="button";quote.className="text-action";quote.textContent="인용";
  quote.addEventListener("click",()=>{
   const textarea=document.querySelector(".discussion-reply-form textarea");if(!textarea)return;
   const quoted=String(post.body||"").split(/\r?\n/).map(line=>"> "+line).join("\n");
   const prefix=textarea.value.trim()?"\n\n":"";
   const addition=prefix+"> "+String(post.author||"사용자")+"님의 의견\n"+quoted+"\n\n";
   const position=textarea.selectionStart??textarea.value.length;
   textarea.value=textarea.value.slice(0,position)+addition+textarea.value.slice(position);
   textarea.focus();const caret=position+addition.length;textarea.setSelectionRange(caret,caret);
   textarea.dispatchEvent(new Event("input",{bubbles:true}));
  });
  actions.append(quote);
 }
 if(isWikiAdmin||currentDisplayName()===post.author){
  const edit=document.createElement("button");edit.type="button";edit.className="text-action";edit.textContent="수정";
  edit.addEventListener("click",()=>{
   const existing=card.querySelector(".discussion-inline-edit-form");
   if(existing){existing.remove();return}
   const editorForm=buildDiscussionBodyEditForm({
    heading:"답글 수정",value:post.body,maxLength:6000,rows:5,
    onSave:async nextBody=>{
     await api("/api/discussion/post",{method:"PATCH",body:JSON.stringify({id:post.id,body:nextBody})});
     await loadDiscussionDetail(post.discussion_id,false);
    }
   });
   card.append(editorForm);
   editorForm.querySelector("textarea")?.focus();
  });
  const remove=document.createElement("button");remove.type="button";remove.className="text-action danger-text";remove.textContent="삭제";
  remove.addEventListener("click",async()=>{if(!confirm("이 답글을 삭제할까요?"))return;try{await api("/api/discussion/post?id="+post.id,{method:"DELETE"});await loadDiscussionDetail(post.discussion_id,false);loadGlobalRail()}catch(error){alert(error.message)}});
  actions.append(edit,remove);
 }
 if(actions.childElementCount)card.append(actions);
 return card;
}
async function loadDiscussionDetail(id,pushRoute=true){
 id=Number(id);if(!Number.isSafeInteger(id)||id<1){loadDiscussionList(pushRoute);return}
 if(!loggedInName&&!sessionStorage.getItem(TOKEN_SETTING)&&!currentVisitorIp){
  try{const identity=await api("/api/me");currentVisitorIp=String(identity.ip||"")}catch{}
 }
 const requestId=prepareDiscussionView("토론 #"+id,"#/discussion/"+id,pushRoute);
 document.title="토론 #"+id+" - AonWiki";
 const article=$("article");
 const loading=addText(article,"p","토론 내용을 불러오는 중입니다…");loading.className="loading";
 try{
  const data=await api("/api/discussion?id="+id);
  if(requestId!==pageNavigationSequence)return;
  const topic=data.discussion,posts=data.posts||[];
  article.replaceChildren();
  const head=document.createElement("div");head.className="discussion-page-heading";
  const copy=document.createElement("div");
  const eyebrow=addText(copy,"p","DISCUSSION #"+topic.id);eyebrow.className="discussion-eyebrow";
  addText(copy,"h2",topic.title);
  const meta=addText(copy,"p",(topic.author||"알 수 없음")+" · 시작 "+discussionDate(topic.created_at)+" · 답글 "+Number(topic.reply_count||0));meta.className="discussion-intro";
  head.append(copy);
  const state=addText(head,"span",topic.status==="closed"?"종료된 토론":"진행 중인 토론");
  state.className="discussion-state "+(topic.status==="closed"?"is-closed":"is-open");
  article.append(head);
  const nav=document.createElement("div");nav.className="discussion-breadcrumb";
   const back=document.createElement("a");
   const backParams=new URLSearchParams();
   const backTitle=lastDiscussionListState.pageTitle||topic.page_title||"";
   if(backTitle)backParams.set("title",backTitle);
   if(lastDiscussionListState.q)backParams.set("q",lastDiscussionListState.q);
   if(lastDiscussionListState.status!=="all")backParams.set("status",lastDiscussionListState.status);
   back.href="#/discussions"+(backParams.toString()?"?"+backParams.toString():"");
   back.textContent="‹ 토론 목록";
   back.addEventListener("click",event=>{event.preventDefault();loadDiscussionList(true,lastDiscussionListState.pageTitle||topic.page_title||"",lastDiscussionListState)});
  nav.append(back);
  if(topic.page_title){nav.append(document.createTextNode(" · "));nav.append(discussionLink(topic.page_title,"연결 문서: "+topic.page_title))}
  article.append(nav);
  const original=document.createElement("section");original.className="discussion-original";
  const originalHeader=document.createElement("div");originalHeader.className="discussion-post-header";
  addText(originalHeader,"strong",topic.author||"알 수 없음");
  addText(originalHeader,"span",discussionDate(topic.created_at)+" · 원문");
  original.append(originalHeader);discussionText(original,topic.body,"discussion-body","토론:"+String(topic.title||topic.page_title||id));article.append(original);
  const controls=document.createElement("div");controls.className="discussion-topic-actions";
  if(isWikiAdmin||currentDisplayName()===topic.author){
   const editTopic=document.createElement("button");editTopic.type="button";editTopic.className="title-button";editTopic.textContent="토론 수정";
   editTopic.addEventListener("click",()=>{
    const existing=article.querySelector(".discussion-inline-edit-form.topic-edit-form");
    if(existing){existing.remove();return}
    const editorForm=buildDiscussionBodyEditForm({
     heading:"토론 원문 수정",titleValue:topic.title,value:topic.body,maxLength:10000,rows:7,
     onSave:async(nextBody,nextTitle)=>{
      await api("/api/discussion",{method:"PATCH",body:JSON.stringify({id:topic.id,action:"edit",title:nextTitle,body:nextBody})});
      await loadDiscussionDetail(topic.id,false);loadGlobalRail();
     }
    });
    editorForm.classList.add("topic-edit-form");
    original.after(editorForm);
    editorForm.querySelector("textarea")?.focus();
   });
   controls.append(editTopic);
   const statusButton=document.createElement("button");statusButton.type="button";statusButton.className="title-button";
   statusButton.textContent=topic.status==="closed"?"토론 다시 열기":"토론 종료";
   statusButton.addEventListener("click",async()=>{
    const action=topic.status==="closed"?"reopen":"close";
    try{await api("/api/discussion",{method:"PATCH",body:JSON.stringify({id:topic.id,action})});await loadDiscussionDetail(topic.id,false);loadGlobalRail()}
    catch(error){alert(error.message)}
   });
   controls.append(statusButton);
   if(isWikiAdmin||Number(topic.reply_count)===0){
    const remove=document.createElement("button");remove.type="button";remove.className="title-button danger-button";remove.textContent="토론 삭제";
    remove.addEventListener("click",async()=>{
     if(!confirm("토론을 삭제할까요? 삭제한 토론은 목록에서 숨겨집니다."))return;
     try{await api("/api/discussions?id="+topic.id,{method:"DELETE"});loadDiscussionList(true,topic.page_title||"");loadGlobalRail()}
     catch(error){alert(error.message)}
    });
    controls.append(remove);
   }
  }
  if(controls.childElementCount)article.append(controls);
  const replySection=document.createElement("section");replySection.className="discussion-replies";
  const replyHeading=addText(replySection,"h3","답글");replyHeading.className="discussion-section-title";
  const replyList=document.createElement("div");replyList.className="discussion-post-list";
  if(!posts.length)makeDiscussionNotice(replyList,"아직 답글이 없습니다. 첫 의견을 남겨 보세요.");
  else posts.forEach((post,index)=>replyList.append(buildDiscussionPostCard(post,index,"토론:"+String(topic.title||topic.page_title||id),topic.status==="open")));
  replySection.append(replyList);article.append(replySection);
  if(topic.status==="open"){
   const form=document.createElement("form");form.className="discussion-reply-form";
   addText(form,"h3","답글 작성").className="discussion-form-heading";
   const replyEditor=createDiscussionSyntaxEditor({required:true,maxLength:6000,rows:5,placeholder:"토론에 대한 의견을 작성하세요."});
   const textarea=replyEditor.textarea;
   const footer=document.createElement("div");footer.className="discussion-form-actions";
   const submit=document.createElement("button");submit.type="submit";submit.className="primary-button";submit.textContent="답글 등록";
   footer.append(submit);const status=addText(form,"p","");status.className="discussion-form-status";
   form.append(replyEditor.wrap,footer,status);form.addEventListener("submit",async event=>{
    event.preventDefault();submit.disabled=true;status.textContent="답글을 등록하고 있습니다…";
    try{await api("/api/discussion/reply",{method:"POST",body:JSON.stringify({id:topic.id,body:textarea.value})});await loadDiscussionDetail(topic.id,false);loadGlobalRail()}
    catch(error){status.textContent=error.message;submit.disabled=false}
   });
   article.append(form);
  }else{
   makeDiscussionNotice(article,"이 토론은 종료되었습니다. 작성자 또는 위키 관리자가 다시 열면 답글을 작성할 수 있습니다.");
  }
 }catch(error){
  if(requestId!==pageNavigationSequence)return;
  article.replaceChildren();makeDiscussionNotice(article,error.message);
 }
}
async function loadGlobalRail(){
 const pagesHost=$("rail-recent-pages"),talkHost=$("rail-recent-discussions");
 if(!pagesHost||!talkHost)return;
 try{
  const [recent,talks]=await Promise.all([
   api("/api/recent").catch(()=>({changes:[]})),
   api("/api/discussions?limit=6").catch(()=>({discussions:[]}))
  ]);
  pagesHost.replaceChildren();talkHost.replaceChildren();
  const changes=(recent.changes||[]).slice(0,15);
  if(!changes.length){const li=addText(pagesHost,"li","아직 변경 기록이 없습니다.");li.className="rail-muted"}
  changes.forEach(item=>{
   const li=document.createElement("li");
   const link=document.createElement("a");link.href=routeFor(item.title);link.textContent=item.title;
   link.addEventListener("click",event=>{event.preventDefault();openPage(item.title)});
   li.append(link);pagesHost.append(li);
  });
  const discussions=talks.discussions||[];
  if(!discussions.length){const li=addText(talkHost,"li","아직 토론이 없습니다.");li.className="rail-muted"}
  discussions.slice(0,6).forEach(item=>{
   const li=document.createElement("li");
   const link=document.createElement("a");link.href="#/discussion/"+item.id;link.textContent=item.title;
   link.addEventListener("click",event=>{event.preventDefault();loadDiscussionDetail(item.id,true)});
   li.append(link);talkHost.append(li);
  });
 }catch(error){console.warn("활동 패널을 불러오지 못했습니다.",error)}
}


const SPECIAL_PAGE_CONFIG={
 missing:{title:"작성에 필요한 문서",description:"다른 문서에서 링크하고 있지만 아직 만들어지지 않은 문서입니다.",type:"missing"},
 orphan:{title:"고립된 문서",description:"다른 문서에서 내부 링크로 참조되지 않는 문서입니다.",type:"orphan"},
 "orphan-categories":{title:"고립된 분류",description:"어떤 문서에서도 분류 링크로 참조하지 않는 분류입니다.",type:"orphan-categories"},
 uncategorized:{title:"분류가 되지 않은 문서",description:"분류 링크가 등록되지 않은 문서입니다.",type:"uncategorized"},
 old:{title:"편집된 지 오래된 문서",description:"가장 오랫동안 수정되지 않은 문서부터 표시합니다.",type:"old"},
 short:{title:"내용이 짧은 문서",description:"본문 원문이 200자 이하인 문서입니다.",type:"short"},
 long:{title:"내용이 긴 문서",description:"본문 원문이 10,000자 이상인 문서입니다.",type:"long"},
 blocked:{title:"차단 내역",description:"AonWiki에서 확인할 수 있는 회원 차단 이력입니다.",type:"blocked"},
 license:{title:"라이선스",description:"AonWiki의 문서 및 소프트웨어 이용 안내입니다.",type:"license"}
};
function formatSpecialDate(value){
 if(!value)return "수정 기록 없음";
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"수정 기록 없음":date.toLocaleDateString("ko-KR");
}
async function loadSpecialPage(type,pushRoute=true){
 const config=SPECIAL_PAGE_CONFIG[type];
 if(!config){loadHome(true);return}
 const requestId=prepareDiscussionView(config.title,"#/special/"+encodeURIComponent(type),pushRoute);
 document.title=config.title+" - AonWiki";
 const article=$("article");
 const heading=document.createElement("div");heading.className="special-page-heading";
 const copy=document.createElement("div");
 addText(copy,"p","AONWIKI · SPECIAL PAGES").className="discussion-eyebrow";
 addText(copy,"h2",config.title);
 addText(copy,"p",config.description).className="discussion-intro";
 heading.append(copy);article.append(heading);
 if(type==="license"){
  const toolbar=document.createElement("div");toolbar.className="special-list-toolbar";
  if(isWikiAdmin){
   const editButton=document.createElement("button");editButton.type="button";editButton.className="button";editButton.textContent="라이선스 편집";
   editButton.onclick=async()=>{
    try{
     const data=await api("/api/page?title="+encodeURIComponent("라이선스"));
     editPage("라이선스",data.page?.content||"");
    }catch{
     await editPage("", "");
     $("editor-title").value="라이선스";
     $("editor-title").readOnly=true;
     $("editor-title").disabled=false;
     editorOriginalTitle="";
     editorIsNew=true;
     $("editor-heading").textContent="라이선스 작성";
     $("editor-breadcrumb").textContent="라이선스 작성";
    }
   };
   toolbar.append(editButton);
  }
  if(isWikiAdmin)article.append(toolbar);
  try{
   const data=await api("/api/page?title="+encodeURIComponent("라이선스"));
   if(data.page?.content){
    const contentHost=document.createElement("div");contentHost.className="wiki-content";
    await renderNamuMarkup(data.page.content,contentHost,"라이선스");
    article.append(contentHost);return;
   }
  }catch{}
  const panel=document.createElement("section");panel.className="special-info-panel";
  addText(panel,"h3","이용 전 확인 사항");
  addText(panel,"p","AonWiki의 공통 라이선스 정책은 현재 이 문서에서 별도로 지정되어 있지 않습니다. 개별 문서에 저작권·라이선스 표시가 있다면 해당 표시를 먼저 확인하세요.");
  addText(panel,"p","별도 허가나 라이선스가 확인되지 않은 자료는 재배포 및 2차 이용이 허용된다고 임의로 판단하지 마세요.");
  const repoLink=document.createElement("a");repoLink.href="https://github.com/hiakdhs323-cmd/aon";repoLink.target="_blank";repoLink.rel="noopener noreferrer";repoLink.textContent="AonWiki 소스 코드 저장소";
  panel.append(repoLink);article.append(panel);return;
 }
 const status=document.createElement("p");status.className="loading";status.textContent="특수 문서 데이터를 불러오는 중입니다…";article.append(status);
 try{
  const data=await api("/api/special-pages?type="+encodeURIComponent(type));
  if(requestId!==pageNavigationSequence)return;
  status.remove();
  if(data.available===false){
   const panel=document.createElement("section");panel.className="special-info-panel special-info-unavailable";
   addText(panel,"h3","이 기능은 아직 연결되지 않았습니다.");
   addText(panel,"p",data.message||"현재 표시할 수 있는 내역이 없습니다.");
   article.append(panel);return;
  }
  const toolbar=document.createElement("div");toolbar.className="special-list-toolbar";
  const count=addText(toolbar,"strong",Number(data.total||0).toLocaleString("ko-KR")+"개 문서");count.className="special-result-count";
  const filter=document.createElement("input");filter.type="search";filter.placeholder="목록에서 검색";filter.setAttribute("aria-label","특수 문서 목록 검색");
  toolbar.append(filter);article.append(toolbar);
  const list=document.createElement("div");list.className="special-result-list";article.append(list);
  const items=data.items||[];
  const renderItems=()=>{
   const query=filter.value.trim().toLocaleLowerCase();
   const visible=items.filter(item=>String(item.title||"").toLocaleLowerCase().includes(query));
   list.replaceChildren();
   if(!visible.length){
    const empty=addText(list,"p",items.length?"검색 결과가 없습니다.":"표시할 문서가 없습니다.");
    empty.className="discussion-empty";return;
   }
   visible.forEach((item,index)=>{
    const row=document.createElement("div");row.className="special-result-row";
    const number=addText(row,"span",String(index+1));number.className="special-result-number";
    const main=document.createElement("div");main.className="special-result-main";
    const link=document.createElement("a");link.href=routeFor(item.title);link.textContent=item.title;
    link.addEventListener("click",event=>{event.preventDefault();openPage(item.title)});
    main.append(link);
    const meta=[];
    if(type==="missing"){meta.push("링크 "+Number(item.count||0)+"회",item.source?"예시: "+item.source:"")}
    else if(type==="short"||type==="long"){meta.push("원문 "+Number(item.characters||0).toLocaleString("ko-KR")+"자")}
    else meta.push(formatSpecialDate(item.updated_at));
    if(meta.filter(Boolean).length){const detail=addText(main,"span",meta.filter(Boolean).join(" · "));detail.className="special-result-meta"}
    row.append(main);list.append(row);
   });
  };
  filter.addEventListener("input",renderItems);renderItems();
 }catch(error){
  if(requestId!==pageNavigationSequence)return;
  status.textContent=error.message;status.className="discussion-empty";
 }
}
function closeSpecialMenu(){
 const menu=$("special-menu"),toggle=$("special-menu-toggle");
 if(!menu||!toggle)return;
 menu.hidden=true;toggle.setAttribute("aria-expanded","false");
}
function initSpecialMenu(){
 const toggle=$("special-menu-toggle"),menu=$("special-menu");
 if(!toggle||!menu)return;
 toggle.addEventListener("click",event=>{
  event.stopPropagation();
  const open=menu.hidden;
  menu.hidden=!open;toggle.setAttribute("aria-expanded",String(open));
 });
 menu.addEventListener("click",event=>{
  const button=event.target.closest("[data-special-action],[data-special-type]");
  if(!button)return;
  closeSpecialMenu();
  const type=button.dataset.specialType,action=button.dataset.specialAction;
  if(type){loadSpecialPage(type,true);return}
  if(action==="board"){loadDiscussionList(true);return}
  if(action==="upload"){
   $("file").click();return;
  }
  if(action==="random"){openRandomPage();return}
  if(action==="license"){loadSpecialPage("license",true);return}
 });
 document.addEventListener("click",event=>{
  if(!event.target.closest(".special-dropdown"))closeSpecialMenu();
 });
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!menu.hidden){closeSpecialMenu();toggle.focus()}
 });
}
initSpecialMenu();

const CATEGORY_INITIALS = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
function categoryInitial(value) {
  const first = Array.from(String(value || "").trim())[0] || "#";
  const code = first.codePointAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return CATEGORY_INITIALS[Math.floor((code - 0xac00) / 588)] || "#";
  if (/[a-z]/i.test(first)) return first.toLocaleUpperCase("en");
  if (/[0-9]/.test(first)) return "0–9";
  return "#";
}
function compareCategoryInitial(a, b) {
  const rank = value => {
    const hangul = CATEGORY_INITIALS.indexOf(value);
    if (hangul >= 0) return hangul;
    if (/^[A-Z]$/.test(value)) return 100 + value.charCodeAt(0);
    if (value === "0–9") return 200;
    return 300;
  };
  return rank(a) - rank(b) || a.localeCompare(b, "ko");
}
function renderCategoryGroups(host, items, options = {}) {
  const { getName = item => item.name || item.title || "", getTitle = item => item.title || ("분류:" + getName(item)), getCount = item => item.count, emptyText = "표시할 항목이 없습니다." } = options;
  host.replaceChildren();
  if (!items.length) {
    addText(host, "p", emptyText).className = "empty-list";
    return;
  }
  const groups = new Map();
  for (const item of items) {
    const name = String(getName(item) || "").trim();
    if (!name) continue;
    const initial = categoryInitial(name);
    if (!groups.has(initial)) groups.set(initial, []);
    groups.get(initial).push(item);
  }
  const grid = document.createElement("div");
  grid.className = "category-groups";
  [...groups.entries()].sort((a, b) => compareCategoryInitial(a[0], b[0])).forEach(([initial, entries]) => {
    const section = document.createElement("section");
    section.className = "category-group";
    const heading = addText(section, "h3", initial);
    heading.className = "category-group-heading";
    const list = document.createElement("ul");
    list.className = "category-group-items";
    entries.sort((a, b) => String(getName(a)).localeCompare(String(getName(b)), "ko"));
    entries.forEach(item => {
      const row = document.createElement("li");
      row.className = "category-entry";
      const link = document.createElement("a");
      const title = String(getTitle(item));
      link.href = routeFor(title);
      link.textContent = getName(item);
      link.addEventListener("click", event => {
        event.preventDefault();
        openPage(title);
      });
      row.append(link);
      const count = getCount(item);
      if (count !== undefined && count !== null) {
        const countLabel = addText(row, "span", Number(count).toLocaleString("ko-KR") + "개");
        countLabel.className = "category-entry-count";
      }
      list.append(row);
    });
    section.append(list);
    grid.append(section);
  });
  host.append(grid);
}
async function loadCategoryIndex(pushRoute = true) {
  const requestId=++pageNavigationSequence;
  if (pushRoute) history.pushState(null, "", "#/categories");
  currentTitle = "분류 목록";
  document.title = "분류 목록 - AonWiki";
  currentContent = "";
  $("home-view").hidden = true;
  $("document-view").hidden = false;
  $("editor-view").hidden = true;
  document.body.classList.remove("editor-active");
  $("home").classList.remove("active");
  $("new").classList.remove("active");
  $("edit").hidden = true;
  $("history").hidden = true;
  $("upload").hidden = true;
  $("delete-page").hidden = true;
  $("heading-edit").hidden = true;
  $("backlinks-tab").hidden = true;
  $("title").textContent = "분류 목록";
  $("crumb").textContent = "분류 목록";
  $("message").textContent = "";
  const article = $("article");
  article.replaceChildren();
  try {
    const data = await api("/api/categories");
    if(requestId!==pageNavigationSequence)return;
    const categories = data.categories || [];
    const intro = document.createElement("div");
    intro.className = "category-index-heading";
    addText(intro, "p", "분류 찾아보기").className = "category-eyebrow";
    addText(intro, "p", "문서의 주제와 성격에 따라 분류를 모아 놓은 목록입니다.").className = "category-index-intro";
    article.append(intro);
    const summary = document.createElement("div");
    summary.className = "category-summary-line";
    addText(summary, "strong", Number(data.total ?? categories.length).toLocaleString("ko-KR") + "개 분류");
    addText(summary, "span", "이름의 첫 글자 순으로 정렬");
    article.append(summary);
    const list = document.createElement("div");
    list.className = "category-index-list";
    article.append(list);
    renderCategoryGroups(list, categories, {
      getName: category => category.name,
      getTitle: category => "분류:" + category.name,
      getCount: category => category.count,
      emptyText: "아직 등록된 분류가 없습니다. 문서에 [[분류:분류명]]을 추가하면 여기에 나타납니다."
    });
  } catch (error) {
    if(requestId===pageNavigationSequence)addText(article, "p", error.message).className = "empty-list";
  }
}
function openRandomPage(){const requestId=++pageNavigationSequence;api("/api/pages").then(data=>{if(requestId!==pageNavigationSequence)return;const pages=(data.pages||[]).filter(page=>page.title!=="대문"&&!/^(?:분류|category):/i.test(page.title));if(!pages.length)throw Error("이동할 문서가 없습니다.");openPage(pages[Math.floor(Math.random()*pages.length)].title)}).catch(error=>{if(requestId===pageNavigationSequence)$("message").textContent=error.message})}

async function renderCategoryPage(name, offset = 0, articleHost = $("article"), requestId = pageNavigationSequence) {
  const pageSize = 100;
  const data = await api("/api/category?name=" + encodeURIComponent(name) + "&limit=" + pageSize + "&offset=" + Math.max(0, Number(offset) || 0));
  if (requestId !== pageNavigationSequence) return;
  const article = articleHost;
  article.replaceChildren();

  const meta = document.createElement("div");
  meta.className = "category-page-meta";
  addText(meta, "span", "분류 문서").className = "category-eyebrow";
  if (data.categoryUpdatedAt) {
    const updated = addText(meta, "time", "최근 수정 " + new Date(data.categoryUpdatedAt).toLocaleDateString("ko-KR"));
    updated.dateTime = data.categoryUpdatedAt;
  }
  article.append(meta);

  const parents = Array.isArray(data.parentCategories) ? data.parentCategories : [];
  if (parents.length) {
    const parentBar = document.createElement("div");
    parentBar.className = "category-parent-line";
    addText(parentBar, "span", "상위 분류");
    const parentLinks = document.createElement("div");
    parentLinks.className = "category-parent-links";
    parents.forEach(parent => {
      const link = document.createElement("a");
      link.href = routeFor("분류:" + parent);
      link.textContent = parent;
      link.addEventListener("click", event => {
        event.preventDefault();
        openPage("분류:" + parent);
      });
      parentLinks.append(link);
    });
    parentBar.append(parentLinks);
    article.append(parentBar);
  }

  const description = String(data.description || "").trim();
  if (description) {
    const descriptionHost = document.createElement("div");
    descriptionHost.className = "category-description wiki-content";
    article.append(descriptionHost);
    await renderNamuMarkup(description, descriptionHost, "분류:" + name);
    if(requestId!==pageNavigationSequence)return;
  }

  const subcategories = Array.isArray(data.subcategories) ? data.subcategories : [];
  const subheading = document.createElement("div");
  subheading.className = "category-section-heading";
  addText(subheading, "h2", "하위 분류");
  addText(subheading, "span", subcategories.length.toLocaleString("ko-KR") + "개 분류");
  article.append(subheading);
  const subHost = document.createElement("div");
  subHost.className = "category-subcategories";
  article.append(subHost);
  renderCategoryGroups(subHost, subcategories, {
    getName: item => item.name,
    getTitle: item => item.title,
    emptyText: "하위 분류가 없습니다."
  });

  const pages = Array.isArray(data.pages) ? data.pages : [];
  const total = Number(data.total) || 0;
  const pageHeading = document.createElement("div");
  pageHeading.className = "category-section-heading category-document-heading";
  addText(pageHeading, "h2", "이 분류에 속하는 문서");
  addText(pageHeading, "span", total.toLocaleString("ko-KR") + "개 문서");
  article.append(pageHeading);

  if (!pages.length) {
    addText(article, "p", "이 분류에 등록된 문서가 없습니다.").className = "empty-list";
  } else {
    const pageHost = document.createElement("div");
    pageHost.className = "category-document-list";
    article.append(pageHost);
    renderCategoryGroups(pageHost, pages, {
      getName: item => item.title,
      getTitle: item => item.title,
      emptyText: "문서가 없습니다."
    });
  }

  if (total > pageSize) {
    const pagination = document.createElement("nav");
    pagination.className = "category-pagination";
    pagination.setAttribute("aria-label", "분류 문서 페이지");
    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "button";
    previous.textContent = "이전";
    previous.disabled = offset <= 0;
    previous.addEventListener("click", () => renderCategoryPage(name, Math.max(0, offset - pageSize))
      .catch(error => { $("message").textContent = error.message; }));
    const range = addText(pagination, "span", (offset + 1).toLocaleString("ko-KR") + "–" + Math.min(offset + pages.length, total).toLocaleString("ko-KR") + " / " + total.toLocaleString("ko-KR"));
    const next = document.createElement("button");
    next.type = "button";
    next.className = "button";
    next.textContent = "다음";
    next.disabled = offset + pages.length >= total;
    next.addEventListener("click", () => renderCategoryPage(name, offset + pageSize)
      .catch(error => { $("message").textContent = error.message; }));
    pagination.append(previous, range, next);
    article.append(pagination);
  }
}
function renderDocumentMetadata(article, metadata, docTitle) {
 const normalizeCategoryName=value=>{
  let name=String(value||"").trim();
  while(/^(?:분류|category):/i.test(name))name=name.replace(/^(?:분류|category):/i,"").trim();
  return name;
 };
 const categories=[...new Set((metadata?.categories||[]).map(normalizeCategoryName).filter(Boolean))];
 const shell=article.closest(".article")||article;
 shell.querySelector(":scope > .wiki-categories")?.remove();
 if(!categories.length)return;
 const footer=document.createElement("div");
 footer.className="wiki-categories";
 categories.forEach((name,index)=>{
  if(index){
   const separator=document.createElement("span");
   separator.className="wiki-categories-separator";
   separator.textContent=" | ";
   separator.setAttribute("aria-hidden","true");
   footer.append(separator);
  }
  const link=document.createElement("a");
  link.href=routeFor("분류:"+name);
  link.textContent=index===0?"분류:"+name:name;
  link.addEventListener("click",event=>{event.preventDefault();openPage("분류:"+name)});
  footer.append(link);
 });
 shell.prepend(footer);
}

async function loadPage(title,pushRoute=true,anchor=""){
 currentDiscussionView=false;
 title=String(title||"").trim();if(!title||title==="대문"){showHome(pushRoute);return}
 const requestId=++pageNavigationSequence;
 if(pushRoute){
  const existing=breadcrumbTrail.lastIndexOf(title);
  if(existing>=0)breadcrumbTrail=breadcrumbTrail.slice(0,existing+1);
  else breadcrumbTrail.push(title);
  history.pushState(null,"",routeFor(title,anchor));
 }else if(!breadcrumbTrail.length||breadcrumbTrail[breadcrumbTrail.length-1]!==title){
  const existing=breadcrumbTrail.lastIndexOf(title);
  if(existing>=0)breadcrumbTrail=breadcrumbTrail.slice(0,existing+1);
  else breadcrumbTrail=[title];
 }
 renderBreadcrumbTrail();
 currentTitle=title;$("search-view").hidden=true;$("home-view").hidden=true;$("document-view").hidden=false;$("editor-view").hidden=true;document.body.classList.remove("editor-active");$("home").classList.remove("active");$("new").classList.remove("active");$("edit").hidden=false;$("history").hidden=false;$("upload").hidden=false;$("delete-page").hidden=!isWikiAdmin;$("file-manager").hidden=!loggedInName;$("backlinks-tab").hidden=false;$("discussion-tab").hidden=true;
 const displayTitle=/^(?:category|분류):/i.test(title)?"분류:"+title.replace(/^(?:category|분류):/i,""):title;
 document.title=displayTitle+" - AonWiki";
 const targets=ensureDocumentViewTargets();
  targets.article.classList.remove("wiki-content","wiki","namumark-wasm-content","namumark-rendered");
  targets.article.classList.add("namumark-content-host");
 const templateStatus=$("template-status");
 if(templateStatus)templateStatus.hidden=true;
 setArticleTitleLink(targets.title,title,displayTitle);targets.crumb.textContent=displayTitle;targets.message.textContent="문서를 불러오는 중입니다…";targets.article.replaceChildren();
 if(targets.protection)targets.protection.hidden=true;
 if(targets.headingEdit)targets.headingEdit.hidden=false;
 window.scrollTo({top:0,behavior:"auto"});
 try{
  if (/^(?:category|분류):/i.test(title)) {
   const name=title.replace(/^(?:category|분류):/i,"");
   $("message").textContent="";
   const staging=document.createElement("article");
   await renderCategoryPage(name,0,staging,requestId);
   if(requestId!==pageNavigationSequence)return;
    $("article").replaceChildren(...staging.childNodes);
   $("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;$("delete-page").hidden=true;$("page-protection").hidden=true;$("official-document").hidden=true;$("heading-edit").hidden=true;$("backlinks-tab").hidden=true;
   return;
  }
  const data=await getRenderedDocument(title);
  if(requestId!==pageNavigationSequence)return;
  if(!data.page){
   currentContent="";currentProtection={level:"none",reason:""};currentOfficial=false;currentCanEdit=null;
   $("protection-status").hidden=true;$("protection-notice").hidden=true;$("protection-notice").replaceChildren();$("page-protection").hidden=true;$("official-document").hidden=true;
   $("message").replaceChildren();
   const notice=document.createElement("div");notice.className="missing-page-panel";
   const title=document.createElement("strong");title.textContent="아직 작성되지 않은 문서입니다.";
   const detail=document.createElement("p");detail.textContent="이 문서를 직접 만들 수 있습니다. 비로그인 편집은 IP로 기록됩니다.";
   const create=document.createElement("button");create.type="button";create.className="primary-button missing-page-create";create.textContent="이 문서 지금 만들기";
   create.addEventListener("click",()=>{const missingTitle=currentTitle;editPage("","");$("editor-title").value=missingTitle;});
   notice.append(title,detail,create);$("message").append(notice);
   $("edit").textContent="문서 만들기";
   $("edit").onclick=()=>{const missingTitle=currentTitle;editPage("","");$("editor-title").value=missingTitle;};
   $("history").hidden=true;$("upload").hidden=true;$("delete-page").hidden=true;$("backlinks-tab").hidden=true;$("discussion-tab").hidden=true;
   return;
  }
  if(data.page.title&&data.page.title!==title){history.replaceState(null,"",routeFor(data.page.title,anchor));return loadPage(data.page.title,false,anchor)}
  if(templateStatus)templateStatus.hidden=!/^(?:틀|template):/i.test(data.page.title||title);
  $("discussion-tab").hidden=false;
  currentContent=data.page.content||"";
  currentProtection={level:data.page.protectionLevel||"none",reason:data.page.protectionReason||""};
  currentCanEdit=typeof data.page.canEdit==="boolean" ? data.page.canEdit : null;
  syncDocumentEditControls();
  $("delete-page").hidden=!isWikiAdmin||currentProtection.level==="admin";
  const protectionStatus=$("protection-status"),protectionNotice=$("protection-notice");
  if(currentProtection.level==="admin"){
   protectionStatus.hidden=false;protectionStatus.textContent="관리자 편집 보호";protectionStatus.title=currentProtection.reason||"일반 회원은 편집할 수 없으며 관리자만 편집할 수 있습니다.";
   protectionNotice.hidden=false;protectionNotice.replaceChildren();
   const strong=document.createElement("strong");strong.textContent="이 문서는 관리자 편집 보호 상태입니다.";
   const detail=document.createElement("span");detail.textContent=" 일반 회원은 편집할 수 없으며 관리자만 편집할 수 있습니다.";
   setAonIconLabel(strong,"shield-lock","이 문서는 관리자 편집 보호 상태입니다.");
  protectionNotice.append(strong,detail);
  }else if(currentProtection.level==="registered"){
   protectionStatus.hidden=false;protectionStatus.textContent="회원 편집 보호";protectionStatus.title=currentProtection.reason||"로그인한 회원만 편집할 수 있습니다.";
   protectionNotice.hidden=false;protectionNotice.replaceChildren();
   const strong=document.createElement("strong");strong.textContent="이 문서는 회원 편집 보호 상태입니다.";
   const detail=document.createElement("span");detail.textContent=" 문서 편집은 로그인한 회원만 할 수 있습니다.";
   setAonIconLabel(strong,"lock","이 문서는 회원 편집 보호 상태입니다.");
  protectionNotice.append(strong,detail);
  }else{
   protectionStatus.hidden=true;protectionStatus.textContent="";protectionStatus.title="";
   protectionNotice.hidden=true;protectionNotice.replaceChildren();
  }
  if(currentProtection.level!=="none"&&currentProtection.reason){
   const reason=document.createElement("div");reason.className="protection-reason";
   const label=document.createElement("strong");label.textContent="보호 사유: ";
   reason.append(label,document.createTextNode(currentProtection.reason));protectionNotice.append(reason);
  }
  currentOfficial=Boolean(data.page.official);
  currentCanEdit=data.page.canEdit;
  const templateStatusAfterLoad=$("template-status");
  if(templateStatusAfterLoad) templateStatusAfterLoad.hidden=!(currentOfficial&&/^(?:틀|template):/i.test(title));
  $("page-protection").hidden=!isWikiAdmin;
  $("official-document").hidden=!isWikiAdmin;
  $("official-document").textContent=currentOfficial?"공식 문서 해제":"공식 문서 지정";
  $("message").textContent="";
  const redirect=currentContent.match(/^\s*#redirect\s+(?:\[\[)?([^\]\n]+?)(?:\]\])?\s*$/im);
  if(redirect&&redirect[1].trim()!==title){loadPage(redirect[1].trim(),true);return}
  syncDocumentEditControls();
  const staging=document.createElement("article");
  let renderMetadata = data.metadata || { categories: [], backlinks: [] };
  if(data.clientRender){
   renderMetadata = await renderClientParsedDocument(data.clientRender,staging,data.page.title||title);
  }else{
   appendSanitizedServerHtml(staging,data.html);
   rewriteClientNamuImageUrls(staging,data.imageMap);
   prepareServerRenderedMarkup(staging,displayTitle);
   ensureClientDocumentToc(staging, data.page.content || "", true);
  }
  if(requestId!==pageNavigationSequence)return;
  const article=$("article");
   article.classList.remove("namumark-content-host");
  article.replaceChildren(...staging.childNodes);
  article.classList.add("namumark-wasm-content");
  article.dataset.namumarkWasm = "true";
  article.classList.add("namumark-rendered");
  await activateAonWikiInteractions(article);
  if(requestId!==pageNavigationSequence)return;
  renderDocumentMetadata(article, renderMetadata, data.page.title||title);
  article.dataset.renderEngine=data.engine||staging.dataset.renderEngine||"worker-ssr";
  requestAnimationFrame(()=>{
   if(requestId!==pageNavigationSequence)return;
   if(anchor)scrollToAnchor(anchor);
   else window.scrollTo({top:0,behavior:"auto"});
  });
 }catch(error){
  if(requestId!==pageNavigationSequence)return;
  $("message").textContent=error.message;$("article").replaceChildren()
 }
}
$("cancel").addEventListener("click",()=>{if($("dialog").open)$("dialog").close()});
$("dialog").addEventListener("click",event=>{if(event.target===$("dialog"))$("dialog").close()});
function showDialog(title,fields,onSave,label="저장"){
 $("save").hidden=false;
 $("dialog-title").textContent=title;const body=$("dialog-body");body.replaceChildren();
 for(const field of fields){addText(body,"label",field.label);const input=document.createElement(field.multiline?"textarea":"input");input.id=field.id;input.value=field.value||"";if(field.type)input.type=field.type;if(field.placeholder)input.placeholder=field.placeholder;body.append(input)}
 $("dialog-status").textContent="";$("save").textContent=label;$("dialog").showModal();$("save").onclick=async()=>{try{await onSave()}catch(error){$("dialog-status").textContent=error.message}}
}
async function openEditRequests(){
 if(!isWikiAdmin)return;
 const dialog=$("dialog"),body=$("dialog-body"),status=$("dialog-status"),save=$("save");
 $("dialog-title").textContent="편집 요청 관리";save.hidden=true;body.replaceChildren();
 status.textContent="대기 중인 요청을 불러오는 중입니다…";if(!dialog.open)dialog.showModal();
 try{
  const data=await api("/api/edit-requests");body.replaceChildren();
  const requests=data.requests||[];
  if(!requests.length){const empty=addText(body,"p","현재 대기 중인 편집 요청이 없습니다.");empty.className="dialog-empty-state";}
  else{
   const list=document.createElement("div");list.className="edit-request-list";
   requests.forEach(item=>{
    const card=document.createElement("article");card.className="edit-request-card";
    addText(card,"h3","#"+item.id+" · "+item.page_title);
    const meta=addText(card,"p",(item.requester||"알 수 없음")+" · "+new Date(item.created_at).toLocaleString("ko-KR"));meta.className="edit-request-meta";
    if(item.summary){const summary=addText(card,"p",item.summary);summary.className="edit-request-summary";}
    const details=document.createElement("details");details.className="edit-request-source";
    addText(details,"summary","제안한 전체 문서 원문 보기");
    const pre=addText(details,"pre",item.proposed_content||"");details.append(pre);card.append(details);
    const actions=document.createElement("div");actions.className="edit-request-actions";
    const reject=document.createElement("button");reject.type="button";reject.className="is-reject";reject.textContent="반려";
    const accept=document.createElement("button");accept.type="button";accept.className="is-accept";accept.textContent="승인 및 반영";
    reject.addEventListener("click",async()=>{
     reject.disabled=true;accept.disabled=true;status.textContent="요청을 반려하는 중입니다…";
     try{await api("/api/edit-request",{method:"PATCH",body:JSON.stringify({id:item.id,action:"reject"})});await openEditRequests();}
     catch(error){status.textContent=error.message;reject.disabled=false;accept.disabled=false}
    });
    accept.addEventListener("click",async()=>{
     if(!confirm("이 편집 요청의 원문을 문서에 반영할까요?"))return;
     reject.disabled=true;accept.disabled=true;status.textContent="요청을 승인하고 문서에 반영하는 중입니다…";
     try{
      const result=await api("/api/edit-request",{method:"PATCH",body:JSON.stringify({id:item.id,action:"accept"})});
      if(result.title===currentTitle)await loadPage(currentTitle,false);
      await openEditRequests();status.textContent="편집 요청 #"+item.id+"을 승인했습니다.";
     }catch(error){status.textContent=error.message;reject.disabled=false;accept.disabled=false}
    });
    actions.append(reject,accept);card.append(actions);list.append(card);
   });
   body.append(list);
  }
  status.textContent=requests.length?requests.length+"건의 대기 요청":"";
 }catch(error){body.replaceChildren();status.textContent=error.message}
}
$("edit-requests").addEventListener("click",openEditRequests);
function openLogin(){
 let mode="login";
 showDialog("로그인",[{id:"auth-username",label:"아이디",placeholder:"2~20자"},{id:"auth-password",label:"비밀번호",type:"password",placeholder:"8자 이상"}],async()=>{
  const username=$("auth-username").value.trim(),password=$("auth-password").value;
  const data=await api("/api/"+mode,{method:"POST",body:JSON.stringify({username,password})});
  if(mode==="register"){$("dialog-status").textContent=data.message+" 로그인 화면으로 돌아가 로그인하세요.";return}
  sessionStorage.setItem(TOKEN_SETTING,data.token);sessionStorage.setItem(NAME_SETTING,data.username);loggedInName=data.username;$("dialog").close();await refreshIdentity();
  if(document.body.classList.contains("editor-active"))return;if(currentTitle)loadPage(currentTitle,false);else loadHome()
 }, "로그인");
 const toggle=document.createElement("button");toggle.type="button";toggle.className="button";toggle.textContent="계정 만들기";toggle.style.marginTop="10px";
 toggle.onclick=()=>{mode=mode==="login"?"register":"login";$("dialog-title").textContent=mode==="login"?"로그인":"회원가입";$("save").textContent=mode==="login"?"로그인":"가입하기";toggle.textContent=mode==="login"?"계정 만들기":"로그인으로 돌아가기"};
 $("dialog-body").append(toggle)
}
$("login").onclick=async()=>{
 if(loggedInName){
  try{await api("/api/logout",{method:"POST"})}catch{}
  sessionStorage.removeItem(TOKEN_SETTING);sessionStorage.removeItem(NAME_SETTING);loggedInName="";isWikiAdmin=false;currentRole="anonymous";
  await refreshIdentity();readRoute();return
 }
 openLogin()
};
$("change-password").onclick=()=>{
 if(!loggedInName||currentRole!=="user"){openLogin();return}
 showDialog("비밀번호 변경",[
  {id:"password-current",label:"현재 비밀번호",type:"password",placeholder:"현재 비밀번호"},
  {id:"password-new",label:"새 비밀번호",type:"password",placeholder:"8~200자"},
  {id:"password-confirm",label:"새 비밀번호 확인",type:"password",placeholder:"새 비밀번호 다시 입력"}
 ],async()=>{
  const currentPassword=$("password-current").value;
  const newPassword=$("password-new").value;
  const confirmPassword=$("password-confirm").value;
  if(!currentPassword)throw Error("현재 비밀번호를 입력하세요.");
  if(newPassword.length<8||newPassword.length>200)throw Error("새 비밀번호는 8~200자로 설정하세요.");
  if(newPassword!==confirmPassword)throw Error("새 비밀번호가 서로 일치하지 않습니다.");
  const result=await api("/api/account/password",{method:"POST",body:JSON.stringify({currentPassword,newPassword})});
  sessionStorage.setItem(TOKEN_SETTING,result.token);
  sessionStorage.setItem(NAME_SETTING,result.username);
  $("dialog").close();
  await refreshIdentity();
  if(currentTitle)loadPage(currentTitle,false);else loadHome();
  alert(result.message||"비밀번호가 변경되었습니다.");
 },"비밀번호 변경");
};
$("settings").onclick=()=>{
 showDialog("연결 및 관리자 인증",[
  {id:"api-url",label:"Cloudflare Worker API 주소",value:apiBase()},
  {id:"admin-token",label:"초기 관리자 토큰 · Cloudflare ADMIN_TOKEN",type:"password",placeholder:"최초 관리자 인증 키"}
 ],async()=>{
  const base=$("api-url").value.trim().replace(/\/$/,"");
  if(base&&!base.startsWith("https://"))throw Error("https:// 주소를 입력하세요.");
  const previousApi=apiBase(),previousToken=sessionStorage.getItem(TOKEN_SETTING)||"";
  if(base)localStorage.setItem(API_SETTING,base);
  const candidate=$("admin-token").value.trim();
  if(candidate)sessionStorage.setItem(TOKEN_SETTING,candidate);
  try{
   const identity=await api("/api/me");
   if(candidate&&!identity.isAdmin)throw Error("관리자 토큰이 올바르지 않습니다.");
   await refreshIdentity();
   $("dialog").close();
   readRoute()
  }catch(error){
   if(previousApi)localStorage.setItem(API_SETTING,previousApi);
   if(previousToken)sessionStorage.setItem(TOKEN_SETTING,previousToken);else sessionStorage.removeItem(TOKEN_SETTING);
   await refreshIdentity();
   throw error
  }
 });
 const note=document.createElement("p");
 note.className="dialog-help";
 note.textContent="최초 관리자 키는 Cloudflare Worker의 ADMIN_TOKEN 비밀 변수로 등록해야 합니다. 저장소에는 비밀값을 기록하지 않습니다. 최초 인증 후에는 대문 아래의 토큰 재발급 기능으로 기존 키를 폐기하세요.";
 $("dialog-body").append(note);
};
$("labs").onclick=()=>{
  showDialog("정식 나무마크 엔진",[],async()=>{$("dialog").close()},"닫기");
  const body=$("dialog-body");body.replaceChildren();
  const card=document.createElement("section");card.className="labs-feature";
  addText(card,"h3","Worker 정식 렌더링 엔진");
  addText(card,"p","문서 주소(/w/문서명)를 열면 Cloudflare Worker가 D1에서 문서를 조회하고 정식 나무마크 엔진으로 파싱·정화한 뒤, 공통 HTML 셸과 문서 본문을 합친 완전한 HTML 문서를 응답합니다. 브라우저는 전달받은 문서에 각주·접기 등의 상호작용만 연결합니다. 편집기 미리보기는 별도의 JSON 렌더링 API를 사용합니다.");
  const label=document.createElement("label");label.className="labs-toggle";
  const input=document.createElement("input");input.type="checkbox";input.checked=true;input.disabled=true;
  const textLabel=document.createElement("span");textLabel.textContent="서버에서 완성한 전체 문서 HTML 응답";
  label.append(input,textLabel);card.append(label);
  const state=addText(card,"p","정식 엔진 활성화됨 · 문서 첫 화면을 브라우저에서 다시 파싱하거나 재구성하지 않습니다.");state.className="labs-state";
  body.append(card);
};
async function editHomepage(){
 if(!isWikiAdmin){$("message").textContent="위키 관리자 권한이 필요합니다.";return}
 const data=await api("/api/home"),settings=data.settings||{};
 showDialog("대문 편집",[
  {id:"home-edit-title",label:"대문 제목",value:settings.title||"AonWiki"},
  {id:"home-edit-tagline",label:"소개 문구",value:settings.tagline||""},
  {id:"home-edit-notice",label:"공지 / 안내",value:settings.notice||"",multiline:true},
  {id:"home-edit-hint",label:"검색 안내 문구",value:settings.searchHint||""},
  {id:"home-edit-list-title",label:"문서 목록 제목",value:settings.listTitle||""},
  {id:"home-edit-bottom-title",label:"하단 안내 제목",value:settings.bottomTitle||""},
  {id:"home-edit-bottom-text",label:"하단 안내 문구",value:settings.bottomText||""},
  {id:"home-edit-content",label:"대문 본문 (나무마크)",value:settings.content||"",multiline:true}
 ],async()=>{
  await api("/api/home",{method:"PUT",body:JSON.stringify({
   title:$("home-edit-title").value,
   tagline:$("home-edit-tagline").value,
   notice:$("home-edit-notice").value,
   searchHint:$("home-edit-hint").value,
   listTitle:$("home-edit-list-title").value,
   bottomTitle:$("home-edit-bottom-title").value,
   bottomText:$("home-edit-bottom-text").value,
   content:$("home-edit-content").value
  })});
  $("dialog").close();await loadHome()
 },"대문 저장");
}
$("home-edit").onclick=()=>editHomepage().catch(error=>{$("dialog-status").textContent=error.message});
$("admin-token-rotate").onclick=async()=>{
 if(!isWikiAdmin){$("dialog-status").textContent="위키 관리자 권한이 필요합니다.";return}
 if(!confirm("초기 관리자 토큰을 폐기하고 새 랜덤 관리자 토큰으로 교체할까요? 이전 토큰은 즉시 사용할 수 없게 됩니다."))return;
 try{
  const data=await api("/api/admin/token/rotate",{method:"POST"});
  if(currentRole!=="user")sessionStorage.setItem(TOKEN_SETTING,data.token);
  await refreshIdentity();
  showDialog("새 관리자 토큰 발급 완료",[
   {id:"generated-admin-token",label:"새 관리자 토큰 (다시 표시되지 않습니다)",value:data.token}
  ],async()=>{$("dialog").close()},"확인");
  const note=document.createElement("p");note.className="dialog-help";note.textContent="새 토큰을 안전한 장소에 보관하세요. 이전 토큰은 더 이상 작동하지 않습니다. Cloudflare의 ADMIN_TOKEN 비밀 변수도 더 이상 필요하지 않으므로 별도로 삭제하세요.";
  $("dialog-body").append(note);
  const copy=document.createElement("button");copy.type="button";copy.className="button";copy.textContent="토큰 복사";
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(data.token);copy.textContent="복사 완료"}catch{ $("generated-admin-token").focus();$("generated-admin-token").select();copy.textContent="토큰을 선택했습니다." }};
  $("dialog-body").append(copy);
 }catch(error){$("dialog-status").textContent=error.message}
};
$("page-protection").onclick=()=>{
 if(!isWikiAdmin||!currentTitle)return;
 showDialog("문서 편집 보호",[
  {id:"protection-level",label:"편집 보호 수준",value:currentProtection.level||"none"},
  {id:"protection-reason",label:"보호 사유 (선택)",value:currentProtection.reason||"",placeholder:"예: 반복적인 문서 훼손"}
 ],async()=>{
  const level=$("protection-level").value;
  const result=await api("/api/page/protection",{method:"PUT",body:JSON.stringify({title:currentTitle,level,reason:$("protection-reason").value})});
  currentProtection={level:result.protection.level,reason:result.protection.reason||""};
  $("dialog").close();await loadPage(currentTitle,false);
 },"적용");
 const select=document.createElement("select");select.id="protection-level";
 [["none","보호 안 함"],["registered","로그인 회원만 편집"],["admin","관리자만 편집"]].forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;select.append(option)});
 select.value=currentProtection.level||"none";
 const label=[...$("dialog-body").querySelectorAll("label")].find(node=>node.textContent==="편집 보호 수준");
 const oldInput=$("protection-level");if(oldInput)oldInput.replaceWith(select);else if(label)label.after(select);
};
$("official-document").onclick=async()=>{
 if(!isWikiAdmin||!currentTitle)return;
 const next=!currentOfficial;
 try{
  const result=await api("/api/page/official",{method:"PUT",body:JSON.stringify({title:currentTitle,official:next})});
  currentOfficial=Boolean(result.official);
  $("official-document").textContent=currentOfficial?"공식 문서 해제":"공식 문서 지정";
  $("official-status").hidden=!currentOfficial;
  if(currentOfficial)setAonIconLabel($("official-status"),"file","공식 문서");
  applyDocumentActionIcons();
 }catch(error){alert(error.message)}
};
$("delete-page").onclick=async()=>{
 if(!isWikiAdmin||!currentTitle)return;
 if(!confirm("‘"+currentTitle+"’ 문서와 문서 역사를 삭제할까요? 이 작업은 되돌릴 수 없습니다."))return;
 try{await api("/api/page?title="+encodeURIComponent(currentTitle),{method:"DELETE"});invalidateNamuDatabaseCache();showHome(true)}
 catch(error){$("message").textContent=error.message}
};

let editorOriginalTitle = "";
let editorReturnTitle = "";
let editorIsNew = false;
let editorDraftTimer = 0;

let aonMonacoEditor = null;
let aonMonacoTextareaSync = false;
let aonMonacoTextareaInputBound = false;

function syncAonMonacoSelectionFromTextarea() {
  if (!aonMonacoEditor) return;
  const field = $("editor-content");
  const model = aonMonacoEditor.getModel();
  if (!field || !model) return;
  const startOffset = Number.isInteger(field.selectionStart) ? field.selectionStart : field.value.length;
  const endOffset = Number.isInteger(field.selectionEnd) ? field.selectionEnd : startOffset;
  const start = model.getPositionAt(startOffset);
  const end = model.getPositionAt(endOffset);
  aonMonacoEditor.setSelection({
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column
  });
}

function syncAonMonacoFromTextarea() {
  if (!aonMonacoEditor || aonMonacoTextareaSync) return;
  const field = $("editor-content");
  if (!field) return;
  if (aonMonacoEditor.getValue() !== field.value) aonMonacoEditor.setValue(field.value);
  syncAonMonacoSelectionFromTextarea();
}

function syncAonTextareaFromMonaco() {
  if (!aonMonacoEditor || aonMonacoTextareaSync) return;
  const field = $("editor-content");
  const model = aonMonacoEditor.getModel();
  if (!field || !model) return;
  const value = aonMonacoEditor.getValue();
  const selection = aonMonacoEditor.getSelection();
  if (selection) {
    const start = model.getOffsetAt(selection.getStartPosition());
    const end = model.getOffsetAt(selection.getEndPosition());
    field.setSelectionRange(start, end);
  }
  if (field.value === value) return;
  field.value = value;
  aonMonacoTextareaSync = true;
  try {
    field.dispatchEvent(new Event("input", { bubbles: true }));
  } finally {
    aonMonacoTextareaSync = false;
  }
}

function focusAonWikiEditor() {
  if (aonMonacoEditor) {
    aonMonacoEditor.focus();
    return;
  }
  $("editor-content")?.focus();
}

function initializeAonMonacoEditor() {
  const field = $("editor-content");
  const host = $("editor-monaco-host");
  const wrap = $("editor-code-wrap");
  const bridge = window.AonMonacoEditor;
  if (!field || !host || !wrap || !bridge?.createEditor || !bridge?.monaco) {
    console.warn("Monaco bundle is unavailable; using the built-in NamuMark editor.");
    return false;
  }
  if (aonMonacoEditor) {
    syncAonMonacoFromTextarea();
    requestAnimationFrame(() => aonMonacoEditor?.layout());
    return true;
  }
  try {
    aonMonacoEditor = bridge.createEditor(host, field.value, {
      ariaLabel: "AonWiki 나무마크 문서 원문",
      readOnly: false
    });
    wrap.classList.add("monaco-active");
    field.setAttribute("aria-hidden", "true");
    field.tabIndex = -1;

    if (!aonMonacoTextareaInputBound) {
      field.addEventListener("input", () => {
        if (!aonMonacoTextareaSync) syncAonMonacoFromTextarea();
      });
      aonMonacoTextareaInputBound = true;
    }
    aonMonacoEditor.onDidChangeModelContent(syncAonTextareaFromMonaco);
    aonMonacoEditor.onDidChangeCursorSelection(syncAonTextareaFromMonaco);

    const monaco = bridge.monaco;
    if (monaco.KeyMod?.CtrlCmd !== undefined && monaco.KeyCode?.KeyS !== undefined) {
      aonMonacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => $("editor-form").requestSubmit());
    }
    if (monaco.KeyMod?.CtrlCmd !== undefined && monaco.KeyCode?.KeyB !== undefined) {
      aonMonacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => insertEditorMarkup("bold"));
    }
    if (monaco.KeyMod?.CtrlCmd !== undefined && monaco.KeyCode?.KeyI !== undefined) {
      aonMonacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => insertEditorMarkup("italic"));
    }
    if (monaco.KeyMod?.CtrlCmd !== undefined && monaco.KeyCode?.KeyK !== undefined) {
      aonMonacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => insertEditorMarkup("link"));
    }

    requestAnimationFrame(() => {
      if (!aonMonacoEditor) return;
      aonMonacoEditor.layout();
      aonMonacoEditor.focus();
    });
    console.info("AonWiki Monaco editor initialized", bridge.version || "");
    return true;
  } catch (error) {
    console.error("Monaco editor initialization failed; using the built-in editor.", error);
    aonMonacoEditor = null;
    wrap.classList.remove("monaco-active");
    field.removeAttribute("aria-hidden");
    field.removeAttribute("tabindex");
    return false;
  }
}

function resizeEditorTitleField() {
  const field = $("editor-title");
  if (!field) return;
  const value = field.value || field.placeholder || "문서 제목";
  const measuredWidth = Array.from(value).reduce((width, char) => width + (char.charCodeAt(0) > 255 ? 17 : 9), 14);
  field.style.setProperty("width", Math.max(110, Math.min(680, measuredWidth)) + "px", "important");
}

function syncEditorConsentLock(){
 const accepted=Boolean($("editor-public-ack")?.checked);
 const fields=$("editor-fields");
 const save=$("editor-save");
 if(fields)fields.disabled=!accepted;
 if(save)save.disabled=!accepted;
}
$("editor-public-ack").addEventListener("change",syncEditorConsentLock);
async function startEditRequest(){if(!currentTitle)return;await editPage(currentTitle,currentContent,{request:true});}
async function editPage(title = currentTitle, content = currentContent, options = {}) {
  editorRequestMode=Boolean(options.request);
  editorOriginalTitle = String(title || "");
  // Always refresh the source text when opening an existing document for editing.
  // SSR state can be present while the client-side currentContent is still stale/empty.
  if (editorOriginalTitle) {
    try {
      const latest = await api("/api/page?title=" + encodeURIComponent(editorOriginalTitle));
      if (latest.page && typeof latest.page.content === "string") {
        content = latest.page.content;
        currentContent = latest.page.content;
        currentTitle = latest.page.title || editorOriginalTitle;
      }
    } catch (error) {
      console.warn("편집 원문 새로 불러오기 실패:", error);
    }
  }
  editorReturnTitle = String(currentTitle || editorOriginalTitle || "");
  editorIsNew = !editorOriginalTitle;
  const anonymousEditing = !loggedInName && !sessionStorage.getItem(TOKEN_SETTING);
  if(anonymousEditing&&!currentVisitorIp){try{const identity=await api("/api/me");currentVisitorIp=String(identity.ip||"")}catch{}}
  document.title = (editorIsNew ? "새 문서 작성" : editorOriginalTitle + (editorRequestMode ? " 편집 요청" : " (편집)")) + " - AonWiki";
  $("search-view").hidden = true;
  $("home-view").hidden = true;
  $("document-view").hidden = true;
  $("editor-view").hidden = false;
  document.body.classList.add("editor-active");
  $("home").classList.remove("active");
  $("new").classList.add("active");
  $("editor-heading").textContent = editorIsNew ? "새 문서 (작성)" : editorOriginalTitle + (editorRequestMode ? " (편집 요청)" : " (편집)");
  $("editor-breadcrumb").textContent = editorIsNew ? "새 문서 작성" : editorOriginalTitle + (editorRequestMode ? " 편집 요청" : " 편집");
  $("editor-title-wrap").hidden = false;
  $("editor-title-wrap").querySelector("label").textContent = "문서 제목";
  const titleFieldRow=$("editor-title-wrap").closest(".editor-title-field");
  if(titleFieldRow)titleFieldRow.hidden=!editorIsNew;
  $("editor-title-help").hidden = true;
  $("editor-title").value = editorIsNew ? "" : editorOriginalTitle;
  resizeEditorTitleField();
  $("editor-backlinks-action").hidden = editorIsNew;
  $("editor-move-action").hidden = editorIsNew;
  $("editor-delete-action").hidden = editorIsNew || !isWikiAdmin;
  $("editor-title").readOnly = false;
  $("editor-title").disabled = false;
  $("editor-title").removeAttribute("readonly");
  $("editor-title").removeAttribute("disabled");
  $("editor-title").readOnly = editorRequestMode || (anonymousEditing && !editorIsNew);
  $("editor-move-action").hidden = editorIsNew || anonymousEditing || editorRequestMode;
  $("editor-ip-warning").hidden = !anonymousEditing;
  $("editor-login-note").hidden = anonymousEditing;
  $("editor-public-ack").checked = false;
  $("editor-ip-warning").textContent = editorRequestMode
    ? "비로그인 상태로 편집 요청을 제출하면, 요청 기록에 본인이 사용하는 IP(" + (currentVisitorIp||"확인할 수 없음") + ") 주소 전체가 기록됩니다."
    : "비로그인 상태로 편집합니다. 로그인하지 않은 상태로 문서 편집을 저장하면, 편집 역사에 본인이 사용하는 IP(" + (currentVisitorIp||"확인할 수 없음") + ") 주소 전체가 영구히 기록됩니다.";
  if (anonymousEditing) $("editor-breadcrumb").textContent = editorOriginalTitle + " · IP 편집";
  else $("editor-login-note").textContent = "로그인 계정이 편집 기록에 표시됩니다.";
  syncEditorConsentLock();
  let editorText = String(content || "");
  try {
    const draft = JSON.parse(sessionStorage.getItem("aonwiki-draft") || "null");
    const draftHasChanges = draft && draft.originalTitle === editorOriginalTitle &&
      ((typeof draft.content === "string" && draft.content !== editorText) ||
       (typeof draft.title === "string" && draft.title !== $("editor-title").value));
    if (draftHasChanges && confirm("저장되지 않은 편집 초안이 있습니다. 복구할까요?")) {
      if (typeof draft.content === "string") editorText = draft.content;
      if (typeof draft.title === "string") $("editor-title").value = draft.title;
    }
  } catch {}
  $("editor-content").value = editorText;
  initializeAonMonacoEditor();
  syncAonMonacoFromTextarea();
  resetEditorHighlightState();
  updateEditorHighlight({immediate:true});
  $("editor-counter").textContent = editorText.length.toLocaleString("ko-KR") + " / 200,000자";
  $("editor-summary").value = "";
  $("editor-status").textContent = "";
  $("editor-preview").replaceChildren();
  setEditorMode("write", { render: false });
  $("editor-draft-indicator").textContent = "초안 자동 저장 준비";
  $("editor-save").textContent = editorRequestMode ? "편집 요청 제출" : editorIsNew ? "문서 등록" : "저장";
  $("editor-save").disabled = false;
  $("editor-help").hidden = true;
  syncEditorConsentLock();
}

function cancelEditor(event) {
  event.preventDefault();
  event.stopPropagation();
  if (typeof editorPreviewTimer !== "undefined") clearTimeout(editorPreviewTimer);
  if (editorDraftTimer) clearTimeout(editorDraftTimer);
  sessionStorage.removeItem("aonwiki-draft");
  document.body.classList.remove("editor-active");
  const destination = editorReturnTitle || editorOriginalTitle;
  editorReturnTitle = "";
  if (destination) {
    history.replaceState(null, "", routeFor(destination));
    loadPage(destination, false);
  } else {
    showHome(true);
  }
}
$("editor-cancel").addEventListener("click", cancelEditor);
$("editor-backlinks-action").onclick = () => {
  if (!editorIsNew && currentTitle) $("backlinks-tab").click();
};
$("editor-move-action").onclick = () => {
  const titleField = $("editor-title");
  if (!titleField) return;
  const titleFieldRow=titleField.closest(".editor-title-field");
  if(titleFieldRow)titleFieldRow.hidden=false;
  $("editor-status").textContent = "제목을 변경한 뒤 저장하면 문서가 새 제목으로 이동합니다.";
  titleField.focus();
  titleField.select();
};
$("editor-delete-action").onclick = () => {
  if (!isWikiAdmin || editorIsNew) return;
  $("delete-page").click();
};
$("editor-help-toggle").onclick = () => {
  $("editor-help").hidden = !$("editor-help").hidden;
  $("editor-help-toggle").setAttribute("aria-expanded", $("editor-help").hidden ? "false" : "true");
};
function setEditorMode(mode, { render = true } = {}) {
  const nextMode = ["write", "raw", "preview"].includes(mode) ? mode : "write";
  const codePane = $("editor-code-pane");
  const previewPane = $("editor-preview-pane");
  const workspace = $("editor-workspace");
  const codeWrap = $("editor-code-wrap");
  if (!codePane || !previewPane || !workspace || !codeWrap) return;
  workspace.dataset.mode = nextMode;
  codePane.hidden = nextMode === "preview";
  previewPane.hidden = nextMode !== "preview";
  $("editor-preview").hidden = nextMode !== "preview";
  codeWrap.classList.toggle("raw-mode", nextMode === "raw");
  if (aonMonacoEditor) {
    window.AonMonacoEditor?.setLanguage(aonMonacoEditor, nextMode);
    if (nextMode !== "preview") requestAnimationFrame(() => aonMonacoEditor?.layout());
  }
  [
    ["editor-tab-write", "write"],
    ["editor-tab-raw", "raw"],
    ["editor-tab-preview", "preview"]
  ].forEach(([id, value]) => {
    const active = value === nextMode;
    const button = $(id);
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  if (nextMode !== "preview") updateEditorHighlight({ immediate: true });
  if (render && nextMode === "preview") renderEditorPreview();
}
let editorPreviewTimer = null;
async function renderEditorPreview() {
  const preview = $("editor-preview");
  const status = $("editor-preview-status");
  if (!preview || $("editor-preview-pane").hidden) return;
  const title = $("editor-title").value.trim() || editorOriginalTitle || "미리보기";
  $("editor-preview-title").textContent = title;
  $("editor-preview-crumb").textContent = title;
  if (status) status.textContent = "실제 문서와 같은 렌더러로 미리보기를 생성하고 있습니다…";
  try {
    const metadata = await renderNamuMarkup($("editor-content").value, preview, title);
    renderDocumentMetadata(preview, metadata, title);
    if (status) status.textContent = "미리보기 갱신 · " + new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    if (status) status.textContent = "미리보기를 불러오지 못했습니다: " + String(error?.message || error);
    console.warn("Worker SSR preview failed", error);
  }
}
function scheduleServerEditorPreview() {
  clearTimeout(editorPreviewTimer);
  editorPreviewTimer = setTimeout(() => {
    if ($("editor-preview-pane").hidden) return;
    renderEditorPreview();
  }, 650);
}
$("editor-tab-write").onclick = () => setEditorMode("write", { render: false });
$("editor-tab-raw").onclick = () => setEditorMode("raw", { render: false });
$("editor-tab-preview").onclick = () => setEditorMode("preview");
$("editor-preview-refresh").onclick = () => renderEditorPreview();
$("editor-content").addEventListener("keydown", event => {
  if (event.key === "Tab") {
    event.preventDefault();
    const field = event.currentTarget;
    field.setRangeText("    ", field.selectionStart, field.selectionEnd, "end");
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (event.ctrlKey || event.metaKey) {
    const key = event.key.toLowerCase();
    if (key === "s") {
      event.preventDefault();
      $("editor-form").requestSubmit();
    } else if (key === "b" || key === "i" || key === "k") {
      event.preventDefault();
      insertEditorMarkup(key === "b" ? "bold" : key === "i" ? "italic" : "link");
    }
  }
});
$("editor-form").onsubmit = async event => {
  event.preventDefault();
  const title = $("editor-title").value.trim();
  const content = $("editor-content").value;
  const summary = $("editor-summary").value.trim();
  const status = $("editor-status");
  const saveButton = $("editor-save");
  status.textContent = "";
  if (!$("editor-public-ack").checked) {
    status.textContent = "문서가 공개 문서에 반영된다는 점을 확인해 주세요.";
    $("editor-public-ack").focus();
    return;
  }
  if (!title) { status.textContent = "문서 제목을 입력하세요."; return; }
  if (title === "대문" && !isWikiAdmin) { status.textContent = "대문은 위키 관리자만 편집할 수 있습니다."; return; }
  if (content.length > 200000) { status.textContent = "문서는 200,000자 이하로 작성해 주세요."; return; }
  saveButton.disabled = true;
  saveButton.textContent = editorRequestMode ? "요청 제출 중…" : "저장 중…";
  try {
    if(editorRequestMode){
      const requestResult=await api("/api/edit-request",{method:"POST",body:JSON.stringify({title:editorOriginalTitle,content,summary,consent:true})});
      sessionStorage.removeItem("aonwiki-draft");document.body.classList.remove("editor-active");
      history.replaceState(null,"",routeFor(editorOriginalTitle));
      await loadPage(editorOriginalTitle,false);
      $("message").textContent="편집 요청 #"+requestResult.id+"을 제출했습니다. 관리자가 검토한 뒤 반영합니다.";
      return;
    }
    await api("/api/page", {
      method: "PUT",
      body: JSON.stringify({ title, originalTitle: editorIsNew ? "" : editorOriginalTitle, content, summary, createOnly: editorIsNew, consent: true })
    });
    invalidateNamuDatabaseCache();
    sessionStorage.removeItem("aonwiki-draft");
    document.body.classList.remove("editor-active");
    history.replaceState(null, "", routeFor(title));
    await loadPage(title, false);
  } catch (error) {
    status.textContent = error.message;
    saveButton.disabled = false;
    saveButton.textContent = editorRequestMode ? "편집 요청 제출" : editorIsNew ? "문서 등록" : "저장";
  }
};
function saveEditorDraft() {
  sessionStorage.setItem("aonwiki-draft", JSON.stringify({
    originalTitle: editorOriginalTitle,
    title: $("editor-title").value,
    content: $("editor-content").value
  }));
  $("editor-draft-indicator").textContent = "초안 자동 저장됨";
}
function scheduleEditorDraftSave() {
  clearTimeout(editorDraftTimer);
  $("editor-draft-indicator").textContent = "초안 저장 중…";
  editorDraftTimer = setTimeout(() => {
    editorDraftTimer = 0;
    saveEditorDraft();
  }, 240);
}
$("editor-title").addEventListener("input", () => {
  resizeEditorTitleField();
  if(!editorIsNew)$("editor-heading").textContent=$("editor-title").value.trim()+(editorRequestMode?" (편집 요청)":" (편집)");
  scheduleEditorDraftSave();
  if (!$("editor-preview-pane").hidden) scheduleServerEditorPreview();
});
$("editor-content").addEventListener("input", () => {
  const content=$("editor-content").value;
  $("editor-counter").textContent=content.length.toLocaleString("ko-KR")+" / 200,000자";
  $("editor-status").textContent=content.length>200000?"문서가 200,000자를 초과했습니다.":"";
  scheduleEditorDraftSave();
  updateEditorHighlight();
  if (!$("editor-preview-pane").hidden) scheduleServerEditorPreview();
});

function runEditorCorrectionBot() {
  const field = $("editor-content");
  if (!field) return;

  const rules = [
    [/안되요/gu, "안 돼요"], [/됬/gu, "됐"], [/되요/gu, "돼요"],
    [/어떻해/gu, "어떻게"], [/몇일/gu, "며칠"], [/왠만/gu, "웬만"],
    [/웬지/gu, "왠지"], [/금새/gu, "금세"], [/희안/gu, "희한"],
    [/어의없/gu, "어이없"], [/역활/gu, "역할"], [/일부로/gu, "일부러"],
    [/오랫만/gu, "오랜만"], [/구지/gu, "굳이"], [/설레임/gu, "설렘"],
    [/아니예요/gu, "아니에요"], [/아니였/gu, "아니었"], [/뭐에요/gu, "뭐예요"],
    [/할께요/gu, "할게요"], [/갈께요/gu, "갈게요"], [/볼께요/gu, "볼게요"],
    [/할께/gu, "할게"], [/갈께/gu, "갈게"], [/뵈요/gu, "봬요"], [/않되/gu, "안 되"],
    [/할수있/gu, "할 수 있"], [/할수없/gu, "할 수 없"],
    [/될수있/gu, "될 수 있"], [/될수없/gu, "될 수 없"],
    [/수있습니다/gu, "수 있습니다"], [/수없습니다/gu, "수 없습니다"],
    [/수있는/gu, "수 있는"], [/수없는/gu, "수 없는"],
    [/할거에요/gu, "할 거예요"], [/갈거에요/gu, "갈 거예요"], [/될거에요/gu, "될 거예요"]
  ];

  const protectedPattern = /\{\{\{[\s\S]*?\}\}\}|https?:\/\/[^\s<>\]]+|\[\[[^\]\n]*\]\]|\[[^\]\n]*\]|\x60[^\x60\n]*\x60/gi;
  const protectedTokens = [];
  const protect = value => String(value).replace(protectedPattern, token => {
    const index = protectedTokens.push(token) - 1;
    return "\uE000" + index + "\uE001";
  });
  const restore = value => String(value).replace(/\uE000(\d+)\uE001/g, (match, index) =>
    protectedTokens[Number(index)] ?? match
  );

  const changes = [];
  let insideCodeBlock = false;
  const correctedLines = field.value.split("\n").map((line, lineIndex) => {
    if (insideCodeBlock) {
      if (/^\s*\}\}\}\s*$/.test(line)) insideCodeBlock = false;
      return line;
    }
    if (/^\s*\{\{\{/.test(line)) {
      if (!/\}\}\}\s*$/.test(line)) insideCodeBlock = true;
      return line;
    }

    let result = protect(line);
    for (const [pattern, replacement] of rules) {
      const matches = result.match(pattern) || [];
      if (!matches.length) continue;
      for (const before of matches) changes.push({ line: lineIndex + 1, before, after: replacement });
      result = result.replace(pattern, replacement);
    }
    return restore(result);
  });

  if (!changes.length) {
    $("editor-status").textContent = "교정 BOT: 보호 영역을 제외한 본문에서 등록된 명확한 오타를 찾지 못했습니다.";
    return;
  }

  const unique = [];
  const seen = new Set();
  for (const change of changes) {
    const key = change.line + "\u0000" + change.before + "\u0000" + change.after;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(change);
  }
  const preview = unique.slice(0, 8)
    .map(change => change.line + "행: " + change.before + " → " + change.after)
    .join("\n");
  const omitted = unique.length > 8 ? "\n외 " + (unique.length - 8) + "개 유형" : "";

  if (!window.confirm(
    "교정 후보 " + changes.length + "건을 찾았습니다.\n\n" +
    preview + omitted +
    "\n\nURL, 내부·외부 링크, 인라인 코드와 {{{ }}} 영역은 보존합니다.\n교정 결과를 편집기에 적용할까요?"
  )) return;

  const selectionStart = field.selectionStart;
  const selectionEnd = field.selectionEnd;
  field.value = correctedLines.join("\n");
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.setSelectionRange(Math.min(selectionStart, field.value.length), Math.min(selectionEnd, field.value.length));
  syncAonMonacoSelectionFromTextarea();
  $("editor-status").textContent = "교정 BOT: " + changes.length + "건을 수정했습니다. 저장 전 미리보기에서 확인하세요.";
  focusAonWikiEditor();
}
$("editor-autocorrect")?.addEventListener("click",runEditorCorrectionBot);

function escapeHighlightText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
}
function highlightNamuLine(line, insideCode) {
  const escaped = escapeHighlightText(line);
  const trimmed = line.trim();
  const syntax = value => '<span class="mk-syntax">' + escapeHighlightText(value) + '</span>';
  const content = value => '<span class="mk-content">' + escapeHighlightText(value) + '</span>';
  if (/^\{\{\{#![a-z0-9_-]+/i.test(trimmed)) {
    const match = trimmed.match(/^(\{\{\{#![a-z0-9_-]+)([\s\S]*)$/i);
    return syntax(match[1]) + content(match[2]);
  }
  if (trimmed === "}}}") return syntax(trimmed);
  if (insideCode) return '<span class="mk-code-line">' + escaped + '</span>';
  if (/^\s*={2,6}.*?={2,6}\s*$/.test(line)) {
    const match = line.match(/^(\s*)(={2,6})(.*?)(={2,6})(\s*)$/);
    if (match) return escapeHighlightText(match[1]) + syntax(match[2]) + '<span class="mk-heading-text">' + escapeHighlightText(match[3]) + '</span>' + syntax(match[4]) + escapeHighlightText(match[5]);
  }
  if (/^\s*\|\|/.test(line)) return '<span class="mk-table">' + escaped + '</span>';
  if (/^\s*(?:\*+|\d+\.)\s/.test(line)) {
    const match = line.match(/^(\s*(?:\*+|\d+\.))(\s+)(.*)$/);
    if (match) return syntax(match[1]) + escapeHighlightText(match[2]) + escapeHighlightText(match[3]);
  }
  if (/^\s*(?:-{4,}|={4,})\s*$/.test(line)) return syntax(line);

  const tokenPattern = /(\[include\([^\]\n]+\)\]|\[\[(?:분류|category):[^\]]+\]\]|\[\[(?:파일|file):[^\]]+\]\]|\[\[[^\]]+\]\]|\[\*[^\]]+\]|\[https?:\/\/[^\]]+\]|\[(?:youtube|nicovideo|navertv|kakaotv|vimeo|instagram|twitter|tiktok|facebook|ruby|age|dday|math)\([^\]\n]+\)\]|\[anchor\([^\]]+\)\]|\{\{\{#![^\n]*|\{\{\{(?:\+|-)[1-5][^}]*\}\}\}|\{\{\{[@#][^}]*\}\}\}|<(?:(?:table(?:width|height|align|textalign|bgcolor|color|bordercolor|class)|row(?:bgcolor|color|textalign|height)|col(?:bgcolor|color|textalign)|width|height|align|textalign|bgcolor|color|bordercolor|class)=[^>\n]+|[():]|(?:\^|v)?\|[0-9]+|-?[0-9]+)>|'''[^']*'''|''[^']*''|__.*?__|~~.*?~~|\^\^.*?\^\^|,,.*?,,|\[목차(?:\([^\]]*\))?\]|\[(?:\/?table(?:\([^\]\n]*\))?|\/?tr|\/?th(?:=\d+)?|\/?td(?:=\d+)?)\]|\[(?:br|date|clearfix|pagecount)\])/gi;
  let output = "", last = 0, match;
  while ((match = tokenPattern.exec(line))) {
    output += escapeHighlightText(line.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("'''")) {
      output += syntax("'''") + '<strong class="mk-bold-text">' + escapeHighlightText(token.slice(3, -3)) + '</strong>' + syntax("'''");
    } else if (token.startsWith("''")) {
      output += syntax("''") + '<em class="mk-italic-text">' + escapeHighlightText(token.slice(2, -2)) + '</em>' + syntax("''");
    } else if (token.startsWith("__")) {
      output += syntax("__") + '<span class="mk-underline-text">' + escapeHighlightText(token.slice(2, -2)) + '</span>' + syntax("__");
    } else if (token.startsWith("~~")) {
      output += syntax("~~") + '<del class="mk-strike-text">' + escapeHighlightText(token.slice(2, -2)) + '</del>' + syntax("~~");
    } else if (token.startsWith("^^")) {
      output += syntax("^^") + '<sup class="mk-script-text">' + escapeHighlightText(token.slice(2, -2)) + '</sup>' + syntax("^^");
    } else if (token.startsWith(",,")) {
      output += syntax(",,") + '<sub class="mk-script-text">' + escapeHighlightText(token.slice(2, -2)) + '</sub>' + syntax(",,");
    } else if (/^\[\[(?:분류|category):/i.test(token)) {
      output += syntax("[[") + '<span class="mk-category-label">' + escapeHighlightText(token.slice(2, token.indexOf(":") + 1)) + '</span>' + content(token.slice(token.indexOf(":") + 1, -2)) + syntax("]]");
    } else if (/^\[\[(?:파일|file):/i.test(token)) {
      output += syntax("[[") + '<span class="mk-file-label">' + escapeHighlightText(token.slice(2, token.indexOf(":") + 1)) + '</span>' + content(token.slice(token.indexOf(":") + 1, -2)) + syntax("]]");
    } else if (token.startsWith("[[")) {
      const inner = token.slice(2, -2);
      const separator = inner.indexOf("|");
      output += syntax("[[") + '<span class="mk-link-target">' + escapeHighlightText(separator >= 0 ? inner.slice(0, separator) : inner) + '</span>' +
        (separator >= 0 ? syntax("|") + content(inner.slice(separator + 1)) : "") + syntax("]]");
    } else if (token.startsWith("[*")) {
      output += syntax("[*") + content(token.slice(2, -1)) + syntax("]");
    } else if (/^\[https?:\/\//i.test(token)) {
      const inner = token.slice(1, -1), pipe = inner.indexOf("|");
      const separator = pipe >= 0 ? pipe : inner.search(/\s/);
      const url = separator >= 0 ? inner.slice(0, separator) : inner;
      const label = separator >= 0 ? inner.slice(separator + (pipe >= 0 ? 1 : 0)).trim() : "";
      output += syntax("[") + '<span class="mk-external-url">' + escapeHighlightText(url) + '</span>' +
        (label ? syntax(pipe >= 0 ? "|" : " ") + content(label) : "") + syntax("]");
    } else if (token.startsWith("<")) {
      output += syntax(token);
    } else if (/^\[(?:youtube|nicovideo|navertv|kakaotv|vimeo|instagram|twitter|tiktok|facebook|ruby|age|dday|math)\(/i.test(token)) {
      const open=token.indexOf("(");
      output += syntax("[") + '<span class="mk-directive">' + content(token.slice(1,open)) + '</span>' +
        syntax("(") + content(token.slice(open+1,-2)) + syntax(")]");
    } else if (/^\[anchor\(/i.test(token)) {
      output += syntax("[anchor(") + '<span class="mk-anchor-target">' + content(token.slice(8, -2)) + '</span>' + syntax(")]");
    } else if (/^\[include\(/i.test(token)) {
      output += syntax("[include(") + '<span class="mk-include-target">' + escapeHighlightText(token.slice(9, -2)) + '</span>' + syntax(")]");
    } else if (/^\{\{\{#!/i.test(token)) {
      const macro = token.match(/^(\{\{\{#![a-z0-9_-]+)([\s\S]*)$/i);
      output += syntax(macro[1]) + content(macro[2]);
    } else if (token.startsWith("{{{")) {
      const inner = token.slice(3, -3);
      output += syntax("{{{") + '<span class="mk-directive">' + escapeHighlightText(inner) + '</span>' + syntax("}}}");
    } else {
      output += syntax(token);
    }
    last = tokenPattern.lastIndex;
  }
  output += escapeHighlightText(line.slice(last));
  return output;
}
function createDiscussionSyntaxEditor(options={}){
 const wrap=document.createElement("div");
 wrap.className="discussion-code-wrap";
 const pre=document.createElement("pre");
 pre.className="discussion-code-highlight";
 pre.setAttribute("aria-hidden","true");
 const code=document.createElement("code");
 code.className="discussion-code-highlight-content";
 pre.append(code);
 const textarea=document.createElement("textarea");
 textarea.className="discussion-markup-input";
 textarea.value=String(options.value??"");
 textarea.rows=Number(options.rows||5);
 if(options.maxLength)textarea.maxLength=Number(options.maxLength);
 if(options.required)textarea.required=true;
 textarea.placeholder=String(options.placeholder||"");
 textarea.spellcheck=false;
 const update=()=>{
  let insideCode=false;
  code.innerHTML=textarea.value.split("\n").map(line=>{
   const opening=line.match(/^\s*\{\{\{#!([a-z0-9_-]+)/i);
   if(opening){
    const output=highlightNamuLine(line,false);
    insideCode=["syntax","html","style","latex"].includes(opening[1].toLowerCase());
    return output;
   }
   if(/^\s*\{\{\{\s*$/.test(line)){
    insideCode=true;
    return '<span class="mk-code-fence">'+escapeHighlightText(line)+'</span>';
   }
   if(/^\s*\}\}\}\s*$/.test(line)){
    insideCode=false;
    return highlightNamuLine(line,false);
   }
   return highlightNamuLine(line,insideCode);
  }).join("\n")+(textarea.value.endsWith("\n")?"\n":"");
  pre.scrollTop=textarea.scrollTop;
  pre.scrollLeft=textarea.scrollLeft;
 };
 textarea.addEventListener("input",update);
 textarea.addEventListener("keyup",update);
 textarea.addEventListener("click",update);
 textarea.addEventListener("scroll",()=>{
  pre.scrollTop=textarea.scrollTop;
  pre.scrollLeft=textarea.scrollLeft;
 });
 textarea.addEventListener("compositionupdate",update);
 textarea.addEventListener("compositionend",update);
 wrap.append(pre,textarea);
 update();
 return {wrap,textarea,update};
}
function buildDiscussionBodyEditForm(options={}){
 const form=document.createElement("form");
 form.className="discussion-inline-edit-form";
 const heading=addText(form,"h4",options.heading||"내용 수정");
 heading.className="discussion-form-heading";
 if(options.titleValue!==undefined){
  const titleLabel=document.createElement("label");
  titleLabel.className="discussion-field";
  titleLabel.append(document.createTextNode("토론 제목"));
  const titleInput=document.createElement("input");
  titleInput.type="text";
  titleInput.required=true;
  titleInput.maxLength=120;
  titleInput.value=String(options.titleValue||"");
  titleLabel.append(titleInput);
  form.append(titleLabel);
  form._discussionTitleInput=titleInput;
 }
 const bodyLabel=document.createElement("label");
 bodyLabel.className="discussion-field";
 bodyLabel.append(document.createTextNode("토론 내용"));
 const editor=createDiscussionSyntaxEditor({
  value:options.value||"",maxLength:options.maxLength||6000,rows:options.rows||5,required:true,
  placeholder:"나무마크 문법을 사용해 내용을 작성하세요."
 });
 bodyLabel.append(editor.wrap);
 form.append(bodyLabel);
 const footer=document.createElement("div");
 footer.className="discussion-form-actions";
 const cancel=document.createElement("button");
 cancel.type="button";cancel.className="title-button";cancel.textContent="취소";
 cancel.addEventListener("click",()=>form.remove());
 const submit=document.createElement("button");
 submit.type="submit";submit.className="primary-button";submit.textContent="수정 저장";
 footer.append(cancel,submit);
 const status=addText(form,"p","");
 status.className="discussion-form-status";
 form.append(footer,status);
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  submit.disabled=true;status.textContent="수정 내용을 저장하고 있습니다…";
  try{
   await options.onSave(editor.textarea.value,form._discussionTitleInput?.value);
  }catch(error){
   status.textContent=String(error?.message||error);
   submit.disabled=false;
  }
 });
 return form;
}

let editorHighlightFrame = 0;
let editorHighlightSource = null;
function resetEditorHighlightState() {
  if (editorHighlightFrame) cancelAnimationFrame(editorHighlightFrame);
  editorHighlightFrame = 0;
  editorHighlightSource = null;
}
function updateEditorHighlight({immediate=false}={}) {
  if (aonMonacoEditor) return;
  const field = $("editor-content"), code = $("editor-highlight-code"), pre = $("editor-highlight");
  if (!field || !code || !pre) return;
  const lineNumbers = $("editor-line-numbers");
  const syncScroll = () => {
    pre.scrollTop = field.scrollTop;
    pre.scrollLeft = field.scrollLeft;
    if (lineNumbers) lineNumbers.scrollTop = field.scrollTop;
  };
  const updateLineNumbers = () => {
    if (!lineNumbers) return;
    const count = Math.max(1, field.value.split("\n").length);
    if (lineNumbers.dataset.lineCount !== String(count)) {
      lineNumbers.textContent = Array.from({ length: count }, (_, index) => String(index + 1)).join("\n");
      lineNumbers.dataset.lineCount = String(count);
    }
  };
  const paint = () => {
    let insideCode = false;
    const value = field.value;
    code.innerHTML = value.split("\n").map(line => {
      const opening = line.match(/^\s*\{\{\{#!([a-z0-9_-]+)/i);
      if (opening) {
        const output = highlightNamuLine(line, false);
        insideCode = ["syntax", "html", "style", "latex"].includes(opening[1].toLowerCase());
        return output;
      }
      if (/^\s*\{\{\{\s*$/.test(line)) {
        insideCode = true;
        return '<span class="mk-code-fence">' + escapeHighlightText(line) + '</span>';
      }
      if (/^\s*\}\}\}\s*$/.test(line)) {
        insideCode = false;
        return highlightNamuLine(line, false);
      }
      return highlightNamuLine(line, insideCode);
    }).join("\n") + (value.endsWith("\n") ? "\n" : "");
    editorHighlightSource = value;
    pre.dataset.sourceText = value;
    updateLineNumbers();
    const wrap = field.closest(".editor-code-wrap");
    if (wrap) wrap.classList.add("highlight-active");
    syncScroll();
  };
  if (!immediate) {
    if (editorHighlightSource === field.value) {
      syncScroll();
      return;
    }
    if (editorHighlightFrame) return;
    editorHighlightFrame = requestAnimationFrame(() => {
      editorHighlightFrame = 0;
      if (field.isConnected) paint();
    });
    return;
  }
  resetEditorHighlightState();
  paint();
}
$("editor-content").addEventListener("scroll", () => {
  const pre = $("editor-highlight");
  const gutter = $("editor-line-numbers");
  if (pre) { pre.scrollTop = $("editor-content").scrollTop; pre.scrollLeft = $("editor-content").scrollLeft; }
  if (gutter) gutter.scrollTop = $("editor-content").scrollTop;
});
$("editor-content").addEventListener("input", updateEditorHighlight);
$("editor-content").addEventListener("compositionend", updateEditorHighlight);

function insertEditorMarkup(kind){
 const field=$("editor-content");
 if(!field)return;
 const start=field.selectionStart,end=field.selectionEnd;
 const selected=field.value.slice(start,end);
 const templates={
  heading:["== "," ==","문단 제목"],
  bold:["'''","'''","굵게"],
  italic:["''","''","기울임"],
  underline:["__","__","밑줄"],
  strike:["~~","~~","취소선"],
  sup:["^^","^^","위첨자"],
  sub:[",,",",,","아래첨자"],
  link:["[[","]]","문서 제목"],
  list:["* ","","목록 항목"],
  footnote:["[* ","]","각주 내용"],
  category:["[[분류:","]]","분류명"],
  external:["[https://example.com|","]","표시문구"],
  file:["[[파일:","]]","파일명.png"],
  template:["[[틀:","]]","틀 이름"]
 };
 const insert=(value,selectFrom=null,selectTo=null)=>{
  field.setRangeText(value,start,end,"end");
  field.dispatchEvent(new Event("input",{bubbles:true}));
  if(selectFrom!==null)field.setSelectionRange(start+selectFrom,start+(selectTo??selectFrom));
  syncAonMonacoSelectionFromTextarea();
  focusAonWikiEditor();
 };
 if(kind==="category"||kind==="external"||kind==="file"||kind==="template"){
  const item=templates[kind],value=item[0]+(selected||item[2])+item[1];
  insert(value,selected?null:item[0].length,selected?null:item[0].length+item[2].length);
  return;
 }
 if(kind==="toc"){insert((selected?"":"\n")+"[목차]\n");return}
 if(kind==="hr"||kind==="table"){
  const value=kind==="hr"?"\n----\n":"\n||항목 1||항목 2||\n||내용||내용||\n";
  insert(value);return;
 }
 if(kind==="code"){
  const before="{{{\n",placeholder="코드를 입력하세요";
  insert(before+(selected||placeholder)+"\n}}}",selected?null:before.length,selected?null:before.length+placeholder.length);
  return;
 }
 if(kind==="folding"){
  const before="{{{#!folding 제목\n",placeholder="접을 내용을 입력하세요";
  const titleStart="{{{#!folding ".length;
  insert(before+(selected||placeholder)+"\n}}}",titleStart,titleStart+2);
  return;
 }
 const item=templates[kind];if(!item)return;
 const value=item[0]+(selected||item[2])+item[1];
 insert(value,selected?null:item[0].length,selected?null:item[0].length+item[2].length);
}
document.querySelectorAll("[data-markup]").forEach(button=>{
 button.addEventListener("click",()=>insertEditorMarkup(button.dataset.markup));
});
$("home").onclick=()=>showHome(true);
$("home-login-action").onclick=()=>$("login").click();
$("home-create-action").onclick=()=>editPage("","");
$("home-search-action").onclick=()=>loadSearchPage("","all",true);
$("home-categories-action").onclick=()=>loadCategoryIndex(true);
$("discussion-tab").onclick=()=>loadDiscussionList(true,currentTitle);
$("recent-changes").onclick=()=>loadRecentChanges(true);
$("categories").onclick=()=>loadCategoryIndex(true);
$("random-page").onclick=()=>openRandomPage();
$("new").onclick=()=>editPage("","");
$("home-new").onclick=()=>editPage("","");
$("edit").onclick=()=>editPage(initialSsrState&&!initialSsrState.exists?"":currentTitle,initialSsrState&&!initialSsrState.exists?"":currentContent);
$("heading-edit").onclick=()=>editPage();
function searchPageUrl(query,scope="all"){
 const params=new URLSearchParams();
 params.set("q",String(query||"").trim());
 params.set("scope",scope==="title"?"title":scope==="files"?"files":"all");
 return "/Search?"+params.toString();
}
function showSearchView(){
 document.title="검색 - AonWiki";
 breadcrumbTrail=[];pageNavigationSequence++;
 currentTitle="";currentContent="";
 $("home-view").hidden=true;$("document-view").hidden=true;$("editor-view").hidden=true;$("search-view").hidden=false;
 document.body.classList.remove("editor-active");
 $("home").classList.remove("active");$("new").classList.remove("active");
 $("edit").hidden=true;$("heading-edit").hidden=true;$("history").hidden=true;$("history-tab").hidden=true;
 $("upload").hidden=true;$("file-manager").hidden=true;$("delete-page").hidden=true;
 $("page-protection").hidden=true;$("official-document").hidden=true;$("protection-status").hidden=true;
}
function appendSearchHighlighted(target,text,query){
 const value=String(text||""),needle=String(query||"").trim();
 if(!needle){target.textContent=value;return}
 const lower=value.toLocaleLowerCase("ko-KR"),find=needle.toLocaleLowerCase("ko-KR");
 let cursor=0,match=lower.indexOf(find);
 while(match>=0){
  if(match>cursor)target.append(document.createTextNode(value.slice(cursor,match)));
  const mark=document.createElement("mark");mark.className="search-match";mark.textContent=value.slice(match,match+needle.length);target.append(mark);
  cursor=match+needle.length;match=lower.indexOf(find,cursor);
 }
 if(cursor<value.length)target.append(document.createTextNode(value.slice(cursor)));
}
function makeSearchResultRow(page,query,kind){
 const row=document.createElement("article");row.className="search-result-row";
 const icon=document.createElement("span");icon.className="search-result-icon"+(kind==="category"?" is-category":"");
 icon.setAttribute("aria-hidden","true");icon.textContent=kind==="category"?"▣":"▤";
 const body=document.createElement("div");body.className="search-result-main";
 const link=document.createElement("a");link.className="search-result-title";link.href=routeFor(page.title);
 appendSearchHighlighted(link,page.title,query);
 link.addEventListener("click",event=>{event.preventDefault();openPage(page.title)});
 body.append(link);
 if(page.snippet){
  const snippet=document.createElement("p");snippet.className="search-result-snippet";
  appendSearchHighlighted(snippet,page.snippet,query);body.append(snippet);
 }
 const meta=document.createElement("div");meta.className="search-result-meta";
 const updated=page.updated_at?new Date(page.updated_at):null;
 const dateText=updated&&!Number.isNaN(updated.getTime())
  ?updated.toLocaleString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})
  :"수정 날짜 정보 없음";
 const reason=page.match_type==="title"?"제목 일치":page.match_type==="content"?"본문 일치":kind==="category"?"분류":"문서";
 meta.textContent=reason+" · 최근 수정 "+dateText;
 body.append(meta);row.append(icon,body);return row;
}
function renderSearchGroup(host,title,pages,query,kind){
 if(!pages.length)return;
 let group=host.querySelector('.search-result-group[data-search-kind="'+kind+'"]');
 if(!group){
  group=document.createElement("section");group.className="search-result-group";group.dataset.searchKind=kind;
  const heading=document.createElement("h2");heading.className="search-result-group-heading";
  const badge=document.createElement("span");badge.className="search-group-icon"+(kind==="category"?" is-category":"");
  badge.setAttribute("aria-hidden","true");badge.textContent=kind==="category"?"▣":"▤";
  const label=document.createElement("span");label.textContent=title;
  const number=document.createElement("small");number.textContent="0건";number.className="search-result-group-count";
  heading.append(badge,label,number);
  const list=document.createElement("div");list.className="search-result-list";
  group.append(heading,list);host.append(group);
 }
 const list=group.querySelector(".search-result-list");
 pages.forEach(page=>list.append(makeSearchResultRow(page,query,kind)));
 const count=Number(group.dataset.resultCount||0)+pages.length;
 group.dataset.resultCount=String(count);
 const number=group.querySelector(".search-result-group-count");
 if(number)number.textContent=count.toLocaleString("ko-KR")+"건";
}
function makeSearchFileRow(file,query){
 const row=document.createElement("article");row.className="search-result-row search-file-row";
 const preview=document.createElement("span");preview.className="search-file-preview";
 preview.setAttribute("aria-hidden","true");
 if(String(file.content_type||"").startsWith("image/")){
  const image=document.createElement("img");
  image.src=new URL("/media/"+encodeURIComponent(file.id),apiBase()).href;
  image.alt="";image.loading="lazy";image.decoding="async";
  preview.append(image);
 }else preview.textContent="▧";
 const body=document.createElement("div");body.className="search-result-main";
 const link=document.createElement("a");link.className="search-result-title";
 link.href=new URL("/media/"+encodeURIComponent(file.id),apiBase()).href;
 link.target="_blank";link.rel="noopener noreferrer";
 appendSearchHighlighted(link,file.filename,query);
 body.append(link);
 const meta=document.createElement("div");meta.className="search-result-meta";
 const created=file.created_at?new Date(file.created_at):null;
 const dateText=created&&!Number.isNaN(created.getTime())
  ?created.toLocaleString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})
  :"등록 날짜 정보 없음";
 const type=String(file.content_type||"application/octet-stream").replace(/^image\//,"").toUpperCase();
 meta.textContent=type+" 파일 · 등록 "+dateText;
 body.append(meta);
 if(file.aliases){
  const alias=addText(body,"span","이전 이름: "+file.aliases);
  alias.className="search-result-meta search-file-aliases";
 }
 row.append(preview,body);return row;
}
function renderSearchFileGroup(host,files,query){
 if(!files.length)return;
 let group=host.querySelector('.search-result-group[data-search-kind="files"]');
 if(!group){
  group=document.createElement("section");group.className="search-result-group search-file-group";group.dataset.searchKind="files";
  const heading=document.createElement("h2");heading.className="search-result-group-heading";
  const badge=document.createElement("span");badge.className="search-group-icon is-file";
  badge.setAttribute("aria-hidden","true");badge.textContent="▧";
  const label=document.createElement("span");label.textContent="파일";
  const number=document.createElement("small");number.textContent="0개";number.className="search-result-group-count";
  heading.append(badge,label,number);
  const list=document.createElement("div");list.className="search-result-list";
  group.append(heading,list);host.append(group);
 }
 const list=group.querySelector(".search-result-list");
 files.forEach(file=>list.append(makeSearchFileRow(file,query)));
 const count=Number(group.dataset.resultCount||0)+files.length;
 group.dataset.resultCount=String(count);
 const number=group.querySelector(".search-result-group-count");
 if(number)number.textContent=count.toLocaleString("ko-KR")+"개";
}
function renderSearchEmpty(host,query){
 const empty=document.createElement("div");empty.className="search-empty-state";
 const icon=document.createElement("span");icon.className="search-empty-icon";icon.textContent="⌕";icon.setAttribute("aria-hidden","true");
 const title=document.createElement("strong");title.textContent="검색 결과가 없습니다.";
 const desc=document.createElement("p");desc.textContent="‘"+query+"’와 일치하는 문서를 찾지 못했습니다. 다른 검색어나 검색 범위를 사용해 보세요.";
 empty.append(icon,title,desc);host.append(empty);
}
let activeSearchState={query:"",scope:"all",pageOffset:0,fileOffset:0,hasMore:false,loading:false,requestId:0};
function getSearchMoreButton(host){
 let button=$("search-more-results");
 if(!button){
  button=document.createElement("button");button.id="search-more-results";button.type="button";
  button.className="search-load-more";button.textContent="더 많은 검색 결과";
  button.addEventListener("click",loadMoreSearchResults);
  host.after(button);
 }
 return button;
}
function updateSearchMoreButton(host){
 const button=getSearchMoreButton(host);
 button.hidden=!activeSearchState.hasMore;
 button.disabled=activeSearchState.loading;
 button.textContent=activeSearchState.loading?"검색 결과를 불러오는 중…":"더 많은 검색 결과";
}
function appendSearchPageResults(host,data,query){
 const pages=data.pages||[],files=data.files||[];
 const categories=pages.filter(page=>/^분류\s*[:：]/.test(String(page.title||"")));
 const documents=pages.filter(page=>!/^분류\s*[:：]/.test(String(page.title||"")));
 renderSearchGroup(host,"분류",categories,query,"category");
 renderSearchGroup(host,"문서",documents,query,"document");
 renderSearchFileGroup(host,files,query);
 activeSearchState.pageOffset+=pages.length;
 activeSearchState.fileOffset+=files.length;
 activeSearchState.hasMore=Boolean(data.pages_has_more||data.files_has_more||data.has_more);
}
async function loadSearchPage(query,scope="all",push=false){
 const q=String(query||"").trim().slice(0,100),selectedScope=scope==="title"?"title":scope==="files"?"files":"all";
 if(push)history.pushState(null,"",searchPageUrl(q,selectedScope));
 const requestId=activeSearchState.requestId+1;
 activeSearchState={query:q,scope:selectedScope,pageOffset:0,fileOffset:0,hasMore:false,loading:Boolean(q),requestId};
 showSearchView();$("query").value=q;$("search-page-query").value=q;$("search-page-scope").value=selectedScope;
 const host=$("search-result-groups");host.replaceChildren();
 const moreButton=getSearchMoreButton(host);moreButton.hidden=true;
 $("search-result-query").textContent=q?"검색어: "+q:"";
 const createButton=$("search-create-page");createButton.hidden=!q;createButton.onclick=()=>editPage(q,"");
 if(!q){
  activeSearchState.loading=false;
  $("search-result-count").textContent="검색어를 입력해 주세요.";
  const empty=document.createElement("div");empty.className="search-empty-state";
  const icon=document.createElement("span");icon.className="search-empty-icon";icon.textContent="⌕";icon.setAttribute("aria-hidden","true");
  const title=document.createElement("strong");title.textContent="무엇을 찾고 있나요?";
  const desc=document.createElement("p");desc.textContent="문서 제목·본문 또는 업로드된 파일 이름을 검색할 수 있습니다.";
  empty.append(icon,title,desc);host.append(empty);return;
 }
 $("search-result-count").textContent="검색 중입니다…";
 const started=performance.now();
 try{
  const data=await api("/api/pages?q="+encodeURIComponent(q)+"&scope="+selectedScope+"&limit=25&page_offset=0&file_offset=0");
  if(requestId!==activeSearchState.requestId)return;
  const pages=data.pages||[],files=data.files||[];
  const pageTotal=Number(data.page_total??pages.length),fileTotal=Number(data.file_total??files.length);
  const total=Number.isFinite(Number(data.total))?Number(data.total):pageTotal+fileTotal;
  const elapsed=((performance.now()-started)/1000).toFixed(3);
  $("search-result-count").textContent="전체 "+total.toLocaleString("ko-KR")+"건 · 문서 "+pageTotal.toLocaleString("ko-KR")+"건 · 파일 "+fileTotal.toLocaleString("ko-KR")+"개 · 관련도순 ("+elapsed+"초)";
  host.replaceChildren();
  if(!pages.length&&!files.length){renderSearchEmpty(host,q);activeSearchState.loading=false;return}
  appendSearchPageResults(host,data,q);
  activeSearchState.loading=false;
  updateSearchMoreButton(host);
 }catch(error){
  if(requestId!==activeSearchState.requestId)return;
  activeSearchState.loading=false;
  $("search-result-count").textContent="검색을 완료하지 못했습니다.";
  const message=document.createElement("div");message.className="search-empty-state is-error";
  const title=document.createElement("strong");title.textContent="검색 중 오류가 발생했습니다.";
  const desc=document.createElement("p");desc.textContent=error.message||"잠시 후 다시 시도해 주세요.";
  message.append(title,desc);host.append(message);
 }
}
async function loadMoreSearchResults(){
 const state=activeSearchState;
 if(!state.query||state.loading||!state.hasMore)return;
 state.loading=true;
 const host=$("search-result-groups");
 updateSearchMoreButton(host);
 try{
  const data=await api("/api/pages?q="+encodeURIComponent(state.query)+"&scope="+state.scope+"&limit=25&page_offset="+state.pageOffset+"&file_offset="+state.fileOffset);
  if(state!==activeSearchState)return;
  appendSearchPageResults(host,data,state.query);
  state.loading=false;
  if(!data.pages?.length&&!data.files?.length)state.hasMore=false;
  updateSearchMoreButton(host);
 }catch(error){
  state.loading=false;
  updateSearchMoreButton(host);
  const note=document.createElement("p");note.className="search-result-note is-error";
  note.textContent="추가 검색 결과를 불러오지 못했습니다: "+String(error.message||error);
  host.append(note);
 }
}
async function searchFor(query,scope="all"){
 const q=String(query||"").trim();if(!q){$("query").focus();return}
 await loadSearchPage(q,scope,true);
}
const headerSearchForm=$("search");
const headerSearchInput=$("query");
let headerSuggestionTimer=0,headerSuggestionSequence=0;
let headerSuggestionHost=null;
if(headerSearchForm&&headerSearchInput){
 headerSearchForm.classList.add("has-search-suggestions");
 headerSuggestionHost=document.createElement("div");
 headerSuggestionHost.className="search-suggestions";
 headerSuggestionHost.id="search-suggestions";
 headerSuggestionHost.setAttribute("role","listbox");
 headerSuggestionHost.hidden=true;
 headerSearchForm.append(headerSuggestionHost);
 headerSearchInput.setAttribute("aria-autocomplete","list");
 headerSearchInput.setAttribute("aria-controls","search-suggestions");
 headerSearchInput.addEventListener("input",()=>{
  const query=headerSearchInput.value.trim();
  const sequence=++headerSuggestionSequence;
  window.clearTimeout(headerSuggestionTimer);
  if(query.length<2){headerSuggestionHost.hidden=true;headerSuggestionHost.replaceChildren();return}
  headerSuggestionTimer=window.setTimeout(async()=>{
   try{
    const data=await api("/api/pages?q="+encodeURIComponent(query)+"&scope=title&limit=8&page_offset=0");
    if(sequence!==headerSuggestionSequence||headerSearchInput.value.trim()!==query)return;
    headerSuggestionHost.replaceChildren();
    const pages=(data.pages||[]).slice(0,8);
    if(!pages.length){headerSuggestionHost.hidden=true;return}
    pages.forEach(page=>{
     const item=document.createElement("button");item.type="button";item.className="search-suggestion-item";item.setAttribute("role","option");
     const title=document.createElement("span");title.className="search-suggestion-title";appendSearchHighlighted(title,page.title,query);
     const meta=document.createElement("small");meta.textContent="문서";
     item.append(title,meta);
     item.addEventListener("click",()=>{headerSuggestionHost.hidden=true;openPage(page.title)});
     headerSuggestionHost.append(item);
    });
    const more=document.createElement("button");more.type="button";more.className="search-suggestion-more";more.textContent="검색 결과 전체 보기";
    more.addEventListener("click",()=>{headerSuggestionHost.hidden=true;searchFor(query)});
    headerSuggestionHost.append(more);headerSuggestionHost.hidden=false;
   }catch(error){headerSuggestionHost.hidden=true}
  },180);
 });
 headerSearchInput.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!headerSuggestionHost.hidden){headerSuggestionHost.hidden=true;event.stopPropagation()}
 });
 document.addEventListener("pointerdown",event=>{
  if(!headerSearchForm.contains(event.target))headerSuggestionHost.hidden=true;
 });
}

$("search").onsubmit=e=>{e.preventDefault();searchFor($("query").value)};
$("search-page-form").onsubmit=e=>{
 e.preventDefault();searchFor($("search-page-query").value,$("search-page-scope").value);
};
function diffRevisionLines(beforeText, afterText) {
  const before = String(beforeText || "").split("\n"), after = String(afterText || "").split("\n");
  const n = before.length, m = after.length;
  if ((n + 1) * (m + 1) > 1800000) {
    let prefix = 0;
    while (prefix < n && prefix < m && before[prefix] === after[prefix]) prefix++;
    let suffix = 0;
    while (suffix < n - prefix && suffix < m - prefix && before[n - 1 - suffix] === after[m - 1 - suffix]) suffix++;
    return [
      ...before.slice(0, prefix).map(text => ({ type: "same", text })),
      ...before.slice(prefix, n - suffix).map(text => ({ type: "remove", text })),
      ...after.slice(prefix, m - suffix).map(text => ({ type: "add", text })),
      ...before.slice(n - suffix).map(text => ({ type: "same", text }))
    ];
  }
  const width = m + 1, dp = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i * width + j] = before[i] === after[j] ? 1 + dp[(i + 1) * width + j + 1] :
      Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
  }
  const result = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) { result.push({ type: "same", text: before[i++] }); j++; }
    else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) result.push({ type: "remove", text: before[i++] });
    else result.push({ type: "add", text: after[j++] });
  }
  while (i < n) result.push({ type: "remove", text: before[i++] });
  while (j < m) result.push({ type: "add", text: after[j++] });
  return result;
}
let historyItemsForCompare = [];
let historyDocumentTitle = "";
let revisionA = null, revisionB = null;

function formatRevisionDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? String(value || "날짜 정보 없음") : date.toLocaleString("ko-KR");
}
function makeHistoryButton(label, action, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ("button " + extraClass).trim();
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}
function canEditHistoryDocument() {
  if (!loggedInName && !isWikiAdmin) return false;
  if (currentTitle === "대문") return false;
  if (currentProtection.level === "admin") return false;
  if (currentProtection.level === "registered" && !loggedInName && !isWikiAdmin) return false;
  return true;
}
function selectedRevisionLabel(id) {
  const item = historyItemsForCompare.find(value => Number(value.id) === Number(id));
  return item ? "#" + item.id + " · " + formatRevisionDate(item.created_at) : "선택 안 됨";
}
function showHistoryList() {
  const body = $("dialog-body");
  body.replaceChildren();
  addText(body, "p", "각 버전의 원문 문법과 실제 렌더 결과를 따로 열어볼 수 있습니다. A와 B를 선택하면 두 버전의 차이도 비교할 수 있습니다.").className = "compare-intro";
  if (!historyItemsForCompare.length) {
    addText(body, "p", "이 문서에는 저장된 역사 기록이 없습니다.").className = "empty-list";
    return;
  }
  const canRestore = canEditHistoryDocument();
  const choices = document.createElement("div");
  choices.className = "history-version-list";
  historyItemsForCompare.forEach(item => {
    const row = document.createElement("section");
    row.className = "history-version-row";
    const info = document.createElement("div");
    info.className = "history-version-info";
    addText(info, "strong", "버전 #" + item.id + " · " + formatRevisionDate(item.created_at));
    addText(info, "span", (item.editor || "알 수 없음") + (item.summary ? " · " + item.summary : " · 편집 요약 없음"));
    const actions = document.createElement("div");
    actions.className = "history-version-actions";
    actions.append(
      makeHistoryButton("문법 보기", () => showRevisionSource(item.id)),
      makeHistoryButton("렌더링 보기", () => showRevisionRendered(item.id))
    );
    if (canRestore) actions.append(makeHistoryButton("이 버전으로 복원", () => restoreRevision(item.id), "history-restore-button"));
    const aButton = makeHistoryButton(revisionA === Number(item.id) ? "A 기준 선택됨" : "A 기준", () => {
      revisionA = revisionA === Number(item.id) ? null : Number(item.id);
      if (revisionB === Number(item.id)) revisionB = null;
      showHistoryList();
    });
    aButton.classList.toggle("selected", revisionA === Number(item.id));
    const bButton = makeHistoryButton(revisionB === Number(item.id) ? "B 비교 선택됨" : "B 비교", () => {
      revisionB = revisionB === Number(item.id) ? null : Number(item.id);
      if (revisionA === Number(item.id)) revisionA = null;
      showHistoryList();
    });
    bButton.classList.toggle("selected", revisionB === Number(item.id));
    actions.append(aButton, bButton);
    row.append(info, actions);
    choices.append(row);
  });
  body.append(choices);
  const selection = document.createElement("div");
  selection.className = "history-compare-selection";
  addText(selection, "p", "A 기준: " + selectedRevisionLabel(revisionA)).className = "history-selection-label";
  addText(selection, "p", "B 비교: " + selectedRevisionLabel(revisionB)).className = "history-selection-label";
  const compareActions = document.createElement("div");
  compareActions.className = "history-compare-actions";
  const compareSource = makeHistoryButton("문법 차이 비교", () => renderRevisionComparison(revisionA, revisionB, "source"), "button-primary");
  const compareRendered = makeHistoryButton("렌더 결과 비교", () => renderRevisionComparison(revisionA, revisionB, "render"));
  const canCompare = Boolean(revisionA && revisionB && revisionA !== revisionB);
  compareSource.disabled = !canCompare;
  compareRendered.disabled = !canCompare;
  compareActions.append(compareSource, compareRendered);
  if (!canRestore) addText(selection, "p", "이전 버전 복원은 현재 문서를 편집할 수 있는 계정에만 제공됩니다.").className = "history-permission-note";
  selection.append(compareActions);
  body.append(selection);
}
async function fetchHistoryRevision(id) {
  const title = historyDocumentTitle || currentTitle;
  if (!title) throw new Error("문서 제목을 확인할 수 없습니다.");
  const query = "?id=" + encodeURIComponent(id) + "&title=" + encodeURIComponent(title);
  const data = await api("/api/revision" + query);
  if (!data.revision || data.revision.title !== title) throw new Error("현재 문서에 속한 버전을 찾을 수 없습니다.");
  return data.revision;
}
async function restoreRevision(id) {
  if (!canEditHistoryDocument()) {
    $("dialog-status").textContent = "이전 버전을 복원하려면 현재 문서의 편집 권한이 필요합니다.";
    return;
  }
  const item = historyItemsForCompare.find(value => Number(value.id) === Number(id));
  const title = historyDocumentTitle || currentTitle;
  const versionDate = item ? formatRevisionDate(item.created_at) : "선택한 버전";
  if (!window.confirm("'" + title + "' 문서를 " + versionDate + " 버전으로 복원할까요?\n현재 문서 내용도 별도의 역사 항목으로 먼저 보존됩니다.")) return;
  try {
    await api("/api/revision/restore", { method: "POST", body: JSON.stringify({ id: Number(id), title }) });
    invalidateNamuDatabaseCache();
    $("dialog").close();
    await loadPage(title, false);
    $("message").textContent = "버전 #" + id + " 복원이 완료되었습니다. 복원 직전 내용도 역사에 보존했습니다.";
  } catch (error) {
    $("dialog-status").textContent = error.message;
    $("message").textContent = error.message;
  }
}
async function showRevisionSource(id) {
  const body = $("dialog-body");
  body.replaceChildren();
  addText(body, "p", "문서 원문 문법을 불러오는 중입니다.").className = "compare-intro";
  try {
    const revision = await fetchHistoryRevision(id);
    body.replaceChildren();
    addText(body, "p", "버전 #" + revision.id + " · " + formatRevisionDate(revision.created_at) + " · " + (revision.editor || "알 수 없음")).className = "compare-intro";
    if (revision.summary) addText(body, "p", "편집 요약: " + revision.summary).className = "compare-intro";
    const source = document.createElement("pre");
    source.className = "revision-source-code";
    source.tabIndex = 0;
    source.textContent = String(revision.content || "");
    body.append(source);
    const actions = document.createElement("div");
    actions.className = "revision-preview-actions";
    actions.append(
      makeHistoryButton("원문 복사", async () => {
        try {
          await navigator.clipboard.writeText(String(revision.content || ""));
          $("dialog-status").textContent = "원문을 클립보드에 복사했습니다.";
        } catch {
          const temporary = document.createElement("textarea");
          temporary.value = String(revision.content || "");
          temporary.style.position = "fixed";
          temporary.style.opacity = "0";
          document.body.append(temporary);
          temporary.select();
          const copied = document.execCommand("copy");
          temporary.remove();
          $("dialog-status").textContent = copied ? "원문을 복사했습니다." : "원문을 직접 선택해 복사하세요.";
        }
      }),
      ...(canEditHistoryDocument() ? [makeHistoryButton("이 버전으로 복원", () => restoreRevision(id), "button-primary")] : []),
      makeHistoryButton("역사 목록", showHistoryList)
    );
    body.append(actions);
  } catch (error) {
    body.replaceChildren();
    addText(body, "p", error.message).className = "dialog-status";
    body.append(makeHistoryButton("역사 목록", showHistoryList));
  }
}
async function showRevisionRendered(id) {
  const body = $("dialog-body");
  body.replaceChildren();
  addText(body, "p", "선택한 버전을 Worker에서 렌더링하고 있습니다.").className = "compare-intro";
  try {
    const revision = await fetchHistoryRevision(id);
    body.replaceChildren();
    addText(body, "p", "버전 #" + revision.id + " · " + formatRevisionDate(revision.created_at) + " · " + (revision.editor || "알 수 없음")).className = "compare-intro";
    const preview = document.createElement("article");
     preview.className = "namumark-content-host revision-single-preview";
    body.append(preview);
    await renderNamuMarkup(revision.content, preview, historyDocumentTitle || revision.title);
    const actions = document.createElement("div");
    actions.className = "revision-preview-actions";
    actions.append(
      makeHistoryButton("문법 보기", () => showRevisionSource(id)),
      ...(canEditHistoryDocument() ? [makeHistoryButton("이 버전으로 복원", () => restoreRevision(id), "button-primary")] : []),
      makeHistoryButton("역사 목록", showHistoryList)
    );
    body.append(actions);
  } catch (error) {
    body.replaceChildren();
    addText(body, "p", error.message).className = "dialog-status";
    body.append(makeHistoryButton("역사 목록", showHistoryList));
  }
}
async function renderRevisionComparison(idA, idB, mode = "source") {
  const body = $("dialog-body");
  body.replaceChildren();
  addText(body, "p", "두 버전의 원문을 불러오고 있습니다.").className = "compare-intro";
  try {
    const [a, b] = await Promise.all([fetchHistoryRevision(idA), fetchHistoryRevision(idB)]);
    body.replaceChildren();
    addText(body, "p", "A 기준: 버전 #" + a.id + " · " + formatRevisionDate(a.created_at) + " → B 비교: 버전 #" + b.id + " · " + formatRevisionDate(b.created_at)).className = "compare-intro";
    const toolbar = document.createElement("div");
    toolbar.className = "revision-compare-toolbar";
    const sourceButton = makeHistoryButton("문법 차이", () => showSourceComparison(), "button-primary");
    const renderButton = makeHistoryButton("렌더 결과", () => showRenderedComparison());
    const back = makeHistoryButton("버전 선택으로", showHistoryList);
    toolbar.append(sourceButton, renderButton);
    if (canEditHistoryDocument()) {
      toolbar.append(
        makeHistoryButton("A 버전 복원", () => restoreRevision(idA)),
        makeHistoryButton("B 버전 복원", () => restoreRevision(idB))
      );
    }
    toolbar.append(back);
    body.append(toolbar);
    const panel = document.createElement("div");
    panel.className = "revision-compare-panel";
    body.append(panel);
    function showSourceComparison() {
      sourceButton.classList.add("button-primary");
      renderButton.classList.remove("button-primary");
      panel.replaceChildren();
      const diff = document.createElement("div");
      diff.className = "revision-diff";
      const rows = diffRevisionLines(a.content, b.content);
      let added = 0, removed = 0;
      rows.forEach(line => {
        if (line.type === "add") added++;
        if (line.type === "remove") removed++;
        const row = document.createElement("div");
        row.className = "revision-diff-line diff-" + line.type;
        const sign = document.createElement("span");
        sign.className = "revision-diff-sign";
        sign.textContent = line.type === "add" ? "+" : line.type === "remove" ? "−" : " ";
        const content = document.createElement("code");
        content.textContent = line.text || " ";
        row.append(sign, content);
        diff.append(row);
      });
      addText(panel, "p", "추가 " + added + "줄 · 삭제 " + removed + "줄 · 변경된 원문 문법").className = "compare-summary";
      panel.append(diff);
    }
    async function showRenderedComparison() {
      sourceButton.classList.remove("button-primary");
      renderButton.classList.add("button-primary");
      panel.replaceChildren();
      const grid = document.createElement("div");
      grid.className = "revision-render-grid";
      const makePane = (label, revision) => {
        const pane = document.createElement("section");
        pane.className = "revision-render-pane";
        addText(pane, "h3", label + " · " + formatRevisionDate(revision.created_at));
        const article = document.createElement("article");
         article.className = "namumark-content-host revision-rendered-content";
        pane.append(article);
        grid.append(pane);
        return article;
      };
      const left = makePane("A 기준", a);
      const right = makePane("B 비교", b);
      panel.append(grid);
      await Promise.all([
        renderNamuMarkup(a.content, left, historyDocumentTitle || a.title),
        renderNamuMarkup(b.content, right, historyDocumentTitle || b.title)
      ]);
    }
    if (mode === "render") await showRenderedComparison();
    else showSourceComparison();
  } catch (error) {
    body.replaceChildren();
    addText(body, "p", error.message).className = "dialog-status";
    body.append(makeHistoryButton("버전 선택으로", showHistoryList));
  }
}

$("history").onclick=async()=>{
  try {
    historyDocumentTitle=currentTitle;
    const data=await api("/api/history?title="+encodeURIComponent(historyDocumentTitle));
    historyItemsForCompare=(data.revisions||[]).map(item=>({...item,id:Number(item.id)})); revisionA=null; revisionB=null;
    $("dialog-title").textContent=historyDocumentTitle+" — 문서 역사 및 버전 비교";
    $("dialog-status").textContent="";
    $("save").textContent="닫기"; $("save").onclick=()=>$("dialog").close();
    showHistoryList(); $("dialog").showModal();
  } catch(error) { $("message").textContent=error.message; }
};
$("history-tab").onclick=()=>$("history").click();
$("backlinks-tab").onclick=()=>loadBacklinks(currentTitle,true);
async function openFileManager(){
 if(!loggedInName){openLogin();return}
 try{
  const data=await api("/api/files?manage=1");
  showDialog("파일 관리",[],async()=>{$("dialog").close()},"닫기");
  const body=$("dialog-body");body.replaceChildren();
  const intro=addText(body,"p",data.isAdmin?"전체 파일을 관리할 수 있습니다.":"내가 업로드한 파일만 이름을 변경할 수 있습니다.");
  intro.className="file-manager-intro";
  const files=data.files||[];
  if(!files.length){addText(body,"p","관리할 파일이 없습니다.").className="empty-list";return}
  const list=document.createElement("div");list.className="file-manager-list";
  files.forEach(file=>{
   const row=document.createElement("div");row.className="file-manager-row";
   const image=document.createElement("img");image.src=apiBase()+"/media/"+file.id;image.alt=file.filename;image.loading="lazy";
   const info=document.createElement("div");info.className="file-manager-info";
   addText(info,"strong",file.filename);
   addText(info,"small",(file.content_type||"이미지")+" · "+(file.created_at?new Date(file.created_at).toLocaleDateString("ko-KR"):""));
   if(data.isAdmin&&file.owner)addText(info,"small","업로더: "+file.owner);
   const actions=document.createElement("div");actions.className="file-manager-actions";
   const rename=document.createElement("button");rename.type="button";rename.className="button";rename.textContent="이름 변경";
   rename.onclick=()=>{
    $("dialog").close();
    const base=file.filename.replace(/\.[^.]+$/,"");
    showDialog("파일 이름 변경",[{id:"rename-file-name",label:"새 파일 이름",value:base}],async()=>{
     const newName=$("rename-file-name").value.trim();
     if(!newName)throw Error("파일 이름을 입력하세요.");
     await api("/api/file",{method:"PATCH",body:JSON.stringify({id:file.id,filename:newName})});
     invalidateNamuDatabaseCache();
     $("dialog").close();await openFileManager()
    },"변경");
   };
   const insert=document.createElement("button");insert.type="button";insert.className="button";insert.textContent="문법 삽입";
   insert.onclick=async()=>{
    const markup="[[파일:"+file.filename+"|width=500]]";
    if(!$("editor-view").hidden){
     const field=$("editor-content");field.setRangeText(markup,field.selectionStart,field.selectionEnd,"end");field.dispatchEvent(new Event("input",{bubbles:true}));syncAonMonacoSelectionFromTextarea();focusAonWikiEditor();$("dialog").close()
    }else{
     try{await navigator.clipboard.writeText(markup);insert.textContent="복사됨"}catch{insert.textContent="복사 권한 없음"}
    }
   };
   actions.append(rename,insert);row.append(image,info,actions);list.append(row)
  });
  body.append(list)
 }catch(error){$("message").textContent=error.message}
}
$("file-manager").onclick=()=>openFileManager();
$("scroll-top")?.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
$("scroll-bottom")?.addEventListener("click",()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"}));
$("upload").onclick=()=>{$("file").click()};
$("editor-image").onclick=()=>{$("file").click()};
const MAX_RAW_IMAGE_BYTES=3*1024*1024;
const MAX_STORED_IMAGE_BYTES=900*1024;
async function decodeImageFile(file){
 if(typeof createImageBitmap==="function"){
  try{const bitmap=await createImageBitmap(file);return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()}}catch{}
 }
 const url=URL.createObjectURL(file);
 try{const image=new Image();image.src=url;await image.decode();return {source:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>URL.revokeObjectURL(url)}}
 catch(error){URL.revokeObjectURL(url);throw error}
}
async function compressImageForUpload(file){
 if(file.type==="image/svg+xml"||/\.svg$/i.test(file.name))return {blob:new Blob([await file.text()],{type:"image/svg+xml"}),filename:file.name.replace(/\.svg$/i,"")+".svg",compressed:false,animatedGif:false,originalSize:file.size,isSvg:true};
 if(file.size<=MAX_STORED_IMAGE_BYTES)return {blob:file,filename:file.name,compressed:false,animatedGif:false,originalSize:file.size};
 const decoded=await decodeImageFile(file);
 try{
  if(!decoded.width||!decoded.height)throw Error("이미지 크기를 확인할 수 없습니다.");
  const canvas=document.createElement("canvas");
  const context=canvas.getContext("2d",{alpha:true});
  if(!context)throw Error("이미지 압축 기능을 사용할 수 없습니다.");
  let scale=Math.min(1,2400/Math.max(decoded.width,decoded.height));
  const qualities=[0.86,0.78,0.70,0.62,0.54];
  for(let pass=0;pass<6;pass++){
   canvas.width=Math.max(1,Math.round(decoded.width*scale));
   canvas.height=Math.max(1,Math.round(decoded.height*scale));
   context.clearRect(0,0,canvas.width,canvas.height);
   context.drawImage(decoded.source,0,0,canvas.width,canvas.height);
   for(const quality of qualities){
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",quality));
    if(!blob)continue;
    if(blob.type!=="image/webp")throw Error("이 브라우저에서 WebP 압축을 지원하지 않습니다. 이미지를 더 작은 파일로 저장한 뒤 다시 시도하세요.");
    if(blob.size<=MAX_STORED_IMAGE_BYTES){
     const base=file.name.replace(/\.[^.]+$/,"")||"image";
     return {blob,filename:base+".webp",compressed:true,animatedGif:file.type==="image/gif",originalSize:file.size}
    }
   }
   scale*=0.82;
  }
  throw Error("자동 압축 후에도 900KB를 넘습니다. 더 작은 이미지로 다시 시도하세요.");
 }finally{decoded.close()}
}
function formatImageSize(bytes){return bytes>=1024*1024?(bytes/1024/1024).toFixed(2)+"MB":Math.round(bytes/1024)+"KB"}

$("file").onchange=async()=>{
 const file=$("file").files[0];$("file").value="";
 if(!file)return;
 if(file.size>MAX_RAW_IMAGE_BYTES||((file.type==="image/svg+xml"||/\.svg$/i.test(file.name))&&file.size>1024*1024)){
  const message=(file.type==="image/svg+xml"||/\.svg$/i.test(file.name))?"SVG 파일은 1MB 이하만 업로드할 수 있습니다.":"이미지는 원본 3MB 이하만 업로드할 수 있습니다.";
  if(!$("editor-view").hidden)$("editor-status").textContent=message;else $("message").textContent=message;
  return
 }
 const defaultName=file.name.replace(/\.[^.]+$/,"");
 showDialog("이미지 업로드",[{id:"upload-filename",label:"파일 이름",value:defaultName}],async()=>{
  $("dialog-status").textContent="이미지를 확인하고 압축하는 중…";
  const compressed=await compressImageForUpload(file);
  if(compressed.animatedGif&&!confirm("용량을 줄이기 위해 GIF의 첫 프레임을 정적 WebP 이미지로 변환합니다. 애니메이션은 유지되지 않습니다. 계속할까요?"))return;
  if(compressed.compressed){
   $("dialog-status").textContent="압축 완료: "+formatImageSize(compressed.originalSize)+" → "+formatImageSize(compressed.blob.size)+". 업로드 중…";
  }else{$("dialog-status").textContent="업로드 중…"}
  const form=new FormData();form.append("file",compressed.blob,compressed.filename);form.append("filename",$("upload-filename").value.trim());
  const data=await api("/api/upload",{method:"POST",body:form});
  invalidateNamuDatabaseCache();
  const markup="[[파일:"+data.filename+"|width=500]]";
  const compressionNote=compressed.isSvg?"SVG 벡터 이미지를 원본 형식으로 업로드했습니다.":compressed.compressed?"원본 "+formatImageSize(compressed.originalSize)+" → "+formatImageSize(compressed.blob.size)+"로 자동 압축했습니다.":"원본 파일을 그대로 업로드했습니다.";
  if(!$("editor-view").hidden){
   const field=$("editor-content");field.setRangeText(markup,field.selectionStart,field.selectionEnd,"end");field.dispatchEvent(new Event("input",{bubbles:true}));syncAonMonacoSelectionFromTextarea();focusAonWikiEditor();
   $("editor-status").textContent=compressionNote;
  }else if(currentTitle){
   $("dialog").close();editPage(currentTitle,currentContent+(currentContent?"\n\n":"")+markup);return
  }else{
   $("dialog").close();
   showDialog("이미지 업로드 완료",[{id:"uploaded-image-markup",label:"문서에 붙여넣을 나무마크",value:markup}],async()=>{$("dialog").close()},"닫기");
   addText($("dialog-body"),"p",compressionNote+" 이미지는 파일 관리에서 확인할 수 있습니다.").className="dialog-help";
   addText($("dialog-body"),"p","아래 문법을 복사해 대문이나 문서에 붙여넣으세요.").className="dialog-help";
   const copy=document.createElement("button");copy.type="button";copy.className="button";copy.textContent="문법 복사";
   copy.onclick=async()=>{try{await navigator.clipboard.writeText(markup);copy.textContent="복사 완료"}catch{const field=$("uploaded-image-markup");field.focus();field.select();copy.textContent="선택 완료"}};
   $("dialog-body").append(copy);return
  }
  $("dialog").close()
 },"업로드");
 addText($("dialog-body"),"p","PNG, JPG, GIF, WebP, SVG를 지원합니다. 원본 최대 3MB, 일반 이미지는 900KB 초과 시 WebP로 압축하며 SVG는 벡터 형식을 유지합니다.").className="dialog-help";
};
window.addEventListener("popstate",readRoute);
window.addEventListener("hashchange",readRoute);
if(document.body.dataset.ssrPage==="true"){
 if(initialSsrState?.exists){
  if($("article")?.dataset.clientRenderPending==="true"){
   if(location.hash.startsWith("#/"))requestAnimationFrame(readRoute);
   else requestAnimationFrame(()=>loadPage(currentTitle,false,location.hash?location.hash.slice(1):""));
  }else{
    prepareServerRenderedMarkup($("article"),currentTitle);
    renderDocumentMetadata($("article"),initialSsrState?.metadata,currentTitle);
   activateAonWikiInteractions($("article")).catch(error => console.warn("초기 문서 상호작용 초기화 실패",error));
   if(location.hash.startsWith("#/"))requestAnimationFrame(readRoute);
   else if(location.hash)requestAnimationFrame(()=>scrollToAnchor(location.hash.slice(1)));
  }
 }else{
  // A missing or malformed SSR state must never leave an inert document shell.
  // Re-read the canonical /w/<title> route through the normal API path.
  requestAnimationFrame(readRoute);
 }
}else{
 readRoute();
}
refreshIdentity().catch(()=>{}).finally(()=>syncDocumentEditControls());
loadGlobalRail();
startLivePageWatcher();

