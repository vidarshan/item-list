# Item List Tracker

A tiny, dependency-free web app for tracking a list of items (name, spec, qty, optional comment). No backend, no build step — everything lives in the browser.

## Features

- Ships pre-loaded with a default item list (edit `DEFAULT_ITEMS_DATA` in `app.js` to change it)
- Add / delete items (name, spec, qty, optional comment) directly in an always-editable table — no separate edit/save mode
- Live search box filters the list by item name, spec, or comment as you type
- Changes auto-save as you type (debounced ~500ms), with a small "Saving…/Saved" indicator
- A single floating "+" button (bottom-right) expands into a menu for Add, Share, Set Default, Restore, and Clear
- **Set Default** — optionally saves your current list (including any edits, additions, or deletions) as your new default, so **Restore** brings back that exact version instead of the original pre-loaded list from then on
- **Restore** — reverts to your saved default if you've set one, otherwise the original pre-loaded list (asks for confirmation first)
- Data persists in the browser's `localStorage` until you explicitly hit **Clear**
- **Share** — opens the browser print dialog with a plain, content-only document (no app UI); choose "Save as PDF" as the destination to get a shareable PDF, pre-named from the list title and current date/time. Note: some browsers (notably iOS Safari's share sheet) don't honor the suggested filename — you may need to rename it manually there. Items with no quantity set (blank or 0) are left out of the shared document, since only what actually needs picking up is useful there
- Editable, persisted list title, plus generated-date and last-updated timestamps

## Running locally

Just open `index.html` in a browser — no server or install needed.

## Hosting on GitHub Pages

1. Create a new GitHub repo and push these files (`index.html`, `style.css`, `app.js`) to it.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to `Deploy from a branch`, pick the `main` branch and `/ (root)` folder, then save.
4. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

## Notes on data storage

All data is stored client-side in `localStorage`, scoped to the exact origin (domain) the page is served from. That means:

- Data persists across page reloads and browser restarts.
- Data does **not** sync between devices or browsers — it's local to one browser on one machine.
- Clearing your browser's site data for the page, or using a private/incognito window, will not preserve entries.
