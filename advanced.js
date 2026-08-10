// AeroRoster Advanced Operations Extension
const advancedState={historyMap:null,airportMap:null};
const ADVANCED_FLEET={
  'Saudia':{'B77W':['HZ-AK11','HZ-AK17','HZ-AK28'],'B789':['HZ-ARB','HZ-ARC','HZ-ARD'],'A333':['HZ-AQ11','HZ-AQ15'],'A320':['HZ-ASA','HZ-ASB']},
  'Turkish Airlines':{'B77W':['TC-JJI','TC-JJK','TC-JJV'],'B789':['TC-LLA','TC-LLB','TC-LLC'],'A359':['TC-LGA','TC-LGB'],'A21N':['TC-LSA','TC-LSB']},
  'Singapore Airlines':{'A359':['9V-SMA','9V-SMF','9V-SMH'],'A388':['9V-SKA','9V-SKM'],'B77W':['9V-SWA','9V-SWM'],'B78X':['9V-SCA','9V-SCB']},
  'Air India':{'A359':['VT-JRA','VT-JRB','VT-JRF'],'B77W':['VT-ALJ','VT-ALK'],'B788':['VT-ANI','VT-ANJ'],'A20N':['VT-EXA','VT-EXB']},
  'Qatar Airways':{'A35K':['A7-ANA','A7-ANB','A7-ANC'],'A359':['A7-ALA','A7-ALB'],'B77W':['A7-BAA','A7-BAB'],'B789':['A7-BHA','A7-BHB']}
};
function advGetProfile(){try{return JSON.parse(localStorage.getItem('aeroroster-local-profile')||'null')}catch{return null}}
function advFavorites(){try{return JSON.parse(localStorage.getItem('aeroroster-favorites')||'[]')}catch{return[]}}
function advSaveFavorites(v){localStorage.setItem('aeroroster-favorites',JSON.stringify(v))}
function advFleetCustom(){try{return JSON.parse(localStorage.getItem('aeroroster-custom-fleet')||'{}')}catch{return{}}}
function advSaveFleetCustom(v){localStorage.setItem('aeroroster-custom-fleet',JSON.stringify(v))}
function advRouteId(r){return `${r.airline}|${r.aircraftIcao}|${r.fromIcao}|${r.toIcao}`}
function advCallsign(r){const n=String(r.flightNumber||'').replace(/\D/g,'');return n?`${r.airlineIcao}${n}`:'Not set'}
function advRegistrationOptions(r){const built=ADVANCED_FLEET[r.airline]?.[r.aircraftIcao]||[];const custom=advFleetCustom()[r.airline]?.[r.aircraftIcao]||[];return [...new Set([...built,...custom])]}
function advImported(){return getImportedSimbrief?.()||null}
function advFormatDurationMinutes(min){const h=Math.floor(min/60),m=Math.round(min%60);return `${h}h ${String(m).padStart(2,'0')}m`}
function advAirportByCode(code){const q=String(code||'').toUpperCase();return state.worldAirports.find(a=>a.ident===q||a.iata===q)||Object.values(state.airports).find(a=>a.icao===q||a.iata===q)}
function advDistanceNm(a,b){if(!a||!b)return 0;const R=3440.065,rad=x=>x*Math.PI/180;const dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon);const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}

