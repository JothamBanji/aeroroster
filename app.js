const state={routes:[],baseRoutes:[],filtered:[],selected:null,page:1,pageSize:8,mode:'airline',timer:null,airports:{},activeMap:null,activeMarker:null,activeRouteLine:null,renderedActiveId:null};
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
  const [routeResponse,airportResponse]=await Promise.all([fetch('./data/routes.json'),fetch('./data/airports.json')]);
  if(!routeResponse.ok)throw new Error('Could not load route data.');
  state.baseRoutes=await routeResponse.json();
  state.airports=airportResponse.ok?await airportResponse.json():{};
  state.routes=addReverseRoutes(state.baseRoutes);
  applyStoredSettings();bind();bindSettings();populateAirlines();
  const settings=getSettings();
  const airlines=[...new Set(state.routes.map(r=>r.airline))];
  setAirline(settings.rememberAirline&&airlines.includes(settings.lastAirline)?settings.lastAirline:'Saudia');
  setMode(settings.routeMode||'airline');
  renderSettingsSummary();renderLogbook();renderActive();renderDashboard();
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
  if(getSettings().rememberAirline)saveSettings({...getSettings(),lastAirline:airline},false);
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
function startFlight(r,departureMs,durationMinutes,flightNumber){
  const imported=getImportedSimbrief(),settings=getSettings();
  const matches=imported&&normalizeCode(imported.origin)===normalizeCode(r.fromIcao)&&normalizeCode(imported.destination)===normalizeCode(r.toIcao);
  const active={...r,departureMs,durationMinutes,etaMs:departureMs+durationMinutes*60000,flightNumber,id:crypto.randomUUID?.()||String(Date.now()),simbriefRoute:settings.useSimbriefMap&&matches?imported:null};
  localStorage.setItem('aeroroster-active-flight',JSON.stringify(active));
  $('routeDialog').close();destroyActiveMap();renderActive();switchView('active');
  if(settings.autoSimbrief)openSimbrief(active);
}
function renderActive(){
  const c=$('activeFlightContainer'),f=getActive();
  if(!f){destroyActiveMap();state.renderedActiveId=null;c.innerHTML='<div class="empty-message">No active flight. Select a route and schedule a departure.</div>';return}
  const now=Date.now(),progress=Math.max(0,Math.min(1,(now-f.departureMs)/(f.etaMs-f.departureMs)));
  const status=getFlightStatus(f,now,progress);
  const countdown=now<f.departureMs?formatCountdown(f.departureMs-now):now<f.etaMs?formatCountdown(f.etaMs-now):'Complete';
  if(state.renderedActiveId!==f.id){
    destroyActiveMap();state.renderedActiveId=f.id;
    c.innerHTML=`<div class="active-flight-card map-active-card"><div class="active-head"><div><small>${escapeHtml(f.airline)} · ${escapeHtml(f.aircraft)}</small><h2>${f.fromIata} → ${f.toIata}</h2></div><span id="activeStatusChip" class="status-chip">${status}</span></div><div class="active-map-layout"><section class="map-panel"><div id="activeFlightMap" class="active-flight-map"></div><div class="map-source-chip" id="mapSourceChip"></div></section><aside class="flight-sidebar-panel"><div class="active-metrics vertical-metrics"><div><span>Flight</span><strong>${escapeHtml(f.flightNumber||'Not available')}</strong></div><div><span>Status</span><strong id="activeStatusText">${status}</strong></div><div><span>Departure</span><strong>${formatUtc(f.departureMs)}</strong></div><div><span>ETA</span><strong>${formatUtc(f.etaMs)}</strong></div><div><span>Countdown</span><strong id="activeCountdown">${countdown}</strong></div><div><span>Progress</span><strong id="activeProgressText">${Math.round(progress*100)}%</strong></div><div><span>Next waypoint</span><strong id="activeNextWaypoint">—</strong></div></div></aside></div><div class="flight-progress-footer"><div class="progress"><div id="activeProgressFill" class="progress-fill" style="width:${progress*100}%"></div><div id="activeProgressPlane" class="progress-plane" style="left:${progress*100}%">✈</div></div></div><div class="dialog-actions"><button id="activeSimbrief" class="outline-button">Open SimBrief</button><button id="refreshSimbriefActive" class="outline-button">Import latest OFP</button><button id="finishFlight" class="schedule-button">Finish & Log</button></div></div>`;
    $('activeSimbrief').onclick=()=>openSimbrief(f);$('finishFlight').onclick=()=>finishFlight(f);
    $('refreshSimbriefActive').onclick=async()=>{const imported=await importLatestSimbrief(true);if(imported){const current=getActive();if(normalizeCode(imported.origin)===normalizeCode(current.fromIcao)&&normalizeCode(imported.destination)===normalizeCode(current.toIcao)){current.simbriefRoute=imported;localStorage.setItem('aeroroster-active-flight',JSON.stringify(current));destroyActiveMap();state.renderedActiveId=null;renderActive();}else alert('The imported SimBrief OFP does not match this active flight.');}};
    setupActiveMap(f);
  }
  if($('activeStatusChip'))$('activeStatusChip').textContent=status;if($('activeStatusText'))$('activeStatusText').textContent=status;if($('activeCountdown'))$('activeCountdown').textContent=countdown;if($('activeProgressText'))$('activeProgressText').textContent=`${Math.round(progress*100)}%`;if($('activeProgressFill'))$('activeProgressFill').style.width=`${progress*100}%`;if($('activeProgressPlane'))$('activeProgressPlane').style.left=`${progress*100}%`;
  updateActiveMap(f,progress);
}
function getFlightStatus(f,now,p){if(now<f.departureMs)return'Waiting at gate';if(now>=f.etaMs)return'Arrived';if(p<.04)return'Taxi and takeoff';if(p<.16)return'Climb';if(p<.8)return'Cruise';if(p<.96)return'Descent';return'Approach and landing'}
function destroyActiveMap(){if(state.activeMap)state.activeMap.remove();state.activeMap=null;state.activeMarker=null;state.activeRouteLine=null}
function setupActiveMap(f){if(typeof L==='undefined')return;const el=$('activeFlightMap');if(!el)return;const pts=getFlightMapPoints(f);if(pts.length<2){el.innerHTML='<div class="map-error">Airport coordinates are unavailable.</div>';return}state.activeMap=L.map(el);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(state.activeMap);const ll=pts.map(p=>[p.lat,p.lon]);state.activeRouteLine=L.polyline(ll,{color:getComputedStyle(document.body).getPropertyValue('--accent').trim()||'#16db73',weight:4,opacity:.92}).addTo(state.activeMap);L.marker(ll[0]).addTo(state.activeMap).bindPopup(`<b>${escapeHtml(f.fromIata)}</b>`);L.marker(ll[ll.length-1]).addTo(state.activeMap).bindPopup(`<b>${escapeHtml(f.toIata)}</b>`);state.activeMarker=L.marker(ll[0],{icon:L.divIcon({className:'aircraft-map-marker',html:'✈',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(state.activeMap);state.activeMap.fitBounds(state.activeRouteLine.getBounds(),{padding:[35,35]});$('mapSourceChip').textContent=f.simbriefRoute?.waypoints?.length?`SimBrief route · ${f.simbriefRoute.waypoints.length} waypoints`:'Estimated great-circle route';setTimeout(()=>state.activeMap?.invalidateSize(),100)}
function getFlightMapPoints(f){if(f.simbriefRoute?.waypoints?.length>=2)return f.simbriefRoute.waypoints.filter(validMapPoint);const a=state.airports[f.fromIata],b=state.airports[f.toIata];if(!a||!b)return[];return createGreatCirclePoints({lat:+a.lat,lon:+a.lon,ident:f.fromIata},{lat:+b.lat,lon:+b.lon,ident:f.toIata},80)}
function validMapPoint(p){return Number.isFinite(+p.lat)&&Number.isFinite(+p.lon)}
function createGreatCirclePoints(s,e,n){const out=[],a1=toRad(s.lat),o1=toRad(s.lon),a2=toRad(e.lat),o2=toRad(e.lon),d=2*Math.asin(Math.sqrt(Math.sin((a2-a1)/2)**2+Math.cos(a1)*Math.cos(a2)*Math.sin((o2-o1)/2)**2));if(!Number.isFinite(d)||d===0)return[s,e];for(let i=0;i<=n;i++){const f=i/n,A=Math.sin((1-f)*d)/Math.sin(d),B=Math.sin(f*d)/Math.sin(d),x=A*Math.cos(a1)*Math.cos(o1)+B*Math.cos(a2)*Math.cos(o2),y=A*Math.cos(a1)*Math.sin(o1)+B*Math.cos(a2)*Math.sin(o2),z=A*Math.sin(a1)+B*Math.sin(a2);out.push({lat:toDeg(Math.atan2(z,Math.sqrt(x*x+y*y))),lon:toDeg(Math.atan2(y,x)),ident:i===0?s.ident:i===n?e.ident:''})}return out}
function updateActiveMap(f,p){if(!state.activeMarker)return;const pts=getFlightMapPoints(f);if(pts.length<2)return;const pos=interpolatePolyline(pts,p);state.activeMarker.setLatLng([pos.lat,pos.lon]);const next=pts[Math.min(pts.length-1,Math.ceil(p*(pts.length-1)))];if($('activeNextWaypoint'))$('activeNextWaypoint').textContent=next?.ident||f.toIata}
function interpolatePolyline(pts,p){const s=Math.max(0,Math.min(1,p))*(pts.length-1),i=Math.min(pts.length-2,Math.floor(s)),f=s-i,a=pts[i],b=pts[i+1];return{lat:+a.lat+(+b.lat-+a.lat)*f,lon:+a.lon+(+b.lon-+a.lon)*f}}
function toRad(v){return +v*Math.PI/180}function toDeg(v){return v*180/Math.PI}
function finishFlight(f){const log=getLog();log.unshift({...f,completedAt:new Date().toISOString()});localStorage.setItem('aeroroster-logbook',JSON.stringify(log));localStorage.removeItem('aeroroster-active-flight');renderActive();renderLogbook();renderDashboard();switchView('logbook');}
function quickLog(r){const log=getLog();log.unshift({...r,id:crypto.randomUUID?.()||String(Date.now()),completedAt:new Date().toISOString()});localStorage.setItem('aeroroster-logbook',JSON.stringify(log));renderLogbook();renderDashboard();if($('routeDialog').open)$('routeDialog').close();switchView('logbook');}
function renderLogbook(){const log=getLog();$('metricFlights').textContent=log.length;$('metricAirlines').textContent=new Set(log.map(x=>x.airline)).size;$('metricAircraft').textContent=new Set(log.map(x=>x.aircraftIcao)).size;$('emptyLogbook').classList.toggle('hidden',log.length>0);$('logbookList').innerHTML=log.map(x=>`<div class="log-row"><div><strong>${x.fromIata} → ${x.toIata}</strong><span>${escapeHtml(x.fromCity)} to ${escapeHtml(x.toCity)}</span></div><div><strong>${escapeHtml(x.airline)}</strong><span>${escapeHtml(x.flightNumber||x.airlineCode)}</span></div><div><strong>${escapeHtml(x.aircraftIcao)}</strong><span>${new Date(x.completedAt).toLocaleString()}</span></div><button data-id="${x.id}">Delete</button></div>`).join('');document.querySelectorAll('#logbookList button').forEach(b=>b.onclick=()=>{localStorage.setItem('aeroroster-logbook',JSON.stringify(getLog().filter(x=>x.id!==b.dataset.id)));renderLogbook();renderDashboard();});}
function renderDashboard(){const log=getLog();$('dashboardMetrics').innerHTML=`<div><span>Routes available</span><strong>${state.routes.length||0}</strong></div><div><span>Flights completed</span><strong>${log.length}</strong></div><div><span>Airlines flown</span><strong>${new Set(log.map(x=>x.airline)).size}</strong></div>`;$('statisticsContent').innerHTML=`<div class="metric-row"><div><span>Unique aircraft</span><strong>${new Set(log.map(x=>x.aircraftIcao)).size}</strong></div><div><span>Unique destinations</span><strong>${new Set(log.map(x=>x.toIata)).size}</strong></div><div><span>Active flight</span><strong>${getActive()?'1':'0'}</strong></div></div>`;}
function switchView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));const map={finder:'finderView',active:'activeView',logbook:'logbookView',dashboard:'dashboardView',statistics:'statisticsView',settings:'settingsView'};$(map[name]||'finderView').classList.add('active-view');document.querySelectorAll('.side-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('sidebar').classList.remove('open');if(name==='settings')renderSettingsSummary();window.scrollTo({top:0,behavior:'smooth'});}
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
function defaultUtcInput(){const settings=getSettings();const d=new Date(Date.now()+Number(settings.departureOffset||60)*60000);return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}T${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`}
function parseUtc(v){const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);return m?Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5]):NaN}
function formatUtc(ms){const settings=getSettings();const local=settings.timeZone==='local';return new Intl.DateTimeFormat('en-GB',{timeZone:local?undefined:'UTC',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms))+(local?' local':' UTC')}
function formatCountdown(ms){const settings=getSettings();const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return settings.showSeconds?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}
function simbriefDate(d){return `${String(d.getUTCDate()).padStart(2,'0')}${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]}${String(d.getUTCFullYear()).slice(-2)}`}
function displayFlightNumber(r){return r.flightNumber||'Not available'}
function normalizeFlight(v){return String(v||'').trim().toUpperCase().replace(/\s+/g,'')}
function routeKey(r){return `${r.airline||''}|${r.aircraftIcao||''}|${r.fromIata||''}|${r.toIata||''}`}
function shortAirport(v){return String(v).replace('International','Intl').slice(0,25)}
function getLog(){try{return JSON.parse(localStorage.getItem('aeroroster-logbook')||'[]')}catch{return[]}}
function getActive(){try{return JSON.parse(localStorage.getItem('aeroroster-active-flight')||'null')}catch{return null}}
function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}

function getSettings(){const d={theme:'dark',accent:'green',compact:false,timeZone:'utc',departureOffset:60,showSeconds:true,routeMode:'airline',autoSimbrief:false,rememberAirline:true,lastAirline:'Saudia',simbriefUserId:'',simbriefProxy:'',useSimbriefMap:true};try{return{...d,...JSON.parse(localStorage.getItem('aeroroster-settings')||'{}')}}catch{return d}}
function saveSettings(next,show=true){localStorage.setItem('aeroroster-settings',JSON.stringify({...getSettings(),...next}));applyStoredSettings();renderSettingsSummary();if(show&&$('settingsSaveStatus')){$('settingsSaveStatus').textContent='✓ Settings saved successfully.';$('settingsSaveStatus').classList.add('visible');setTimeout(()=>$('settingsSaveStatus')?.classList.remove('visible'),2800)}}
function readSettingsForm(){return{theme:$('settingTheme').value,accent:$('settingAccent').value,compact:$('settingCompact').checked,timeZone:$('settingTimeZone').value,departureOffset:+$('settingDepartureOffset').value,showSeconds:$('settingSeconds').checked,routeMode:$('settingRouteMode').value,autoSimbrief:$('settingAutoSimbrief').checked,rememberAirline:$('settingRememberAirline').checked,simbriefUserId:$('settingSimbriefUserId').value.trim(),simbriefProxy:$('settingSimbriefProxy').value.trim(),useSimbriefMap:$('settingUseSimbriefMap').checked}}
function applyStoredSettings(){const s=getSettings();document.body.classList.remove('theme-midnight','theme-light','accent-blue','accent-purple','accent-orange','compact-layout');if(s.theme==='midnight')document.body.classList.add('theme-midnight');if(s.theme==='light')document.body.classList.add('theme-light');if(s.accent!=='green')document.body.classList.add(`accent-${s.accent}`);if(s.compact)document.body.classList.add('compact-layout');const u=document.querySelector('.utc-chip');if(u)u.textContent=s.timeZone==='local'?'◷ LOCAL':'◷ UTC'}
function bindSettings(){$('saveSettingsButton').onclick=()=>{const n=readSettingsForm();saveSettings(n,true);if(n.routeMode!==state.mode)setMode(n.routeMode)};$('resetSettings').onclick=()=>{if(confirm('Reset all AeroRoster preferences?')){localStorage.removeItem('aeroroster-settings');applyStoredSettings();renderSettingsSummary()}};$('importSimbriefButton').onclick=()=>importLatestSimbrief(false);$('clearSimbriefButton').onclick=()=>{localStorage.removeItem('aeroroster-simbrief-ofp');renderSettingsSummary();setSimbriefStatus('Imported SimBrief plan cleared.','success')};$('clearActiveFlightSetting').onclick=()=>{if(confirm('Clear the active flight?')){localStorage.removeItem('aeroroster-active-flight');destroyActiveMap();state.renderedActiveId=null;renderActive();renderDashboard();renderSettingsSummary()}};$('clearLogbookSetting').onclick=()=>{if(confirm('Clear every flight in the logbook?')){localStorage.removeItem('aeroroster-logbook');renderLogbook();renderDashboard();renderSettingsSummary()}}}
function renderSettingsSummary(){const s=getSettings(),v={settingTheme:s.theme,settingAccent:s.accent,settingTimeZone:s.timeZone,settingDepartureOffset:String(s.departureOffset),settingRouteMode:s.routeMode,settingSimbriefUserId:s.simbriefUserId,settingSimbriefProxy:s.simbriefProxy};Object.entries(v).forEach(([id,val])=>{if($(id))$(id).value=val});if($('settingCompact'))$('settingCompact').checked=!!s.compact;if($('settingSeconds'))$('settingSeconds').checked=!!s.showSeconds;if($('settingAutoSimbrief'))$('settingAutoSimbrief').checked=!!s.autoSimbrief;if($('settingRememberAirline'))$('settingRememberAirline').checked=!!s.rememberAirline;if($('settingUseSimbriefMap'))$('settingUseSimbriefMap').checked=!!s.useSimbriefMap;if($('settingsFlightCount'))$('settingsFlightCount').textContent=getLog().length;if($('settingsActiveStatus'))$('settingsActiveStatus').textContent=getActive()?'Scheduled':'None';const ofp=getImportedSimbrief();setSimbriefStatus(ofp?`${ofp.flightNumber||'Flight'} · ${ofp.origin} → ${ofp.destination} · ${ofp.waypoints.length} map points`:'No SimBrief plan has been imported.',ofp?'success':'')}
async function importLatestSimbrief(silent=false){const d=readSettingsForm();if(!d.simbriefUserId){setSimbriefStatus('Enter your SimBrief Pilot ID first.','error');if(!silent)switchView('settings');return null}setSimbriefStatus('Importing the latest SimBrief OFP…','loading');try{const direct=`https://www.simbrief.com/api/xml.fetcher.php?userid=${encodeURIComponent(d.simbriefUserId)}&json=1`,url=d.simbriefProxy?buildProxyUrl(d.simbriefProxy,direct):direct,res=await fetch(url,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error(`SimBrief returned HTTP ${res.status}.`);const parsed=parseSimbriefOfp(await res.json());if(!parsed.origin||!parsed.destination)throw new Error('OFP did not contain origin and destination.');localStorage.setItem('aeroroster-simbrief-ofp',JSON.stringify(parsed));saveSettings(d,false);renderSettingsSummary();setSimbriefStatus(`Imported ${parsed.flightNumber||'flight'} ${parsed.origin} → ${parsed.destination} with ${parsed.waypoints.length} map points.`,'success');return parsed}catch(e){console.error(e);setSimbriefStatus(`Import failed: ${e.message} Direct browser requests may be blocked by CORS; add a compatible proxy URL if necessary.`,'error');return null}}
function buildProxyUrl(p,u){return p.includes('{url}')?p.replace('{url}',encodeURIComponent(u)):`${p}${p.includes('?')?'&':'?'}url=${encodeURIComponent(u)}`}
function parseSimbriefOfp(raw){const g=raw.general||{},o=raw.origin||{},d=raw.destination||{},a=raw.aircraft||{},t=raw.times||{},fix=Array.isArray(raw.navlog?.fix)?raw.navlog.fix:Array.isArray(raw.navlog)?raw.navlog:[],wp=fix.map(x=>({ident:String(x.ident||x.name||x.fix||'').trim(),lat:+(x.pos_lat??x.latitude??x.lat),lon:+(x.pos_long??x.longitude??x.lon)})).filter(validMapPoint),orig=String(o.icao_code||o.icao||g.orig_icao||'').toUpperCase(),dest=String(d.icao_code||d.icao||g.dest_icao||'').toUpperCase(),oa=findAirportByIcao(orig),da=findAirportByIcao(dest);if(wp.length===0&&oa&&da)wp.push({ident:orig,lat:oa.lat,lon:oa.lon},{ident:dest,lat:da.lat,lon:da.lon});else{if(oa&&!wp.some(x=>x.ident===orig))wp.unshift({ident:orig,lat:oa.lat,lon:oa.lon});if(da&&!wp.some(x=>x.ident===dest))wp.push({ident:dest,lat:da.lat,lon:da.lon})}return{importedAt:new Date().toISOString(),origin:orig,destination:dest,flightNumber:String(g.flight_number||g.flight_num||'').toUpperCase(),airline:String(g.icao_airline||g.airline||'').toUpperCase(),aircraft:String(a.icaocode||a.icao_code||g.aircraft||'').toUpperCase(),route:String(g.route||raw.atc?.route||''),cruiseAltitude:+(g.initial_altitude||g.cruise_altitude||0),distanceNm:+(g.route_distance||g.air_distance||0),scheduledDeparture:+(t.sched_out||t.est_out||0)*1000||null,scheduledArrival:+(t.sched_in||t.est_in||0)*1000||null,waypoints:wp}}
function findAirportByIcao(i){return Object.values(state.airports).find(a=>normalizeCode(a.icao)===normalizeCode(i))}function normalizeCode(v){return String(v||'').trim().toUpperCase()}function getImportedSimbrief(){try{return JSON.parse(localStorage.getItem('aeroroster-simbrief-ofp')||'null')}catch{return null}}function setSimbriefStatus(m,t){const e=$('simbriefImportStatus');if(e){e.textContent=m;e.className=`simbrief-status ${t||''}`.trim()}}

init().catch(error=>{console.error(error);document.body.innerHTML='<p style="padding:30px">The route data could not be loaded. Run the site through GitHub Pages or a local server.</p>'});
