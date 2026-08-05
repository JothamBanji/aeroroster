const state={routes:[],filtered:[],selected:null,page:1,pageSize:8,timer:null};
const $=id=>document.getElementById(id);
const logoMap={
  "Saudia":"assets/logos/saudia-uploaded.png",
  "Singapore Airlines":"assets/logos/singapore-airlines.svg",
  "Turkish Airlines":"https://upload.wikimedia.org/wikipedia/commons/0/00/Turkish_Airlines_logo_2019_compact.svg",
  "Air India":"https://upload.wikimedia.org/wikipedia/commons/b/bf/Air_India_2023.svg",
  "Qatar Airways":"https://upload.wikimedia.org/wikipedia/commons/7/75/Qatar_Airways_logo.svg"
};
const aboutMap={"Saudia":"Saudia connects Saudi Arabia with domestic, regional and long-haul destinations through a mixed Airbus and Boeing fleet.","Singapore Airlines":"Singapore Airlines operates a premium global network from Singapore Changi with regional and long-haul aircraft.","Turkish Airlines":"Turkish Airlines connects Istanbul with one of the broadest international networks in the world.","Air India":"Air India operates domestic and international services across India, Europe, Asia, Australia and North America.","Qatar Airways":"Qatar Airways connects Doha with a large global network through Hamad International Airport."};