function renderOpsDashboard(){
  const el=$('opsDashboard'); if(!el)return;
  const profile=advGetProfile();const log=getLog();const active=getActive();const fav=advFavorites();
  const hours=log.reduce((sum,f)=>sum+(Number(f.durationMinutes)||0),0)/60;
  const recent=log.slice(0,4);
  el.innerHTML=`<div class="advanced-page-head"><div><span>OPERATIONS CENTER</span><h2>Welcome back, ${escapeHtml(profile?.name||'Pilot')}</h2><p>Plan the next flight, resume an active sector, or review your operation.</p></div><div class="dashboard-utc">${$('liveUtcClock')?.textContent||'UTC'}</div></div>
  <div class="adv-metrics"><div><span>Flights logged</span><strong>${log.length}</strong></div><div><span>Sim hours</span><strong>${hours.toFixed(1)}</strong></div><div><span>Airports visited</span><strong>${new Set(log.flatMap(f=>[f.fromIata,f.toIata])).size}</strong></div><div><span>Favorites</span><strong>${fav.length}</strong></div></div>
  <div class="dashboard-grid">
   <section class="adv-card"><div class="adv-card-head"><div><span>CURRENT OPERATION</span><h3>${active?`${active.fromIata} → ${active.toIata}`:'No active flight'}</h3></div>${active?'<span class="viz-badge">ACTIVE</span>':''}</div>${active?`<p>${escapeHtml(active.airline)} · ${escapeHtml(active.flightNumber||advCallsign(active))} · ${escapeHtml(active.aircraftIcao)}</p><button id="resumeFlightAdv" class="adv-primary">Open active flight</button>`:'<p>Choose an airline and route when you are ready to fly.</p><button id="planFlightAdv" class="adv-primary">Plan new flight</button>'}</section>
   <section class="adv-card"><div class="adv-card-head"><div><span>RANDOM FLIGHT GENERATOR</span><h3>Not sure what to fly?</h3></div></div><div class="random-grid"><select id="randomAirlineAdv"><option value="">Any airline</option>${[...new Set(state.routes.map(r=>r.airline))].map(a=>`<option>${escapeHtml(a)}</option>`).join('')}</select><select id="randomDurationAdv"><option value="0">Any duration</option><option value="120">Under 2 hours</option><option value="240">2–4 hours</option><option value="480">4–8 hours</option><option value="999">8+ hours</option></select></div><button id="randomFlightAdv" class="adv-primary">Generate flight</button><div id="randomResultAdv" class="random-result"></div></section>
  </div>
  <section class="adv-card recent-card"><div class="adv-card-head"><div><span>RECENT ACTIVITY</span><h3>Last flights</h3></div></div>${recent.length?recent.map(f=>`<div class="recent-flight"><strong>${f.fromIata} → ${f.toIata}</strong><span>${escapeHtml(f.airline)} · ${escapeHtml(f.flightNumber||f.airlineCode)}</span><small>${escapeHtml(f.arrivalPerformance?.label||'Logged flight')}</small></div>`).join(''):'<p>No flights logged yet.</p>'}</section>`;
  $('planFlightAdv')?.addEventListener('click',()=>switchView('finder'));$('resumeFlightAdv')?.addEventListener('click',()=>switchView('active'));
  $('randomFlightAdv')?.addEventListener('click',()=>{const airline=$('randomAirlineAdv').value,dur=Number($('randomDurationAdv').value);let pool=state.routes.filter(r=>!airline||r.airline===airline);if(dur===120)pool=pool.filter(r=>durationTotal(r)<=120);else if(dur===240)pool=pool.filter(r=>durationTotal(r)>120&&durationTotal(r)<=240);else if(dur===480)pool=pool.filter(r=>durationTotal(r)>240&&durationTotal(r)<=480);else if(dur===999)pool=pool.filter(r=>durationTotal(r)>480);if(!pool.length){$('randomResultAdv').textContent='No route matches those filters.';return}const r=pool[Math.floor(Math.random()*pool.length)];$('randomResultAdv').innerHTML=`<strong>${r.fromIata} → ${r.toIata}</strong><span>${escapeHtml(r.airline)} · ${escapeHtml(r.aircraftIcao)} · ${estimatedDuration(r)}</span><button id="useRandomAdv">Use this flight</button>`;$('useRandomAdv').onclick=()=>{setAirline(r.airline);switchView('finder');selectRoute(r);openRouteDialog(r)}});
}

