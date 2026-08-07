Praysion Note - Samsung Internet keyboard guard (clean build)

Included:
- app.css
  - Keeps the mobile/PWA #frame position:fixed viewport pin.
  - Removes failed per-scroller overscroll experiments.
  - Removes the redundant CSS-only TopBar guard.
- bootstrap.js
  - Keeps the keyboard/IME viewport guard and its bootstrap call.

Replace the deployed app.css and bootstrap.js with these files.
After deployment, refresh/update the PWA or clear the service-worker cache.
