const state={routes:[],baseRoutes:[],filtered:[],selected:null,page:1,pageSize:8,mode:'airline',timer:null};
const $=id=>document.getElementById(id);
const logoMap={
  'Saudia':'assets/logos/saudia-uploaded.png',
  'Singapore Airlines':'assets/logos/singapore-airlines-real.svg',
  'Turkish Airlines':'assets/logos/turkish-airlines.svg',
  'Air India':'assets/logos/air-india.svg',
  'Qatar Airways':'assets/logos/qatar-airways.svg'
};
const aboutMap={
  'Saudia':'Saudia connects Saudi Arabia with domestic, regional and long-haul destinations through a mixed Airbus and Boeing fleet.',
  'Singapore Airlines':'Singapore Airlines operates a premium global network from Singapore Changi with regional and long-haul aircraft.',
  'Turkish Airlines':'Turkish Airlines connects Istanbul with one of the broadest international networks in the world.',
  'Air India':'Air India operates domestic and international services across India, Europe, Asia, Australia and North America.',
  'Qatar Airways':'Qatar Airways connects Doha with a large global network through Hamad International Airport.'
};

async function init(){
  const response=await fetch('./data/routes.json');
  if(!response.ok)throw new Error('Could not load route data.');
  state.baseRoutes=await response.json();
  state.routes=addReverseRoutes(state.baseRoutes);
  bind();
  populateAirlines();
  setAirline('Saudia');
  renderLogbook();renderActive();renderDashboard();
  $('sidebarRouteCount').textContent=state.routes.length;
  state.timer=setInterval(renderActive,1000);
}

function addReverseRoutes(routes){
  const result=[];const seen=new Set();
  for(const r of routes){
    const key=routeKey(r);if(!seen.has(key)){result.push({...r,direction:'outbound'});seen.add(key)}
    const reverse={...r,fromIata:r.toIata,fromIcao:r.toIcao,fromCity:r.toCity,fromAirport:r.toAirport,toIata:r.fromIata,toIcao:r.fromIcao,toCity:r.fromCity,toAirport:r.fromAirport,direction:'return',flightNumber:r.returnFlightNumber||'',flightNumberStatus:r.returnFlightNumber?'Stored return service':'Not stored'};
    const reverseKey=routeKey(reverse);if(!seen.has(reverseKey)){result.push(reverse);seen.add(reverseKey)}
  }
  return result;
}

function bind(){
  $('airlineSelect').onchange=()=>setAirline($('airlineSelect').value);
  $('aircraftSelect').onchange=()=>{populateRouteSelect();applyFilters();};
  $('routeSelect').onchange=()=>selectByKey($('routeSelect').value);
  $('routeSearch').oninput=()=>{state.page=1;applyFilters();};
  $('airlineModeButton').onclick=()=>setMode('airline');
  $('customModeButton').onclick=()=>setMode('custom');
  $('customFromSelect').onchange=updateCustomButton;
  $('customToSelect').onchange=updateCustomButton;
  $('swapCustomRoute').onclick=()=>{const a=$('customFromSelect').value;$('customFromSelect').value=$('customToSelect').value;$('customToSelect').value=a;updateCustomButton();};
  $('useCustomRoute').onclick=createCustomRoute;
  $('viewRouteButton').onclick=()=>state.selected&&openRouteDialog(state.selected);
  $('simbriefQuickButton').onclick=()=>state.selected&&openSimbrief(state.selected);
  $('quickLogButton').onclick=()=>state.selected&&quickLog(state.selected);
  $('viewAllRoutes').onclick=()=>{$('routeSearch').value='';state.page=1;applyFilters();};
  $('dialogClose').onclick=()=>$('routeDialog').close();
  $('menuButton').onclick=()=>$('sidebar').classList.toggle('open');
  $('cancelActive').onclick=()=>{if(confirm('Cancel the active flight?')){localStorage.removeItem('aeroroster-active-flight');renderActive();}};
  $('clearLogbook').onclick=()=>{if(confirm('Clear the entire logbook?')){localStorage.removeItem('aeroroster-logbook');renderLogbook();renderDashboard();}};
  document.querySelectorAll('.side-link').forEach(button=>button.onclick=()=>switchView(button.dataset.view));
  document.querySelectorAll('.airline-link').forEach(button=>button.onclick=()=>{setAirline(button.dataset.airline);switchView('finder');});
}