function openBriefing(r=state.selected||getActive()){
  if(!r){switchView('finder');return}switchView('briefing');renderBriefing(r);
}
function renderBriefing(r){
 const el=$('briefingContent');if(!el)return;const ofp=advImported();const match=ofp&&normalizeCode(ofp.origin)===normalizeCode(r.fromIcao)&&normalizeCode(ofp.destination)===normalizeCode(r.toIcao);const regs=advRegistrationOptions(r);const favorites=advFavorites();const isFav=favorites.includes(advRouteId(r));const dep=advAirportByCode(r.fromIcao),arr=advAirportByCode(r.toIcao);const nm=match&&ofp.distanceNm?ofp.distanceNm:Math.round(advDistanceNm(dep,arr));
 el.innerHTML=`<div class="advanced-page-head"><div><span>FLIGHT BRIEFING</span><h2>${r.fromIata} → ${r.toIata}</h2><p>${escapeHtml(r.airline)} · ${escapeHtml(r.aircraft)}</p></div><button id="favoriteRouteAdv" class="favorite-button">${isFav?'★ Favorite':'☆ Add favorite'}</button></div>
 <div class="briefing-hero"><div><img src="${logoMap[r.airline]}" alt="${escapeHtml(r.airline)} logo"><div><span>${escapeHtml(r.flightNumber||'Flight number not set')}</span><strong>${escapeHtml(advCallsign(r))}</strong></div></div><div class="brief-route"><strong>${r.fromIata}</strong><span>──────── ✈ ────────</span><strong>${r.toIata}</strong></div></div>
 <div class="briefing-grid">
 <section class="adv-card"><span>FLIGHT</span><dl><dt>Airline</dt><dd>${escapeHtml(r.airline)}</dd><dt>Flight number</dt><dd>${escapeHtml(r.flightNumber||'Editable during scheduling')}</dd><dt>ATC callsign</dt><dd>${escapeHtml(advCallsign(r))}</dd><dt>Aircraft</dt><dd>${escapeHtml(r.aircraftIcao)} · ${escapeHtml(r.aircraft)}</dd><dt>Registration</dt><dd><select id="registrationAdv">${regs.length?regs.map(x=>`<option>${escapeHtml(x)}</option>`).join(''):'<option value="">Not assigned</option>'}</select></dd></dl></section>
 <section class="adv-card"><span>DISPATCH</span><dl><dt>Distance</dt><dd>${nm?`${Math.round(nm)} NM`:'—'}</dd><dt>Est. block time</dt><dd>${estimatedDuration(r)}</dd><dt>Cruise altitude</dt><dd>${match&&ofp.cruiseAltitude?`FL${Math.round(ofp.cruiseAltitude/100)}`:'From SimBrief after import'}</dd><dt>Route</dt><dd class="route-string">${escapeHtml(match&&ofp.route?ofp.route:'Generate/import SimBrief OFP')}</dd></dl></section>
 <section class="adv-card"><span>SIMBRIEF</span>${match?`<div class="simbrief-ok">✓ Matching OFP imported</div><dl><dt>Aircraft</dt><dd>${escapeHtml(ofp.aircraft||'—')}</dd><dt>Waypoints</dt><dd>${ofp.waypoints?.length||0}</dd><dt>TOC / TOD</dt><dd>${ofp.tocIndex>=0?'Available':'—'} / ${ofp.todIndex>=0?'Available':'—'}</dd></dl>`:'<p>No matching SimBrief plan imported for this route.</p><button id="importBriefingOFP" class="adv-secondary">Import latest OFP</button>'}</section>
 </div>
 <div class="briefing-actions"><button id="scheduleFromBriefing" class="adv-primary">Schedule this flight</button><button id="openSimbriefBriefing" class="adv-secondary">Open SimBrief</button><button id="backFinderBriefing" class="adv-secondary">Back to route finder</button></div>`;
 $('favoriteRouteAdv').onclick=()=>{let f=advFavorites(),id=advRouteId(r);f=f.includes(id)?f.filter(x=>x!==id):[...f,id];advSaveFavorites(f);renderBriefing(r)};
 $('scheduleFromBriefing').onclick=()=>{switchView('finder');selectRoute(r);openRouteDialog(r)};$('openSimbriefBriefing').onclick=()=>openSimbrief(r);$('backFinderBriefing').onclick=()=>switchView('finder');$('importBriefingOFP')?.addEventListener('click',async()=>{await importLatestSimbrief(false);renderBriefing(r)});
}

function renderFleet(){const el=$('fleetContent');if(!el)return;const airline=$('airlineSelect')?.value||'Saudia';const types=[...new Set(state.routes.filter(r=>r.airline===airline).map(r=>r.aircraftIcao))];const custom=advFleetCustom();el.innerHTML=`<div class="advanced-page-head"><div><span>PERSONAL FLEET</span><h2>${escapeHtml(airline)} fleet</h2><p>Choose realistic registrations or add your own simulator aircraft.</p></div></div><div class="fleet-grid">${types.map(t=>`<section class="adv-card fleet-card"><span>${escapeHtml(t)}</span><h3>${escapeHtml(aircraftName(airline,t))}</h3><div class="registration-list">${advRegistrationOptions({airline,aircraftIcao:t}).map(reg=>`<div><strong>${escapeHtml(reg)}</strong><span>${getLog().filter(f=>f.registration===reg).length} flights</span></div>`).join('')||'<p>No registrations saved.</p>'}</div><div class="fleet-add"><input id="reg-${t}" placeholder="Add registration"><button data-type="${t}">Add</button></div></section>`).join('')}</div>`;el.querySelectorAll('.fleet-add button').forEach(b=>b.onclick=()=>{const type=b.dataset.type,input=$(`reg-${type}`),reg=input.value.trim().toUpperCase();if(!reg)return;custom[airline]=custom[airline]||{};custom[airline][type]=custom[airline][type]||[];if(!custom[airline][type].includes(reg))custom[airline][type].push(reg);advSaveFleetCustom(custom);renderFleet()})}

