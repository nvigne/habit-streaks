# Habit streaks

Small steps, every day. A lightweight, mobile-friendly daily habit tracker with no accounts, backend, runtime dependencies, or build step.

## What you can do

- Add, rename, and delete habits (deletion requires confirmation).
- Check in for today, or toggle a check-in off if you made a mistake.
- See your current and best streak, plus today's completion progress.

On phones, a compact header prioritizes your habit list, with check-in and habit-action touch targets of at least 44 pixels. Three typical habit entries fit in a 390-by-844 viewport without scrolling. Shorter screens, longer names, enlarged text, an open keyboard, or storage error messages may require scrolling; habit names and controls are never clipped to force a fit.

Your current streak includes consecutive days ending today **or yesterday**. An unfinished today doesn't break yesterday's streak; missing a full calendar day does. Best streak means your longest consecutive run. Days follow your device's **local calendar**, including daylight-saving changes. Only today's check-in can be edited.

## Run locally

Install [Node.js](https://nodejs.org/) 22 or later, then run:

```sh
npm start
```

Open **http://127.0.0.1:4173**. Stop the server with Ctrl+C. No package installation is needed. Use a web server rather than opening `index.html` directly: browsers restrict JavaScript modules on `file:` URLs.

Run the automated date, streak, and persistence tests with:

```sh
npm test
```

The site itself consists of `index.html`, `styles.css`, `app.js`, `habit-core.js`, and `favicon.svg`. It can be served by any static host. The small local development server serves only these assets.

## Publish for free with GitHub Pages

1. In repository **Settings > Pages > Build and deployment**, select **GitHub Actions** as the source.
2. Push the site to `main`, or manually run **Deploy habit streaks** from the Actions tab on `main`.
3. Once deployment succeeds, use the Pages URL shown by the deployment and repository settings.

The included workflow runs tests and deploys only the five site assets. Pull requests run tests without deploying. Relative asset URLs support the GitHub Pages project path (`/habit-streaks/`) without configuration.

Adding the workflow does not turn on Pages automatically; a repository administrator must select its source. There is no backend to configure.

## Privacy and storage

All habits and check-in dates are saved in this browser's `localStorage`, under `habit-streaks:v1`. There is no analytics, advertising, external font request, account, or cloud sync.

- Habits are local to the browser profile and site origin. Another browser, device, or origin (including local preview versus Pages) has separate data. Sites sharing a GitHub Pages origin also share its storage.
- Clearing browser/site data deletes your habits. Private browsing may discard them when closed. There is no backup, import, or export in v1.
- Names and history are not encrypted. Avoid storing sensitive information on shared devices.
- If storage is blocked, full, or unreadable, the app shows an error instead of pretending a change was saved. Existing unreadable records are not overwritten automatically. Try again after fixing browser permissions or space; **Reset saved data** is an explicit, confirmed, irreversible recovery option.
- The app refreshes when you return to a tab, when another tab changes saved data, and after the local date changes. Device clock/time-zone changes affect which day counts as today; future check-ins remain saved but do not count toward streaks until their date arrives.

No reminders, heatmap, historical editing, or PWA/offline installation are included in v1.
