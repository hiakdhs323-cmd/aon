const $=id=>document.getElementById(id);
const API_SETTING="aonwiki-api",TOKEN_SETTING="aonwiki-key",NAME_SETTING="aonwiki-username";
const DEFAULT_API_URL="https://aon.hiakdhs323.workers.dev";
const apiBase=()=> (localStorage.getItem(API_SETTING)||DEFAULT_API_URL).replace(/\/$/,"");
let currentTitle="",currentContent="",loggedInName=sessionStorage.getItem(NAME_SETTING)||"";
const isHomeRoute=()=>!location.hash||location.hash==="#"||location.hash==="#/";
function routeFor(title,anchor=""){return "#/w/"+encodeURIComponent(title)+(anchor?"#"+encodeURIComponent(anchor):"")}
async function api(path,options={}){const headers=new Headers(options.headers||{});const token=sessionStorage.getItem(TOKEN_SETTING);if(token)headers.set("Authorization","Bearer "+token);if(options.body&&!(options.body instanceof FormData))headers.set("Content-Type","application/json");const res=await fetch(apiBase()+path,{...options,headers});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error([data.error,data.detail].filter(Boolean).join(" — ")||"요청 실패");return data}
function addText(parent,tag,text){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el}
function showHome(push=true){if(push)history.pushState(null,"", "#/");currentTitle="";currentContent="";$("home-view").hidden=false;$("document-view").hidden=true;$("editor-view").hidden=true;document.body.classList.remove("editor-active");$("home").classList.add("active");$("edit").hidden=true;$("history").hidden=true;$("upload").hidden=true;$("new").classList.remove("active");loadHome()}
async function loadHome(){
 const list=$("page-list");list.replaceChildren();$("page-count").textContent="";
 try{const data=await api("/api/pages");const pages=(data.pages||[]).filter(p=>p.title!=="대문");$("page-count").textContent=pages.length+"개 문서";
  if(!pages.length){addText(list,"p","아직 등록된 문서가 없습니다. 로그인 후 첫 문서를 만들어 보세요.").className="empty-list";return}
  pages.forEach(page=>{const row=document.createElement("div");row.className="page-row";const a=document.createElement("a");a.href=routeFor(page.title);a.textContent=page.title;a.onclick=e=>{e.preventDefault();openPage(page.title)};const time=document.createElement("time");time.textContent=page.updated_at?new Date(page.updated_at).toLocaleString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}):"";row.append(a,time);list.append(row)});
 }catch(error){addText(list,"p",error.message).className="empty-list"}
}
function openPage(title,anchor=""){title=String(title||"").trim();if(!title||title==="대문"){showHome(true);return}history.pushState(null,"",routeFor(title,anchor));loadPage(title,false,anchor)}
function readRoute(){
 const hash=location.hash||"#/";
 if(hash==="#"||hash==="#/"||hash==="#/home"){showHome(false);return}
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
 const id=decodeURIComponent(String(anchor||"").replace(/^#/,""));
 let el=document.getElementById(id);
 if(!el){const wanted=id.replace(/^s-\d+$/,"");if(wanted)el=[...$("article").querySelectorAll("h2,h3,h4,h5,h6")].find(h=>h.textContent.trim()===wanted)}
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
 const token=/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|\[\[파일:([^\]]+)\]\]|\[\[([^\]]+)\]\]|\[\*([^\]]*)\]|\[(목차|tableofcontents)(?:\((hide)\))?\]|\[(각주|footnote)\]|\[br\]|\[clearfix\]|\[(https?:\/\/[^\s\]]+)(?:\s+([^\]]+))?\]|'''([\s\S]+?)'''|''([\s\S]+?)''|__([\s\S]+?)__|~~([\s\S]+?)~~|--([\s\S]+?)--|\^\^([\s\S]+?)\^\^|,,([\s\S]+?),,|\{\{\{([\s\S]+?)\}\}\}/gi;
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
  else if(m[9]!==undefined){const a=document.createElement("a");a.href=m[9];a.target="_blank";a.rel="noopener noreferrer";a.textContent=m[10]||m[9];parent.append(a)}
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
  if(state.categories.length){const box=document.createElement("div");box.className="wiki-categories";state.categories.forEach(cat=>{const a=document.createElement("a");a.href="#/";a.textContent="분류:"+cat;a.onclick=e=>{e.preventDefault();searchFor(cat)};box.append(a)});target.append(box)}
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
  const allowed = new Set(["color","background","background-color","font-size","font-weight","font-style","text-align","text-decoration","width","max-width","min-width","height","max-height","margin","margin-left","margin-right","padding","border","border-color","border-width","border-style","border-radius","float","display","vertical-align","white-space","list-style-type"]);
  const output = [];
  String(raw || "").split(";").forEach(entry => {
    const at = entry.indexOf(":");
    if (at < 1) return;
    const key = entry.slice(0, at).trim().toLowerCase();
    const value = entry.slice(at + 1).trim();
    if (!allowed.has(key) || !value || /url\s*\(|expression|javascript|@import|[<>]/i.test(value)) return;
    output.push(key + ":" + value);
  });
  return output.join(";");
}
function sanitizeNamuOutput(root, docTitle) {
  const allowedTags = new Set(("A ABBR B BDI BDO BLOCKQUOTE BR CAPTION CENTER CODE COL COLGROUP DD DEL DETAILS DIV DL DT EM FIGCAPTION FIGURE FONT H1 H2 H3 H4 H5 H6 HR I IFRAME IMG INS KBD LI MARK OL P PRE Q RUBY RT RP S SAMP SMALL SPAN STRIKE STRONG SUB SUMMARY SUP TABLE TBODY TD TFOOT TH THEAD TR TT U UL VAR VIDEO AUDIO SOURCE").split(" "));
  const allowedAttrs = new Set(("alt allow allowfullscreen class colspan frameborder height href id lang loading open referrerpolicy rel rowspan src style target title type width align valign controls loop muted poster start").split(" "));
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
      const href = node.getAttribute("href") || "";
      if (href.startsWith("/w/")) {
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
    if (window.katex) {
      target.querySelectorAll('span[id*="opennamu_math_"]').forEach(element => {
        try {
          window.katex.render(element.textContent || "", element, { throwOnError: false, strict: "ignore" });
        } catch (error) {
          console.warn("KaTeX rendering skipped", error);
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

async function loadPage(title,pushRoute=true,anchor=""){
 title=String(title||"").trim();if(!title||title==="대문"){showHome(pushRoute);return}
 if(pushRoute)history.pushState(null,"",routeFor(title,anchor));
 currentTitle=title;$("home-view").hidden=true;$("document-view").hidden=false;$("editor-view").hidden=true;document.body.classList.remove("editor-active");$("home").classList.remove("active");$("new").classList.remove("active");$("edit").hidden=false;$("history").hidden=false;$("upload").hidden=false;
 $("title").textContent=title;$("crumb").textContent=title;$("message").textContent="문서를 불러오는 중입니다…";$("article").replaceChildren();
 try{const data=await api("/api/page?title="+encodeURIComponent(title));if(!data.page){currentContent="";$("message").textContent="이 문서는 아직 존재하지 않습니다. 로그인 후 새 문서를 작성할 수 있습니다.";$("edit").textContent="문서 만들기";return}
  currentContent=data.page.content||"";$("message").textContent="";
  const redirect=currentContent.match(/^\s*#redirect\s+(?:\[\[)?([^\]\n]+?)(?:\]\])?\s*$/im);
  if(redirect&&redirect[1].trim()!==title){loadPage(redirect[1].trim(),true);return}
  $("edit").textContent="문서 편집";$("heading-edit").textContent="편집";await renderNamuMarkup(currentContent, $("article"), title);
  if(anchor)requestAnimationFrame(()=>scrollToAnchor(anchor))
 }catch(error){$("message").textContent=error.message;$("article").replaceChildren()}
}
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
  sessionStorage.setItem(TOKEN_SETTING,data.token);sessionStorage.setItem(NAME_SETTING,data.username);loggedInName=data.username;$("login").textContent="로그아웃 · "+loggedInName;$("dialog").close();
  if(document.body.classList.contains("editor-active"))return;if(currentTitle)loadPage(currentTitle,false);else loadHome()
 }, "로그인");
 const toggle=document.createElement("button");toggle.type="button";toggle.className="button";toggle.textContent="계정 만들기";toggle.style.marginTop="10px";
 toggle.onclick=()=>{mode=mode==="login"?"register":"login";$("dialog-title").textContent=mode==="login"?"로그인":"회원가입";$("save").textContent=mode==="login"?"로그인":"가입하기";toggle.textContent=mode==="login"?"계정 만들기":"로그인으로 돌아가기"};
 $("dialog-body").append(toggle)
}
$("login").onclick=()=>{if(loggedInName){sessionStorage.removeItem(TOKEN_SETTING);sessionStorage.removeItem(NAME_SETTING);loggedInName="";$("login").textContent="로그인";return}openLogin()};
if(loggedInName)$("login").textContent="로그아웃 · "+loggedInName;
$("settings").onclick=()=>showDialog("API 설정",[{id:"api-url",label:"Cloudflare Worker API 주소",value:apiBase()},{id:"admin-token",label:"관리자 토큰(선택)",type:"password"}],async()=>{
 const base=$("api-url").value.trim().replace(/\/$/,"");if(base&&!base.startsWith("https://"))throw Error("https:// 주소를 입력하세요.");if(base)localStorage.setItem(API_SETTING,base);if($("admin-token").value)sessionStorage.setItem(TOKEN_SETTING,$("admin-token").value);$("dialog").close();readRoute()
});
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
  $("editor-title-wrap").hidden = !editorIsNew;
  $("editor-title").value = editorIsNew ? "" : editorOriginalTitle;
  $("editor-title").readOnly = !editorIsNew;
  $("editor-content").value = String(content || "");
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
  renderNamuMarkup($("editor-content").value, $("editor-preview"), editorIsNew ? $("editor-title").value.trim() : editorOriginalTitle);
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
  const title = editorIsNew ? $("editor-title").value.trim() : editorOriginalTitle;
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
      body: JSON.stringify({ title, content, summary, createOnly: editorIsNew })
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
$("editor-content").addEventListener("input", () => {
  sessionStorage.setItem("aonwiki-draft", JSON.stringify({
    originalTitle: editorOriginalTitle,
    title: $("editor-title").value,
    content: $("editor-content").value
  }));
});
$("home").onclick=()=>showHome(true);
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
$("upload").onclick=()=>{
 if(!currentTitle)return;
 if(!loggedInName&&!sessionStorage.getItem(TOKEN_SETTING)){openLogin();return}
 $("file").click()
};
$("editor-image").onclick=()=>{
 if(!loggedInName&&!sessionStorage.getItem(TOKEN_SETTING)){openLogin();return}
 $("file").click()
};
$("editor-image").onclick=()=>{
 if(!loggedInName&&!sessionStorage.getItem(TOKEN_SETTING)){openLogin();return}
 $("file").click()
};
$("file").onchange=async()=>{
 const file=$("file").files[0];
 $("file").value="";
 if(!file)return;
 if(file.size>1024*1024){
  const message="이미지는 1MB 이하만 업로드할 수 있습니다.";
  if(!$("editor-view").hidden)$("editor-status").textContent=message;
  else $("message").textContent=message;
  return
 }
 const form=new FormData();form.append("file",file);
 try{
  const data=await api("/api/upload",{method:"POST",body:form});
  const markup="[[파일:"+(data.filename||file.name)+"|width=500]]";
  if(!$("editor-view").hidden){
   const field=$("editor-content");
   field.setRangeText(markup,field.selectionStart,field.selectionEnd,"end");
   field.focus();
  }else if(currentTitle){
   editPage(currentTitle,currentContent+(currentContent?"\n\n":"")+markup);
  }
 }catch(error){
  if(!$("editor-view").hidden)$("editor-status").textContent=error.message;
  else $("message").textContent=error.message;
 }
};
window.addEventListener("popstate",readRoute);
window.addEventListener("hashchange",readRoute);
readRoute();
