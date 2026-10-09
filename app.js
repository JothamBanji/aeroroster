const state={routes:[],baseRoutes:[],filtered:[],selected:null,page:1,pageSize:8,mode:'airline',timer:null,airports:{},worldAirports:[],customFrom:null,customTo:null,activeMap:null,activeMarker:null,activeRouteLine:null,renderedActiveId:null};
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
  // Login, theme and clock work immediately; they don't need any data files.
  applyStoredSettings();initLogin();startUtcClock();
  // The worldwide airport list is ~11 MB, so it loads in the background instead of blocking the app.
  state.worldAirportsReady=fetch('./data/world-airports.json')
    .then(r=>r.ok?r.json():[])
    .then(list=>{state.worldAirports=list;document.dispatchEvent(new Event('aeroroster:airports'));return list})
    .catch(error=>{console.error('World airports could not be loaded:',error);return[]});
  const [routeResponse,airportResponse]=await Promise.all([fetch('./data/routes.json'),fetch('./data/airports.json')]);
  if(!routeResponse.ok)throw new Error('Could not load route data.');
  state.baseRoutes=await routeResponse.json();
  state.airports=airportResponse.ok?await airportResponse.json():{};
  state.routes=addReverseRoutes(state.baseRoutes);
  bind();bindSettings();populateAirlines();
  const settings=getSettings();
  const airlines=[...new Set(state.routes.map(r=>r.airline))];
  setAirline(settings.rememberAirline&&airlines.includes(settings.lastAirline)?settings.lastAirline:'Saudia');
  setMode(settings.routeMode||'airline');
  renderSettingsSummary();renderLogbook();renderActive();renderDashboard();
  $('sidebarRouteCount').textContent=state.routes.length;
  state.timer=setInterval(renderActive,1000);
  state.ready=true;
  document.dispatchEvent(new Event('aeroroster:ready'));
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
  $('customFromSearch').oninput=()=>searchWorldAirports('from');
  $('customToSearch').oninput=()=>searchWorldAirports('to');
  $('customFromSearch').onfocus=()=>searchWorldAirports('from');
  $('customToSearch').onfocus=()=>searchWorldAirports('to');
  $('swapCustomRoute').onclick=()=>{const a=state.customFrom;state.customFrom=state.customTo;state.customTo=a;renderSelectedCustomAirports();updateCustomButton();};
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
  state.customFrom=null;
  state.customTo=null;
  if($('customFromSearch'))$('customFromSearch').value='';
  if($('customToSearch'))$('customToSearch').value='';
  renderSelectedCustomAirports();
  updateCustomButton();
}

function searchWorldAirports(direction){
  const input=direction==='from'?$('customFromSearch'):$('customToSearch');
  const results=direction==='from'?$('customFromResults'):$('customToResults');
  const query=input.value.trim().toLowerCase();

  if(query.length<2){
    results.classList.add('hidden');
    results.innerHTML='';
    return;
  }

  if(!state.worldAirports.length){
    results.innerHTML='<div class="airport-result-empty">Loading worldwide airport database…</div>';
    results.classList.remove('hidden');
    state.worldAirportsReady?.then(list=>{if(list.length&&input.value.trim().toLowerCase()===query)searchWorldAirports(direction)});
    return;
  }

  const matches=state.worldAirports
    .filter(a=>`${a.ident} ${a.iata} ${a.name} ${a.city} ${a.country}`.toLowerCase().includes(query))
    .slice(0,25);

  results.innerHTML=matches.length
    ? matches.map((a,i)=>`<button class="airport-result" type="button" data-index="${i}">
        <strong>${escapeHtml(a.iata||a.ident)}</strong>
        <span>${escapeHtml(a.name)}</span>
        <small>${escapeHtml(a.ident)} · ${escapeHtml(a.city||a.country)}</small>
      </button>`).join('')
    : '<div class="airport-result-empty">No airports found.</div>';

  results.classList.remove('hidden');

  results.querySelectorAll('.airport-result').forEach(button=>{
    button.onclick=()=>chooseWorldAirport(direction,matches[Number(button.dataset.index)]);
  });
}

function chooseWorldAirport(direction,airport){
  if(direction==='from'){
    state.customFrom=airport;
    $('customFromSearch').value=airport.iata||airport.ident;
    $('customFromResults').classList.add('hidden');
  }else{
    state.customTo=airport;
    $('customToSearch').value=airport.iata||airport.ident;
    $('customToResults').classList.add('hidden');
  }

  renderSelectedCustomAirports();
  updateCustomButton();
}

function renderSelectedCustomAirports(){
  const render=a=>a
    ? `<strong>${escapeHtml(a.iata||a.ident)}</strong><span>${escapeHtml(a.name)}</span><small>${escapeHtml(a.city||a.country)} · ${escapeHtml(a.ident)}</small>`
    : 'No airport selected';

  if($('customFromSelected'))$('customFromSelected').innerHTML=render(state.customFrom);
  if($('customToSelected'))$('customToSelected').innerHTML=render(state.customTo);
}

function updateCustomButton(){
  $('useCustomRoute').disabled=!(state.customFrom&&state.customTo&&state.customFrom.ident!==state.customTo.ident);
}

