const $=id=>document.getElementById(id);
const API_SETTING="aonwiki-api",TOKEN_SETTING="aonwiki-key",NAME_SETTING="aonwiki-username";
const DEFAULT_API_URL="https://aon.hiakdhs323.workers.dev";
const apiBase=()=> (localStorage.getItem(API_SETTING)||DEFAULT_API_URL).replace(/\/$/,"");
let currentTitle="",currentContent="",loggedInName=sessionStorage.getItem(NAME_SETTING)||"";
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
  if(fresh.length&&isHomeRoute())await loadHome();
 }catch(error){console.warn("새 문서 실시간 확인 실패:",error)}
 finally{livePollBusy=false}
}
function startLivePageWatcher(){
 if(window.aonWikiLiveTimer)return;
 checkForNewPages();
 window.aonWikiLiveTimer=window.setInterval(checkForNewPages,10000);
}
function showHome(push=true){
 if(push)history.pushState(null,"","#/");
 currentTitle="";currentContent="";
 $("home-view").hidden=false;$("document-view").hidden=true;$("editor-view").hidden=true;
 document.body.classList.remove("editor-active");
 $("home").classList.add("active");$("edit").hidden=true;$("history").hidden=true;$("upload").hidden=!loggedInName;$("delete-page").hidden=true;
 $("new").classList.remove("active");loadHome()
}
async function loadHome(){
 const list=$("page-list");list.replaceChildren();$("page-count").textContent="";
 try{
  const [data,homeData]=await Promise.all([
   api("/api/pages"),
   api("/api/home").catch(()=>({settings:{}}))
  ]);
  const settings=homeData.settings||{};
  $("home-title").textContent=settings.title||"AonWiki";
  $("home-tagline").textContent=settings.tagline||"함께 만드는 지식 백과사전";
  const hint=$("home-search-hint");hint.textContent=settings.searchHint||"검색창에서 문서를 찾거나 아래 목록에서 원하는 문서를 선택하세요.";
  $("home-list-title").textContent=settings.listTitle||"최근 수정된 문서";
  $("home-bottom-title").textContent=settings.bottomTitle||"문서가 없나요?";
  $("home-bottom-text").textContent=settings.bottomText||"로그인한 뒤 새 문서를 만들어 지식을 공유할 수 있습니다.";
  const notice=$("home-notice");notice.textContent=settings.notice||"";notice.hidden=!settings.notice;
  const content=settings.content||"";
  if(content)await renderNamuMarkup(content,$("home-content"),"대문");
  else $("home-content").replaceChildren();
  $("home-admin-tools").hidden=!isWikiAdmin;
  const pages=(data.pages||[]).filter(p=>p.title!=="대문");
  $("page-count").textContent=pages.length+"개 문서";
  if(!pages.length){addText(list,"p","아직 등록된 문서가 없습니다. 로그인 후 첫 문서를 만들어 보세요.").className="empty-list";return}
  pages.forEach(page=>{
   const row=document.createElement("div");row.className="page-row";
   const a=document.createElement("a");a.href=routeFor(page.title);a.textContent=page.title;
   a.onclick=e=>{e.preventDefault();openPage(page.title)};
   const time=document.createElement("time");time.textContent=page.updated_at?new Date(page.updated_at).toLocaleString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}):"";
   row.append(a,time);list.append(row)
  });
 }catch(error){addText(list,"p",error.message).className="empty-list"}
}
function openPage(title,anchor=""){title=String(title||"").trim();if(!title||title==="대문"){showHome(true);return}history.pushState(null,"",routeFor(title,anchor));loadPage(title,false,anchor)}
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
function createImage(parent,fileSpec,state,markdownAlt=""){
 const parts=String(fileSpec||"").split("|"),filename=parts.shift().trim(),params={};
 parts.join("|").split("&").forEach(pair=>{const at=pair.indexOf("=");if(at>0)params[pair.slice(0,at).trim().toLowerCase()]=pair.slice(at+1).trim();else if(pair.trim())params[pair.trim().toLowerCase()]="true"});
 const align=(params.align||"center").toLowerCase();
 const figure=document.createElement("figure");figure.className="wiki-image"+(align==="right"?" align-right":align==="left"?" align-left":"");
 const img=document.createElement("img");img.alt=params.alt||markdownAlt||filename;img.loading="lazy";img.decoding="async";
 let width=params.width||params["width"];if(width){width=width.replace(/px$/i,"");if(/^\d+(\.\d+)?$/.test(width))width+="px";if(/^\d+(\.\d+)?(px|%)$/.test(width))figure.style.width=width}
 let height=params.height;if(height){height=height.replace(/px$/i,"");if(/^\d+(\.\d+)?$/.test(height))height+="px";if(/^\d+(\.\d+)?px$/.test(height))img.style.height=height}
 if(width)img.style.width=width;if(params.border==="true")img.style.border="1px solid #a2a9b1";
 const link=document.createElement("a");link.href="#";link.append(img);link.onclick=e=>{e.preventDefault();window.open(img.src,"_blank","noopener")};
 figure.append(link);
 if(params.caption)addText(figure,"figcaption",params.caption);
 parent.append(figure);
 const fail=()=>{const broken=document.createElement("span");broken.className="broken-image";broken.textContent="[이미지 파일을 찾을 수 없음: "+filename+"]";figure.replaceWith(broken)};
 if(/^https?:\/\//i.test(filename)||filename.startsWith("/"))img.src=filename;else if(/^[a-f0-9-]{36}$/i.test(filename))img.src=apiBase()+"/media/"+filename;
 else api("/api/file?name="+encodeURIComponent(filename)).then(d=>{if(d.image&&d.image.url)img.src=d.image.url;else fail()}).catch(fail);
 img.addEventListener("error",fail);
}
function footnoteReference(raw,state,parent){
 let key="",content="",named=false;const value=String(raw||"");
 if(value&&!/^\s/.test(value)){const match=value.match(/^([A-Za-z0-9가-힣_-]+)(?:\s+([\s\S]*))?$/);if(match&&match[2]){key=match[1];content=match[2];named=true}else content=value}
 else content=value.trim();
 let note=named?state.namedFootnotes.get(key):null;
 if(!note){note={number:state.footnotes.length+1,key:named?key:"",content:content||key||"주석",refs:[]};state.footnotes.push(note);if(named)state.namedFootnotes.set(key,note)}
 const refId="fnref-"+note.number+"-"+(note.refs.length+1);note.refs.push(refId);
 const sup=document.createElement("sup");sup.className="wiki-footnote-ref";const a=document.createElement("a");a.href="#fn-"+note.number;a.id=refId;a.textContent="["+note.number+"]";a.onclick=e=>{e.preventDefault();document.getElementById("fn-"+note.number)?.scrollIntoView({behavior:"smooth",block:"center"})};sup.append(a);parent.append(sup)
}
function inlineRender(parent,source,state){
 const text=String(source||"");
 const token=/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|\[\[파일:([^\]]+)\]\]|\[\[([^\]]+)\]\]|\[\*([^\]]*)\]|\[(목차|tableofcontents)(?:\((hide)\))?\]|\[(각주|footnote)\]|\[br\]|\[clearfix\]|\[(https?:\/\/[^\s\]\|]+)(?:[\s|]+([^\]]+))?\]|'''([\s\S]+?)'''|''([\s\S]+?)''|__([\s\S]+?)__|~~([\s\S]+?)~~|--([\s\S]+?)--|\^\^([\s\S]+?)\^\^|,,([\s\S]+?),,|\{\{\{([\s\S]+?)\}\}\}/gi;
 let pos=0,m;
 while((m=token.exec(text))){
  parent.append(document.createTextNode(text.slice(pos,m.index)));
  if(m[1]!==undefined){createImage(parent,m[2],state,m[1])}
  else if(m[3]!==undefined){createImage(parent,m[3],state)}
  else if(m[4]!==undefined){
   const raw=m[4],bar=raw.indexOf("|"),target=(bar>=0?raw.slice(0,bar):raw).trim(),label=bar>=0?raw.slice(bar+1):target;
   if(target.startsWith("분류:")){const category=target.slice(3).trim();if(category&&!state.categories.includes(category))state.categories.push(category)}
   else if(target.startsWith(":파일:")){const a=document.createElement("a");a.href=apiBase()+"/api/file?name="+encodeURIComponent(target.slice(4));a.target="_blank";a.rel="noopener";a.textContent=label;parent.append(a)}
   else{const a=document.createElement("a");a.href=target.startsWith("#")?"#"+target.slice(1):routeFor(target.split("#")[0],target.includes("#")?target.split("#").slice(1).join("#"):"");a.textContent=label;a.onclick=e=>{e.preventDefault();navigateInternal(target)};parent.append(a)}
  }
  else if(m[5]!==undefined)footnoteReference(m[5],state,parent);
  else if(m[6]!==undefined){const marker=document.createElement("span");marker.className="wiki-toc-marker";marker.dataset.hide=m[7]?"1":"0";parent.append(marker)}
  else if(m[8]!==undefined){const marker=document.createElement("span");marker.className="wiki-footnote-marker";parent.append(marker)}
  else if(m[0]==="[br]"){parent.append(document.createElement("br"))}
  else if(m[0]==="[clearfix]"){const clear=document.createElement("div");clear.className="wiki-clear";parent.append(clear)}
  else if(m[9]!==undefined){let href=m[9],label=m[10]||href;const entry=href.match(/^(https?:\/\/playentry\.org\/project\/[a-f0-9]{24})([가-힣A-Za-z][가-힣A-Za-z0-9_-]*)$/i);if(!m[10]&&entry){href=entry[1];label=entry[2]}const a=document.createElement("a");a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label;parent.append(a)}
  else if(m[11]!==undefined)addText(parent,"strong",m[11]);
  else if(m[12]!==undefined)addText(parent,"em",m[12]);
  else if(m[13]!==undefined)addText(parent,"u",m[13]);
  else if(m[14]!==undefined)addText(parent,"del",m[14]);
  else if(m[15]!==undefined)addText(parent,"del",m[15]);
  else if(m[16]!==undefined)addText(parent,"sup",m[16]);
  else if(m[17]!==undefined)addText(parent,"sub",m[17]);
  else if(m[18]!==undefined){
   const raw=m[18],span=document.createElement("code");
   const color=raw.match(/^(#[0-9a-f]{3,8}|[a-z]+)\s+([\s\S]*)$/i),size=raw.match(/^([+-]\d+)\s+([\s\S]*)$/);
   if(color){span.textContent=color[2];span.style.color=color[1]}
   else if(size){span.textContent=size[2];span.style.fontSize=Math.max(8,Math.min(48,14+Number(size[1])*2))+"px";span.style.background="transparent"}
   else span.textContent=raw;
   parent.append(span)
  }
  pos=token.lastIndex;
 }
 parent.append(document.createTextNode(text.slice(pos)))
}
function splitTableCells(line){let value=line.trim().replace(/^\|\|/,"");if(value.endsWith("||"))value=value.slice(0,-2);return value.split("||")}
function tableCellSpec(raw){
 let text=raw.trim(),spec="";const match=text.match(/^<([^>]+)>/);if(match){spec=match[1];text=text.slice(match[0].length)}
 return {text,spec}
}
function renderTable(rows,target,state){
 const table=document.createElement("table");table.className="wiki-table";let tableWidth="",tableAlign="";
 rows.forEach((row,rowIndex)=>{
  const tr=document.createElement("tr");
  splitTableCells(row).forEach((raw,cellIndex)=>{
   const parsed=tableCellSpec(raw),cell=document.createElement("td"),spec=parsed.spec;
   const attrs=spec.split("&").map(v=>v.trim());
   attrs.forEach(attr=>{
    if(attr===":")cell.style.textAlign="center";
    else if(attr==="(")cell.style.textAlign="left";
    else if(attr===")")cell.style.textAlign="right";
    else if(attr.startsWith("tablewidth="))tableWidth=attr.slice(11);
    else if(attr.startsWith("tablealign="))tableAlign=attr.slice(11);
    else if(attr.startsWith("tablebgcolor="))table.style.backgroundColor=cleanStyleValue(attr.slice(13));
    else if(attr.startsWith("bgcolor="))cell.style.backgroundColor=cleanStyleValue(attr.slice(8));
    else if(attr.startsWith("color="))cell.style.color=cleanStyleValue(attr.slice(6));
    else if(attr.startsWith("width="))cell.style.width=cleanStyleValue(attr.slice(6));
    else if(attr.startsWith("height="))cell.style.height=cleanStyleValue(attr.slice(7));
    else if(attr.startsWith("align="))cell.style.textAlign=cleanStyleValue(attr.slice(6));
    else if(attr.startsWith("valign="))cell.style.verticalAlign=cleanStyleValue(attr.slice(7));
    else if(/^-\d+$/.test(attr))cell.colSpan=Math.max(1,Math.min(20,Math.abs(Number(attr))));
    else if(/^\|\d+$/.test(attr))cell.rowSpan=Math.max(1,Math.min(20,Number(attr.slice(1))));
   });
   inlineRender(cell,parsed.text,state);tr.append(cell)
  });
  table.append(tr)
 });
 if(tableWidth)table.style.width=/^\d+$/.test(tableWidth)?tableWidth+"px":cleanStyleValue(tableWidth);
 if(tableAlign==="center")table.style.marginLeft=table.style.marginRight="auto";
 else if(tableAlign==="right")table.style.marginLeft="auto";
 target.append(table)
}
function appendListLine(target,stack,line,state){
 const match=line.match(/^([ \t]*)([*#]+|\d+\.|[A-Za-z]\.)\s*(.*)$/);if(!match)return false;
 const indent=match[1].replace(/\t/g,"    ").length,marker=match[2],type=marker.includes("#")||/^\d+\.$/.test(marker)||/^[A-Za-z]\.$/.test(marker)?"ol":"ul",level=Math.max(1,indent+marker.length);
 while(stack.length&&stack[stack.length-1].level>level)stack.pop();
 let top=stack[stack.length-1];
 if(!top){const list=document.createElement(type);target.append(list);top={level,type,list,last:null};stack.push(top)}
 else if(level>top.level){const nested=document.createElement(type);if(top.last)top.last.append(nested);else top.list.append(nested);top={level,type,list:nested,last:null};stack.push(top)}
 else if(level===top.level&&top.type!==type){const parent=stack.length>1?stack[stack.length-2].last:target;const list=document.createElement(type);(parent||target).append(list);top={level,type,list,last:null};stack[stack.length-1]=top}
 else if(level===top.level&&!top.list.isConnected){const list=document.createElement(type);target.append(list);top={level,type,list,last:null};stack[stack.length-1]=top}
 const li=document.createElement("li");inlineRender(li,match[3],state);top.list.append(li);top.last=li;return true
}
function sanitizeWikiStyle(raw){const result=[];String(raw||"").replace(/([a-z-]+)\s*:\s*([^;]+)/gi,(all,key,value)=>{const k=key.toLowerCase(),v=cleanStyleValue(value);if(v&&["color","background","background-color","text-align","font-size","font-weight","width","max-width","min-width","margin","padding","border","border-color","border-radius","float","display"].includes(k))result.push(k+":"+v)});return result.join(";")}
function renderContent(source,target=$("article"),options={}){
 const state=options.state||{footnotes:[],namedFootnotes:new Map(),categories:[]},nested=Boolean(options.nested),lines=String(source||"").replace(/\r/g,"").split("\n");
 let i=0,paragraph=[],listStack=[],tocMarker=null,footnoteMarker=null;
 const flush=()=>{if(!paragraph.length)return;const p=document.createElement("p");paragraph.forEach((line,n)=>{if(n)p.append(document.createElement("br"));inlineRender(p,line,state)});target.append(p);paragraph=[]};
 while(i<lines.length){
  const line=lines[i],trim=line.trim();
  if(!trim){flush();listStack=[];i++;continue}
  if(/^\{\{\{#!folding(?:\s|$)/i.test(trim)){
   flush();listStack=[];const details=document.createElement("details");details.className="wiki-fold";addText(details,"summary",trim.replace(/^\{\{\{#!folding\s*/i,"")||"내용 펼치기");const content=document.createElement("div");content.className="wiki-fold-content";const inner=[];i++;while(i<lines.length&&!lines[i].trim().startsWith("}}}"))inner.push(lines[i++]);if(i<lines.length)i++;details.append(content);target.append(details);renderContent(inner.join("\n"),content,{nested:true,state});continue
  }
  const wikiBlock=trim.match(/^\{\{\{#!wiki(?:\s+style=["']([^"']*)["'])?/i);
  if(wikiBlock){flush();listStack=[];const box=document.createElement("div");box.className="wiki-stylebox";applyWikiStyles(box,sanitizeWikiStyle(wikiBlock[1]||""));const inner=[];i++;while(i<lines.length&&!lines[i].trim().startsWith("}}}"))inner.push(lines[i++]);if(i<lines.length)i++;target.append(box);renderContent(inner.join("\n"),box,{nested:true,state});continue}
  if(trim.startsWith("{{{")){flush();listStack=[];const code=[];i++;while(i<lines.length&&!lines[i].trim().startsWith("}}}"))code.push(lines[i++]);if(i<lines.length)i++;const pre=document.createElement("pre");pre.textContent=code.join("\n");target.append(pre);continue}
  if(/^#redirect\s+/i.test(trim)){flush();const redirect=trim.replace(/^#redirect\s+/i,"").replace(/^\[\[|\]\]$/g,"");const p=document.createElement("p");p.className="wiki-redirect";p.textContent="이 문서는 "+redirect+" 문서로 이동합니다.";target.append(p);if(!nested)state.redirect=redirect;i++;continue}
  if(/^\|\|/.test(trim)){flush();listStack=[];const rows=[];while(i<lines.length&&/^\s*\|\|/.test(lines[i]))rows.push(lines[i++]);renderTable(rows,target,state);continue}
  const heading=line.match(/^(={1,6})\s*(.*?)\s*\1\s*$/);
  if(heading){flush();listStack=[];const level=Math.max(2,Math.min(6,heading[1].length)),h=document.createElement("h"+level);inlineRender(h,heading[2],state);h.dataset.heading="1";target.append(h);continue}
  if(/^[-]{4,}$/.test(trim)){flush();listStack=[];target.append(document.createElement("hr"));i++;continue}
  if(/^([ \t]*)([*#]+|\d+\.|[A-Za-z]\.)\s*/.test(line)){flush();if(appendListLine(target,listStack,line,state)){i++;continue}}
  listStack=[];
  if(/^>\s?/.test(line)){flush();let quote=target.lastElementChild;if(!quote||quote.tagName!=="BLOCKQUOTE"){quote=document.createElement("blockquote");target.append(quote)}const p=document.createElement("p");inlineRender(p,line.replace(/^>\s?/,""),state);quote.append(p);i++;continue}
  paragraph.push(line);i++;
 }
 flush();
 if(!nested){
  const headings=[...target.querySelectorAll("h2[data-heading],h3[data-heading],h4[data-heading],h5[data-heading],h6[data-heading]")];
  headings.forEach((h,n)=>{h.id="s-"+(n+1)});
  if(headings.length){const toc=document.createElement("nav");toc.className="wiki-toc";addText(toc,"div","목차").className="wiki-toc-title";const ol=document.createElement("ol");headings.forEach((h,n)=>{const li=document.createElement("li");li.className="toc-level-"+h.tagName.toLowerCase();const a=document.createElement("a");a.href="#"+h.id;a.textContent=h.textContent;a.onclick=e=>{e.preventDefault();h.scrollIntoView({behavior:"smooth",block:"start"})};li.append(a);ol.append(li)});toc.append(ol);const marker=target.querySelector(".wiki-toc-marker");if(marker){if(marker.dataset.hide==="1"){const details=document.createElement("details");details.className="wiki-toc";const summary=addText(details,"summary","목차");details.append(...toc.childNodes);marker.replaceWith(details)}else marker.replaceWith(toc)}else target.prepend(toc)}
  else target.querySelectorAll(".wiki-toc-marker").forEach(x=>x.remove());
  const fp=target.querySelector(".wiki-footnote-marker");if(state.footnotes.length){const box=document.createElement("section");box.className="wiki-footnotes";addText(box,"h2","각주");const ol=document.createElement("ol");state.footnotes.forEach(note=>{const li=document.createElement("li");li.id="fn-"+note.number;inlineRender(li,note.content,{footnotes:[],namedFootnotes:new Map(),categories:[]});note.refs.forEach(ref=>{const a=document.createElement("a");a.href="#"+ref;a.className="footnote-back";a.textContent="↩";li.append(a)});ol.append(li)});box.append(ol);if(fp)fp.replaceWith(box);else target.append(box)}else if(fp)fp.remove();
  if(state.categories.length){const box=document.createElement("div");box.className="wiki-categories";state.categories.forEach(cat=>{const a=document.createElement("a");a.href=routeFor("분류:"+cat);a.textContent="분류:"+cat;a.onclick=e=>{e.preventDefault();openPage("분류:"+cat)};box.append(a)});target.append(box)}
  return state
 }
 return state
}

let namuDatabaseCache = { expires: 0, records: [] };
async function getNamuDatabase(source, docTitle) {
  if (Date.now() > namuDatabaseCache.expires) {
    const [pageData, fileData] = await Promise.all([
      api("/api/pages"),
      api("/api/files").catch(() => ({ files: [] }))
    ]);
    const records = (pageData.pages || []).map(page => ({ title: page.title, data: "" }));
    (fileData.files || []).forEach(file => records.push({ title: "file:" + file.filename, data: "" }));
    (fileData.aliases || []).forEach(alias => records.push({ title: "file:" + alias.alias, data: "" }));
    namuDatabaseCache = { expires: Date.now() + 30000, records };
  }
  const records = namuDatabaseCache.records.map(item => ({ ...item }));
  const current = records.find(item => item.title === docTitle);
  if (current) current.data = source;
  else records.push({ title: docTitle, data: source });
  const visited = new Set([docTitle]);
  let pending = [...String(source).matchAll(/\[include\(\s*([^,\])]+)/gi)].map(match => match[1].trim()).filter(Boolean);
  let fetched = 0;
  for (let depth = 0; depth < 4 && pending.length && fetched < 50; depth++) {
    const batch = [...new Set(pending)].filter(name => !visited.has(name)).slice(0, 20);
    pending = [];
    if (!batch.length) break;
    batch.forEach(name => visited.add(name));
    const results = await Promise.all(batch.map(async name => {
      try {
        const result = await api("/api/page?title=" + encodeURIComponent(name));
        return result.page ? { title: name, data: result.page.content || "" } : null;
      } catch { return null; }
    }));
    for (const item of results) {
      if (!item) continue;
      fetched++;
      const found = records.find(record => record.title === item.title);
      if (found) found.data = item.data;
      else records.push(item);
      for (const match of item.data.matchAll(/\[include\(\s*([^,\])]+)/gi)) {
        const nested = match[1].trim();
        if (nested && !visited.has(nested)) pending.push(nested);
      }
      if (fetched >= 50) break;
    }
  }
  return { data: records };
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
    const parserAction = node.getAttribute("onclick") || "";
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
      } else if (href.startsWith("/w/")) {
        const path = href.slice(3).split("#");
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
    link.addEventListener("blur", () => {
      if (!tooltip.classList.contains("visible")) hide();
    });
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

async function renderNamuMarkup(source, target, docTitle = currentTitle || "대문") {
  if (!window.NamuMarkBundle || !window.NamuMarkBundle.NamuMark) {
    renderContent(source, target);
    return;
  }
  try {
    const database = await getNamuDatabase(source, docTitle);
    const parser = new window.NamuMarkBundle.NamuMark(
      String(source || ""),
      { docName: docTitle, useTocSet: "default" },
      database
    );
    const result = parser.parse();
    const holder = document.createElement("div");
    holder.innerHTML = result[0] || "";
    sanitizeNamuOutput(holder, docTitle);
    target.replaceChildren(...holder.childNodes);
    target.classList.add("namumark-rendered");
    enhanceFootnoteHover(target);
    if (window.katex) {
      target.querySelectorAll('span[id*="opennamu_math_"]').forEach(element => {
        try {
          window.katex.render(element.textContent || "", element, { throwOnError: false, strict: "ignore" });
        } catch (error) {
          console.warn("KaTeX rendering skipped", error);
        }
      });
      target.querySelectorAll(".namu-latex-block").forEach(element => {
        try {
          window.katex.render(element.textContent || "", element, { displayMode: true, throwOnError: false, strict: "ignore" });
        } catch (error) {
          console.warn("LaTeX block rendering skipped", error);
        }
      });
    }
    if (window.hljs) {
      target.querySelectorAll("pre code").forEach(code => {
        const language = (code.className || "").trim().split(/\\s+/)[0];
        if (language && !language.startsWith("language-")) code.classList.add("language-" + language);
        window.hljs.highlightElement(code);
      });
      if (typeof window.hljs.initLineNumbersOnLoad === "function") window.hljs.initLineNumbersOnLoad();
    }
  } catch (error) {
    console.error("NamuMark parse failed", error);
    target.classList.remove("namumark-rendered");
    renderContent(source, target);
  }
}

async function loadRecentChanges(pushRoute=true){
 if(pushRoute)history.pushState(null,"","#/recent");
 currentTitle="최근 변경";currentContent="";
 $("home-view").hidden=true;$("document-view").hidden=false;$("editor-view").hidden=true;
 $("home").classList.remove("active");$("new").classList.remove("active");
 $("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;$("delete-page").hidden=true;$("heading-edit").hidden=true;$("backlinks-tab").hidden=true;$("backlinks-tab").hidden=true;
 $("title").textContent="최근 변경";$("crumb").textContent="최근 변경";$("message").textContent="";
 const article=$("article");article.replaceChildren();
 try{
  const data=await api("/api/recent");const changes=data.changes||[];
  if(!changes.length){addText(article,"p","아직 편집 기록이 없습니다.").className="empty-list";return}
  const list=document.createElement("div");list.className="recent-change-list";
  changes.forEach(change=>{const row=document.createElement("div");row.className="recent-change-row";const link=document.createElement("a");link.href=routeFor(change.title);link.textContent=change.title;link.onclick=e=>{e.preventDefault();openPage(change.title)};const meta=addText(row,"span",[(change.editor||"알 수 없음"),change.created_at?new Date(change.created_at).toLocaleString("ko-KR"):"",change.summary||""].filter(Boolean).join(" · "));row.append(link,meta);list.append(row)});article.append(list);
 }catch(error){addText(article,"p",error.message).className="empty-list"}
}
async function loadBacklinks(title,pushRoute=true){
 title=String(title||"").trim();if(!title)return;
 if(pushRoute)history.pushState(null,"","#/backlinks/"+encodeURIComponent(title));
 currentTitle=title;currentContent="";
 $("home-view").hidden=true;$("document-view").hidden=false;$("editor-view").hidden=true;
 $("home").classList.remove("active");$("new").classList.remove("active");
 $("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;$("delete-page").hidden=true;$("heading-edit").hidden=true;$("backlinks-tab").hidden=true;$("backlinks-tab").hidden=true;
 $("title").textContent=title+" — 역링크";$("crumb").textContent=title+" — 역링크";$("message").textContent="";
 const article=$("article");article.replaceChildren();
 try{
  const data=await api("/api/backlinks?title="+encodeURIComponent(title));const backlinks=data.backlinks||[];
  addText(article,"p","‘"+title+"’ 문서를 링크한 문서 목록입니다.");
  if(!backlinks.length){addText(article,"p","이 문서를 링크한 문서가 없습니다.").className="empty-list";return}
  const list=document.createElement("div");list.className="backlink-list";
  backlinks.forEach(page=>{const row=document.createElement("div");row.className="backlink-row";const link=document.createElement("a");link.href=routeFor(page.title);link.textContent=page.title;link.onclick=e=>{e.preventDefault();openPage(page.title)};const meta=addText(row,"span",page.count+"회 참조");row.append(link,meta);list.append(row)});article.append(list);
 }catch(error){addText(article,"p",error.message).className="empty-list"}
}

async function loadCategoryIndex(pushRoute=true){
 if(pushRoute)history.pushState(null,"","#/categories");
 currentTitle="분류 목록";currentContent="";
 $("home-view").hidden=true;$("document-view").hidden=false;$("editor-view").hidden=true;
 document.body.classList.remove("editor-active");$("home").classList.remove("active");$("new").classList.remove("active");
 $("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;$("delete-page").hidden=true;$("heading-edit").hidden=true;$("backlinks-tab").hidden=true;
 $("title").textContent="분류 목록";$("crumb").textContent="분류 목록";$("message").textContent="";
 const article=$("article");article.replaceChildren();
 try{
  const data=await api("/api/categories");
  const categories=data.categories||[];
  const intro=addText(article,"p","AonWiki에 등록된 분류 목록입니다. 각 분류를 선택하면 해당 문서들을 볼 수 있습니다.");intro.className="category-index-intro";
  if(!categories.length){addText(article,"p","아직 등록된 분류가 없습니다. 문서 끝에 [[분류:분류명]]을 추가해 보세요.").className="empty-list";return}
  const list=document.createElement("div");list.className="category-index-list";
  categories.forEach(category=>{const row=document.createElement("div");row.className="category-index-row";const link=document.createElement("a");link.href=routeFor("분류:"+category.name);link.textContent=category.name;link.onclick=e=>{e.preventDefault();openPage("분류:"+category.name)};const count=addText(row,"span",category.count+"개 문서");row.append(link,count);list.append(row)});article.append(list);
 }catch(error){addText(article,"p",error.message).className="empty-list"}
}
function openRandomPage(){api("/api/pages").then(data=>{const pages=(data.pages||[]).filter(page=>page.title!=="대문"&&!/^(?:분류|category):/i.test(page.title));if(!pages.length)throw Error("이동할 문서가 없습니다.");openPage(pages[Math.floor(Math.random()*pages.length)].title)}).catch(error=>{$("message").textContent=error.message})}

async function renderCategoryPage(name) {
  const data = await api("/api/category?name=" + encodeURIComponent(name));
  const article = $("article");
  article.replaceChildren();
  const intro = document.createElement("p");
  intro.textContent = "‘" + name + "’ 분류에 속하는 문서 목록입니다.";
  article.append(intro);
  const pages = data.pages || [];
  if (!pages.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = "이 분류에 등록된 문서가 없습니다.";
    article.append(empty);
    return;
  }
  const list = document.createElement("ul");
  pages.forEach(page => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = routeFor(page.title);
    link.textContent = page.title;
    link.addEventListener("click", event => {
      event.preventDefault();
      openPage(page.title);
    });
    item.append(link);
    list.append(item);
  });
  article.append(list);
}
async function loadPage(title,pushRoute=true,anchor=""){
 title=String(title||"").trim();if(!title||title==="대문"){showHome(pushRoute);return}
 if(pushRoute)history.pushState(null,"",routeFor(title,anchor));
 currentTitle=title;$("home-view").hidden=true;$("document-view").hidden=false;$("editor-view").hidden=true;document.body.classList.remove("editor-active");$("home").classList.remove("active");$("new").classList.remove("active");$("edit").hidden=false;$("history").hidden=false;$("upload").hidden=false;$("delete-page").hidden=!isWikiAdmin;$("file-manager").hidden=!loggedInName;$("backlinks-tab").hidden=false;
 const displayTitle=/^(?:category|분류):/i.test(title)?"분류:"+title.replace(/^(?:category|분류):/i,""):title;
 $("title").textContent=displayTitle;$("crumb").textContent=displayTitle;$("message").textContent="문서를 불러오는 중입니다…";$("article").replaceChildren();
 $("heading-edit").hidden=false;
 try{
  if (/^(?:category|분류):/i.test(title)) {
   const name=title.replace(/^(?:category|분류):/i,"");
   $("message").textContent="";
   await renderCategoryPage(name);
   $("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;$("delete-page").hidden=true;$("heading-edit").hidden=true;$("backlinks-tab").hidden=true;
   return;
  }
  const data=await api("/api/page?title="+encodeURIComponent(title));if(!data.page){currentContent="";$("message").textContent="이 문서는 아직 존재하지 않습니다. 로그인 후 새 문서를 작성할 수 있습니다.";$("edit").textContent="문서 만들기";return}
  if(data.page.title&&data.page.title!==title){history.replaceState(null,"",routeFor(data.page.title,anchor));return loadPage(data.page.title,false,anchor)}
  currentContent=data.page.content||"";$("message").textContent="";
  const redirect=currentContent.match(/^\s*#redirect\s+(?:\[\[)?([^\]\n]+?)(?:\]\])?\s*$/im);
  if(redirect&&redirect[1].trim()!==title){loadPage(redirect[1].trim(),true);return}
  $("edit").textContent="문서 편집";$("heading-edit").textContent="편집";await renderNamuMarkup(currentContent, $("article"), title);
  if(anchor)requestAnimationFrame(()=>scrollToAnchor(anchor))
 }catch(error){$("message").textContent=error.message;$("article").replaceChildren()}
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
$("delete-page").onclick=async()=>{
 if(!isWikiAdmin||!currentTitle)return;
 if(!confirm("‘"+currentTitle+"’ 문서와 문서 역사를 삭제할까요? 이 작업은 되돌릴 수 없습니다."))return;
 try{await api("/api/page?title="+encodeURIComponent(currentTitle),{method:"DELETE"});showHome(true)}
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
  $("editor-counter").textContent = editorText.length.toLocaleString("ko-KR") + " / 200,000자";
  $("editor-summary").value = "";
  $("editor-status").textContent = "";
  $("editor-preview").replaceChildren();
  $("editor-preview").hidden = true;
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
  $("editor-content").hidden = false;
  $("editor-preview").hidden = true;
  $("editor-tab-write").classList.add("active");
  $("editor-tab-preview").classList.remove("active");
};
$("editor-tab-preview").onclick = () => {
  $("editor-content").hidden = true;
  $("editor-preview").hidden = false;
  $("editor-tab-preview").classList.add("active");
  $("editor-tab-write").classList.remove("active");
  renderNamuMarkup($("editor-content").value, $("editor-preview"), $("editor-title").value.trim() || editorOriginalTitle);
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
  if (!$("editor-preview").hidden) {
    renderNamuMarkup($("editor-content").value, $("editor-preview"), $("editor-title").value.trim() || editorOriginalTitle);
  }
});
$("editor-content").addEventListener("input", () => {
  const content=$("editor-content").value;
  $("editor-counter").textContent=content.length.toLocaleString("ko-KR")+" / 200,000자";
  $("editor-status").textContent=content.length>200000?"문서가 200,000자를 초과했습니다.":"";
  saveEditorDraft();
});
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
$("history").onclick=async()=>{
 try{const data=await api("/api/history?title="+encodeURIComponent(currentTitle)),body=$("dialog-body");body.replaceChildren();(data.revisions||[]).forEach(item=>addText(body,"p",(item.created_at||"")+" · "+(item.editor||"알 수 없음")+(item.summary?" · "+item.summary:"")));
  $("dialog-title").textContent=currentTitle+" — 문서 역사";$("dialog-status").textContent="";$("save").textContent="확인";$("save").onclick=()=>$("dialog").close();$("dialog").showModal()
 }catch(error){$("message").textContent=error.message}
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
     namuDatabaseCache.expires=0;
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
 if(file.size>MAX_RAW_IMAGE_BYTES){
  const message="이미지는 원본 3MB 이하만 업로드할 수 있습니다.";
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
  namuDatabaseCache.expires=0;
  const markup="[[파일:"+data.filename+"|width=500]]";
  const compressionNote=compressed.compressed?"원본 "+formatImageSize(compressed.originalSize)+" → "+formatImageSize(compressed.blob.size)+"로 자동 압축했습니다.":"원본 파일을 그대로 업로드했습니다.";
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
 addText($("dialog-body"),"p","원본 이미지 최대 3MB까지 선택할 수 있습니다. 900KB를 넘으면 WebP로 자동 압축합니다.").className="dialog-help";
};
window.addEventListener("popstate",readRoute);
window.addEventListener("hashchange",readRoute);
readRoute();
refreshIdentity();
startLivePageWatcher();
