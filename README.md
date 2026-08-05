# AeroRoster

A static personal flight-simulator route picker for Saudia, Singapore Airlines, Turkish Airlines, Air India and Qatar Airways.

## Included

- Airline and aircraft filtering
- Departure and destination search
- Random route selection
- SimBrief export
- Local browser logbook
- Responsive layout

## Run locally

The app loads a JSON file, so do not simply double-click `index.html`.

### VS Code
Install the Live Server extension and choose **Open with Live Server**.

### Python
Inside the AeroRoster folder run:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Deploy

Upload the entire AeroRoster folder to Netlify, or publish it using GitHub Pages.

## Add more routes

Edit `data/routes.json`. Duplicate an existing object and replace the airline, aircraft and airport information.

## Accuracy note

The included data is a curated starter dataset for personal flight simulation, not a live airline schedule. Aircraft substitutions and seasonal changes are normal. Verify exact aircraft assignments before a flight when strict realism matters.