function createCustomRoute(){
  const airline=$('airlineSelect').value;
  const aircraftIcao=$('aircraftSelect').value;

  if(!state.customFrom||!state.customTo||state.customFrom.ident===state.customTo.ident)return;

  const source=state.routes.find(r=>r.airline===airline&&r.aircraftIcao===aircraftIcao)
    ||state.routes.find(r=>r.airline===airline);

  const from=state.customFrom;
  const to=state.customTo;

  const custom={
    ...source,
    fromIata:from.iata||from.ident,
    fromIcao:from.ident,
    fromCity:from.city||from.name,
    fromAirport:from.name,
    toIata:to.iata||to.ident,
    toIcao:to.ident,
    toCity:to.city||to.name,
    toAirport:to.name,
    aircraftIcao,
    aircraft:aircraftName(airline,aircraftIcao),
    flightNumber:'',
    custom:true,
    direction:'custom',
    customCoordinates:{
      from:{lat:Number(from.lat),lon:Number(from.lon)},
      to:{lat:Number(to.lat),lon:Number(to.lon)}
    }
  };

  selectRoute(custom);
  openRouteDialog(custom);
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
  const imported=getImportedSimbrief();
  const settings=getSettings();
  const matches=imported&&
    normalizeCode(imported.origin)===normalizeCode(r.fromIcao)&&
    normalizeCode(imported.destination)===normalizeCode(r.toIcao);

  const active={
    ...r,
    scheduledDepartureMs:departureMs,
    departureMs,
    durationMinutes,
    scheduledEtaMs:departureMs+durationMinutes*60000,
    etaMs:departureMs+durationMinutes*60000,
    actualDepartureMs:null,
    actualArrivalMs:null,
    flightNumber,
    id:crypto.randomUUID?.()||String(Date.now()),
    simbriefRoute:settings.useSimbriefMap&&matches?imported:null
  };

  localStorage.setItem('aeroroster-active-flight',JSON.stringify(active));
  $('routeDialog').close();
  destroyActiveMap();
  state.renderedActiveId=null;
  renderActive();
  switchView('active');

  if(settings.autoSimbrief)openSimbrief(active);
}

function renderActive(){
  const container=$('activeFlightContainer');
  const flight=getActive();

  if(!flight){
    destroyActiveMap();
    state.renderedActiveId=null;
    container.innerHTML='<div class="empty-message">No active flight. Select a route and schedule a departure.</div>';
    return;
  }

  const now=Date.now();
  const scheduledDeparture=Number(flight.scheduledDepartureMs||flight.departureMs);
  const scheduledEta=Number(flight.scheduledEtaMs||flight.etaMs);
  const actualDeparture=Number(flight.actualDepartureMs)||null;
  const actualArrival=Number(flight.actualArrivalMs)||null;
  const operationalEta=actualDeparture
    ? actualDeparture+Number(flight.durationMinutes)*60000
    : scheduledEta;

  let progress=0;
  if(actualArrival){
    progress=1;
  }else if(actualDeparture){
    progress=Math.max(0,Math.min(1,(now-actualDeparture)/(operationalEta-actualDeparture)));
  }

  const status=getFlightStatus(flight,now,progress);
  const departurePerformance=getSchedulePerformance(actualDeparture,scheduledDeparture,'Departed');
  const arrivalPerformance=getSchedulePerformance(actualArrival,scheduledEta,'Arrived');

  const countdown=actualArrival
    ? 'Complete'
    : !actualDeparture
      ? now<scheduledDeparture
        ? `Departure in ${formatCountdown(scheduledDeparture-now)}`
        : `Scheduled ${formatCountdown(now-scheduledDeparture)} ago`
      : now<operationalEta
        ? `Estimated arrival in ${formatCountdown(operationalEta-now)}`
        : 'Arrival expected';

  if(state.renderedActiveId!==flight.id){
    destroyActiveMap();
    state.renderedActiveId=flight.id;

    container.innerHTML=`<div class="active-flight-card map-active-card">
      <div class="active-head">
        <div>
          <small>${escapeHtml(flight.airline)} · ${escapeHtml(flight.aircraft)}</small>
          <h2>${flight.fromIata} → ${flight.toIata}</h2>
          <div class="ops-badges">
            <span id="departurePerformanceBadge" class="ops-badge">${escapeHtml(departurePerformance.label)}</span>
            <span id="arrivalPerformanceBadge" class="ops-badge">${escapeHtml(arrivalPerformance.label)}</span>
          </div>
        </div>
        <span id="activeStatusChip" class="status-chip">${status}</span>
      </div>

      <div class="active-map-layout">
        <section class="map-panel">
          <div id="activeFlightMap" class="active-flight-map"></div>
          <div class="map-source-chip" id="mapSourceChip"></div>
        </section>

        <aside class="flight-sidebar-panel">
          <div class="active-metrics vertical-metrics">
            <div><span>Flight</span><strong>${escapeHtml(flight.flightNumber||'Not available')}</strong></div>
            <div><span>Status</span><strong id="activeStatusText">${status}</strong></div>
            <div><span>Scheduled departure</span><strong>${formatUtc(scheduledDeparture)}</strong></div>
            <div><span>Actual departure</span><strong id="actualDepartureText">${actualDeparture?formatUtc(actualDeparture):'Not departed'}</strong></div>
            <div><span>Scheduled arrival</span><strong>${formatUtc(scheduledEta)}</strong></div>
            <div><span>Actual arrival</span><strong id="actualArrivalText">${actualArrival?formatUtc(actualArrival):'Not arrived'}</strong></div>
            <div><span>Countdown</span><strong id="activeCountdown">${countdown}</strong></div>
            <div><span>Progress</span><strong id="activeProgressText">${Math.round(progress*100)}%</strong></div>
            <div><span>Next waypoint</span><strong id="activeNextWaypoint">—</strong></div>
            <div><span>Top of climb</span><strong id="activeTocStatus">—</strong></div>
            <div><span>Top of descent</span><strong id="activeTodStatus">—</strong></div>
          </div>
        </aside>
      </div>

      <div class="flight-progress-footer">
        <div class="progress">
          <div id="activeProgressFill" class="progress-fill" style="width:${progress*100}%"></div>
          <div id="activeProgressPlane" class="progress-plane" style="left:${progress*100}%">✈</div>
        </div>
      </div>

      <div class="operations-controls">
        <div class="operation-card">
          <span>Departure operation</span>
          <strong id="departureOperationText">${escapeHtml(departurePerformance.label)}</strong>
          <button id="recordDepartureButton" class="schedule-button" type="button" ${actualDeparture?'disabled':''}>
            ${actualDeparture?'Departure recorded':'Depart now'}
          </button>
        </div>

        <div class="operation-card">
          <span>Arrival operation</span>
          <strong id="arrivalOperationText">${escapeHtml(arrivalPerformance.label)}</strong>
          <button id="recordArrivalButton" class="schedule-button" type="button" ${!actualDeparture||actualArrival?'disabled':''}>
            ${actualArrival?'Arrival recorded':'Arrive now'}
          </button>
        </div>
      </div>

      <div class="dialog-actions">
        <button id="activeSimbrief" class="outline-button">Open SimBrief</button>
        <button id="refreshSimbriefActive" class="outline-button">Import latest OFP</button>
        <button id="finishFlight" class="schedule-button" ${actualArrival?'':'disabled'}>Finish & Log</button>
      </div>
    </div>`;

    $('activeSimbrief').onclick=()=>openSimbrief(flight);
    $('finishFlight').onclick=()=>finishFlight(getActive());

    $('recordDepartureButton').onclick=()=>{
      recordActualDeparture();
    };

    $('recordArrivalButton').onclick=()=>{
      recordActualArrival();
    };

    $('refreshSimbriefActive').onclick=async()=>{
      const imported=await importLatestSimbrief(true);
      if(imported){
        const current=getActive();
        if(normalizeCode(imported.origin)===normalizeCode(current.fromIcao)&&
           normalizeCode(imported.destination)===normalizeCode(current.toIcao)){
          current.simbriefRoute=imported;
          localStorage.setItem('aeroroster-active-flight',JSON.stringify(current));
          destroyActiveMap();
          state.renderedActiveId=null;
          renderActive();
        }else{
          alert('The imported SimBrief OFP does not match this active flight.');
        }
      }
    };

    setupActiveMap(flight);
  }

  if($('activeStatusChip'))$('activeStatusChip').textContent=status;
  if($('activeStatusText'))$('activeStatusText').textContent=status;
  if($('activeCountdown'))$('activeCountdown').textContent=countdown;
  if($('activeProgressText'))$('activeProgressText').textContent=`${Math.round(progress*100)}%`;
  if($('activeProgressFill'))$('activeProgressFill').style.width=`${progress*100}%`;
  if($('activeProgressPlane'))$('activeProgressPlane').style.left=`${progress*100}%`;
  if($('departurePerformanceBadge'))$('departurePerformanceBadge').textContent=departurePerformance.label;
  if($('arrivalPerformanceBadge'))$('arrivalPerformanceBadge').textContent=arrivalPerformance.label;
  if($('departureOperationText'))$('departureOperationText').textContent=departurePerformance.label;
  if($('arrivalOperationText'))$('arrivalOperationText').textContent=arrivalPerformance.label;
  if($('actualDepartureText'))$('actualDepartureText').textContent=actualDeparture?formatUtc(actualDeparture):'Not departed';
  if($('actualArrivalText'))$('actualArrivalText').textContent=actualArrival?formatUtc(actualArrival):'Not arrived';

  updateActiveMap(flight,progress);
}

