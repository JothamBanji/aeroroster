# AeroRoster

A complete static flight-simulator route planner styled as a modern dark airline operations dashboard.

## Features

- 413 route-aircraft combinations for Saudia, Singapore Airlines, Turkish Airlines, Air India and Qatar Airways
- Airline sidebar and real/local logo assets
- Aircraft and route selectors
- Searchable, paginated route table
- Route details panel and popular routes
- Editable flight number
- UTC departure scheduling and confirmation
- SimBrief export with route, aircraft, airline, date, time, duration and flight number
- Active-flight countdown and progress path
- Browser-based logbook and statistics
- Responsive desktop and mobile layout

## Run locally

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## GitHub Pages

Upload the contents of this folder to the repository root, then enable **Settings → Pages → Deploy from a branch → main → /(root)**.

## Data note

Aircraft assignments and flight numbers can vary by date and operating schedule. The flight-number field remains editable so exact services can be entered before sending the route to SimBrief.


## Visibility and flight-number update

- Dropdown menus now force dark backgrounds and light text even when the computer is using light mode.
- Airline logos are displayed on white high-contrast tiles.
- The AeroRoster brand uses a custom vector aircraft mark instead of an emoji.
- The “Add number” message and editable flight-number input have been removed.
- Only stored/verified flight numbers are displayed; routes without one show “Not available” rather than a fabricated number.

## Custom routes and return routes

- Every stored airline route is now available in both directions.
- Return routes are generated automatically in the browser while preserving the selected airline and aircraft.
- Custom Route mode lets you select any two airports found in the chosen airline's network and use any aircraft in that airline's stored fleet.
- Custom routes export normally to SimBrief and can be scheduled, tracked, and logged.
- A return route only carries a flight number when a separate return number is stored. The app does not invent flight numbers.


## Route Finder and flight-number fix

- Airline logos now use fixed high-contrast tiles and no longer overlap or distort Route Finder text.
- The scheduling editor includes a manual flight-number field.
- The entered number is shown in confirmation, saved with the active flight and sent to SimBrief.


## Map and SimBrief OFP integration
- Explicit Save settings button.
- SimBrief Pilot ID and latest OFP import.
- Active Flight OpenStreetMap route with SimBrief waypoints when available.
- Great-circle fallback when no matching OFP is imported.


## SimBrief-only phase logic and Settings confirmation

- No Microsoft Flight Simulator connection is required.
- Active-flight position remains time-estimated along the imported SimBrief waypoint route.
- When the OFP contains TOC/TOD markers or an altitude profile, AeroRoster uses them to show Climb, Cruise and Descent.
- Settings now include clearly visible **Confirm changes** buttons at the top and bottom.
- Theme, accent colour and other preferences are not applied until Confirm changes is pressed.


## Worldwide custom airport selection

Custom Route mode now searches 72,454 non-closed airports and airfields worldwide. The selected airline controls the airline and aircraft only; it no longer restricts the available departure or arrival airports.


## Operations update

- **Depart now** records the actual departure time and automatically calculates whether the flight departed early, on time, or late.
- **Arrive now** records the actual arrival time and calculates whether the flight arrived early, on time, or late compared with the scheduled ETA.
- Flight progress begins from the actual recorded departure, not merely the scheduled departure.
- Finish & Log is enabled after arrival is recorded, and the logbook stores both departure and arrival performance.
- Active-flight maps include Street and Satellite layer controls.
- Added a local AeroRoster profile/PIN login screen.
- Added a live UTC clock in the top-right corner.


## AeroRoster Operations Center v3

This build adds a flight briefing page, personal fleet registrations, manual flight milestones, arrival reports, advanced logbook filters/exports, worldwide flight-history map, airport explorer with METAR/TAF lookup, expanded SimBrief briefing data, ATC callsigns, route favorites, random flight generator, achievements/statistics and a richer post-login dashboard.