function setMode(mode){
  state.mode=mode;
  $('airlineModeButton').classList.toggle('active',mode==='airline');
  $('customModeButton').classList.toggle('active',mode==='custom');
  $('standardRouteField').classList.toggle('hidden',mode==='custom');
  $('customRouteFields').classList.toggle('hidden',mode!=='custom');
  if(mode==='custom'){populateCustomAirports();}else{applyFilters();}
}

function populateAirlines(){
  const airlines=[...new Set(state.routes.map(r=>r.airline))].sort();
  $('airlineSelect').innerHTML=airlines.map(a=>`<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
}

function setAirline(airline){
  $('airlineSelect').value=airline;
  document.querySelectorAll('.airline-link').forEach(b=>b.classList.toggle('active',b.dataset.airline===airline));
  const aircraft=[...new Map(state.routes.filter(r=>r.airline===airline).map(r=>[r.aircraftIcao,r.aircraft])).entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  $('aircraftSelect').innerHTML=aircraft.map(([code,name])=>`<option value="${code}">${code} — ${escapeHtml(name)}</option>`).join('');
  $('detailsLogo').src=logoMap[airline];$('aboutLogo').src=logoMap[airline];$('aboutTitle').textContent=`About ${airline}`;$('aboutText').textContent=aboutMap[airline]||'';
  populateRouteSelect();populateCustomAirports();state.page=1;applyFilters();
}

function populateRouteSelect(){
  const airline=$('airlineSelect').value,aircraft=$('aircraftSelect').value;
  const routes=state.routes.filter(r=>r.airline===airline&&r.aircraftIcao===aircraft).sort(routeSort);
  $('routeSelect').innerHTML=routes.map(r=>`<option value="${routeKey(r)}">${r.fromIata} → ${r.toIata}${r.direction==='return'?' · Return':''}</option>`).join('');
  if(routes.length)selectRoute(routes[0]);
}

function populateCustomAirports(){
  const airline=$('airlineSelect').value;
  const map=new Map();
  state.routes.filter(r=>r.airline===airline).forEach(r=>{
    map.set(r.fromIata,{iata:r.fromIata,icao:r.fromIcao,city:r.fromCity,airport:r.fromAirport});
    map.set(r.toIata,{iata:r.toIata,icao:r.toIcao,city:r.toCity,airport:r.toAirport});
  });
  const airports=[...map.values()].sort((a,b)=>a.city.localeCompare(b.city));
  const options=airports.map(a=>`<option value="${a.iata}">${a.iata} — ${escapeHtml(a.city)} (${escapeHtml(a.airport)})</option>`).join('');
  $('customFromSelect').innerHTML=options;$('customToSelect').innerHTML=options;
  if(airports.length>1){$('customFromSelect').value=airports[0].iata;$('customToSelect').value=airports[1].iata;}
  updateCustomButton();
}

function updateCustomButton(){
  const valid=$('customFromSelect').value&&$('customToSelect').value&&$('customFromSelect').value!==$('customToSelect').value;
  $('useCustomRoute').disabled=!valid;
}

function createCustomRoute(){
  const airline=$('airlineSelect').value,aircraftIcao=$('aircraftSelect').value,from=$('customFromSelect').value,to=$('customToSelect').value;
  if(!from||!to||from===to)return;
  const source=state.routes.find(r=>r.airline===airline&&r.aircraftIcao===aircraftIcao)||state.routes.find(r=>r.airline===airline);
  const fromInfo=findAirport(from),toInfo=findAirport(to);
  const custom={...source,fromIata:fromInfo.iata,fromIcao:fromInfo.icao,fromCity:fromInfo.city,fromAirport:fromInfo.airport,toIata:toInfo.iata,toIcao:toInfo.icao,toCity:toInfo.city,toAirport:toInfo.airport,aircraftIcao,aircraft:aircraftName(airline,aircraftIcao),flightNumber:'',custom:true,direction:'custom'};
  selectRoute(custom);openRouteDialog(custom);
}

function findAirport(iata){
  for(const r of state.routes){if(r.fromIata===iata)return{iata,icao:r.fromIcao,city:r.fromCity,airport:r.fromAirport};if(r.toIata===iata)return{iata,icao:r.toIcao,city:r.toCity,airport:r.toAirport};}
  return{iata,icao:iata,city:iata,airport:iata};
}
function aircraftName(airline,icao){return state.routes.find(r=>r.airline===airline&&r.aircraftIcao===icao)?.aircraft||icao}

function applyFilters(){
  const airline=$('airlineSelect').value,aircraft=$('aircraftSelect').value,q=$('routeSearch').value.trim().toLowerCase();
  state.filtered=state.routes.filter(r=>r.airline===airline&&r.aircraftIcao===aircraft&&(!q||`${r.fromIata} ${r.toIata} ${r.fromCity} ${r.toCity} ${r.fromAirport} ${r.toAirport} ${r.flightNumber||''}`.toLowerCase().includes(q))).sort(routeSort);
  renderTable();renderPopular();
  if(state.filtered.length&&!state.filtered.some(r=>routeKey(r)===routeKey(state.selected||{})))selectRoute(state.filtered[0]);
}

function routeSort(a,b){return `${a.fromIata}-${a.toIata}`.localeCompare(`${b.fromIata}-${b.toIata}`)}
function renderTable(){
  const start=(state.page-1)*state.pageSize,items=state.filtered.slice(start,start+state.pageSize);
  $('routeTableBody').innerHTML=items.map(r=>`<tr data-key="${routeKey(r)}"><td><strong>${r.fromIata}</strong><span>${escapeHtml(r.fromCity)}</span></td><td><span class="direction-chip">${r.direction==='return'?'Return':'Outbound'} →</span></td><td><strong>${r.toIata}</strong><span>${escapeHtml(r.toCity)}</span></td><td>${escapeHtml(displayFlightNumber(r))}</td><td>${estimatedDuration(r)}</td><td><button class="table-view">View</button></td></tr>`).join('');
  document.querySelectorAll('#routeTableBody tr').forEach(row=>row.onclick=()=>selectByKey(row.dataset.key));
  document.querySelectorAll('.table-view').forEach(button=>button.onclick=e=>{e.stopPropagation();const row=e.target.closest('tr');selectByKey(row.dataset.key);openRouteDialog(state.selected);});
  const pages=Math.max(1,Math.ceil(state.filtered.length/state.pageSize));if(state.page>pages)state.page=pages;
  $('tableSummary').textContent=`Showing ${state.filtered.length?start+1:0}–${Math.min(start+state.pageSize,state.filtered.length)} of ${state.filtered.length} routes`;
  $('pagination').innerHTML=Array.from({length:pages},(_,i)=>`<button class="${i+1===state.page?'active':''}" data-page="${i+1}">${i+1}</button>`).join('');
  document.querySelectorAll('#pagination button').forEach(b=>b.onclick=()=>{state.page=Number(b.dataset.page);renderTable();});
}

function renderPopular(){
  $('popularRoutes').innerHTML=state.filtered.slice(0,4).map(r=>`<button data-key="${routeKey(r)}"><span>${r.fromIata} → ${r.toIata}</span><small>${escapeHtml(r.fromCity)} to ${escapeHtml(r.toCity)}</small></button>`).join('');
  document.querySelectorAll('#popularRoutes button').forEach(b=>b.onclick=()=>selectByKey(b.dataset.key));
}
function selectByKey(key){const r=state.routes.find(x=>routeKey(x)===key)||state.filtered.find(x=>routeKey(x)===key);if(r)selectRoute(r)}
function selectRoute(r){state.selected=r;$('routeSelect').value=routeKey(r);renderDetails(r);}
function renderDetails(r){
  $('detailsLogo').src=logoMap[r.airline];$('detailsAircraft').textContent=`${r.aircraftIcao} · ${r.aircraft}`;$('detailFrom').textContent=r.fromIata;$('detailFromCity').textContent=r.fromCity;$('detailFromAirport').textContent=shortAirport(r.fromAirport);$('detailTo').textContent=r.toIata;$('detailToCity').textContent=r.toCity;$('detailToAirport').textContent=shortAirport(r.toAirport);$('detailFlight').textContent=r.custom?'Custom route':(r.direction==='return'?'Return service':'Outbound service');$('detailFlightNumber').textContent=displayFlightNumber(r);$('detailDuration').textContent=estimatedDuration(r);$('detailAircraftName').textContent=r.aircraftIcao;
}

function openRouteDialog(r){
  const departure=defaultUtcInput(),duration=durationTotal(r);
  const initialFlightNumber=r.flightNumber||'';
  $('dialogBody').innerHTML=`<div class="dialog-content">
    <div class="dialog-brand">
      <div class="dialog-logo-tile"><img src="${logoMap[r.airline]}" alt="${escapeHtml(r.airline)} logo"></div>
      <div class="dialog-brand-copy">
        <span>${escapeHtml(r.airline)}</span>
        <small>${escapeHtml(r.airlineCode)} · ${escapeHtml(r.aircraftIcao)}</small>
      </div>
      ${r.custom?'<b class="custom-route-badge">CUSTOM ROUTE</b>':''}
    </div>
    <h2>${r.fromIata} → ${r.toIata}</h2>
    <p>${escapeHtml(r.fromCity)} to ${escapeHtml(r.toCity)} · ${escapeHtml(r.aircraft)}</p>
    <div class="dialog-route">
      <div><strong>${r.fromIata}</strong><span>${escapeHtml(r.fromAirport)}</span></div>
      <b>✈</b>
      <div class="right"><strong>${r.toIata}</strong><span>${escapeHtml(r.toAirport)}</span></div>
    </div>
    <div class="dialog-info-grid">
      <div><span>Flight number</span><strong id="dialogFlightDisplay">${escapeHtml(initialFlightNumber||'Not available')}</strong></div>
      <div><span>Aircraft</span><strong>${escapeHtml(r.aircraftIcao)}</strong></div>
      <div><span>Estimated duration</span><strong>${estimatedDuration(r)}</strong></div>
      <div><span>Direction</span><strong>${r.custom?'Custom':r.direction==='return'?'Return':'Outbound'}</strong></div>
    </div>
    <div id="primaryDialogActions" class="dialog-actions">
      <button id="scheduleFlightButton" class="schedule-button">Schedule Flight</button>
      <button id="dialogSimbrief" class="outline-button">Open SimBrief</button>
      <button id="dialogLog" class="outline-button">Log Now</button>
    </div>
    <section id="schedulePanel" class="schedule-box hidden">
      <div class="schedule-head">
        <div><span>Scheduled departure</span><strong id="departurePreview">${formatUtc(parseUtc(departure))}</strong></div>
        <button id="modifySchedule" class="text-button">Modify</button>
      </div>
      <div id="scheduleFields" class="schedule-fields hidden">
        <label>Departure UTC<input id="departureUtc" type="datetime-local" value="${departure}"></label>
        <label>Duration<div class="duration-pair"><select id="durationHours">${hourOptions(Math.floor(duration/60))}</select><select id="durationMinutes">${minuteOptions(duration%60)}</select></div></label>
        <label class="flight-number-field">Flight number
          <input id="flightNumberInput" type="text" maxlength="10" value="${escapeHtml(initialFlightNumber)}" placeholder="Example: TK760" autocomplete="off">
          <small>Enter or replace the real airline flight number. It will be saved and sent to SimBrief.</small>
        </label>
      </div>
      <button id="departButton" class="schedule-button full-width-button">Depart</button>
      <div id="confirmBox" class="confirm-box hidden"></div>
    </section>
  </div>`;

  $('scheduleFlightButton').onclick=()=>{
    $('schedulePanel').classList.remove('hidden');
    $('primaryDialogActions').classList.add('hidden');
  };

  $('modifySchedule').onclick=()=>{
    $('scheduleFields').classList.toggle('hidden');
    $('modifySchedule').textContent=$('scheduleFields').classList.contains('hidden')?'Modify':'Done';
  };

  $('departureUtc').onchange=()=>{
    $('departurePreview').textContent=formatUtc(parseUtc($('departureUtc').value));
  };

  $('flightNumberInput').oninput=()=>{
    const value=normalizeFlight($('flightNumberInput').value);
    $('flightNumberInput').value=value;
    $('dialogFlightDisplay').textContent=value||'Not available';
  };

  $('dialogSimbrief').onclick=()=>openSimbrief(r);
  $('dialogLog').onclick=()=>quickLog({...r,flightNumber:normalizeFlight($('flightNumberInput')?.value||r.flightNumber||'')});
  $('departButton').onclick=()=>showConfirm(r);
  $('routeDialog').showModal();
}
function showConfirm(r){
  const departureMs=parseUtc($('departureUtc').value);
  const duration=Number($('durationHours').value)*60+Number($('durationMinutes').value);
  const flight=normalizeFlight($('flightNumberInput')?.value||r.flightNumber||'');
  if(!Number.isFinite(departureMs)||duration<=0){
    alert('Choose a valid UTC departure and duration.');
    return;
  }
  const eta=departureMs+duration*60000;
  $('confirmBox').innerHTML=`<strong>Confirm departure</strong>
    <div class="confirm-grid">
      <div><span>Departure</span><strong>${formatUtc(departureMs)}</strong></div>
      <div><span>ETA</span><strong>${formatUtc(eta)}</strong></div>
      <div><span>Flight</span><strong>${escapeHtml(flight||'Not available')}</strong></div>
      <div><span>Aircraft</span><strong>${escapeHtml(r.aircraftIcao)}</strong></div>
    </div>
    <button id="confirmDeparture" class="confirm-button full-width-button">Confirm Departure</button>`;
  $('confirmBox').classList.remove('hidden');
  $('confirmDeparture').onclick=()=>startFlight({...r,flightNumber:flight},departureMs,duration,flight);
}
function startFlight(r,departureMs,durationMinutes,flightNumber){localStorage.setItem('aeroroster-active-flight',JSON.stringify({...r,departureMs,durationMinutes,etaMs:departureMs+durationMinutes*60000,flightNumber,id:crypto.randomUUID?.()||String(Date.now())}));$('routeDialog').close();renderActive();switchView('active');}
function renderActive(){
  const c=$('activeFlightContainer'),f=getActive();if(!f){c.innerHTML='<div class="empty-message">No active flight. Select a route and schedule a departure.</div>';return}const now=Date.now(),progress=Math.max(0,Math.min(1,(now-f.departureMs)/(f.etaMs-f.departureMs)));let status,countdown;if(now<f.departureMs){status='Waiting at gate';countdown=formatCountdown(f.departureMs-now)}else if(now<f.etaMs){status='Departed';countdown=formatCountdown(f.etaMs-now)}else{status='Arrived';countdown='Complete'}
  c.innerHTML=`<div class="active-flight-card"><div class="active-head"><div><small>${escapeHtml(f.airline)} · ${escapeHtml(f.aircraft)}</small><h2>${f.fromIata} → ${f.toIata}</h2></div><span class="status-chip">${status}</span></div><div class="live-route"><div class="live-airport"><strong>${f.fromIata}</strong><span>${escapeHtml(f.fromCity)}</span></div><div class="progress"><div class="progress-fill" style="width:${progress*100}%"></div><div class="progress-plane" style="left:${progress*100}%">✈</div></div><div class="live-airport right"><strong>${f.toIata}</strong><span>${escapeHtml(f.toCity)}</span></div></div><div class="active-metrics"><div><span>Flight</span><strong>${escapeHtml(f.flightNumber||'Not available')}</strong></div><div><span>Status</span><strong>${status}</strong></div><div><span>Departure UTC</span><strong>${formatUtc(f.departureMs)}</strong></div><div><span>ETA UTC</span><strong>${formatUtc(f.etaMs)}</strong></div><div><span>Countdown</span><strong>${countdown}</strong></div></div><div class="dialog-actions"><button id="activeSimbrief" class="outline-button">Open SimBrief</button><button id="finishFlight" class="schedule-button">Finish & Log</button></div></div>`;
  $('activeSimbrief').onclick=()=>openSimbrief(f);$('finishFlight').onclick=()=>finishFlight(f);
}
function finishFlight(f){const log=getLog();log.unshift({...f,completedAt:new Date().toISOString()});localStorage.setItem('aeroroster-logbook',JSON.stringify(log));localStorage.removeItem('aeroroster-active-flight');renderActive();renderLogbook();renderDashboard();switchView('logbook');}
function quickLog(r){const log=getLog();log.unshift({...r,id:crypto.randomUUID?.()||String(Date.now()),completedAt:new Date().toISOString()});localStorage.setItem('aeroroster-logbook',JSON.stringify(log));renderLogbook();renderDashboard();if($('routeDialog').open)$('routeDialog').close();switchView('logbook');}
function renderLogbook(){const log=getLog();$('metricFlights').textContent=log.length;$('metricAirlines').textContent=new Set(log.map(x=>x.airline)).size;$('metricAircraft').textContent=new Set(log.map(x=>x.aircraftIcao)).size;$('emptyLogbook').classList.toggle('hidden',log.length>0);$('logbookList').innerHTML=log.map(x=>`<div class="log-row"><div><strong>${x.fromIata} → ${x.toIata}</strong><span>${escapeHtml(x.fromCity)} to ${escapeHtml(x.toCity)}</span></div><div><strong>${escapeHtml(x.airline)}</strong><span>${escapeHtml(x.flightNumber||x.airlineCode)}</span></div><div><strong>${escapeHtml(x.aircraftIcao)}</strong><span>${new Date(x.completedAt).toLocaleString()}</span></div><button data-id="${x.id}">Delete</button></div>`).join('');document.querySelectorAll('#logbookList button').forEach(b=>b.onclick=()=>{localStorage.setItem('aeroroster-logbook',JSON.stringify(getLog().filter(x=>x.id!==b.dataset.id)));renderLogbook();renderDashboard();});}
function renderDashboard(){const log=getLog();$('dashboardMetrics').innerHTML=`<div><span>Routes available</span><strong>${state.routes.length||0}</strong></div><div><span>Flights completed</span><strong>${log.length}</strong></div><div><span>Airlines flown</span><strong>${new Set(log.map(x=>x.airline)).size}</strong></div>`;$('statisticsContent').innerHTML=`<div class="metric-row"><div><span>Unique aircraft</span><strong>${new Set(log.map(x=>x.aircraftIcao)).size}</strong></div><div><span>Unique destinations</span><strong>${new Set(log.map(x=>x.toIata)).size}</strong></div><div><span>Active flight</span><strong>${getActive()?'1':'0'}</strong></div></div>`;}
function switchView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));const map={finder:'finderView',active:'activeView',logbook:'logbookView',dashboard:'dashboardView',statistics:'statisticsView',settings:'settingsView'};$(map[name]||'finderView').classList.add('active-view');document.querySelectorAll('.side-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});}
function openSimbrief(r){
  const departureMs=Number(r.departureMs)||parseUtc($('departureUtc')?.value||defaultUtcInput());
  const duration=Number(r.durationMinutes)||
    Number($('durationHours')?.value||durationHours(r))*60+
    Number($('durationMinutes')?.value||durationMinutes(r));
  const flight=normalizeFlight($('flightNumberInput')?.value||r.flightNumber||'');
  const d=new Date(departureMs);
  const num=flight.replace(/\D/g,'');
  const p=new URLSearchParams({
    orig:r.fromIcao,
    dest:r.toIcao,
    type:r.aircraftIcao,
    airline:r.airlineIcao,
    date:simbriefDate(d),
    deph:String(d.getUTCHours()).padStart(2,'0'),
    depm:String(d.getUTCMinutes()).padStart(2,'0'),
    steh:String(Math.floor(duration/60)),
    stem:String(duration%60).padStart(2,'0')
  });
  if(num){
    p.set('fltnum',num);
    p.set('callsign',`${r.airlineIcao}${num}`);
  }
  window.open(`https://dispatch.simbrief.com/options/custom?${p.toString()}`,'_blank','noopener,noreferrer');
}
function estimatedDuration(r){const mins=durationTotal(r);return `${Math.floor(mins/60)}h ${String(mins%60).padStart(2,'0')}m`;}
function durationTotal(r){const seed=(r.fromIata.charCodeAt(0)+r.toIata.charCodeAt(1)+r.aircraftIcao.length*17)%600;return Math.max(75,Math.min(850,90+seed));}
function durationHours(r){return Math.floor(durationTotal(r)/60)}function durationMinutes(r){return Math.round((durationTotal(r)%60)/15)*15%60}
function hourOptions(selected){let h='';for(let i=0;i<=18;i++)h+=`<option value="${i}" ${i===selected?'selected':''}>${i} hour${i===1?'':'s'}</option>`;return h}
function minuteOptions(selected){return [0,15,30,45].map(v=>`<option value="${v}" ${v===selected?'selected':''}>${String(v).padStart(2,'0')} min</option>`).join('')}
function defaultUtcInput(){const d=new Date(Date.now()+3600000);return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}T${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`}
function parseUtc(v){const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);return m?Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5]):NaN}
function formatUtc(ms){return new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms))+' UTC'}
function formatCountdown(ms){const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`}
function simbriefDate(d){return `${String(d.getUTCDate()).padStart(2,'0')}${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]}${String(d.getUTCFullYear()).slice(-2)}`}
function displayFlightNumber(r){return r.flightNumber||'Not available'}
function normalizeFlight(v){return String(v||'').trim().toUpperCase().replace(/\s+/g,'')}
function routeKey(r){return `${r.airline||''}|${r.aircraftIcao||''}|${r.fromIata||''}|${r.toIata||''}`}
function shortAirport(v){return String(v).replace('International','Intl').slice(0,25)}
function getLog(){try{return JSON.parse(localStorage.getItem('aeroroster-logbook')||'[]')}catch{return[]}}
function getActive(){try{return JSON.parse(localStorage.getItem('aeroroster-active-flight')||'null')}catch{return null}}
function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
init().catch(error=>{console.error(error);document.body.innerHTML='<p style="padding:30px">The route data could not be loaded. Run the site through GitHub Pages or a local server.</p>'});