function recordActualDeparture(){
  const flight=getActive();
  if(!flight||flight.actualDepartureMs)return;

  flight.actualDepartureMs=Date.now();
  flight.departurePerformance=getSchedulePerformance(
    flight.actualDepartureMs,
    Number(flight.scheduledDepartureMs||flight.departureMs),
    'Departed'
  );
  localStorage.setItem('aeroroster-active-flight',JSON.stringify(flight));

  destroyActiveMap();
  state.renderedActiveId=null;
  renderActive();
}

function recordActualArrival(){
  const flight=getActive();
  if(!flight||!flight.actualDepartureMs||flight.actualArrivalMs)return;

  flight.actualArrivalMs=Date.now();
  flight.arrivalPerformance=getSchedulePerformance(
    flight.actualArrivalMs,
    Number(flight.scheduledEtaMs||flight.etaMs),
    'Arrived'
  );
  localStorage.setItem('aeroroster-active-flight',JSON.stringify(flight));

  destroyActiveMap();
  state.renderedActiveId=null;
  renderActive();
}

function getSchedulePerformance(actualMs,scheduledMs,verb){
  if(!actualMs){
    return{label:verb==='Departed'?'Departure not recorded':'Arrival not recorded',minutes:null,type:'pending'};
  }

  const differenceMinutes=Math.round((actualMs-scheduledMs)/60000);
  const absolute=Math.abs(differenceMinutes);

  if(absolute<=2){
    return{label:`${verb} on time`,minutes:differenceMinutes,type:'ontime'};
  }

  if(differenceMinutes<0){
    return{label:`${verb} ${absolute} min early`,minutes:differenceMinutes,type:'early'};
  }

  return{label:`${verb} ${absolute} min late`,minutes:differenceMinutes,type:'late'};
}

