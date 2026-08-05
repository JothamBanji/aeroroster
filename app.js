
const state={routes:[],filtered:[],selected:null,timer:null};
const $=id=>document.getElementById(id);
const els={airline:$("airline"),aircraft:$("aircraft"),departure:$("departure"),destination:$("destination"),grid:$("routeGrid"),empty:$("empty"),count:$("countPill"),title:$("resultTitle"),modal:$("modal"),modalBody:$("modalBody"),logList:$("logList"),logEmpty:$("logEmpty")};

async function init(){
  try{
    const r=await fetch("./data/routes.json");
    if(!r.ok) throw new Error("Could not load route data.");
    state.routes=await r.json(); state.filtered=[...state.routes];
    fillAirlines(); fillAircraft(); stats(); render(); renderLogbook(); renderActiveFlight(); bind();
    state.timer=setInterval(renderActiveFlight,1000);
  }catch(e){els.grid.innerHTML=`<div class="empty"><h3>Could not start app</h3><p>${escapeHtml(e.message)} Use Live Server, Python, Netlify or GitHub Pages.</p></div>`}
}
function bind(){
  els.airline.onchange=()=>{fillAircraft();filter()};
  els.aircraft.onchange=filter; els.departure.oninput=filter; els.destination.oninput=filter;
  $("randomBtn").onclick=()=>{const p=state.filtered.length?state.filtered:state.routes;if(p.length)openRoute(p[Math.floor(Math.random()*p.length)])};
  $("closeModal").onclick=()=>els.modal.close();
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  $("clearLogbook").onclick=()=>{if(confirm("Delete every logged flight?")){localStorage.removeItem("aeroroster-logbook");renderLogbook()}};
  $("cancelFlight").onclick=()=>{if(confirm("Cancel the active scheduled flight?")){localStorage.removeItem("aeroroster-active-flight");renderActiveFlight()}};
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
  state.selected=x;
  const defaultUtc=getDefaultUtcInput();
  els.modalBody.innerHTML=`<div class="modal-content"><p class="eyebrow">${x.airlineCode} · ${escapeHtml(x.airline)}</p><h2>${escapeHtml(x.fromCity)} to ${escapeHtml(x.toCity)}</h2>
  <div class="modal-route"><div class="modal-airport"><b>${x.fromIata}</b><span>${x.fromIcao} · ${escapeHtml(x.fromCity)}</span></div><div>✈</div><div class="modal-airport"><b>${x.toIata}</b><span>${x.toIcao} · ${escapeHtml(x.toCity)}</span></div></div>
  <div class="detail-grid"><div class="detail"><span>AIRLINE</span><b>${escapeHtml(x.airline)}</b></div><div class="detail"><span>AIRCRAFT</span><b>${escapeHtml(x.aircraft)}</b></div><div class="detail"><span>DEPARTURE</span><b>${escapeHtml(x.fromAirport)}</b></div><div class="detail"><span>ARRIVAL</span><b>${escapeHtml(x.toAirport)}</b></div></div>
  <div class="schedule-grid">
    <label>Departure date and time (UTC)<div class="date-wrap"><input id="departureUtc" type="datetime-local" value="${defaultUtc}"></div></label>
    <label>Estimated flight duration<div class="duration-row"><select id="durationHours">${durationOptions(0,18,2)}</select><select id="durationMinutes">${minuteOptions()}</select></div></label>
  </div>
  <p class="note">The timer uses UTC. At the selected time the status changes automatically from Waiting at gate to Departed. Progress reaches 100% at the calculated ETA.</p>
  <div class="actions"><button id="startRoute" class="primary">Start route</button><button id="simbrief" class="secondary">Open in SimBrief</button><button id="complete" class="secondary">Mark completed</button></div></div>`;
  $("simbrief").onclick=()=>openSimbrief(x);$("complete").onclick=()=>complete(x);$("startRoute").onclick=()=>startRoute(x);els.modal.showModal();
}
function durationOptions(start,end,selected){
  let html="";for(let i=start;i<=end;i++)html+=`<option value="${i}" ${i===selected?"selected":""}>${i} hour${i===1?"":"s"}</option>`;return html;
}
function minuteOptions(){
  return [0,15,30,45].map(m=>`<option value="${m}" ${m===0?"selected":""}>${String(m).padStart(2,"0")} minutes</option>`).join("");
}
function getDefaultUtcInput(){
  const d=new Date(Date.now()+60*60*1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}T${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
}
function parseUtcInput(value){
  const m=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if(!m)return NaN;
  return Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]));
}
function startRoute(x){
  const departureMs=parseUtcInput($("departureUtc").value);
  const durationMinutes=Number($("durationHours").value)*60+Number($("durationMinutes").value);
  if(!Number.isFinite(departureMs)){alert("Choose a valid UTC departure date and time.");return}
  if(durationMinutes<=0){alert("Choose a flight duration longer than zero.");return}
  const active={...x,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),departureMs,durationMinutes,etaMs:departureMs+durationMinutes*60000,createdAt:Date.now()};
  localStorage.setItem("aeroroster-active-flight",JSON.stringify(active));
  els.modal.close();renderActiveFlight();switchView("flight");
}
function getActiveFlight(){try{return JSON.parse(localStorage.getItem("aeroroster-active-flight")||"null")}catch{return null}}
function renderActiveFlight(){
  const x=getActiveFlight();
  const no=$("noActiveFlight"),content=$("activeFlightContent");
  if(!x){no.classList.remove("hidden");content.classList.add("hidden");content.innerHTML="";return}
  no.classList.add("hidden");content.classList.remove("hidden");
  const now=Date.now();
  const total=x.etaMs-x.departureMs;
  const rawProgress=(now-x.departureMs)/total;
  const progress=Math.max(0,Math.min(1,rawProgress));
  let status,statusClass,countdownLabel,countdownValue;
  if(now<x.departureMs){
    status="Waiting at gate";statusClass="";countdownLabel="Departs in";countdownValue=formatDuration(x.departureMs-now);
  }else if(now<x.etaMs){
    status="Departed";statusClass="departed";countdownLabel="Time to ETA";countdownValue=formatDuration(x.etaMs-now);
  }else{
    status="Arrived";statusClass="arrived";countdownLabel="Completed";countdownValue=formatUtc(x.etaMs);
  }
  content.innerHTML=`<div class="flight-status-head"><div><p class="eyebrow">${escapeHtml(x.airlineCode)} · ${escapeHtml(x.airline)} · ${escapeHtml(x.aircraftIcao)}</p><h2>${escapeHtml(x.fromCity)} to ${escapeHtml(x.toCity)}</h2></div><span class="status-badge ${statusClass}">${status}</span></div>
  <div class="live-route"><div class="live-airport"><b>${x.fromIata}</b><span>${escapeHtml(x.fromCity)}</span></div>
  <div class="progress-wrap"><div class="progress-plane" style="left:${progress*100}%">✈</div><div class="progress-track"><div class="progress-fill" style="width:${progress*100}%"></div></div></div>
  <div class="live-airport right"><b>${x.toIata}</b><span>${escapeHtml(x.toCity)}</span></div></div>
  <div class="flight-metrics"><div><span>STATUS</span><b>${status}</b></div><div><span>DEPARTURE UTC</span><b>${formatUtc(x.departureMs)}</b></div><div><span>ETA UTC</span><b>${formatUtc(x.etaMs)}</b></div><div><span>${countdownLabel.toUpperCase()}</span><b class="countdown">${countdownValue}</b></div></div>
  <div class="active-actions"><button id="activeSimbrief" class="primary">Open in SimBrief</button><button id="finishActive" class="secondary">${status==="Arrived"?"Save to logbook":"Finish and log now"}</button></div>`;
  $("activeSimbrief").onclick=()=>openSimbrief(x);
  $("finishActive").onclick=()=>finishActiveFlight(x);
}
function finishActiveFlight(x){
  const log=getLog();
  log.unshift({...x,completedAt:new Date().toISOString(),scheduledDeparture:new Date(x.departureMs).toISOString(),scheduledEta:new Date(x.etaMs).toISOString()});
  localStorage.setItem("aeroroster-logbook",JSON.stringify(log));
  localStorage.removeItem("aeroroster-active-flight");
  renderLogbook();renderActiveFlight();switchView("logbook");
}
function formatUtc(ms){
  return new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(ms))+" UTC";
}
function formatDuration(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  const days=Math.floor(total/86400),hours=Math.floor((total%86400)/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;
  return `${days?days+"d ":""}${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
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