function injectActiveTimeline(){const card=document.querySelector('#activeFlightContainer .active-flight-card');if(!card||card.querySelector('.milestone-panel'))return;const f=getActive();if(!f)return;const milestones=f.milestones||{};const phases=['Takeoff','Reached cruise','Begin descent','Landed','Arrived at gate'];const panel=document.createElement('section');panel.className='milestone-panel';panel.innerHTML=`<div class="adv-card-head"><div><span>FLIGHT TIMELINE</span><h3>Operational milestones</h3></div></div><div class="timeline-strip">${phases.map(p=>`<div class="timeline-step ${milestones[p]?'done':''}"><span>${milestones[p]?'✓':'○'}</span><strong>${p}</strong><small>${milestones[p]?formatUtc(milestones[p]):'Pending'}</small></div>`).join('')}</div><div class="milestone-buttons">${phases.map(p=>`<button data-phase="${p}" ${milestones[p]?'disabled':''}>${p}</button>`).join('')}</div>`;const actions=card.querySelector('.dialog-actions');card.insertBefore(panel,actions);panel.querySelectorAll('button').forEach(b=>b.onclick=()=>{const cur=getActive();cur.milestones=cur.milestones||{};cur.milestones[b.dataset.phase]=Date.now();if(b.dataset.phase==='Arrived at gate'&&!cur.actualArrivalMs)cur.actualArrivalMs=Date.now();localStorage.setItem('aeroroster-active-flight',JSON.stringify(cur));state.renderedActiveId=null;destroyActiveMap();renderActive();setTimeout(injectActiveTimeline,50)})}

function renderArrivalReport(f){if(!f)return'';const sd=Number(f.scheduledDepartureMs||f.departureMs),sa=Number(f.scheduledEtaMs||f.etaMs);const dep=getSchedulePerformance(f.actualDepartureMs,sd,'Departed').label,arr=getSchedulePerformance(f.actualArrivalMs,sa,'Arrived').label;const block=f.actualDepartureMs&&f.actualArrivalMs?advFormatDurationMinutes((f.actualArrivalMs-f.actualDepartureMs)/60000):'—';return `<div class="arrival-report"><div><span>ARRIVAL REPORT</span><h3>${f.fromIata} → ${f.toIata}</h3></div><div class="report-grid"><div><span>Flight</span><strong>${escapeHtml(f.flightNumber||advCallsign(f))}</strong></div><div><span>Departure</span><strong>${escapeHtml(dep)}</strong></div><div><span>Arrival</span><strong>${escapeHtml(arr)}</strong></div><div><span>Block time</span><strong>${block}</strong></div></div></div>`}