function getFlightStatus(f,now,p){
  if(f.actualArrivalMs)return'Arrived';
  if(!f.actualDepartureMs){
    const scheduled=Number(f.scheduledDepartureMs||f.departureMs);
    return now<scheduled?'Waiting at gate':'Awaiting departure';
  }

  const points=getFlightMapPoints(f);
  const currentIndex=Math.min(
    Math.max(0,points.length-1),
    Math.floor(Math.max(0,Math.min(1,p))*(Math.max(1,points.length-1)))
  );

  const simbrief=f.simbriefRoute;
  const tocIndex=Number.isInteger(simbrief?.tocIndex)?simbrief.tocIndex:-1;
  const todIndex=Number.isInteger(simbrief?.todIndex)?simbrief.todIndex:-1;

  if(points.length>2&&(tocIndex>=0||todIndex>=0)){
    if(p<.025)return'Taxi and takeoff';
    if(tocIndex>=0&&currentIndex<tocIndex)return'Climb';
    if(todIndex>=0&&currentIndex>=todIndex){
      if(p>.965)return'Approach and landing';
      return'Descent';
    }
    if(tocIndex>=0&&currentIndex>=tocIndex&&(todIndex<0||currentIndex<todIndex))return'Cruise';
  }

  if(p<.04)return'Taxi and takeoff';
  if(p<.16)return'Climb';
  if(p<.80)return'Cruise';
  if(p<.96)return'Descent';
  return'Approach and landing';
}

function destroyActiveMap(){
  if(state.activeMap)state.activeMap.remove();
  state.activeMap=null;
  state.activeMarker=null;
  state.activeRouteLine=null;
}

function setupActiveMap(f){
  if(typeof L==='undefined')return;
  const el=$('activeFlightMap');
  if(!el)return;

  const pts=getFlightMapPoints(f);
  if(pts.length<2){
    el.innerHTML='<div class="map-error">Airport coordinates are unavailable.</div>';
    return;
  }

  state.activeMap=L.map(el);

  const street=L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:18,attribution:'© OpenStreetMap contributors'}
  );

  const satellite=L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:19,attribution:'Tiles © Esri'}
  );

  const settings=getSettings();
  const defaultLayer=settings.mapStyle==='satellite'?satellite:street;
  defaultLayer.addTo(state.activeMap);

  L.control.layers(
    {'Street':street,'Satellite':satellite},
    {},
    {position:'topright'}
  ).addTo(state.activeMap);

  const ll=pts.map(point=>[point.lat,point.lon]);

  state.activeRouteLine=L.polyline(ll,{
    color:getComputedStyle(document.body).getPropertyValue('--accent').trim()||'#16db73',
    weight:4,
    opacity:.92
  }).addTo(state.activeMap);

  L.marker(ll[0]).addTo(state.activeMap).bindPopup(`<b>${escapeHtml(f.fromIata)}</b>`);
  L.marker(ll[ll.length-1]).addTo(state.activeMap).bindPopup(`<b>${escapeHtml(f.toIata)}</b>`);

  state.activeMarker=L.marker(ll[0],{
    icon:L.divIcon({
      className:'aircraft-map-marker',
      html:'✈',
      iconSize:[34,34],
      iconAnchor:[17,17]
    })
  }).addTo(state.activeMap);

  state.activeMap.fitBounds(state.activeRouteLine.getBounds(),{padding:[35,35]});
  $('mapSourceChip').textContent=f.simbriefRoute?.waypoints?.length
    ? `SimBrief route · ${f.simbriefRoute.waypoints.length} waypoints`
    : 'Estimated great-circle route';

  setTimeout(()=>state.activeMap?.invalidateSize(),100);
}

function getFlightMapPoints(f){
  if(f.simbriefRoute?.waypoints?.length>=2)return f.simbriefRoute.waypoints.filter(validMapPoint);
  const a=f.customCoordinates?.from||state.airports[f.fromIata];
  const b=f.customCoordinates?.to||state.airports[f.toIata];
  if(!a||!b)return[];
  return createGreatCirclePoints(
    {lat:+a.lat,lon:+a.lon,ident:f.fromIata},
    {lat:+b.lat,lon:+b.lon,ident:f.toIata},
    80
  );
}

function validMapPoint(p){return Number.isFinite(+p.lat)&&Number.isFinite(+p.lon)}

function createGreatCirclePoints(s,e,n){
  const out=[];
  const a1=toRad(s.lat),o1=toRad(s.lon),a2=toRad(e.lat),o2=toRad(e.lon);
  const d=2*Math.asin(Math.sqrt(Math.sin((a2-a1)/2)**2+Math.cos(a1)*Math.cos(a2)*Math.sin((o2-o1)/2)**2));
  if(!Number.isFinite(d)||d===0)return[s,e];
  for(let i=0;i<=n;i++){
    const fraction=i/n;
    const A=Math.sin((1-fraction)*d)/Math.sin(d);
    const B=Math.sin(fraction*d)/Math.sin(d);
    const x=A*Math.cos(a1)*Math.cos(o1)+B*Math.cos(a2)*Math.cos(o2);
    const y=A*Math.cos(a1)*Math.sin(o1)+B*Math.cos(a2)*Math.sin(o2);
    const z=A*Math.sin(a1)+B*Math.sin(a2);
    out.push({
      lat:toDeg(Math.atan2(z,Math.sqrt(x*x+y*y))),
      lon:toDeg(Math.atan2(y,x)),
      ident:i===0?s.ident:i===n?e.ident:''
    });
  }
  return out;
}

