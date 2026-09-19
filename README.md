# Item List Tracker

A tiny, dependency-free web app for tracking a list of items (name, spec, qty, optional comment). No backend, no build step — everything lives in the browser.

## Features

- Ships pre-loaded with a default item list (edit `DEFAULT_ITEMS_DATA` in `app.js` to change it)
- Add / delete items (name, spec, qty, optional comment) directly in an always-editable table — no separate edit/save mode
- Items must stay distinct: editing a name or spec so it exactly matches another item's name + spec (case-insensitive) reverts that edit with a warning once you leave the field. Two items can still share a name if their spec differs (e.g. "Smart Water" 591ml vs 1L)
- Each row shows a numbered badge (1, 2, 3…) reflecting its position in the currently visible list
- A separate "back to top" button (bottom-left, apart from the main action menu) appears once you've scrolled down and smooth-scrolls back to the top of the list
- Live search box filters the list by item name, spec, or comment as you type
- Changes auto-save as you type (debounced ~500ms), with a small "Saving…/Saved" indicator
- A single floating "+" button (bottom-right) expands into a menu for Add, Share, Sort A-Z, Set Default, Restore, and Clear Qtys
- **Sort A-Z** — reorders the list alphabetically by item name (case-insensitive). Manual, on demand — the list is never reordered automatically while you're editing
- **Set Default** — optionally saves your current list (including any edits, additions, or deletions) as your new default, so **Restore** brings back that exact version instead of the original pre-loaded list from then on
- **Restore** — reverts to your saved default if you've set one, otherwise the original pre-loaded list (asks for confirmation first). Quantities always come back blank, even if the saved default had them filled in — only names/specs/comments carry over
- **Clear Qtys** — resets every item's quantity to blank, keeping the items themselves (names, specs, comments) untouched (asks for confirmation first)
- Data persists in the browser's `localStorage` until you explicitly clear your browser's site data
- **Share** — renders the list as a PNG image (via `<canvas>`, no external library) and opens the native share sheet (Messages, Mail, AirDrop, etc.) with the image attached; falls back to just downloading the image if the browser doesn't support file sharing. Pre-named from the list title and current date/time. Items with no quantity set (blank or 0) are left out of the shared image, since only what actually needs picking up is useful there. Each included item gets a numbered badge too, numbered 1..N within the image itself (not the underlying list position, since only some items make the cut)
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