async function init(){
  const res=await fetch('./data/routes.json');
  state.routes=await res.json();
  state.filtered=[...state.routes];
  populateAirlines(); bind(); selectAirline('Saudia'); renderLogbook(); renderActive(); renderDashboard();
  $('sidebarRouteCount').textContent=state.routes.length;
  state.timer=setInterval(renderActive,1000);
}
function bind(){
  $('airlineSelect').addEventListener('change',e=>selectAirline(e.target.value));
  $('aircraftSelect').addEventListener('change',()=>{state.page=1;filterRoutes();});
  $('routeSelect').addEventListener('change',()=>selectRouteByIndex(Number($('routeSelect').value)));
  $('routeSearch').addEventListener('input',()=>{state.page=1;filterRoutes();});
  $('viewRouteButton').addEventListener('click',()=>state.selected&&openDialog(state.selected));
  $('simbriefQuickButton').addEventListener('click',()=>state.selected&&openSimbrief(state.selected));
  $('quickLogButton').addEventListener('click',()=>state.selected&&quickLog(state.selected));
  $('dialogClose').addEventListener('click',()=>$('routeDialog').close());
  $('viewAllRoutes').addEventListener('click',()=>{$('routeSearch').value='';filterRoutes();window.scrollTo({top:170,behavior:'smooth'});});
  $('cancelActive').addEventListener('click',()=>{if(confirm('Cancel active flight?')){localStorage.removeItem('aeroroster-active-flight');renderActive();}});
  $('clearLogbook').addEventListener('click',()=>{if(confirm('Clear the entire logbook?')){localStorage.removeItem('aeroroster-logbook');renderLogbook();renderDashboard();}});
  $('menuButton').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  document.querySelectorAll('.airline-link').forEach(b=>b.addEventListener('click',()=>selectAirline(b.dataset.airline)));
  document.querySelectorAll('.side-link').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
}
function populateAirlines(){
  const airlines=[...new Set(state.routes.map(r=>r.airline))];
  $('airlineSelect').innerHTML=airlines.map(a=>`<option>${escapeHtml(a)}</option>`).join('');
}
function selectAirline(name){
  $('airlineSelect').value=name;
  document.querySelectorAll('.airline-link').forEach(b=>b.classList.toggle('active',b.dataset.airline===name));
  const aircraft=[...new Map(state.routes.filter(r=>r.airline===name).map(r=>[r.aircraftIcao,r])).values()];
  $('aircraftSelect').innerHTML=aircraft.map(r=>`<option value="${r.aircraftIcao}">${escapeHtml(r.aircraft)}</option>`).join('');
  state.page=1;filterRoutes();
  $('aboutTitle').textContent=`About ${name}`;$('aboutText').textContent=aboutMap[name]||'';$('aboutLogo').src=logoMap[name];
}
function filterRoutes(){
  const airline=$('airlineSelect').value,aircraft=$('aircraftSelect').value,q=$('routeSearch').value.trim().toLowerCase();
  state.filtered=state.routes.filter(r=>r.airline===airline&&r.aircraftIcao===aircraft&&(!q||`${r.fromIata} ${r.fromCity} ${r.toIata} ${r.toCity} ${r.flightNumber||''}`.toLowerCase().includes(q)));
  populateRouteSelect();renderTable();renderPopular();
  if(state.filtered.length)selectRoute(state.filtered[0]);else clearDetails();
}
function populateRouteSelect(){
  $('routeSelect').innerHTML=state.filtered.length?state.filtered.map((r,i)=>`<option value="${i}">${r.fromIata} → ${r.toIata}</option>`).join(''):'<option>No routes</option>';
}
function selectRouteByIndex(index){const route=state.filtered[index];if(route)selectRoute(route);}
function selectRoute(route){state.selected=route;const idx=state.filtered.indexOf(route);if(idx>=0)$('routeSelect').value=String(idx);renderDetails(route);renderTable();}
function renderTable(){
  const pages=Math.max(1,Math.ceil(state.filtered.length/state.pageSize));state.page=Math.min(state.page,pages);
  const start=(state.page-1)*state.pageSize,rows=state.filtered.slice(start,start+state.pageSize);
  $('routeTableBody').innerHTML=rows.map(r=>`<tr class="${state.selected===r?'selected':''}" data-key="${routeKey(r)}"><td class="airport-cell"><strong>${r.fromIata}</strong><span>${escapeHtml(r.fromCity)}</span></td><td class="route-arrow">✈</td><td class="airport-cell"><strong>${r.toIata}</strong><span>${escapeHtml(r.toCity)}</span></td><td class="flight-number">${escapeHtml(displayFlightNumber(r))}</td><td>${estimatedDuration(r)}</td><td><button class="row-button">›</button></td></tr>`).join('');
  document.querySelectorAll('#routeTableBody tr').forEach(tr=>tr.addEventListener('click',()=>{const r=state.filtered.find(x=>routeKey(x)===tr.dataset.key);if(r)selectRoute(r);}));
  $('tableSummary').textContent=`Showing ${state.filtered.length?start+1:0} to ${Math.min(start+state.pageSize,state.filtered.length)} of ${state.filtered.length} routes`;
  renderPagination(pages);
}
function renderPagination(pages){
  let nums=[];for(let i=1;i<=pages;i++){if(i<=5||i===pages||Math.abs(i-state.page)<=1)nums.push(i)}
  nums=[...new Set(nums)];let last=0,html='';for(const n of nums){if(last&&n-last>1)html+='<span>…</span>';html+=`<button class="${n===state.page?'active':''}" data-page="${n}">${n}</button>`;last=n}$('pagination').innerHTML=html;
  document.querySelectorAll('#pagination button').forEach(b=>b.addEventListener('click',()=>{state.page=Number(b.dataset.page);renderTable();}));
}
function renderDetails(r){
  $('detailsLogo').src=logoMap[r.airline];$('detailsLogo').alt=`${r.airline} logo`;$('detailsAircraft').textContent=r.aircraft;$('detailFrom').textContent=r.fromIata;$('detailFromCity').textContent=r.fromCity;$('detailFromAirport').textContent=shortAirport(r.fromAirport);$('detailTo').textContent=r.toIata;$('detailToCity').textContent=r.toCity;$('detailToAirport').textContent=shortAirport(r.toAirport);$('detailFlight').textContent=r.flightNumber||'—';$('detailFlightNumber').textContent=displayFlightNumber(r);$('detailDuration').textContent=estimatedDuration(r);$('detailAircraftName').textContent=r.aircraft;
}
function clearDetails(){['detailFrom','detailTo','detailFlight'].forEach(id=>$(id).textContent='—');}
function renderPopular(){
  $('popularRoutes').innerHTML=state.filtered.slice(0,5).map(r=>`<button class="popular-route" data-key="${routeKey(r)}"><strong>${r.fromIata} → ${r.toIata}</strong><span>${escapeHtml(displayFlightNumber(r))}</span><small>${estimatedDuration(r)}</small></button>`).join('');
  document.querySelectorAll('.popular-route').forEach(b=>b.addEventListener('click',()=>{const r=state.filtered.find(x=>routeKey(x)===b.dataset.key);if(r){selectRoute(r);openDialog(r);}}));
}
function openDialog(r){
  const defaultUtc=defaultUtcInput();
  $('dialogBody').innerHTML=`<div class="dialog-content"><div class="dialog-header"><div><small>${escapeHtml(r.airlineCode)} · ${escapeHtml(r.airline)}</small><h2>${escapeHtml(r.fromCity)} to ${escapeHtml(r.toCity)}</h2></div><img src="${logoMap[r.airline]}" alt="${escapeHtml(r.airline)} logo"></div><div class="dialog-route"><div><strong>${r.fromIata}</strong><span>${escapeHtml(r.fromAirport)}</span></div><b>✈</b><div><strong>${r.toIata}</strong><span>${escapeHtml(r.toAirport)}</span></div></div><div class="dialog-info"><div><span>Aircraft</span><strong>${escapeHtml(r.aircraft)}</strong></div><div><span>Flight number</span><strong>${escapeHtml(displayFlightNumber(r))}</strong></div><div><span>Typical duration</span><strong>${estimatedDuration(r)}</strong></div><div><span>Schedule</span><strong>UTC, editable</strong></div></div><div id="primaryDialogActions" class="dialog-actions"><button id="scheduleFlightButton" class="schedule-button">Schedule Flight</button><button id="dialogSimbrief" class="outline-button">Open SimBrief</button><button id="dialogLog" class="outline-button">Log now</button></div><section id="schedulePanel" class="schedule-panel hidden"><div class="schedule-head"><div><span>SCHEDULED DEPARTURE</span><strong id="departurePreview">${formatUtc(parseUtc(defaultUtc))}</strong></div><button id="modifySchedule" class="text-button">Modify</button></div><div id="scheduleFields" class="schedule-fields hidden"><label>Departure date and time (UTC)<input id="departureUtc" type="datetime-local" value="${defaultUtc}"></label><label>Estimated duration<div class="duration-pair"><select id="durationHours">${hourOptions(durationHours(r))}</select><select id="durationMinutes">${minuteOptions(durationMinutes(r))}</select></div></label><div class="flight-number-readonly"><span>Flight number</span><strong>${escapeHtml(displayFlightNumber(r))}</strong></div></div><div class="dialog-actions"><button id="departButton" class="schedule-button">Depart</button></div><div id="confirmBox" class="confirm-box hidden"></div></section></div>`;
  $('scheduleFlightButton').onclick=()=>{$('schedulePanel').classList.remove('hidden');$('primaryDialogActions').classList.add('hidden');};
  $('modifySchedule').onclick=()=>{$('scheduleFields').classList.toggle('hidden');$('modifySchedule').textContent=$('scheduleFields').classList.contains('hidden')?'Modify':'Done';};
  $('departureUtc').onchange=()=>{$('departurePreview').textContent=formatUtc(parseUtc($('departureUtc').value));};
  $('dialogSimbrief').onclick=()=>openSimbrief(r);$('dialogLog').onclick=()=>quickLog(r);$('departButton').onclick=()=>showConfirm(r);
  $('routeDialog').showModal();
}
function showConfirm(r){
  const departureMs=parseUtc($('departureUtc').value),duration=Number($('durationHours').value)*60+Number($('durationMinutes').value),flight=normalizeFlight(r.flightNumber||'');if(!Number.isFinite(departureMs)||duration<=0){alert('Choose a valid UTC departure and duration.');return}const eta=departureMs+duration*60000;
  $('confirmBox').innerHTML=`<strong>Confirm departure</strong><div class="confirm-grid"><div><span>Departure</span><strong>${formatUtc(departureMs)}</strong></div><div><span>ETA</span><strong>${formatUtc(eta)}</strong></div><div><span>Flight</span><strong>${escapeHtml(flight||'Not set')}</strong></div><div><span>Aircraft</span><strong>${escapeHtml(r.aircraftIcao)}</strong></div></div><button id="confirmDeparture" class="confirm-button">Confirm Departure</button>`;$('confirmBox').classList.remove('hidden');$('confirmDeparture').onclick=()=>startFlight(r,departureMs,duration,flight);
}
function startFlight(r,departureMs,durationMinutes,flightNumber){localStorage.setItem('aeroroster-active-flight',JSON.stringify({...r,departureMs,durationMinutes,etaMs:departureMs+durationMinutes*60000,flightNumber,id:crypto.randomUUID?.()||String(Date.now())}));$('routeDialog').close();renderActive();switchView('active');}
function renderActive(){
  const c=$('activeFlightContainer'),f=getActive();if(!f){c.innerHTML='<div class="empty-message">No active flight. Select a route and schedule a departure.</div>';return}const now=Date.now(),progress=Math.max(0,Math.min(1,(now-f.departureMs)/(f.etaMs-f.departureMs)));let status,countdown;if(now<f.departureMs){status='Waiting at gate';countdown=formatCountdown(f.departureMs-now)}else if(now<f.etaMs){status='Departed';countdown=formatCountdown(f.etaMs-now)}else{status='Arrived';countdown='Complete'}
  c.innerHTML=`<div class="active-flight-card"><div class="active-head"><div><small>${escapeHtml(f.airline)} · ${escapeHtml(f.aircraft)}</small><h2>${f.fromIata} → ${f.toIata}</h2></div><span class="status-chip">${status}</span></div><div class="live-route"><div class="live-airport"><strong>${f.fromIata}</strong><span>${escapeHtml(f.fromCity)}</span></div><div class="progress"><div class="progress-fill" style="width:${progress*100}%"></div><div class="progress-plane" style="left:${progress*100}%">✈</div></div><div class="live-airport right"><strong>${f.toIata}</strong><span>${escapeHtml(f.toCity)}</span></div></div><div class="active-metrics"><div><span>Flight</span><strong>${escapeHtml(f.flightNumber||'Not set')}</strong></div><div><span>Status</span><strong>${status}</strong></div><div><span>Departure UTC</span><strong>${formatUtc(f.departureMs)}</strong></div><div><span>ETA UTC</span><strong>${formatUtc(f.etaMs)}</strong></div><div><span>Countdown</span><strong>${countdown}</strong></div></div><div class="dialog-actions"><button id="activeSimbrief" class="outline-button">Open SimBrief</button><button id="finishFlight" class="schedule-button">Finish & Log</button></div></div>`;
  $('activeSimbrief').onclick=()=>openSimbrief(f);$('finishFlight').onclick=()=>finishFlight(f);
}
function finishFlight(f){const log=getLog();log.unshift({...f,completedAt:new Date().toISOString()});localStorage.setItem('aeroroster-logbook',JSON.stringify(log));localStorage.removeItem('aeroroster-active-flight');renderActive();renderLogbook();renderDashboard();switchView('logbook');}
function quickLog(r){const log=getLog();log.unshift({...r,id:crypto.randomUUID?.()||String(Date.now()),completedAt:new Date().toISOString()});localStorage.setItem('aeroroster-logbook',JSON.stringify(log));renderLogbook();renderDashboard();$('routeDialog').open&&$('routeDialog').close();switchView('logbook');}
function renderLogbook(){const log=getLog();$('metricFlights').textContent=log.length;$('metricAirlines').textContent=new Set(log.map(x=>x.airline)).size;$('metricAircraft').textContent=new Set(log.map(x=>x.aircraftIcao)).size;$('emptyLogbook').classList.toggle('hidden',log.length>0);$('logbookList').innerHTML=log.map(x=>`<div class="log-row"><div><strong>${x.fromIata} → ${x.toIata}</strong><span>${escapeHtml(x.fromCity)} to ${escapeHtml(x.toCity)}</span></div><div><strong>${escapeHtml(x.airline)}</strong><span>${escapeHtml(x.flightNumber||x.airlineCode)}</span></div><div><strong>${escapeHtml(x.aircraftIcao)}</strong><span>${new Date(x.completedAt).toLocaleString()}</span></div><button data-id="${x.id}">Delete</button></div>`).join('');document.querySelectorAll('#logbookList button').forEach(b=>b.onclick=()=>{localStorage.setItem('aeroroster-logbook',JSON.stringify(getLog().filter(x=>x.id!==b.dataset.id)));renderLogbook();renderDashboard();});}
function renderDashboard(){const log=getLog();$('dashboardMetrics').innerHTML=`<div><span>Routes available</span><strong>${state.routes.length||0}</strong></div><div><span>Flights completed</span><strong>${log.length}</strong></div><div><span>Airlines flown</span><strong>${new Set(log.map(x=>x.airline)).size}</strong></div>`;$('statisticsContent').innerHTML=`<div class="metric-row"><div><span>Unique aircraft</span><strong>${new Set(log.map(x=>x.aircraftIcao)).size}</strong></div><div><span>Unique destinations</span><strong>${new Set(log.map(x=>x.toIata)).size}</strong></div><div><span>Active flight</span><strong>${getActive()?'1':'0'}</strong></div></div>`;}
function switchView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));const map={finder:'finderView',active:'activeView',logbook:'logbookView',dashboard:'dashboardView',statistics:'statisticsView',settings:'settingsView'};$(map[name]||'finderView').classList.add('active-view');document.querySelectorAll('.side-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});}
function openSimbrief(r){let departureMs=Number(r.departureMs)||parseUtc($('departureUtc')?.value||defaultUtcInput()),duration=Number(r.durationMinutes)||Number($('durationHours')?.value||durationHours(r))*60+Number($('durationMinutes')?.value||durationMinutes(r)),flight=normalizeFlight(r.flightNumber||'');const d=new Date(departureMs),num=flight.replace(/\D/g,'');const p=new URLSearchParams({orig:r.fromIcao,dest:r.toIcao,type:r.aircraftIcao,airline:r.airlineIcao,date:simbriefDate(d),deph:String(d.getUTCHours()).padStart(2,'0'),depm:String(d.getUTCMinutes()).padStart(2,'0'),steh:String(Math.floor(duration/60)),stem:String(duration%60).padStart(2,'0'),fltnum:num,callsign:num?`${r.airlineIcao}${num}`:''});window.open(`https://dispatch.simbrief.com/options/custom?${p.toString()}`,'_blank','noopener,noreferrer');}
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
function displayFlightNumber(r){return r.flightNumber||'Not available';}
function normalizeFlight(v){return String(v||'').trim().toUpperCase().replace(/\s+/g,'')}
function routeKey(r){return `${r.airline}|${r.aircraftIcao}|${r.fromIata}|${r.toIata}`}
function shortAirport(v){return String(v).replace('International','Intl').slice(0,25)}
function getLog(){try{return JSON.parse(localStorage.getItem('aeroroster-logbook')||'[]')}catch{return[]}}
function getActive(){try{return JSON.parse(localStorage.getItem('aeroroster-active-flight')||'null')}catch{return null}}
function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
init().catch(e=>{console.error(e);document.body.innerHTML='<p style="padding:30px">The route data could not be loaded. Run the site through GitHub Pages or a local server.</p>'});
