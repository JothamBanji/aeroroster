
const state={routes:[],filtered:[],selected:null};
const $=id=>document.getElementById(id);
const els={airline:$("airline"),aircraft:$("aircraft"),departure:$("departure"),destination:$("destination"),grid:$("routeGrid"),empty:$("empty"),count:$("countPill"),title:$("resultTitle"),modal:$("modal"),modalBody:$("modalBody"),logList:$("logList"),logEmpty:$("logEmpty")};

async function init(){
  try{
    const r=await fetch("./data/routes.json");
    if(!r.ok) throw new Error("Could not load route data.");
    state.routes=await r.json(); state.filtered=[...state.routes];
    fillAirlines(); fillAircraft(); stats(); render(); renderLogbook(); bind();
  }catch(e){els.grid.innerHTML=`<div class="empty"><h3>Could not start app</h3><p>${escapeHtml(e.message)} Use Live Server, Python, Netlify or GitHub Pages.</p></div>`}
}
function bind(){
  els.airline.onchange=()=>{fillAircraft();filter()};
  els.aircraft.onchange=filter; els.departure.oninput=filter; els.destination.oninput=filter;
  $("randomBtn").onclick=()=>{const p=state.filtered.length?state.filtered:state.routes;if(p.length)openRoute(p[Math.floor(Math.random()*p.length)])};
  $("closeModal").onclick=()=>els.modal.close();
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  $("clearLogbook").onclick=()=>{if(confirm("Delete every logged flight?")){localStorage.removeItem("aeroroster-logbook");renderLogbook()}};
}
function fillAirlines(){
  [...new Set(state.routes.map(x=>x.airline))].sort().forEach(name=>{const o=document.createElement("option");o.value=name;o.textContent=name;els.airline.append(o)});
}
function fillAircraft(){
  const airline=els.airline.value;
  els.aircraft.innerHTML='<option value="">All aircraft</option>';
  [...new Set(state.routes.filter(x=>!airline||x.airline===airline).map(x=>`${x.aircraftIcao}|${x.aircraft}`))].sort().forEach(v=>{const [code,name]=v.split("|");const o=document.createElement("option");o.value=code;o.textContent=`${code} — ${name}`;els.aircraft.append(o)});
}
function filter(){
  const a=els.airline.value,ac=els.aircraft.value,d=els.departure.value.trim().toLowerCase(),q=els.destination.value.trim().toLowerCase();
  state.filtered=state.routes.filter(x=>{
    const from=`${x.fromIata} ${x.fromIcao} ${x.fromCity} ${x.fromAirport}`.toLowerCase();
    const to=`${x.toIata} ${x.toIcao} ${x.toCity} ${x.toAirport}`.toLowerCase();
    return(!a||x.airline===a)&&(!ac||x.aircraftIcao===ac)&&(!d||from.includes(d))&&(!q||to.includes(q));
  });
  els.title.textContent=a&&ac?`${a} · ${ac}`:a||ac||"All routes";render();
}
function render(){
  els.grid.innerHTML="";els.count.textContent=`${state.filtered.length} route${state.filtered.length===1?"":"s"}`;els.empty.classList.toggle("hidden",state.filtered.length>0);
  state.filtered.forEach(x=>{
    const c=document.createElement("article");c.className="route-card";
    c.innerHTML=`<div class="card-top"><span class="badge">${escapeHtml(x.airlineCode)} · ${escapeHtml(x.airline)}</span><span class="code">${escapeHtml(x.aircraftIcao)}</span></div>
    <div class="airports"><div class="airport"><b>${x.fromIata}</b><span>${escapeHtml(x.fromCity)}</span></div><div class="line"><i>✈</i></div><div class="airport right"><b>${x.toIata}</b><span>${escapeHtml(x.toCity)}</span></div></div>
    <div class="card-bottom"><div><small>Aircraft</small><strong>${escapeHtml(x.aircraft)}</strong></div><button class="primary">View flight</button></div>`;
    c.querySelector("button").onclick=()=>openRoute(x);els.grid.append(c);
  });
}
function openRoute(x){
  state.selected=x;els.modalBody.innerHTML=`<div class="modal-content"><p class="eyebrow">${x.airlineCode} · ${escapeHtml(x.airline)}</p><h2>${escapeHtml(x.fromCity)} to ${escapeHtml(x.toCity)}</h2>
  <div class="modal-route"><div class="modal-airport"><b>${x.fromIata}</b><span>${x.fromIcao} · ${escapeHtml(x.fromCity)}</span></div><div>✈</div><div class="modal-airport"><b>${x.toIata}</b><span>${x.toIcao} · ${escapeHtml(x.toCity)}</span></div></div>
  <div class="detail-grid"><div class="detail"><span>AIRLINE</span><b>${escapeHtml(x.airline)}</b></div><div class="detail"><span>AIRCRAFT</span><b>${escapeHtml(x.aircraft)}</b></div><div class="detail"><span>DEPARTURE</span><b>${escapeHtml(x.fromAirport)}</b></div><div class="detail"><span>ARRIVAL</span><b>${escapeHtml(x.toAirport)}</b></div></div>
  <p class="note">This is a typical route-aircraft combination. Airlines may substitute aircraft based on date, season, maintenance or demand.</p>
  <div class="actions"><button id="simbrief" class="primary">Open in SimBrief</button><button id="complete" class="secondary">Mark completed</button></div></div>`;
  $("simbrief").onclick=()=>openSimbrief(x);$("complete").onclick=()=>complete(x);els.modal.showModal();
}
function openSimbrief(x){
  const p=new URLSearchParams({orig:x.fromIcao,dest:x.toIcao,type:x.aircraftIcao,airline:x.airlineIcao});
  window.open(`https://dispatch.simbrief.com/options/custom?${p}`,"_blank","noopener,noreferrer");
}
function complete(x){
  const log=getLog();log.unshift({...x,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),completedAt:new Date().toISOString()});
  localStorage.setItem("aeroroster-logbook",JSON.stringify(log));els.modal.close();renderLogbook();switchView("logbook");
}
function getLog(){try{return JSON.parse(localStorage.getItem("aeroroster-logbook")||"[]")}catch{return[]}}
function renderLogbook(){
  const log=getLog();els.logList.innerHTML="";els.logEmpty.classList.toggle("hidden",log.length>0);
  $("logFlights").textContent=log.length;$("logAirlines").textContent=new Set(log.map(x=>x.airline)).size;$("logAircraft").textContent=new Set(log.map(x=>x.aircraftIcao)).size;
  log.forEach(x=>{const row=document.createElement("div");row.className="log-row";const date=new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(x.completedAt));
    row.innerHTML=`<div><b>${x.fromIata} → ${x.toIata}</b><span>${escapeHtml(x.fromCity)} to ${escapeHtml(x.toCity)}</span></div><div><b>${escapeHtml(x.airline)}</b><span>${x.airlineCode}</span></div><div><b>${x.aircraftIcao}</b><span>${date}</span></div><button class="delete">Delete</button>`;
    row.querySelector("button").onclick=()=>{localStorage.setItem("aeroroster-logbook",JSON.stringify(getLog().filter(f=>f.id!==x.id)));renderLogbook()};els.logList.append(row);
  });
}
function switchView(name){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===name));document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===name));window.scrollTo({top:0,behavior:"smooth"})}
function stats(){$("airlinesStat").textContent=new Set(state.routes.map(x=>x.airline)).size;$("routesStat").textContent=state.routes.length;$("aircraftStat").textContent=new Set(state.routes.map(x=>x.aircraftIcao)).size}
function escapeHtml(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
init();
