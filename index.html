<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="AeroRoster personal flight-simulator route planner">
  <title>AeroRoster — Route Finder</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand-block">
        <div class="brand-icon" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M7 35 29 30 42 8c2-3 7-2 7 2l-5 19 12 7c2 1 2 5-1 6l-14 2-9 13c-2 3-6 1-6-2l1-11-17 3c-4 1-6-5-3-7z" fill="currentColor"/></svg></div>
        <div><h1>AeroRoster</h1><p>Plan. Fly. Log.</p></div>
      </div>

      <div class="side-section">
        <span class="side-label">MAIN</span>
        <button class="side-link" data-view="dashboard"><span>⌂</span>Dashboard</button>
        <button class="side-link active" data-view="finder"><span>✈</span>Find Route</button>
        <button class="side-link" data-view="active"><span>➤</span>Active Flight</button>
        <button class="side-link" data-view="logbook"><span>▣</span>Logbook</button>
        <button class="side-link" data-view="statistics"><span>▥</span>Statistics</button>
        <button class="side-link" data-view="settings"><span>⚙</span>Settings</button>
      </div>

      <div class="side-section airline-menu">
        <span class="side-label">AIRLINES</span>
        <button class="airline-link active" data-airline="Saudia"><img src="assets/logos/saudia-uploaded.png" alt="Saudia logo"><span>Saudia</span></button>
        <button class="airline-link" data-airline="Singapore Airlines"><img src="assets/logos/singapore-airlines-real.svg" alt="Singapore Airlines logo"><span>Singapore Airlines</span></button>
        <button class="airline-link" data-airline="Turkish Airlines"><img src="assets/logos/turkish-airlines.svg" alt="Turkish Airlines logo"><span>Turkish Airlines</span></button>
        <button class="airline-link" data-airline="Air India"><img src="assets/logos/air-india.svg" alt="Air India logo"><span>Air India</span></button>
        <button class="airline-link" data-airline="Qatar Airways"><img src="assets/logos/qatar-airways.svg" alt="Qatar Airways logo"><span>Qatar Airways</span></button>
      </div>

      <div class="sidebar-summary">
        <div><span>Total Routes</span><strong id="sidebarRouteCount">0</strong></div>
        <div><span>Last Updated</span><strong>August 2026</strong></div>
      </div>
    </aside>

    <section class="main-area">
      <header class="topbar">
        <button id="menuButton" class="menu-button" aria-label="Open menu">☰</button>
        <div></div>
        <div class="top-actions"><span class="utc-chip">◷ UTC</span><div class="avatar">●</div></div>
      </header>

      <main>
        <section id="finderView" class="view active-view">
          <div class="finder-layout">
            <section class="finder-card">
              <div class="finder-hero">
                <div class="hero-copy"><h2>Route Finder</h2><p>Choose airline, aircraft and route to start your journey</p></div>
                <div class="aircraft-art" aria-hidden="true"><span class="wing left"></span><span class="fuselage">✈</span><span class="wing right"></span></div>
                <div class="route-mode-switch" role="group" aria-label="Route mode">
                  <button id="airlineModeButton" class="mode-button active" type="button">Airline routes</button>
                  <button id="customModeButton" class="mode-button" type="button">Custom route</button>
                </div>
                <div class="select-row">
                  <label class="select-card"><span class="step-number">1</span><span class="select-copy"><small>Airline</small><select id="airlineSelect"></select></span></label>
                  <label class="select-card"><span class="step-number">2</span><span class="select-copy"><small>Aircraft</small><select id="aircraftSelect"></select></span></label>
                  <label id="standardRouteField" class="select-card"><span class="step-number">3</span><span class="select-copy"><small>Route</small><select id="routeSelect"></select></span></label>
                </div>
                <div id="customRouteFields" class="custom-route-fields hidden">
                  <label class="custom-select-card"><small>Departure airport</small><select id="customFromSelect"></select></label>
                  <button id="swapCustomRoute" class="swap-route-button" type="button" aria-label="Swap departure and arrival">⇄</button>
                  <label class="custom-select-card"><small>Arrival airport</small><select id="customToSelect"></select></label>
                  <button id="useCustomRoute" class="primary-action custom-use-button" type="button">Use custom route</button>
                </div>
              </div>

              <div class="routes-panel">
                <div class="section-heading"><h3>Select Route</h3><label class="search-box"><input id="routeSearch" type="search" placeholder="Search by city, airport or flight number..."><span>⌕</span></label></div>
                <div class="route-table-wrap">
                  <table class="route-table">
                    <thead><tr><th>FROM</th><th></th><th>TO</th><th>FLIGHT NUMBER</th><th>DURATION</th><th></th></tr></thead>
                    <tbody id="routeTableBody"></tbody>
                  </table>
                </div>
                <div class="table-footer"><span id="tableSummary"></span><div id="pagination" class="pagination"></div></div>
              </div>
            </section>

            <aside class="details-card" id="detailsCard">
              <div class="details-title"><h3>Route Details</h3><img id="detailsLogo" src="assets/logos/saudia-uploaded.png" alt="Selected airline logo"></div>
              <div class="aircraft-pill">✈ <span id="detailsAircraft">Select an aircraft</span></div>
              <div class="route-display"><div><strong id="detailFrom">—</strong><span id="detailFromCity">Departure</span><small id="detailFromAirport">Airport</small></div><div class="route-mid"><span>✈</span><b id="detailFlight">—</b><small>● Active Service</small></div><div class="right"><strong id="detailTo">—</strong><span id="detailToCity">Arrival</span><small id="detailToAirport">Airport</small></div></div>
              <div class="details-grid"><div><span>Flight Number</span><strong id="detailFlightNumber">Not set</strong></div><div><span>Duration</span><strong id="detailDuration">—</strong></div><div><span>Aircraft</span><strong id="detailAircraftName">—</strong></div><div><span>Schedule</span><strong>Editable UTC</strong></div></div>
              <p class="info-note">Flight numbers and equipment can vary by date. Verify the selected service when exact realism matters.</p>
              <button id="viewRouteButton" class="primary-action">View Route Details <span>›</span></button>
              <div class="secondary-actions"><button id="simbriefQuickButton">↗ SimBrief Plan</button><button id="quickLogButton">▱ Add to Logbook</button></div>
            </aside>
          </div>

          <div class="bottom-grid">
            <section class="popular-card"><div class="mini-heading"><h3>♨ Popular Routes</h3><button id="viewAllRoutes">View All</button></div><div id="popularRoutes" class="popular-routes"></div></section>
            <section class="about-card"><div><h3 id="aboutTitle">About Saudia</h3><p id="aboutText">Choose an airline to browse its aircraft and route network.</p><span id="aboutLink">Personal simulator planner</span></div><img id="aboutLogo" src="assets/logos/saudia-uploaded.png" alt="Selected airline logo"></section>
          </div>
        </section>

        <section id="activeView" class="view">
          <div class="page-heading"><div><span>LIVE FLIGHT</span><h2>Active Flight</h2><p>Progress is estimated from the confirmed UTC departure and ETA.</p></div><button id="cancelActive" class="danger-button">Cancel flight</button></div>
          <section class="content-card" id="activeFlightContainer"></section>
        </section>

        <section id="logbookView" class="view">
          <div class="page-heading"><div><span>FLIGHT HISTORY</span><h2>Logbook</h2><p>Completed flights are saved in this browser.</p></div><button id="clearLogbook" class="danger-button">Clear logbook</button></div>
          <div class="metric-row"><div><span>Flights</span><strong id="metricFlights">0</strong></div><div><span>Airlines</span><strong id="metricAirlines">0</strong></div><div><span>Aircraft</span><strong id="metricAircraft">0</strong></div></div>
          <section class="content-card"><div id="logbookList"></div><div id="emptyLogbook" class="empty-message">No flights have been logged yet.</div></section>
        </section>

        <section id="dashboardView" class="view simple-view"><h2>Dashboard</h2><p>Your route statistics and recent flights appear here.</p><div id="dashboardMetrics" class="metric-row"></div></section>
        <section id="statisticsView" class="view simple-view"><h2>Statistics</h2><p>Flight and route statistics from this browser.</p><div id="statisticsContent" class="content-card"></div></section>
        <section id="settingsView" class="view simple-view"><h2>Settings</h2><p>All times are handled in UTC. Data is stored locally in your browser.</p></section>
      </main>
    </section>
  </div>

  <dialog id="routeDialog">
    <button class="dialog-close" id="dialogClose" aria-label="Close">×</button>
    <div id="dialogBody"></div>
  </dialog>

  <script src="app.js"></script>
</body>
</html>
