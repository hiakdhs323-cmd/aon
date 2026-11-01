const $=id=>document.getElementById(id);
const API_SETTING="aonwiki-api",TOKEN_SETTING="aonwiki-key",NAME_SETTING="aonwiki-username";
const DEFAULT_API_URL="https://aon.hiakdhs323.workers.dev";
const apiBase=()=> (localStorage.getItem(API_SETTING)||DEFAULT_API_URL).replace(/\/$/,"");
let currentTitle="대문",currentContent="",loggedInName=sessionStorage.getItem(NAME_SETTING)||"";
const isHome=title=>String(title||"").trim()==="대문";
async function api(path,options={}){const headers=new Headers(options.headers||{});const token=sessionStorage.getItem(TOKEN_SETTING);if(token)headers.set("Authorization","Bearer "+token);if(options.body&&!(options.body instanceof FormData))headers.set("Content-Type","application/json");const res=await fetch(apiBase()+path,{...options,headers});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error([data.error,data.detail].filter(Boolean).join(" — ")||"요청 실패");return data}
function addText(parent,tag,text){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el}
function inlineRender(parent,source){
 const text=String(source||"");
 const re=/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\[([^\s\]]+)\s+([^\]]+)\]|\*\*([^*]+)\*\*|'''([^']+)'''|''([^']+)''|~~([^~]+)~~|__([^_]+)__/g;
 let pos=0,m;
 while((m=re.exec(text))){
  parent.append(document.createTextNode(text.slice(pos,m.index)));
  if(m[1]!==undefined){const img=document.createElement("img");img.alt=m[1]||"이미지";img.loading="lazy";img.decoding="async";img.src=m[2];img.addEventListener("error",()=>{const span=document.createElement("span");span.className="broken-image";span.textContent="[이미지를 불러오지 못했습니다: "+img.alt+"]";img.replaceWith(span)});parent.append(img)}
  else if(m[3]){const title=m[3].trim(),a=document.createElement("a");a.href="#/"+encodeURIComponent(title);a.textContent=m[4]||title;a.onclick=e=>{e.preventDefault();loadPage(title)};parent.append(a)}
  else if(m[5]){const a=document.createElement("a");a.href=m[5];a.target="_blank";a.rel="noopener noreferrer";a.textContent=m[6];parent.append(a)}
  else if(m[7]||m[8])addText(parent,"strong",m[7]||m[8]);
  else if(m[9])addText(parent,"em",m[9]);
  else if(m[10])addText(parent,"del",m[10]);
  else if(m[11])addText(parent,"u",m[11]);
  pos=re.lastIndex;
 }
 parent.append(document.createTextNode(text.slice(pos)));
}
function renderContent(source,target=$("article")){
 target.replaceChildren();
 const lines=String(source||"").replace(/\r/g,"").split("\n");
 let i=0,paragraph=[];
 const flushParagraph=()=>{if(!paragraph.length)return;const p=document.createElement("p");paragraph.forEach((line,n)=>{if(n)p.append(document.createElement("br"));inlineRender(p,line)});target.append(p);paragraph=[]};
 while(i<lines.length){
  const line=lines[i],trim=line.trim();
  if(!trim){flushParagraph();i++;continue}
  if(trim.startsWith("{{{")){flushParagraph();const code=[];i++;while(i<lines.length&&!lines[i].trim().startsWith("}}}"))code.push(lines[i++]);if(i<lines.length)i++;const pre=document.createElement("pre");pre.textContent=code.join("\n");target.append(pre);continue}
  const hm=line.match(/^(={1,6})\s*(.*?)\s*\1\s*$/);
  if(hm){flushParagraph();addText(target,"h"+Math.min(6,hm[1].length),hm[2]);i++;continue}
  if(/^[-]{4,}$/.test(trim)){flushParagraph();target.append(document.createElement("hr"));i++;continue}
  if(/^\|\|/.test(trim)){
   flushParagraph();const rows=[];
   while(i<lines.length&&/^\s*\|\|/.test(lines[i])){rows.push(lines[i].trim().replace(/^\|\|/,"").replace(/\|\|$/,"").split("||").map(x=>x.trim()));i++}
   const table=document.createElement("table");const tbody=document.createElement("tbody");
   rows.forEach((cells,ri)=>{const tr=document.createElement("tr");cells.forEach(cell=>{const tag=ri===0?"th":"td",el=document.createElement(tag);inlineRender(el,cell);tr.append(el)});tbody.append(tr)});table.append(tbody);target.append(table);continue
  }
  const lm=line.match(/^([*#])\s*(.*)$/);
  if(lm){flushParagraph();const type=lm[1]==="*"?"ul":"ol";let list=target.lastElementChild;if(!list||list.tagName.toLowerCase()!==type){list=document.createElement(type);target.append(list)}const li=document.createElement("li");inlineRender(li,lm[2]);list.append(li);i++;continue}
  if(/^>\s?/.test(line)){flushParagraph();const quote=document.createElement("blockquote");const p=document.createElement("p");inlineRender(p,line.replace(/^>\s?/,""));quote.append(p);target.append(quote);i++;continue}
  paragraph.push(line);i++;
 }
 flushParagraph();
 const headings=[...target.querySelectorAll("h2,h3,h4")];
 if(headings.length){const toc=document.createElement("nav");toc.className="wiki-toc";const label=addText(toc,"strong","목차");const ol=document.createElement("ol");headings.forEach((h,n)=>{const id="section-"+n;h.id=id;const li=document.createElement("li");li.className="toc-level-"+h.tagName.toLowerCase();const a=document.createElement("a");a.href="#"+id;a.textContent=h.textContent;a.onclick=e=>{e.preventDefault();h.scrollIntoView({behavior:"smooth",block:"start"})};li.append(a);ol.append(li)});toc.append(ol);target.prepend(toc)}
}
function updateEditControls(){const home=isHome(currentTitle);$("edit").hidden=home;$("heading-edit").hidden=home}
async function loadPage(title,saveRoute=true){
 currentTitle=String(title||"대문").trim()||"대문";
 if(saveRoute){const route="#/"+encodeURIComponent(currentTitle);if(location.hash!==route)history.replaceState(null,"",route)}
 $("title").textContent=currentTitle;$("crumb").textContent=currentTitle;updateEditControls();
 $("message").textContent="문서를 불러오는 중입니다…";
 try{const d=await api("/api/page?title="+encodeURIComponent(currentTitle));currentContent=d.page?d.page.content:"";renderContent(currentContent);$("message").textContent=d.page?"":"문서가 없습니다. 로그인 후 새 문서를 만들 수 있습니다."}
 catch(e){$("message").textContent=e.message;$("article").replaceChildren()}
}
function showDialog(title,fields,onSave,label="저장"){
 $("dialog-title").textContent=title;const body=$("dialog-body");body.replaceChildren();
 for(const f of fields){addText(body,"label",f.label);const input=document.createElement(f.multiline?"textarea":"input");input.id=f.id;input.value=f.value||"";if(f.type)input.type=f.type;if(f.placeholder)input.placeholder=f.placeholder;body.append(input)}
 $("dialog-status").textContent="";$("save").textContent=label;$("dialog").showModal();
 $("save").onclick=async()=>{try{await onSave()}catch(e){$("dialog-status").textContent=e.message}}
}
$("cancel").onclick=()=>$("dialog").close();
$("login").onclick=()=>{
 if(loggedInName){sessionStorage.removeItem(TOKEN_SETTING);sessionStorage.removeItem(NAME_SETTING);loggedInName="";$("login").textContent="로그인";$("message").textContent="로그아웃했습니다.";return}
 let mode="login";
 showDialog("로그인",[{id:"auth-username",label:"아이디"},{id:"auth-password",label:"비밀번호",type:"password"}],async()=>{
  const username=$("auth-username").value.trim(),password=$("auth-password").value;
  const d=await api("/api/"+mode,{method:"POST",body:JSON.stringify({username,password})});
  if(mode==="register"){$("dialog-status").textContent=d.message+" 로그인 화면으로 돌아가 로그인하세요.";return}
  sessionStorage.setItem(TOKEN_SETTING,d.token);sessionStorage.setItem(NAME_SETTING,d.username);loggedInName=d.username;$("login").textContent="로그아웃 · "+loggedInName;$("dialog").close();await loadPage(currentTitle)
 }, "로그인");
 const toggle=document.createElement("button");toggle.type="button";toggle.className="button";toggle.textContent="계정 만들기";
 toggle.onclick=()=>{mode=mode==="login"?"register":"login";$("dialog-title").textContent=mode==="login"?"로그인":"회원가입";$("save").textContent=mode==="login"?"로그인":"가입하기";toggle.textContent=mode==="login"?"계정 만들기":"로그인으로 돌아가기"};
 $("dialog-body").append(toggle)
};
if(loggedInName)$("login").textContent="로그아웃 · "+loggedInName;
$("settings").onclick=()=>showDialog("API 설정",[{id:"api-url",label:"Cloudflare Worker API 주소",value:apiBase()},{id:"admin-token",label:"관리자 토큰(선택)",type:"password"}],async()=>{
 const base=$("api-url").value.trim().replace(/\/$/,"");if(base&&!base.startsWith("https://"))throw Error("https:// 주소를 입력하세요.");if(base)localStorage.setItem(API_SETTING,base);if($("admin-token").value)sessionStorage.setItem(TOKEN_SETTING,$("admin-token").value);$("dialog").close();await loadPage(currentTitle)
});
function editPage(title=currentTitle,content=currentContent){
 if(isHome(title)){ $("message").textContent="대문은 직접 편집할 수 없습니다.";return}
 showDialog("문서 편집",[{id:"edit-title",label:"문서 제목",value:title,placeholder:"문서 제목"},{id:"edit-content",label:"문서 내용",value:content,multiline:true,placeholder:"== 제목 ==\n**굵게** ''기울임''\n[[다른 문서]]\n![이미지](이미지 URL)\n* 목록"}],async()=>{
  const t=$("edit-title").value.trim(),c=$("edit-content").value;if(!t)throw Error("문서 제목을 입력하세요.");if(isHome(t))throw Error("대문은 편집할 수 없습니다.");if(c.length>200000)throw Error("문서는 200,000자 이하로 작성해 주세요.");
  await api("/api/page",{method:"PUT",body:JSON.stringify({title:t,content:c})});$("dialog").close();await loadPage(t)
 });
 const b=document.createElement("button");b.type="button";b.className="button";b.textContent="미리보기";b.style.margin="8px 0";
 const v=document.createElement("div");v.className="wiki-content";v.hidden=true;$("dialog-body").append(b,v);
 b.onclick=()=>{v.hidden=!v.hidden;b.textContent=v.hidden?"미리보기":"편집으로 돌아가기";if(!v.hidden)renderContent($("edit-content").value,v)}
}
$("edit").onclick=()=>editPage();$("heading-edit").onclick=()=>editPage();
$("new").onclick=()=>editPage("","");$("home").onclick=()=>loadPage("대문");
$("search").onsubmit=async e=>{e.preventDefault();const q=$("query").value.trim();if(!q)return;try{const d=await api("/api/pages?q="+encodeURIComponent(q));const pages=d.pages||[];if(pages.length===1)loadPage(pages[0].title);else if(pages.length){$("dialog-title").textContent="검색 결과";const body=$("dialog-body");body.replaceChildren();pages.forEach(p=>{const b=document.createElement("button");b.className="button";b.style.display="block";b.style.margin="5px 0";b.textContent=p.title;b.onclick=()=>{$("dialog").close();loadPage(p.title)};body.append(b)});$("save").textContent="닫기";$("save").onclick=()=>$("dialog").close();$("dialog").showModal()}else $("message").textContent="검색 결과가 없습니다."}catch(e){$("message").textContent=e.message}};
$("history").onclick=async()=>{try{const d=await api("/api/history?title="+encodeURIComponent(currentTitle));const body=$("dialog-body");body.replaceChildren();(d.revisions||[]).forEach(x=>addText(body,"p",x.created_at+" · "+x.editor));$("dialog-title").textContent=currentTitle+" — 문서 역사";$("save").textContent="확인";$("save").onclick=()=>$("dialog").close();$("dialog").showModal()}catch(e){$("message").textContent=e.message}};
$("history-tab").onclick=()=>$("history").click();
$("upload").onclick=()=>{if(isHome(currentTitle)){$("message").textContent="대문에서는 이미지를 업로드할 수 없습니다. 먼저 다른 문서를 여세요.";return}$("file").click()};
$("file").onchange=async()=>{const file=$("file").files[0];$("file").value="";if(!file)return;if(file.size>1024*1024){$("message").textContent="이미지는 1MB 이하만 업로드할 수 있습니다.";return}const f=new FormData();f.append("file",file);try{const d=await api("/api/upload",{method:"POST",body:f});editPage(currentTitle,currentContent+"\n\n!["+file.name.replace(/[\[\]]/g,"")+"]("+d.url+")")}catch(e){$("message").textContent=e.message}};
window.addEventListener("hashchange",()=>{if(location.hash.startsWith("#/")){let title="대문";try{title=decodeURIComponent(location.hash.slice(2))||"대문"}catch{}if(title!==currentTitle)loadPage(title,false)}});
let initialTitle="대문";if(location.hash.startsWith("#/")){try{initialTitle=decodeURIComponent(location.hash.slice(2))||"대문"}catch{}}
loadPage(initialTitle,false);
