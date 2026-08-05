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
