const $ = id => document.getElementById(id);
const API_SETTING = "aonwiki-api";
const TOKEN_SETTING = "aonwiki-key";
let loggedInName = sessionStorage.getItem("aonwiki-username") || "";
let currentTitle = "대문";
let currentContent = "";
const DEFAULT_API_URL = "https://aon.hiakdhs323.workers.dev";
const apiBase = () => (localStorage.getItem(API_SETTING) || DEFAULT_API_URL).replace(/\/$/, "");
const adminToken = () => sessionStorage.getItem(TOKEN_SETTING) || "";

async function api(path, options = {}) {
  if (!apiBase()) throw new Error("설정에서 Cloudflare Worker API 주소를 먼저 입력하세요.");
  const headers = new Headers(options.headers || {});
  if (adminToken()) headers.set("Authorization", "Bearer " + adminToken());
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(apiBase() + path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "요청에 실패했습니다.");
  return data;
}

function addText(parent, tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  parent.append(el);
  return el;
}

function inlineRender(parent,text){
 const re=/\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]|\\*\\*([^*]+)\\*\\*|'''([^']+)'''|''([^']+)''|~~([^~]+)~~|__([^_]+)__/g;
 let pos=0,m;
 while((m=re.exec(text))){
  parent.append(document.createTextNode(text.slice(pos,m.index)));
  if(m[1]){const title=m[1].trim(),a=document.createElement("a");a.href="#";a.textContent=m[2]||title;a.onclick=e=>{e.preventDefault();loadPage(title)};parent.append(a)}
  else if(m[3])addText(parent,"strong",m[3]);
  else if(m[4])addText(parent,"strong",m[4]);
  else if(m[5])addText(parent,"em",m[5]);
  else if(m[6])addText(parent,"del",m[6]);
  else if(m[7])addText(parent,"u",m[7]);
  pos=re.lastIndex;
 }
 parent.append(document.createTextNode(text.slice(pos)));
}
function renderContent(source,target=$("article")){
 target.replaceChildren(); let list=null,listType="",quote=null,code=null,p=null;
 for(const line of String(source||"").split("\n")){
  if(line.trim().startsWith("{{{")&&!code){code=[];p=null;list=null;continue}
  if(code){if(line.trim().startsWith("}}}")){const pre=document.createElement("pre");pre.textContent=code.join("\n");target.append(pre);code=null}else code.push(line);continue}
  const hm=line.match(/^(={1,6})\s*(.*?)\s*\1$/);
  if(hm){p=null;list=null;quote=null;addText(target,"h"+Math.min(6,hm[1].length),hm[2]);continue}
  if(/^[-]{4,}$/.test(line.trim())){p=null;list=null;target.append(document.createElement("hr"));continue}
  const lm=line.match(/^([*#])\s*(.*)$/);
  if(lm){p=null;quote=null;const type=lm[1]==="*"?"ul":"ol";if(!list||listType!==type){list=document.createElement(type);target.append(list);listType=type}const li=document.createElement("li");inlineRender(li,lm[2]);list.append(li);continue}else{list=null;listType=""}
  if(/^>\s?/.test(line)){p=null;if(!quote){quote=document.createElement("blockquote");target.append(quote)}const q=document.createElement("p");inlineRender(q,line.replace(/^>\s?/,""));quote.append(q);continue}else quote=null;
  if(!line.trim()){p=null;continue}
  if(!p){p=document.createElement("p");target.append(p)}else p.append(document.createElement("br"));
  inlineRender(p,line);
 }
 if(code){const pre=document.createElement("pre");pre.textContent=code.join("\n");target.append(pre)}
}
async function loadPage(title) {
  currentTitle = String(title || "대문").trim() || "대문";
  $("title").textContent = currentTitle;
  $("crumb").textContent = currentTitle;
  try {
    const data = await api("/api/page?title=" + encodeURIComponent(currentTitle));
    currentContent = data.page ? data.page.content : "";
    renderContent(currentContent);
    $("message").textContent = data.page ? "문서를 불러왔습니다." : "문서가 없습니다. 로그인 후 새 문서를 만들 수 있습니다.";
  } catch (error) {
    $("message").textContent = error.message;
    $("article").replaceChildren();
  }
}

function showDialog(title, fields, onSave, saveLabel = "저장") {
  $("dialog-title").textContent = title;
  const body = $("dialog-body");
  body.replaceChildren();
  for (const field of fields) {
    addText(body, "label", field.label);
    const input = document.createElement(field.multiline ? "textarea" : "input");
    input.id = field.id;
    input.value = field.value || "";
    if (field.type) input.type = field.type;
    if (field.placeholder) input.placeholder = field.placeholder;
    body.append(input);
  }
  $("dialog-status").textContent = "";
  $("save").textContent = saveLabel;
  $("dialog").showModal();
  $("save").onclick = async () => {
    try {
      await onSave();
    } catch (error) {
      $("dialog-status").textContent = error.message;
    }
  };
}

$("cancel").addEventListener("click", () => $("dialog").close());
$("settings").addEventListener("click", () => showDialog("API 설정", [
  { id: "api-url", label: "Cloudflare Worker API 주소", value: apiBase(), placeholder: "https://aon.hiakdhs323.workers.dev" },
  { id: "admin-token", label: "관리자 토큰 (선택)", type: "password", value: "", placeholder: "ADMIN_TOKEN" }
], async () => {
  const base = $("api-url").value.trim().replace(/\/$/, "");
  if (base && !base.startsWith("https://")) throw new Error("https:// 주소를 입력하세요.");
  if (base) localStorage.setItem(API_SETTING, base); else localStorage.removeItem(API_SETTING);
  if ($("admin-token").value) sessionStorage.setItem(TOKEN_SETTING, $("admin-token").value);
  $("dialog").close();
  await $("login").addEventListener("click",()=>{
 if(loggedInName){sessionStorage.removeItem(TOKEN_SETTING);sessionStorage.removeItem("aonwiki-username");loggedInName="";$("login").textContent="로그인";$("message").textContent="로그아웃했습니다.";return}
 let mode="login";
 showDialog("로그인",[
 {id:"auth-username",label:"아이디",placeholder:"한글/영문/숫자 2~20자"},
 {id:"auth-password",label:"비밀번호",type:"password",placeholder:"8자 이상"}
 ],async()=>{
 const username=$("auth-username").value.trim(),password=$("auth-password").value;
 const data=await api("/api/"+mode,{method:"POST",body:JSON.stringify({username,password})});
 if(mode==="register"){$("dialog-status").textContent=data.message;return}
 sessionStorage.setItem(TOKEN_SETTING,data.token);sessionStorage.setItem("aonwiki-username",data.username);loggedInName=data.username;
 $("login").textContent="로그아웃 · "+loggedInName;$("dialog").close();$("message").textContent=loggedInName+"님 로그인됨";await loadPage(currentTitle);
 });
 const toggle=document.createElement("button");toggle.type="button";toggle.className="secondary-button";toggle.textContent="계정 만들기";toggle.style.marginTop="10px";$("dialog-body").append(toggle);
 toggle.onclick=()=>{mode=mode==="login"?"register":"login";$("dialog-title").textContent=mode==="login"?"로그인":"회원가입";$("save").textContent=mode==="login"?"로그인":"가입하기";toggle.textContent=mode==="login"?"계정 만들기":"로그인으로 돌아가기"};
 $("save").textContent="로그인";
});
if(loggedInName)$("login").textContent="로그아웃 · "+loggedInName;

loadPage(currentTitle);
}));

function editPage(title = currentTitle, content = currentContent) {
  showDialog("문서 편집", [
    { id: "edit-title", label: "문서 제목", value: title, placeholder: "문서 제목" },
    { id: "edit-content", label: "문서 내용", value: content, multiline: true, placeholder: "== 문단 제목 ==\n내용\n[[다른 문서]]\n![설명](https://이미지주소)" }
  ], async () => {
    const pageTitle = $("edit-title").value.trim();
    const pageContent = $("edit-content").value;
    if (!pageTitle) throw new Error("문서 제목을 입력하세요.");
    if (pageContent.length > 200000) throw new Error("문서는 200,000자 이하로 작성해 주세요.");
    await api("/api/page", { method: "PUT", body: JSON.stringify({ title: pageTitle, content: pageContent }) });
    $("dialog").close();
    await loadPage(pageTitle);
  });
  const pb=document.createElement("button");pb.type="button";pb.className="secondary-button";pb.textContent="미리보기";pb.style.margin="10px 0";
  const pv=document.createElement("div");pv.className="wiki-content editor-preview";pv.hidden=true;
  $("dialog-body").append(pb,pv);
  pb.onclick=()=>{pv.hidden=!pv.hidden;pb.textContent=pv.hidden?"미리보기":"편집으로 돌아가기";if(!pv.hidden)renderContent($("edit-content").value,pv)};
}

$("edit").addEventListener("click", () => editPage());
$("new").addEventListener("click", () => editPage("", ""));
$("home").addEventListener("click", () => loadPage("대문"));
$("search").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const data = await api("/api/pages?q=" + encodeURIComponent($("query").value.trim()));
    const pages = data.pages || [];
    if (pages.length) {
      if (pages.length === 1) await loadPage(pages[0].title);
      else {
        const body = $("dialog-body");
        body.replaceChildren();
        for (const page of pages) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = page.title;
          button.style.display = "block";
          button.style.margin = "8px 0";
          button.addEventListener("click", async () => {
            $("dialog").close();
            await loadPage(page.title);
          });
          body.append(button);
        }
        $("dialog-title").textContent = "검색 결과";
        $("dialog-status").textContent = "";
        $("save").textContent = "닫기";
        $("save").onclick = () => $("dialog").close();
        $("dialog").showModal();
      }
    } else $("message").textContent = "검색 결과가 없습니다.";
  } catch (error) {
    $("message").textContent = error.message;
  }
});