function enhanceLogbook(){const view=$('logbookView');if(!view||view.querySelector('.logbook-tools'))return;const tools=document.createElement('div');tools.className='logbook-tools';tools.innerHTML=`<input id="logSearchAdv" placeholder="Search route, airline or flight"><select id="logAirlineAdv"><option value="">All airlines</option>${[...new Set(getLog().map(f=>f.airline))].map(a=>`<option>${escapeHtml(a)}</option>`).join('')}</select><button id="exportLogAdv">Export JSON</button><button id="exportCsvAdv">Export CSV</button>`;view.insertBefore(tools,view.querySelector('.metrics')||view.firstChild.nextSibling);function filter(){const q=$('logSearchAdv').value.toLowerCase(),a=$('logAirlineAdv').value;document.querySelectorAll('#logbookList .log-row').forEach((row,i)=>{const f=getLog()[i];if(!f)return;row.style.display=(!a||f.airline===a)&&(`${f.fromIata} ${f.toIata} ${f.airline} ${f.flightNumber}`.toLowerCase().includes(q))?'':'none'})}$('logSearchAdv').oninput=filter;$('logAirlineAdv').onchange=filter;$('exportLogAdv').onclick=()=>advDownload('aeroroster-logbook.json',JSON.stringify(getLog(),null,2),'application/json');$('exportCsvAdv').onclick=()=>{const rows=[['date','airline','flight','aircraft','from','to','actual_departure','actual_arrival','departure_performance','arrival_performance'],...getLog().map(f=>[f.completedAt,f.airline,f.flightNumber||'',f.aircraftIcao,f.fromIata,f.toIata,f.actualDepartureMs?new Date(f.actualDepartureMs).toISOString():'',f.actualArrivalMs?new Date(f.actualArrivalMs).toISOString():'',f.departurePerformance?.label||'',f.arrivalPerformance?.label||''])];advDownload('aeroroster-logbook.csv',rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n'),'text/csv')}}
function advDownload(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}

function renderAdvancedStatistics(){const el=$('advancedStatistics');if(!el)return;const log=getLog();const totalMin=log.reduce((s,f)=>s+(Number(f.durationMinutes)||0),0);const airports=new Set(log.flatMap(f=>[f.fromIata,f.toIata]));const countries=new Set(log.flatMap(f=>[advAirportByCode(f.fromIcao)?.country,advAirportByCode(f.toIcao)?.country]).filter(Boolean));const longest=[...log].sort((a,b)=>(b.durationMinutes||0)-(a.durationMinutes||0))[0];const arrivals=log.filter(f=>f.actualArrivalMs);const ontime=arrivals.filter(f=>Math.abs((f.actualArrivalMs-Number(f.scheduledEtaMs||f.etaMs))/60000)<=15).length;const favAir=advMostCommon(log.map(f=>f.airline));const favAc=advMostCommon(log.map(f=>f.aircraftIcao));const badges=[['First Flight',log.length>=1],['Frequent Flyer',log.length>=10],['Globe Trotter',countries.size>=10],['Century Club',totalMin>=6000],['On-Time Captain',arrivals.length>=5&&ontime/arrivals.length>=.8]];el.innerHTML=`<div class="advanced-page-head"><div><span>CAREER STATISTICS</span><h2>Your AeroRoster record</h2><p>Achievements and operational performance.</p></div></div><div class="adv-metrics"><div><span>Flights</span><strong>${log.length}</strong></div><div><span>Hours</span><strong>${(totalMin/60).toFixed(1)}</strong></div><div><span>Airports</span><strong>${airports.size}</strong></div><div><span>Countries</span><strong>${countries.size}</strong></div></div><div class="dashboard-grid"><section class="adv-card"><span>HIGHLIGHTS</span><dl><dt>Favorite airline</dt><dd>${escapeHtml(favAir||'—')}</dd><dt>Favorite aircraft</dt><dd>${escapeHtml(favAc||'—')}</dd><dt>Longest flight</dt><dd>${longest?`${longest.fromIata} → ${longest.toIata} · ${advFormatDurationMinutes(longest.durationMinutes||0)}`:'—'}</dd><dt>On-time arrivals</dt><dd>${arrivals.length?`${Math.round(ontime/arrivals.length*100)}%`:'—'}</dd></dl></section><section class="adv-card"><span>ACHIEVEMENTS</span><div class="achievement-grid">${badges.map(([n,ok])=>`<div class="achievement ${ok?'unlocked':''}"><span>${ok?'★':'☆'}</span><strong>${n}</strong></div>`).join('')}</div></section></div>`}
function advMostCommon(arr){const c={};arr.filter(Boolean).forEach(x=>c[x]=(c[x]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0]||''}

function renderHistoryMap(){const el=$('historyMap');if(!el||typeof L==='undefined')return;if(advancedState.historyMap){advancedState.historyMap.remove();advancedState.historyMap=null}const log=getLog();$('historyMapEmpty')?.classList.toggle('hidden',log.length>0);if(!log.length)return;const map=L.map(el).setView([25,15],2);advancedState.historyMap=map;L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map);const bounds=[];log.forEach(f=>{const a=advAirportByCode(f.fromIcao),b=advAirportByCode(f.toIcao);if(!a||!b)return;const line=L.polyline([[a.lat,a.lon],[b.lat,b.lon]],{weight:2,opacity:.55,color:getComputedStyle(document.body).getPropertyValue('--accent').trim()||'#16db73'}).addTo(map);line.bindPopup(`<b>${escapeHtml(f.flightNumber||f.airline)}</b><br>${f.fromIata} → ${f.toIata}`);bounds.push([a.lat,a.lon],[b.lat,b.lon])});if(bounds.length)map.fitBounds(bounds,{padding:[30,30]});setTimeout(()=>map.invalidateSize(),100)}

function renderAirportExplorer(){const el=$('airportExplorer');if(!el)return;el.innerHTML=`<div class="advanced-page-head"><div><span>AIRPORT EXPLORER</span><h2>Airport information & weather</h2><p>Search any airport in the worldwide database.</p></div></div><div class="airport-explorer-search"><input id="airportSearchAdv" placeholder="Search by city, airport, IATA or ICAO"><div id="airportResultsAdv"></div></div><div id="airportDetailAdv"></div>`;$('airportSearchAdv').oninput=()=>{const q=$('airportSearchAdv').value.trim().toLowerCase();if(q.length<2){$('airportResultsAdv').innerHTML='';return}const matches=state.worldAirports.filter(a=>`${a.ident} ${a.iata} ${a.name} ${a.city}`.toLowerCase().includes(q)).slice(0,12);$('airportResultsAdv').innerHTML=matches.map((a,i)=>`<button data-i="${i}"><strong>${escapeHtml(a.iata||a.ident)}</strong><span>${escapeHtml(a.name)} · ${escapeHtml(a.city||a.country)}</span></button>`).join('');$('airportResultsAdv').querySelectorAll('button').forEach(b=>b.onclick=()=>showAirportDetail(matches[Number(b.dataset.i)]))}}
async function showAirportDetail(a){
  const el=$('airportDetailAdv');

  el.innerHTML=`<div class="airport-detail-grid">
    <section class="adv-card">
      <span>AIRPORT</span>
      <h3>${escapeHtml(a.name)}</h3>
      <dl>
        <dt>IATA</dt><dd>${escapeHtml(a.iata||'—')}</dd>
        <dt>ICAO / Ident</dt><dd>${escapeHtml(a.ident)}</dd>
        <dt>City</dt><dd>${escapeHtml(a.city||'—')}</dd>
        <dt>Country</dt><dd>${escapeHtml(a.country||'—')}</dd>
        <dt>Coordinates</dt><dd>${Number(a.lat).toFixed(4)}, ${Number(a.lon).toFixed(4)}</dd>
      </dl>
    </section>

    <section class="adv-card weather-card-advanced">
      <span>WEATHER</span>
      <div id="weatherAdv"><div class="weather-loading">Loading airport weather…</div></div>
    </section>
  </div>`;

  const weather=$('weatherAdv');

  try{
    const params=new URLSearchParams({
      latitude:String(a.lat),
      longitude:String(a.lon),
      current:[
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'cloud_cover',
        'pressure_msl',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m'
      ].join(','),
      hourly:[
        'visibility',
        'precipitation_probability'
      ].join(','),
      wind_speed_unit:'kn',
      timezone:'UTC',
      forecast_hours:'3'
    });

    const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if(!response.ok)throw new Error(`Weather service returned HTTP ${response.status}`);

    const data=await response.json();
    const current=data.current||{};
    const units=data.current_units||{};
    const visibility=data.hourly?.visibility?.[0];
    const rainChance=data.hourly?.precipitation_probability?.[0];

    weather.innerHTML=`
      <div class="weather-current-grid">
        <div class="weather-main">
          <strong>${formatWeatherValue(current.temperature_2m,units.temperature_2m,'°C')}</strong>
          <span>${escapeHtml(describeWeatherCode(current.weather_code))}</span>
          <small>Modelled current conditions near ${escapeHtml(a.iata||a.ident)} · UTC</small>
        </div>

        <div class="weather-stat"><span>Wind</span><strong>${formatWeatherValue(current.wind_speed_10m,units.wind_speed_10m,'kt')} ${formatWindDirection(current.wind_direction_10m)}</strong></div>
        <div class="weather-stat"><span>Gusts</span><strong>${formatWeatherValue(current.wind_gusts_10m,units.wind_gusts_10m,'kt')}</strong></div>
        <div class="weather-stat"><span>Pressure</span><strong>${formatWeatherValue(current.pressure_msl,units.pressure_msl,'hPa')}</strong></div>
        <div class="weather-stat"><span>Humidity</span><strong>${formatWeatherValue(current.relative_humidity_2m,units.relative_humidity_2m,'%')}</strong></div>
        <div class="weather-stat"><span>Cloud cover</span><strong>${formatWeatherValue(current.cloud_cover,units.cloud_cover,'%')}</strong></div>
        <div class="weather-stat"><span>Visibility</span><strong>${visibility==null?'—':`${(Number(visibility)/1000).toFixed(1)} km`}</strong></div>
        <div class="weather-stat"><span>Precipitation</span><strong>${formatWeatherValue(current.precipitation,units.precipitation,'mm')}</strong></div>
        <div class="weather-stat"><span>Rain chance</span><strong>${rainChance==null?'—':`${Math.round(Number(rainChance))}%`}</strong></div>
      </div>

      <div class="aviation-weather-note">
        <strong>METAR / TAF</strong>
        <p>The official Aviation Weather Center blocks cross-origin browser requests. Because AeroRoster runs on GitHub Pages, its METAR/TAF API cannot be called directly from this page.</p>
        <a href="https://aviationweather.gov/data/metar/?id=${encodeURIComponent(a.ident)}" target="_blank" rel="noopener noreferrer">Open official aviation weather ↗</a>
      </div>`;
  }catch(error){
    console.error('Airport weather error:',error);
    weather.innerHTML=`
      <div class="weather-error">
        <strong>Weather temporarily unavailable</strong>
        <p>${escapeHtml(error.message||'The weather service could not be reached.')}</p>
        <a href="https://aviationweather.gov/data/metar/?id=${encodeURIComponent(a.ident)}" target="_blank" rel="noopener noreferrer">Open official METAR / TAF ↗</a>
      </div>`;
  }
}

function formatWeatherValue(value,unit,fallbackUnit){
  if(value===null||value===undefined||Number.isNaN(Number(value)))return'—';
  const number=Number(value);
  const formatted=Math.abs(number)>=100?Math.round(number):Math.round(number*10)/10;
  return `${formatted} ${unit||fallbackUnit||''}`.trim();
}

function formatWindDirection(degrees){
  const value=Number(degrees);
  if(!Number.isFinite(value))return'';
  const labels=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return labels[Math.round(value/22.5)%16];
}

function describeWeatherCode(code){
  const labels={
    0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
    45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',
    56:'Freezing drizzle',57:'Heavy freezing drizzle',
    61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',
    71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',
    80:'Light rain showers',81:'Rain showers',82:'Heavy rain showers',
    85:'Snow showers',86:'Heavy snow showers',
    95:'Thunderstorm',96:'Thunderstorm with hail',99:'Severe thunderstorm with hail'
  };
  return labels[Number(code)]||'Current conditions';
}

// Wrap existing navigation behavior with advanced renders.
const advOriginalSwitchView=switchView;switchView=function(name){advOriginalSwitchView(name);setTimeout(()=>{if(name==='dashboard')renderOpsDashboard();if(name==='briefing')renderBriefing(state.selected||getActive());if(name==='fleet')renderFleet();if(name==='history')renderHistoryMap();if(name==='airports')renderAirportExplorer();if(name==='statistics')renderAdvancedStatistics();if(name==='logbook')enhanceLogbook();if(name==='active')injectActiveTimeline()},30)};
const advOriginalOpenRouteDialog=openRouteDialog;openRouteDialog=function(r){advOriginalOpenRouteDialog(r);setTimeout(()=>{const actions=$('primaryDialogActions');if(actions&&!$('briefingDialogButton')){const b=document.createElement('button');b.id='briefingDialogButton';b.className='outline-button';b.textContent='Flight Briefing';b.onclick=()=>{$('routeDialog').close();openBriefing(r)};actions.prepend(b)}},0)};
const advOriginalRenderActive=renderActive;renderActive=function(){advOriginalRenderActive();setTimeout(injectActiveTimeline,0)};
const advOriginalFinishFlight=finishFlight;finishFlight=function(f){advOriginalFinishFlight(f);setTimeout(()=>{const latest=getLog()[0];if(latest){sessionStorage.setItem('aeroroster-last-report',JSON.stringify(latest));const log=$('logbookView');if(log){let box=log.querySelector('.last-arrival-report');if(!box){box=document.createElement('div');box.className='last-arrival-report';log.prepend(box)}box.innerHTML=renderArrivalReport(latest)}}},50)};

setTimeout(()=>{renderOpsDashboard();renderAdvancedStatistics();enhanceLogbook();document.querySelectorAll('.side-link[data-view="fleet"]')[0]?.addEventListener('click',renderFleet)},400);
