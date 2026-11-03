const $=id=>document.getElementById(id);

const THEME_SETTING = "aonwiki-theme";
function applyWikiTheme(theme) {
  const selected = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = selected;
  const button = $("theme-toggle");
  if (button) {
    button.textContent = selected === "dark" ? "화이트 모드" : "다크 모드";
    button.setAttribute("aria-label", selected === "dark" ? "화이트 모드로 전환" : "다크 모드로 전환");
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = selected === "dark" ? "#151a23" : "#ffffff";
}
applyWikiTheme(localStorage.getItem(THEME_SETTING) || "light");
$("theme-toggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_SETTING, next);
  applyWikiTheme(next);
});

const API_SETTING="aonwiki-api",TOKEN_SETTING="aonwiki-key",NAME_SETTING="aonwiki-username";
const DEFAULT_API_URL="https://aon.hiakdhs323.workers.dev";
const apiBase=()=> (localStorage.getItem(API_SETTING)||DEFAULT_API_URL).replace(/\/$/,"");
const initialSsrState=window.__AONWIKI_SSR__||null;
let currentTitle=initialSsrState?.title||"",currentContent=initialSsrState?.content||"",currentProtection=initialSsrState?.protection||{level:"none",reason:""},loggedInName=sessionStorage.getItem(NAME_SETTING)||"";
const isHomeRoute=()=>!location.hash||location.hash==="#"||location.hash==="#/";
function routeFor(title,anchor=""){return "#/w/"+encodeURIComponent(title)+(anchor?"#"+encodeURIComponent(anchor):"")}
async function api(path,options={}){const headers=new Headers(options.headers||{});const token=sessionStorage.getItem(TOKEN_SETTING);if(token)headers.set("Authorization","Bearer "+token);if(options.body&&!(options.body instanceof FormData))headers.set("Content-Type","application/json");const res=await fetch(apiBase()+path,{...options,headers});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error([data.error,data.detail].filter(Boolean).join(" — ")||"요청 실패");return data}
let isWikiAdmin=false;
let currentRole="anonymous";
async function refreshIdentity(){
 try{
  const me=await api("/api/me");
  isWikiAdmin=Boolean(me.isAdmin);
  currentRole=me.role||"anonymous";
  loggedInName=me.authenticated?(me.username||""):"";
  if(loggedInName)sessionStorage.setItem(NAME_SETTING,loggedInName);
  else sessionStorage.removeItem(NAME_SETTING);
 }catch{
  isWikiAdmin=false;
  currentRole="anonymous";
  loggedInName="";
 }
 $("login").textContent=loggedInName?"로그아웃 · "+loggedInName:"로그인";
 const roleLabel=$("role-label");
 roleLabel.hidden=!loggedInName;
 roleLabel.textContent=isWikiAdmin?"위키 관리자":"회원";
 roleLabel.classList.toggle("admin",isWikiAdmin);
 $("change-password").hidden=!(loggedInName && currentRole==="user");
 $("home-admin-tools").hidden=!isWikiAdmin;
 $("file-manager").hidden=!loggedInName;
 $("upload").hidden=!loggedInName;
 $("delete-page").hidden=!isWikiAdmin||!currentTitle;
  const protectionButton=$("page-protection");
  const isArticleView=!$("document-view").hidden&&!$("backlinks-tab").hidden&&!/^(?:분류|category):/i.test(currentTitle)&&!$("message").textContent.includes("이 문서는 아직 존재하지 않습니다");
  if(protectionButton)protectionButton.hidden=!isWikiAdmin||!currentTitle||isHomeRoute()||!isArticleView;}

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
  if(fresh.length&&isHomeRoute())await loadHome();
 }catch(error){console.warn("새 문서 실시간 확인 실패:",error)}
 finally{livePollBusy=false}
}
function startLivePageWatcher(){
 if(window.aonWikiLiveTimer)return;
 checkForNewPages();
 window.aonWikiLiveTimer=window.setInterval(checkForNewPages,10000);
}
let pageNavigationSequence = 0;
function showHome(push=true){
 pageNavigationSequence++;
 if(push)history.pushState(null,"","#/");
 currentTitle="";currentContent="";
 $("home-view").hidden=false;$("document-view").hidden=true;$("editor-view").hidden=true;
 document.body.classList.remove("editor-active");
 $("home").classList.add("active");$("edit").hidden=true;$("history").hidden=true;$("upload").hidden=!loggedInName;$("delete-page").hidden=true;
 $("new").classList.remove("active");loadHome()
}
async function loadHome(){
  const list=$("page-list");
  list.replaceChildren();
  $("page-count").textContent="";
  try{
    const [data,homeData] = await Promise.all([
      api("/api/pages"),
      api("/api/home").catch(()=>({settings:{}}))
    ]);
    const settings=homeData.settings||{};
    $("home-title").textContent=settings.title||"AonWiki";
    $("home-tagline").textContent=settings.tagline||"함께 만드는 지식 백과사전";
    const hint=$("home-search-hint");
    if(hint)hint.textContent=settings.searchHint||"검색창에서 문서를 찾거나 아래 목록에서 원하는 문서를 선택하세요.";
    $("home-list-title").textContent=settings.listTitle||"최근 수정된 문서";
    $("home-bottom-title").textContent=settings.bottomTitle||"문서가 없나요?";
    $("home-bottom-text").textContent=settings.bottomText||"로그인한 뒤 새 문서를 만들어 지식을 공유할 수 있습니다.";
    const notice=$("home-notice");
    notice.textContent=settings.notice||"";
    notice.hidden=!settings.notice;
    const content=settings.content||"";
    if(content)await renderNamuMarkup(content,$("home-content"),"대문");
    else $("home-content").replaceChildren();
    $("home-admin-tools").hidden=!isWikiAdmin;

    const pages=(data.pages||[]).filter(p=>p.title!=="대문"&&!/^(?:분류|category):/i.test(p.title||""));
    $("page-count").textContent=pages.length+"개 문서";
    // The old homepage uses the classic compact document list. Category
    // browsing remains available from the sidebar and /api/categories.
    if(!pages.length){
      addText(list,"p","아직 등록된 문서가 없습니다. 로그인 후 첫 문서를 만들어 보세요.").className="empty-list";
      return;
    }
    pages.forEach(page=>{
      const row=document.createElement("div");
      row.className="page-row";
      const link=document.createElement("a");
      link.href=routeFor(page.title);
      link.textContent=page.title;
      link.addEventListener("click",event=>{
        event.preventDefault();
        openPage(page.title);
      });
      const time=document.createElement("time");
      time.textContent=page.updated_at
        ? new Date(page.updated_at).toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"})
        : "";
      row.append(link,time);
      list.append(row);
    });
  }catch(error){
    addText(list,"p",error.message).className="empty-list";
  }
}
function openPage(title,anchor=""){title=String(title||"").trim();if(!title)return;if(title==="대문"){location.assign("/");return}const target="/w/"+encodeURIComponent(title)+(anchor?"#"+encodeURIComponent(anchor):"");location.assign(target)}
function readRoute(){
 const hash=location.hash||"#/";
 if(hash==="#"||hash==="#/"||hash==="#/home"){showHome(false);return}
 if(hash==="#/categories"){loadCategoryIndex(false);return}
 if(hash==="#/recent"){loadRecentChanges(false);return}
 if(hash.startsWith("#/backlinks/")){let target=hash.slice("#/backlinks/".length);try{target=decodeURIComponent(target)}catch{}loadBacklinks(target,false);return}
 let title="",anchor="";
 if(hash.startsWith("#/w/")){const rest=hash.slice(4),parts=rest.split("#");try{title=decodeURIComponent(parts[0]);anchor=parts[1]?decodeURIComponent(parts[1]):""}catch{title=parts[0]}}
 else if(hash.startsWith("#/")){try{title=decodeURIComponent(hash.slice(2))}catch{title=hash.slice(2)}}
 if(!title||title==="대문"){showHome(false);return}
 loadPage(title,false,anchor)
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
async function resolveWikiFile(filename){
 const key=apiBase()+"|"+String(filename||"").trim().toLocaleLowerCase();
 const cached=wikiFileLookupCache.get(key);
 if(cached&&cached.expires>Date.now()){
  if(cached.url)return {url:cached.url};
  throw new Error("파일을 찾을 수 없습니다.");
 }
 if(wikiFileLookupPending.has(key))return wikiFileLookupPending.get(key);
 const pending=api("/api/file?name="+encodeURIComponent(filename)).then(data=>{
  if(!data.image||!data.image.url)throw new Error("파일을 찾을 수 없습니다.");
  const mediaUrl=new URL(data.image.url,apiBase()).href;
  wikiFileLookupCache.set(key,{url:mediaUrl,expires:Date.now()+5*60*1000});
  return {url:mediaUrl};
 }).catch(error=>{
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
 if(/^https?:\/\//i.test(filename))img.src=filename;else if(filename.startsWith("/"))img.src=new URL(filename,apiBase()).href;else if(/^[a-f0-9-]{36}$/i.test(filename))img.src=apiBase()+"/media/"+filename;
 else resolveWikiFile(filename).then(file=>{if(!imageFailed)img.src=file.url}).catch(fail);
}

function safeWikiStyle(raw) {
  const allowed = new Set([
    "color","background","background-color","font-size","font-weight","font-style",
    "text-align","text-decoration","text-transform","line-height","letter-spacing",
    "word-spacing","width","max-width","min-width","height","max-height","min-height",
    "margin","margin-left","margin-right","margin-top","margin-bottom","padding",
    "border","border-color","border-width","border-style","border-radius","border-collapse",
    "float","clear","display","vertical-align","white-space","list-style-type",
    "image-rendering","object-fit","overflow","overflow-wrap","box-shadow","opacity"
  ]);
  const output = [];
  String(raw || "").split(";").forEach(entry => {
    const at = entry.indexOf(":");
    if (at < 1) return;
    const key = entry.slice(0, at).trim().toLowerCase();
    const value = entry.slice(at + 1).trim();
    if (!allowed.has(key) || !value || /url\s*\(|expression|javascript|@import|[<>{}]/i.test(value)) return;
    output.push(key + ":" + value);
  });
  return output.join(";");
}
function sanitizeNamuStylesheet(raw) {
  const allowedSelectorPart = /^(?:\*|[a-z][a-z0-9-]*|[.#][a-z_][a-z0-9_-]*)(?::(?:hover|focus|active|first-child|last-child|only-child|nth-child\(\d+(?:n[+-]\d+)?\)|nth-of-type\(\d+(?:n[+-]\d+)?\)))?$/i;
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
      return parts.length > 0 && parts.length <= 8 && parts.every(part => allowedSelectorPart.test(part));
    });
    if (!safeSelectors.length) continue;
    safeRules.push(safeSelectors.map(selector => ".wiki-content " + selector).join(",") + "{" + declarations + "}");
  }
  return safeRules.join("\n");
}
function sanitizeNamuOutput(root, docTitle) {
  const allowedTags = new Set(("A ABBR B BDI BDO BLOCKQUOTE BR CAPTION CENTER CODE COL COLGROUP DD DEL DETAILS DIV DL DT EM FIGCAPTION FIGURE FONT FOOTNOTE_TITLE H1 H2 H3 H4 H5 H6 HR I IFRAME IMG INS KBD LI MARK OL P PRE Q RUBY RT RP S SAMP SMALL SPAN STRIKE STRONG STYLE SUB SUMMARY SUP TABLE TBODY TD TFOOT TH THEAD TR TT U UL VAR VIDEO AUDIO SOURCE").split(" "));
  const allowedAttrs = new Set(("alt allow allowfullscreen class colspan fn_target frameborder height href id lang loading open referrerpolicy rel rowspan src style target title type width align valign controls loop muted poster start").split(" "));
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
    const parserAction = node.getAttribute("data-opennamu-action") || node.getAttribute("onclick") || "";
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
      if (parserAction.includes("opennamu_heading_folding")) {
        const heading = node.closest("h1,h2,h3,h4,h5,h6");
        const section = heading ? heading.nextElementSibling : null;
        if (section && section.id && section.id.includes("opennamu_heading_")) {
          node.removeAttribute("href");
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
        }
      }
      const href = node.getAttribute("href") || "";
      // Footnote markers are UI popups, never ordinary hash-navigation links.
      const footnoteTarget = node.getAttribute("fn_target") ||
        (href.startsWith("#") ? (() => { try { return decodeURIComponent(href.slice(1)); } catch { return href.slice(1); } })() : "");
      if (node.id.includes("rfn_") && footnoteTarget) {
        node.setAttribute("data-wiki-footnote-target", footnoteTarget);
        node.removeAttribute("href");
        node.setAttribute("role", "button");
        node.setAttribute("tabindex", "0");
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
      } else if (href.startsWith("/image/") || href.startsWith("/media/")) {
        node.setAttribute("href", apiBase() + href);
      }
    }
    if (tag === "IMG") {
      const src = node.getAttribute("src") || "";
      if (src.startsWith("/image/") || src.startsWith("/media/")) node.setAttribute("src", apiBase() + src);
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

function syncNamumarkBetaButton() {
  const button = $("namumark-beta-toggle");
  if (!button) return;
  button.textContent = "서버 렌더링";
  button.setAttribute("aria-pressed", "true");
  button.setAttribute("title", "모든 나무마크 문서는 Cloudflare Worker에서 파싱됩니다.");
  button.disabled = true;
  button.classList.add("is-enabled");
}
function toggleNamumarkBeta() {
  syncNamumarkBetaButton();
}
syncNamumarkBetaButton();
function moveWikiTocToTop(root) {
  if (!root || !root.querySelector) return;
  const folded = root.querySelector(".opennamu_TOC_fold");
  const toc = folded || root.querySelector(".opennamu_TOC, .wiki-toc");
  if (toc && toc.parentElement !== root) root.prepend(toc);
  else if (toc && root.firstElementChild !== toc) root.prepend(toc);
}
function prepareServerRenderedMarkup(root,docTitle){
  sanitizeNamuOutput(root,docTitle);
  moveWikiTocToTop(root);
  root.classList.add("namumark-rendered");
  root.classList.remove("namumark-beta-active");
  enhanceFootnoteHover(root);
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
    target.innerHTML = String(data.html || "");
    prepareServerRenderedMarkup(target, docTitle);
    target.dataset.renderEngine = data.engine || "namumark-worker";
  } catch (error) {
    if (serverRenderVersions.get(target) !== version) return;
    target.replaceChildren();
    const message = document.createElement("p");
    message.className = "namumark-beta-warning";
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
 $("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;$("delete-page").hidden=true;$("heading-edit").hidden=true;$("backlinks-tab").hidden=true;$("backlinks-tab").hidden=true;
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
async function loadPage(title,pushRoute=true,anchor=""){
 title=String(title||"").trim();if(!title||title==="대문"){showHome(pushRoute);return}
 const requestId=++pageNavigationSequence;
 if(pushRoute)history.pushState(null,"",routeFor(title,anchor));
 currentTitle=title;$("home-view").hidden=true;$("document-view").hidden=false;$("editor-view").hidden=true;document.body.classList.remove("editor-active");$("home").classList.remove("active");$("new").classList.remove("active");$("edit").hidden=false;$("history").hidden=false;$("upload").hidden=false;$("delete-page").hidden=!isWikiAdmin;$("file-manager").hidden=!loggedInName;$("backlinks-tab").hidden=false;
 const displayTitle=/^(?:category|분류):/i.test(title)?"분류:"+title.replace(/^(?:category|분류):/i,""):title;
 $("title").textContent=displayTitle;$("crumb").textContent=displayTitle;$("message").textContent="문서를 불러오는 중입니다…";$("article").replaceChildren();$("page-protection").hidden=true;
 $("heading-edit").hidden=false;
 window.scrollTo({top:0,behavior:"auto"});
 try{
  if (/^(?:category|분류):/i.test(title)) {
   const name=title.replace(/^(?:category|분류):/i,"");
   $("message").textContent="";
   const staging=document.createElement("article");
   await renderCategoryPage(name,0,staging,requestId);
   if(requestId!==pageNavigationSequence)return;
   $("article").replaceChildren(...staging.childNodes);
   $("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;$("delete-page").hidden=true;$("page-protection").hidden=true;$("heading-edit").hidden=true;$("backlinks-tab").hidden=true;
   return;
  }
  const data=await api("/api/render?title="+encodeURIComponent(title));
  if(requestId!==pageNavigationSequence)return;
  if(!data.page){currentContent="";currentProtection={level:"none",reason:""};$("protection-status").hidden=true;$("protection-notice").hidden=true;$("protection-notice").replaceChildren();$("page-protection").hidden=true;$("message").textContent="이 문서는 아직 존재하지 않습니다. 로그인 후 새 문서를 작성할 수 있습니다.";$("edit").textContent="문서 만들기";return}
  if(data.page.title&&data.page.title!==title){history.replaceState(null,"",routeFor(data.page.title,anchor));return loadPage(data.page.title,false,anchor)}
  currentContent=data.page.content||"";
  currentProtection={level:data.page.protectionLevel||"none",reason:data.page.protectionReason||""};
  const protectionStatus=$("protection-status"),protectionNotice=$("protection-notice");
  if(currentProtection.level==="admin"){
   protectionStatus.hidden=false;protectionStatus.textContent="관리자 편집 보호";protectionStatus.title=currentProtection.reason||"관리자만 편집할 수 있습니다.";
   protectionNotice.hidden=false;protectionNotice.replaceChildren();
   const strong=document.createElement("strong");strong.textContent="이 문서는 관리자 편집 보호 상태입니다.";
   const detail=document.createElement("span");detail.textContent=" 문서 편집은 관리자만 할 수 있습니다.";
   protectionNotice.append(strong,detail);
  }else if(currentProtection.level==="registered"){
   protectionStatus.hidden=false;protectionStatus.textContent="회원 편집 보호";protectionStatus.title=currentProtection.reason||"로그인한 회원만 편집할 수 있습니다.";
   protectionNotice.hidden=false;protectionNotice.replaceChildren();
   const strong=document.createElement("strong");strong.textContent="이 문서는 회원 편집 보호 상태입니다.";
   const detail=document.createElement("span");detail.textContent=" 문서 편집은 로그인한 회원만 할 수 있습니다.";
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
  $("page-protection").hidden=!isWikiAdmin;
  $("heading-edit").hidden=(currentProtection.level==="admin"&&!isWikiAdmin)||(!loggedInName&&!sessionStorage.getItem(TOKEN_SETTING))||(currentProtection.level==="registered"&&!loggedInName&&!isWikiAdmin);
  $("message").textContent="";
  const redirect=currentContent.match(/^\s*#redirect\s+(?:\[\[)?([^\]\n]+?)(?:\]\])?\s*$/im);
  if(redirect&&redirect[1].trim()!==title){loadPage(redirect[1].trim(),true);return}
  $("edit").textContent="문서 편집";$("heading-edit").textContent="편집";
  const staging=document.createElement("article");
  staging.innerHTML=String(data.html||"");
  prepareServerRenderedMarkup(staging,displayTitle);
  if(requestId!==pageNavigationSequence)return;
  const article=$("article");
  article.replaceChildren(...staging.childNodes);
  article.classList.add("namumark-rendered");
  article.classList.remove("namumark-beta-active");
  article.dataset.renderEngine=data.engine||"worker-ssr";
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
 $("dialog-title").textContent=title;const body=$("dialog-body");body.replaceChildren();
 for(const field of fields){addText(body,"label",field.label);const input=document.createElement(field.multiline?"textarea":"input");input.id=field.id;input.value=field.value||"";if(field.type)input.type=field.type;if(field.placeholder)input.placeholder=field.placeholder;body.append(input)}
 $("dialog-status").textContent="";$("save").textContent=label;$("dialog").showModal();$("save").onclick=async()=>{try{await onSave()}catch(error){$("dialog-status").textContent=error.message}}
}
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
$("delete-page").onclick=async()=>{
 if(!isWikiAdmin||!currentTitle)return;
 if(!confirm("‘"+currentTitle+"’ 문서와 문서 역사를 삭제할까요? 이 작업은 되돌릴 수 없습니다."))return;
 try{await api("/api/page?title="+encodeURIComponent(currentTitle),{method:"DELETE"});invalidateNamuDatabaseCache();showHome(true)}
 catch(error){$("message").textContent=error.message}
};

let editorOriginalTitle = "";
let editorIsNew = false;

function editPage(title = currentTitle, content = currentContent) {
  if (!loggedInName && !sessionStorage.getItem(TOKEN_SETTING)) {
    openLogin();
    return;
  }
  editorOriginalTitle = String(title || "");
  editorIsNew = !editorOriginalTitle;
  $("home-view").hidden = true;
  $("document-view").hidden = true;
  $("editor-view").hidden = false;
  document.body.classList.add("editor-active");
  $("home").classList.remove("active");
  $("new").classList.add("active");
  $("editor-heading").textContent = editorIsNew ? "새 문서 작성" : "문서 편집";
  $("editor-breadcrumb").textContent = editorIsNew ? "새 문서 작성" : editorOriginalTitle + " 편집";
  $("editor-title-wrap").hidden = false;
  $("editor-title-wrap").querySelector("label").textContent = editorIsNew ? "문서 제목" : "문서 제목 변경";
  $("editor-title-help").hidden = editorIsNew;
  $("editor-title").value = editorIsNew ? "" : editorOriginalTitle;
  $("editor-title").readOnly = false;
  $("editor-title").disabled = false;
  $("editor-title").removeAttribute("readonly");
  $("editor-title").removeAttribute("disabled");
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
  updateEditorHighlight();
  $("editor-counter").textContent = editorText.length.toLocaleString("ko-KR") + " / 200,000자";
  $("editor-summary").value = "";
  $("editor-status").textContent = "";
  $("editor-preview").replaceChildren();
  $("editor-preview").hidden = true;
  $("editor-code-wrap").hidden = false;
  $("editor-content").hidden = false;
  $("editor-tab-write").classList.add("active");
  $("editor-tab-preview").classList.remove("active");
  $("editor-save").textContent = editorIsNew ? "문서 등록" : "저장";
  $("editor-save").disabled = false;
  $("editor-help").hidden = true;
}

$("editor-cancel").onclick = () => {
  document.body.classList.remove("editor-active");
  if (editorOriginalTitle) openPage(editorOriginalTitle);
  else showHome(true);
};
$("editor-help-toggle").onclick = () => {
  $("editor-help").hidden = !$("editor-help").hidden;
};
$("editor-tab-write").onclick = () => {
  $("editor-code-wrap").hidden = false;
  $("editor-content").hidden = false;
  $("editor-preview").hidden = true;
  $("editor-tab-write").classList.add("active");
  $("editor-tab-preview").classList.remove("active");
};
let editorPreviewTimer = null;
function scheduleServerEditorPreview() {
  clearTimeout(editorPreviewTimer);
  editorPreviewTimer = setTimeout(() => {
    if ($("editor-preview").hidden) return;
    renderNamuMarkup(
      $("editor-content").value,
      $("editor-preview"),
      $("editor-title").value.trim() || editorOriginalTitle
    ).catch(error => console.error("Worker SSR preview failed", error));
  }, 350);
}
$("editor-tab-preview").onclick = () => {
  $("editor-code-wrap").hidden = true;
  $("editor-content").hidden = true;
  $("editor-preview").hidden = false;
  $("editor-tab-preview").classList.add("active");
  $("editor-tab-write").classList.remove("active");
  renderNamuMarkup($("editor-content").value, $("editor-preview"), $("editor-title").value.trim() || editorOriginalTitle).catch(error => console.error("Worker SSR preview failed", error));
};
$("editor-content").addEventListener("keydown", event => {
  if (event.key === "Tab") {
    event.preventDefault();
    const field = event.currentTarget;
    field.setRangeText("    ", field.selectionStart, field.selectionEnd, "end");
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    $("editor-form").requestSubmit();
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
  if (!title) { status.textContent = "문서 제목을 입력하세요."; return; }
  if (title === "대문") { status.textContent = "대문은 시작 화면이므로 일반 문서로 등록할 수 없습니다."; return; }
  if (content.length > 200000) { status.textContent = "문서는 200,000자 이하로 작성해 주세요."; return; }
  saveButton.disabled = true;
  saveButton.textContent = "저장 중…";
  try {
    if (editorIsNew) {
      const data = await api("/api/pages?q=" + encodeURIComponent(title));
      if ((data.pages || []).some(page => page.title.toLocaleLowerCase() === title.toLocaleLowerCase())) {
        throw new Error("같은 제목의 문서가 이미 있습니다.");
      }
    }
    await api("/api/page", {
      method: "PUT",
      body: JSON.stringify({ title, originalTitle: editorIsNew ? "" : editorOriginalTitle, content, summary, createOnly: editorIsNew })
    });
    invalidateNamuDatabaseCache();
    sessionStorage.removeItem("aonwiki-draft");
    document.body.classList.remove("editor-active");
    history.replaceState(null, "", routeFor(title));
    await loadPage(title, false);
  } catch (error) {
    status.textContent = error.message;
    saveButton.disabled = false;
    saveButton.textContent = editorIsNew ? "문서 등록" : "저장";
  }
};
function saveEditorDraft() {
  sessionStorage.setItem("aonwiki-draft", JSON.stringify({
    originalTitle: editorOriginalTitle,
    title: $("editor-title").value,
    content: $("editor-content").value
  }));
}
$("editor-title").addEventListener("input", () => {
  saveEditorDraft();
  if (!$("editor-preview").hidden) scheduleServerEditorPreview();
});
$("editor-content").addEventListener("input", () => {
  const content=$("editor-content").value;
  $("editor-counter").textContent=content.length.toLocaleString("ko-KR")+" / 200,000자";
  $("editor-status").textContent=content.length>200000?"문서가 200,000자를 초과했습니다.":"";
  saveEditorDraft();
  updateEditorHighlight();
  if (!$("editor-preview").hidden) scheduleServerEditorPreview();
});

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

  const tokenPattern = /(\[include\([^\]\n]+\)\]|\[\[(?:분류|category):[^\]]+\]\]|\[\[(?:파일|file):[^\]]+\]\]|\[\[[^\]]+\]\]|\[\*[^\]]+\]|\[https?:\/\/[^\]]+\]|\{\{\{#![^\n]*|\{\{\{(?:\+|-)[1-5][^}]*\}\}\}|\{\{\{[@#][^}]*\}\}\}|'''[^']*'''|''[^']*''|__.*?__|~~.*?~~|\^\^.*?\^\^|,,.*?,,|\[목차(?:\([^\]]*\))?\]|\[(?:br|date|clearfix|pagecount)\])/gi;
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
      const inner = token.slice(1, -1), separator = inner.indexOf("|");
      output += syntax("[") + '<span class="mk-external-url">' + escapeHighlightText(separator >= 0 ? inner.slice(0, separator) : inner) + '</span>' +
        (separator >= 0 ? syntax("|") + content(inner.slice(separator + 1)) : "") + syntax("]");
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
  return output || " ";
}
function updateEditorHighlight() {
  const field = $("editor-content"), code = $("editor-highlight-code"), pre = $("editor-highlight");
  if (!field || !code || !pre) return;
  let insideCode = false;
  code.innerHTML = field.value.split("\n").map(line => {
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
  }).join("\n") + (field.value.endsWith("\n") ? "\n" : "");
  pre.scrollTop = field.scrollTop;
  pre.scrollLeft = field.scrollLeft;
}
$("editor-content").addEventListener("scroll", () => {
  const pre = $("editor-highlight");
  if (pre) { pre.scrollTop = $("editor-content").scrollTop; pre.scrollLeft = $("editor-content").scrollLeft; }
});
$("editor-content").addEventListener("keyup", updateEditorHighlight);
$("editor-content").addEventListener("click", updateEditorHighlight);

function insertEditorMarkup(kind){
 const field=$("editor-content"),start=field.selectionStart,end=field.selectionEnd;
 const selected=field.value.slice(start,end);
 const templates={
  heading:["== "," ==","문단 제목"],
  bold:["'''","'''","굵게"],
  italic:["''","''","기울임"],
  link:["[[","]]","문서 제목"],
  list:["* ","","목록 항목"],
  footnote:["[* ","]","각주 내용"],
  category:["[[분류:","]]","분류명"],
  external:["[https://example.com|","]","표시문구"]
 };
 if(kind==="category"||kind==="external"){
  const item=templates[kind],value=item[0]+(selected||item[2])+item[1];
  field.setRangeText(value,start,end,"end");field.dispatchEvent(new Event("input",{bubbles:true}));field.focus();
  if(!selected)field.setSelectionRange(start+item[0].length,start+item[0].length+item[2].length);
  return;
 }
 if(kind==="hr"||kind==="table"){
  const value=kind==="hr"?"\n----\n":"\n||항목 1||항목 2||\n||내용||내용||\n";
  field.setRangeText(value,start,end,"end");
  field.dispatchEvent(new Event("input",{bubbles:true}));
  field.focus();return;
 }
 const item=templates[kind];if(!item)return;
 const value=item[0]+(selected||item[2])+item[1];
 field.setRangeText(value,start,end,"end");
 field.dispatchEvent(new Event("input",{bubbles:true}));
 field.focus();
 if(!selected)field.setSelectionRange(start+item[0].length,start+item[0].length+item[2].length);
}
document.querySelectorAll("[data-markup]").forEach(button=>{
 button.addEventListener("click",()=>insertEditorMarkup(button.dataset.markup));
});
$("home").onclick=()=>showHome(true);
$("recent-changes").onclick=()=>loadRecentChanges(true);
$("categories").onclick=()=>loadCategoryIndex(true);
$("random-page").onclick=()=>openRandomPage();
$("new").onclick=()=>editPage("","");
$("home-new").onclick=()=>editPage("","");
$("edit").onclick=()=>editPage();
$("heading-edit").onclick=()=>editPage();
async function searchFor(query){
 const q=String(query||"").trim();if(!q)return;
 try{const data=await api("/api/pages?q="+encodeURIComponent(q)),pages=(data.pages||[]).filter(p=>p.title!=="대문");
  const body=$("dialog-body");body.replaceChildren();$("dialog-title").textContent="검색 결과";
  if(!pages.length)addText(body,"p","검색 결과가 없습니다.");
  pages.forEach(page=>{const row=document.createElement("p");const a=document.createElement("a");a.href=routeFor(page.title);a.textContent=page.title;a.onclick=e=>{e.preventDefault();$("dialog").close();openPage(page.title)};row.append(a);body.append(row)});
  $("dialog-status").textContent="";$("save").textContent="닫기";$("save").onclick=()=>$("dialog").close();$("dialog").showModal()
 }catch(error){$("message").textContent=error.message}
}
$("search").onsubmit=e=>{e.preventDefault();searchFor($("query").value)};
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
let historyItemsForCompare = [], revisionA = null, revisionB = null;
function showHistoryList() {
  const body = $("dialog-body"); body.replaceChildren();
  addText(body, "p", "비교할 두 버전을 선택하세요. A는 기준 버전, B는 비교할 버전입니다.").className = "compare-intro";
  const choices = document.createElement("div"); choices.className = "history-version-list";
  historyItemsForCompare.forEach(item => {
    const row = document.createElement("div"); row.className = "history-version-row";
    const info = document.createElement("div"); info.className = "history-version-info";
    addText(info, "strong", item.created_at || "날짜 정보 없음");
    addText(info, "span", (item.editor || "알 수 없음") + (item.summary ? " · " + item.summary : ""));
    const actions = document.createElement("div"); actions.className = "history-version-actions";
    const aButton = document.createElement("button");
    aButton.type = "button"; aButton.className = "button";
    aButton.textContent = revisionA === item.id ? "A 선택됨" : "A 기준";
    aButton.classList.toggle("selected", revisionA === item.id);
    aButton.onclick = () => { revisionA = revisionA === item.id ? null : item.id; if (revisionB === item.id) revisionB = null; showHistoryList(); };
    const bButton = document.createElement("button");
    bButton.type = "button"; bButton.className = "button";
    bButton.textContent = revisionB === item.id ? "B 선택됨" : "B 비교";
    bButton.classList.toggle("selected", revisionB === item.id);
    bButton.onclick = () => { revisionB = revisionB === item.id ? null : item.id; if (revisionA === item.id) revisionA = null; showHistoryList(); };
    actions.append(aButton, bButton); row.append(info, actions); choices.append(row);
  });
  body.append(choices);
  const compare = document.createElement("button");
  compare.type = "button"; compare.className = "button button-primary";
  compare.textContent = "선택한 두 버전 비교";
  compare.disabled = !revisionA || !revisionB || revisionA === revisionB;
  compare.onclick = () => renderRevisionComparison(revisionA, revisionB);
  body.append(compare);
}
async function renderRevisionComparison(idA, idB) {
  const body = $("dialog-body"); body.replaceChildren();
  addText(body, "p", "두 버전의 문서 내용을 불러오는 중입니다.").className = "compare-intro";
  try {
    const [aData, bData] = await Promise.all([
      api("/api/revision?id=" + encodeURIComponent(idA)), api("/api/revision?id=" + encodeURIComponent(idB))
    ]);
    const a = aData.revision, b = bData.revision;
    if (!a || !b) throw new Error("비교할 버전을 찾을 수 없습니다.");
    body.replaceChildren();
    addText(body, "p", "A 기준: " + a.created_at + " · " + (a.editor || "알 수 없음") +
      " → B 비교: " + b.created_at + " · " + (b.editor || "알 수 없음")).className = "compare-intro";
    const diff = document.createElement("div"); diff.className = "revision-diff";
    const rows = diffRevisionLines(a.content, b.content); let added = 0, removed = 0;
    rows.forEach(line => {
      if (line.type === "add") added++;
      if (line.type === "remove") removed++;
      const row = document.createElement("div"); row.className = "revision-diff-line diff-" + line.type;
      const sign = document.createElement("span"); sign.className = "revision-diff-sign";
      sign.textContent = line.type === "add" ? "+" : line.type === "remove" ? "−" : " ";
      const content = document.createElement("code"); content.textContent = line.text || " ";
      row.append(sign, content); diff.append(row);
    });
    addText(body, "p", "추가 " + added + "줄 · 삭제 " + removed + "줄").className = "compare-summary";
    body.append(diff);
    const back = document.createElement("button"); back.type = "button"; back.className = "button";
    back.textContent = "버전 선택으로 돌아가기"; back.addEventListener("click", showHistoryList); body.prepend(back);
    $("save").textContent = "닫기"; $("save").onclick = () => $("dialog").close();
  } catch (error) {
    body.replaceChildren(); addText(body, "p", error.message).className = "dialog-status";
    const back = document.createElement("button"); back.type = "button"; back.className = "button";
    back.textContent = "돌아가기"; back.onclick = showHistoryList; body.append(back);
  }
}
$("history").onclick=async()=>{
  try {
    const data=await api("/api/history?title="+encodeURIComponent(currentTitle));
    historyItemsForCompare=data.revisions||[]; revisionA=null; revisionB=null;
    $("dialog-title").textContent=currentTitle+" — 문서 역사 및 버전 비교";
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
     const field=$("editor-content");field.setRangeText(markup,field.selectionStart,field.selectionEnd,"end");field.dispatchEvent(new Event("input",{bubbles:true}));field.focus();$("dialog").close()
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
$("upload").onclick=()=>{
 if(!loggedInName&&!sessionStorage.getItem(TOKEN_SETTING)){openLogin();return}
 $("file").click()
};
$("editor-image").onclick=()=>{
 if(!loggedInName&&!sessionStorage.getItem(TOKEN_SETTING)){openLogin();return}
 $("file").click()
};
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
   const field=$("editor-content");field.setRangeText(markup,field.selectionStart,field.selectionEnd,"end");field.dispatchEvent(new Event("input",{bubbles:true}));field.focus();
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
if(document.body.dataset.ssrPage==="true"&&initialSsrState?.exists){prepareServerRenderedMarkup($("article"),currentTitle);if(location.hash)requestAnimationFrame(()=>scrollToAnchor(location.hash.slice(1)));}
if(document.body.dataset.ssrPage!=="true")readRoute();
refreshIdentity();
startLivePageWatcher();