$("history").addEventListener("click", async () => {
  try {
    const data = await api("/api/history?title=" + encodeURIComponent(currentTitle));
    const dialogBody = $("dialog-body");
    dialogBody.replaceChildren();
    for (const revision of (data.revisions || [])) {
      addText(dialogBody, "p", revision.created_at + " · " + revision.editor);
    }
    $("dialog-title").textContent = currentTitle + " — 문서 역사";
    $("dialog-status").textContent = "";
    $("save").textContent = "확인";
    $("save").onclick = () => $("dialog").close();
    $("dialog").showModal();
  } catch (error) {
    $("message").textContent = error.message;
  }
});

$("upload").addEventListener("click", () => $("file").click());
$("file").addEventListener("change", async () => {
  const file = $("file").files[0];
  if (!file) return;
  $("file").value = "";
  if (file.size > 1 * 1024 * 1024) {
    $("message").textContent = "이미지는 1MB 이하만 업로드할 수 있습니다.";
    return;
  }
  const form = new FormData();
  form.append("file", file);
  try {
    const data = await api("/api/upload", { method: "POST", body: form });
    editPage(currentTitle, currentContent + "\n\n![" + file.name.replace(/[\[\]]/g, "") + "](" + data.url + ")");
  } catch (error) {
    $("message").textContent = error.message;
  }
});

loadPage(currentTitle);