function updateActiveMap(f,p){
  if(!state.activeMarker)return;
  const pts=getFlightMapPoints(f);
  if(pts.length<2)return;

  const pos=interpolatePolyline(pts,p);
  state.activeMarker.setLatLng([pos.lat,pos.lon]);

  const currentIndex=Math.min(
    pts.length-1,
    Math.floor(Math.max(0,Math.min(1,p))*(pts.length-1))
  );
  const next=pts[Math.min(pts.length-1,currentIndex+1)];
  if($('activeNextWaypoint'))$('activeNextWaypoint').textContent=next?.ident||f.toIata;

  const tocIndex=Number.isInteger(f.simbriefRoute?.tocIndex)?f.simbriefRoute.tocIndex:-1;
  const todIndex=Number.isInteger(f.simbriefRoute?.todIndex)?f.simbriefRoute.todIndex:-1;

  if($('activeTocStatus')){
    $('activeTocStatus').textContent=tocIndex<0
      ? 'Not in OFP'
      : currentIndex>=tocIndex
        ? 'Passed'
        : `${Math.max(0,tocIndex-currentIndex)} waypoint${tocIndex-currentIndex===1?'':'s'} ahead`;
  }

  if($('activeTodStatus')){
    $('activeTodStatus').textContent=todIndex<0
      ? 'Not in OFP'
      : currentIndex>=todIndex
        ? 'Passed · descending'
        : `${Math.max(0,todIndex-currentIndex)} waypoint${todIndex-currentIndex===1?'':'s'} ahead`;
  }
}

function interpolatePolyline(points,p){
  const x=Math.max(0,Math.min(1,p))*(points.length-1);
  const i=Math.min(points.length-2,Math.floor(x));
  const t=x-i;
  return{
    lat:+points[i].lat+(+points[i+1].lat-+points[i].lat)*t,
    lon:+points[i].lon+(+points[i+1].lon-+points[i].lon)*t
  };
}

function toRad(v){return+v*Math.PI/180}
function toDeg(v){return v*180/Math.PI}

function finishFlight(f){
  if(!f?.actualArrivalMs){
    alert('Record the arrival first so AeroRoster can calculate whether you arrived early or late.');
    return;
  }

  const scheduledDeparture=Number(f.scheduledDepartureMs||f.departureMs);
  const scheduledEta=Number(f.scheduledEtaMs||f.etaMs);
  const log=getLog();

  log.unshift({
    ...f,
    departurePerformance:getSchedulePerformance(f.actualDepartureMs,scheduledDeparture,'Departed'),
    arrivalPerformance:getSchedulePerformance(f.actualArrivalMs,scheduledEta,'Arrived'),
    completedAt:new Date().toISOString()
  });

  localStorage.setItem('aeroroster-logbook',JSON.stringify(log));
  localStorage.removeItem('aeroroster-active-flight');
  destroyActiveMap();
  state.renderedActiveId=null;
  renderActive();
  renderLogbook();
  renderDashboard();
  switchView('logbook');
}

function quickLog(r){const log=getLog();log.unshift({...r,id:crypto.randomUUID?.()||String(Date.now()),completedAt:new Date().toISOString()});localStorage.setItem('aeroroster-logbook',JSON.stringify(log));renderLogbook();renderDashboard();if($('routeDialog').open)$('routeDialog').close();switchView('logbook');}
function renderLogbook(){
  const log=getLog();
  $('metricFlights').textContent=log.length;
  $('metricAirlines').textContent=new Set(log.map(x=>x.airline)).size;
  $('metricAircraft').textContent=new Set(log.map(x=>x.aircraftIcao)).size;
  $('emptyLogbook').classList.toggle('hidden',log.length>0);

  $('logbookList').innerHTML=log.map(x=>{
    const departure=x.departurePerformance?.label||(
      x.actualDepartureMs
        ? getSchedulePerformance(x.actualDepartureMs,Number(x.scheduledDepartureMs||x.departureMs),'Departed').label
        : 'Departure not recorded'
    );
    const arrival=x.arrivalPerformance?.label||(
      x.actualArrivalMs
        ? getSchedulePerformance(x.actualArrivalMs,Number(x.scheduledEtaMs||x.etaMs),'Arrived').label
        : 'Arrival not recorded'
    );

    return `<div class="log-row enhanced-log-row">
      <div>
        <strong>${x.fromIata} → ${x.toIata}</strong>
        <span>${escapeHtml(x.fromCity)} to ${escapeHtml(x.toCity)}</span>
        <small class="log-performance">${escapeHtml(departure)} · ${escapeHtml(arrival)}</small>
      </div>
      <div><strong>${escapeHtml(x.airline)}</strong><span>${escapeHtml(x.flightNumber||x.airlineCode)}</span></div>
      <div><strong>${escapeHtml(x.aircraftIcao)}</strong><span>${new Date(x.completedAt).toLocaleString()}</span></div>
      <button data-id="${x.id}">Delete</button>
    </div>`;
  }).join('');

  document.querySelectorAll('#logbookList button').forEach(button=>{
    button.onclick=()=>{
      localStorage.setItem(
        'aeroroster-logbook',
        JSON.stringify(getLog().filter(x=>x.id!==button.dataset.id))
      );
      renderLogbook();
      renderDashboard();
    };
  });
}
function renderDashboard(){const log=getLog();$('dashboardMetrics').innerHTML=`<div><span>Routes available</span><strong>${state.routes.length||0}</strong></div><div><span>Flights completed</span><strong>${log.length}</strong></div><div><span>Airlines flown</span><strong>${new Set(log.map(x=>x.airline)).size}</strong></div>`;$('statisticsContent').innerHTML=`<div class="metric-row"><div><span>Unique aircraft</span><strong>${new Set(log.map(x=>x.aircraftIcao)).size}</strong></div><div><span>Unique destinations</span><strong>${new Set(log.map(x=>x.toIata)).size}</strong></div><div><span>Active flight</span><strong>${getActive()?'1':'0'}</strong></div></div>`;}
function switchView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));const map={finder:'finderView',active:'activeView',logbook:'logbookView',dashboard:'dashboardView',statistics:'statisticsView',briefing:'briefingView',fleet:'fleetView',history:'historyView',airports:'airportsView',settings:'settingsView'};$(map[name]||'finderView').classList.add('active-view');document.querySelectorAll('.side-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('sidebar').classList.remove('open');if(name==='settings')renderSettingsSummary();window.scrollTo({top:0,behavior:'smooth'});}
function openSimbrief(r){
  // Only read the scheduling form while its dialog is open; otherwise stale values from a previous route leak in.
  const form=$('routeDialog').open?id=>$(id)?.value:()=>undefined;
  const departureMs=Number(r.departureMs)||parseUtc(form('departureUtc')||defaultUtcInput());
  const duration=Number(r.durationMinutes)||
    Number(form('durationHours')??durationHours(r))*60+
    Number(form('durationMinutes')??durationMinutes(r));
  const flight=normalizeFlight((Number(r.departureMs)?r.flightNumber:form('flightNumberInput'))||r.flightNumber||'');
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
// Typical cruise speeds (knots) used for block-time estimates.
const CRUISE_KTS={A20N:450,A320:450,A21N:450,B738:450,B38M:450,A333:470,B788:485,B789:485,B78X:485,A359:485,A35K:485,B77W:490,A388:490};
function routeCoordinates(r){
  const a=r.customCoordinates?.from||state.airports[r.fromIata]||findWorldAirport(r.fromIcao);
  const b=r.customCoordinates?.to||state.airports[r.toIata]||findWorldAirport(r.toIcao);
  return a&&b&&Number.isFinite(+a.lat)&&Number.isFinite(+b.lat)?[a,b]:null;
}
function routeDistanceNm(r){
  const c=routeCoordinates(r);if(!c)return 0;const [a,b]=c;
  const p1=toRad(a.lat),p2=toRad(b.lat),dp=p2-p1,dl=toRad(b.lon-a.lon);
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 3440.065*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function durationTotal(r){
  const nm=routeDistanceNm(r);
  if(!nm)return 120;
  // airway routing adds ~5%; ~40 min covers taxi, climb, approach and landing
  const minutes=nm*1.05/(CRUISE_KTS[r.aircraftIcao]||470)*60+40;
  return Math.max(45,Math.round(minutes/5)*5);
}
function findWorldAirport(icao){const q=normalizeCode(icao);return q?state.worldAirports.find(a=>a.ident===q):null}
function durationHours(r){return Math.floor(durationTotal(r)/60)}function durationMinutes(r){return durationTotal(r)%60}
function hourOptions(selected){let h='';for(let i=0;i<=20;i++)h+=`<option value="${i}" ${i===selected?'selected':''}>${i} hour${i===1?'':'s'}</option>`;return h}
function minuteOptions(selected){return Array.from({length:12},(_,i)=>i*5).map(v=>`<option value="${v}" ${v===selected?'selected':''}>${String(v).padStart(2,'0')} min</option>`).join('')}
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

function getSettings(){const d={theme:'dark',accent:'green',compact:false,timeZone:'utc',departureOffset:60,showSeconds:true,routeMode:'airline',autoSimbrief:false,rememberAirline:true,lastAirline:'Saudia',simbriefUserId:'',simbriefProxy:'',useSimbriefMap:true,mapStyle:'street'};try{return{...d,...JSON.parse(localStorage.getItem('aeroroster-settings')||'{}')}}catch{return d}}
function saveSettings(next,show=true){localStorage.setItem('aeroroster-settings',JSON.stringify({...getSettings(),...next}));applyStoredSettings();renderSettingsSummary();if(show&&$('settingsSaveStatus')){$('settingsSaveStatus').textContent='✓ Changes confirmed and applied successfully.';$('settingsSaveStatus').classList.add('visible');setTimeout(()=>$('settingsSaveStatus')?.classList.remove('visible'),2800)}}
function readSettingsForm(){return{theme:$('settingTheme').value,accent:$('settingAccent').value,compact:$('settingCompact').checked,timeZone:$('settingTimeZone').value,departureOffset:+$('settingDepartureOffset').value,showSeconds:$('settingSeconds').checked,routeMode:$('settingRouteMode').value,autoSimbrief:$('settingAutoSimbrief').checked,rememberAirline:$('settingRememberAirline').checked,simbriefUserId:$('settingSimbriefUserId').value.trim(),simbriefProxy:$('settingSimbriefProxy').value.trim(),useSimbriefMap:$('settingUseSimbriefMap').checked,mapStyle:$('settingMapStyle')?.value||'street'}}
function applyStoredSettings(){const s=getSettings();document.body.classList.remove('theme-midnight','theme-light','accent-blue','accent-purple','accent-orange','compact-layout');if(s.theme==='midnight')document.body.classList.add('theme-midnight');if(s.theme==='light')document.body.classList.add('theme-light');if(s.accent!=='green')document.body.classList.add(`accent-${s.accent}`);if(s.compact)document.body.classList.add('compact-layout');const u=document.querySelector('.utc-chip');if(u)u.textContent=s.timeZone==='local'?'◷ LOCAL':'◷ UTC'}
function bindSettings(){const confirmSettings=()=>{
  const next=readSettingsForm();
  saveSettings(next,true);
  if(next.routeMode!==state.mode)setMode(next.routeMode);
};
$('saveSettingsButton').onclick=confirmSettings;
$('confirmSettingsBottom').onclick=confirmSettings;$('resetSettings').onclick=()=>{if(confirm('Reset all AeroRoster preferences?')){localStorage.removeItem('aeroroster-settings');applyStoredSettings();renderSettingsSummary()}};$('importSimbriefButton').onclick=()=>importLatestSimbrief(false);$('clearSimbriefButton').onclick=()=>{localStorage.removeItem('aeroroster-simbrief-ofp');renderSettingsSummary();setSimbriefStatus('Imported SimBrief plan cleared.','success')};$('clearActiveFlightSetting').onclick=()=>{if(confirm('Clear the active flight?')){localStorage.removeItem('aeroroster-active-flight');destroyActiveMap();state.renderedActiveId=null;renderActive();renderDashboard();renderSettingsSummary()}};$('clearLogbookSetting').onclick=()=>{if(confirm('Clear every flight in the logbook?')){localStorage.removeItem('aeroroster-logbook');renderLogbook();renderDashboard();renderSettingsSummary()}}}
function renderSettingsSummary(){const s=getSettings(),v={settingTheme:s.theme,settingAccent:s.accent,settingTimeZone:s.timeZone,settingDepartureOffset:String(s.departureOffset),settingRouteMode:s.routeMode,settingSimbriefUserId:s.simbriefUserId,settingSimbriefProxy:s.simbriefProxy,settingMapStyle:s.mapStyle||'street'};Object.entries(v).forEach(([id,val])=>{if($(id))$(id).value=val});if($('settingCompact'))$('settingCompact').checked=!!s.compact;if($('settingSeconds'))$('settingSeconds').checked=!!s.showSeconds;if($('settingAutoSimbrief'))$('settingAutoSimbrief').checked=!!s.autoSimbrief;if($('settingRememberAirline'))$('settingRememberAirline').checked=!!s.rememberAirline;if($('settingUseSimbriefMap'))$('settingUseSimbriefMap').checked=!!s.useSimbriefMap;if($('settingsFlightCount'))$('settingsFlightCount').textContent=getLog().length;if($('settingsActiveStatus'))$('settingsActiveStatus').textContent=getActive()?'Scheduled':'None';const ofp=getImportedSimbrief();setSimbriefStatus(ofp?`${ofp.flightNumber||'Flight'} · ${ofp.origin} → ${ofp.destination} · ${ofp.waypoints.length} map points`:'No SimBrief plan has been imported.',ofp?'success':'')}
async function importLatestSimbrief(silent=false){const d=readSettingsForm();if(!d.simbriefUserId){setSimbriefStatus('Enter your SimBrief Pilot ID first.','error');if(!silent)switchView('settings');return null}setSimbriefStatus('Importing the latest SimBrief OFP…','loading');try{const direct=`https://www.simbrief.com/api/xml.fetcher.php?userid=${encodeURIComponent(d.simbriefUserId)}&json=1`,url=d.simbriefProxy?buildProxyUrl(d.simbriefProxy,direct):direct,res=await fetch(url,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error(`SimBrief returned HTTP ${res.status}.`);const parsed=parseSimbriefOfp(await res.json());if(!parsed.origin||!parsed.destination)throw new Error('OFP did not contain origin and destination.');localStorage.setItem('aeroroster-simbrief-ofp',JSON.stringify(parsed));saveSettings(d,false);renderSettingsSummary();setSimbriefStatus(`Imported ${parsed.flightNumber||'flight'} ${parsed.origin} → ${parsed.destination} with ${parsed.waypoints.length} map points.`,'success');return parsed}catch(e){console.error(e);setSimbriefStatus(`Import failed: ${e.message} Direct browser requests may be blocked by CORS; add a compatible proxy URL if necessary.`,'error');return null}}
function buildProxyUrl(p,u){return p.includes('{url}')?p.replace('{url}',encodeURIComponent(u)):`${p}${p.includes('?')?'&':'?'}url=${encodeURIComponent(u)}`}
function parseSimbriefOfp(raw){
  const general=raw.general||{};
  const origin=raw.origin||{};
  const destination=raw.destination||{};
  const aircraft=raw.aircraft||{};
  const times=raw.times||{};

  const fixes=Array.isArray(raw.navlog?.fix)
    ? raw.navlog.fix
    : Array.isArray(raw.navlog)
      ? raw.navlog
      : [];

  const waypoints=fixes.map(fix=>({
    ident:String(fix.ident||fix.name||fix.fix||'').trim().toUpperCase(),
    lat:Number(fix.pos_lat??fix.latitude??fix.lat),
    lon:Number(fix.pos_long??fix.longitude??fix.lon),
    altitude:Number(fix.altitude_feet??fix.altitude??fix.altitude_ft??0),
    type:String(fix.type||fix.stage||fix.via_airway||'').trim().toUpperCase()
  })).filter(validMapPoint);

  const originCode=String(origin.icao_code||origin.icao||general.orig_icao||'').toUpperCase();
  const destinationCode=String(destination.icao_code||destination.icao||general.dest_icao||'').toUpperCase();
  const originAirport=findAirportByIcao(originCode);
  const destinationAirport=findAirportByIcao(destinationCode);

  if(waypoints.length===0&&originAirport&&destinationAirport){
    waypoints.push(
      {ident:originCode,lat:originAirport.lat,lon:originAirport.lon,altitude:0,type:'AIRPORT'},
      {ident:destinationCode,lat:destinationAirport.lat,lon:destinationAirport.lon,altitude:0,type:'AIRPORT'}
    );
  }else{
    if(originAirport&&!waypoints.some(point=>point.ident===originCode)){
      waypoints.unshift({ident:originCode,lat:originAirport.lat,lon:originAirport.lon,altitude:0,type:'AIRPORT'});
    }
    if(destinationAirport&&!waypoints.some(point=>point.ident===destinationCode)){
      waypoints.push({ident:destinationCode,lat:destinationAirport.lat,lon:destinationAirport.lon,altitude:0,type:'AIRPORT'});
    }
  }

  const isToc=point=>{
    const value=`${point.ident} ${point.type}`.toUpperCase();
    return value.includes('TOC')||value.includes('TOP OF CLIMB');
  };
  const isTod=point=>{
    const value=`${point.ident} ${point.type}`.toUpperCase();
    return value.includes('TOD')||value.includes('TOP OF DESCENT');
  };

  let tocIndex=waypoints.findIndex(isToc);
  let todIndex=waypoints.findIndex(isTod);

  // Some OFPs omit literal TOC/TOD labels. Use planned altitude profile as a fallback.
  const cruiseAltitude=Number(general.initial_altitude||general.cruise_altitude||0);
  if(tocIndex<0&&cruiseAltitude>0){
    tocIndex=waypoints.findIndex(point=>point.altitude>=cruiseAltitude-1000);
  }
  if(todIndex<0&&cruiseAltitude>0){
    for(let index=Math.max(0,tocIndex+1);index<waypoints.length;index++){
      const current=waypoints[index];
      const previous=waypoints[Math.max(0,index-1)];
      if(previous.altitude>=cruiseAltitude-1000&&current.altitude<cruiseAltitude-1500){
        todIndex=index;
        break;
      }
    }
  }

  return{
    importedAt:new Date().toISOString(),
    origin:originCode,
    destination:destinationCode,
    flightNumber:String(general.flight_number||general.flight_num||'').toUpperCase(),
    airline:String(general.icao_airline||general.airline||'').toUpperCase(),
    aircraft:String(aircraft.icaocode||aircraft.icao_code||general.aircraft||'').toUpperCase(),
    route:String(general.route||raw.atc?.route||''),
    cruiseAltitude,
    distanceNm:Number(general.route_distance||general.air_distance||0),
    scheduledDeparture:Number(times.sched_out||times.est_out||0)*1000||null,
    scheduledArrival:Number(times.sched_in||times.est_in||0)*1000||null,
    tocIndex,
    todIndex,
    waypoints
  };
}
function findAirportByIcao(i){return Object.values(state.airports).find(a=>normalizeCode(a.icao)===normalizeCode(i))||findWorldAirport(i)}function normalizeCode(v){return String(v||'').trim().toUpperCase()}function getImportedSimbrief(){try{return JSON.parse(localStorage.getItem('aeroroster-simbrief-ofp')||'null')}catch{return null}}function setSimbriefStatus(m,t){const e=$('simbriefImportStatus');if(e){e.textContent=m;e.className=`simbrief-status ${t||''}`.trim()}}


function startUtcClock(){
  const update=()=>{
    const now=new Date();
    const value=`UTC ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}`;
    if($('liveUtcClock'))$('liveUtcClock').textContent=value;
  };
  update();
  setInterval(update,1000);
}

async function hashPin(pin){
  if(window.crypto?.subtle){
    const data=new TextEncoder().encode(pin);
    const digest=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  return btoa(pin);
}

function getLocalProfile(){
  try{
    return JSON.parse(localStorage.getItem('aeroroster-local-profile')||'null');
  }catch{
    return null;
  }
}

function showLoginScreen(){
  const profile=getLocalProfile();
  $('loginScreen').classList.remove('hidden');
  $('appShell').classList.add('app-locked');

  if(profile){
    $('loginTitle').textContent=`Welcome back, ${profile.name}`;
    $('loginDescription').textContent='Enter your local PIN to unlock AeroRoster.';
    $('loginNameField').classList.add('hidden');
    $('loginButton').textContent='Unlock AeroRoster';
    $('resetProfileButton').classList.remove('hidden');
    $('profileName').textContent=profile.name;
  }else{
    $('loginTitle').textContent='Welcome aboard';
    $('loginDescription').textContent='Create a local profile for this browser. Your PIN stays on this device.';
    $('loginNameField').classList.remove('hidden');
    $('loginButton').textContent='Create profile';
    $('resetProfileButton').classList.add('hidden');
  }

  $('loginPin').value='';
  $('loginStatus').textContent='';
}

function hideLoginScreen(){
  $('loginScreen').classList.add('hidden');
  $('appShell').classList.remove('app-locked');
}

function initLogin(){
  const profile=getLocalProfile();
  if(profile)$('profileName').textContent=profile.name;

  const unlocked=sessionStorage.getItem('aeroroster-unlocked')==='1';
  if(unlocked&&profile){
    hideLoginScreen();
  }else{
    showLoginScreen();
  }

  $('loginButton').onclick=async()=>{
    const current=getLocalProfile();
    const pin=$('loginPin').value.trim();

    if(!/^\d{4,8}$/.test(pin)){
      $('loginStatus').textContent='Use a 4–8 digit PIN.';
      return;
    }

    if(!current){
      const name=$('loginName').value.trim()||'Pilot';
      const pinHash=await hashPin(pin);
      localStorage.setItem('aeroroster-local-profile',JSON.stringify({name,pinHash}));
      sessionStorage.setItem('aeroroster-unlocked','1');
      $('profileName').textContent=name;
      hideLoginScreen();
      return;
    }

    const pinHash=await hashPin(pin);
    if(pinHash!==current.pinHash){
      $('loginStatus').textContent='Incorrect PIN.';
      return;
    }

    sessionStorage.setItem('aeroroster-unlocked','1');
    hideLoginScreen();
  };

  $('logoutButton').onclick=()=>{
    sessionStorage.removeItem('aeroroster-unlocked');
    showLoginScreen();
  };

  $('resetProfileButton').onclick=()=>{
    if(confirm('Reset the local AeroRoster profile and PIN on this browser?')){
      localStorage.removeItem('aeroroster-local-profile');
      sessionStorage.removeItem('aeroroster-unlocked');
      $('loginName').value='';
      showLoginScreen();
    }
  };

  $('loginPin').addEventListener('keydown',event=>{
    if(event.key==='Enter')$('loginButton').click();
  });
}


init().catch(error=>{console.error(error);document.body.innerHTML='<p style="padding:30px">The route data could not be loaded. Run the site through GitHub Pages or a local server.</p>'});
