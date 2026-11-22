// files.ts — @ritvel/ui AS AN APP SERVES IT: every file of ./src under `ui/`, so the page's import
// map can say `"@ritvel/ui/": "/ui/"` and its head can link `/ui/ui.css`. An app spreads this
// into the files it hands `serveFiles` (apps/dash/app.ts); README.md has the three steps.
// oxlint-disable-next-line import/extensions -- a folder: the loader hands over every file under it, by path
import src from "./src/";

export const ritvelUi: Record<string, string | Uint8Array> = Object.fromEntries(
  Object.entries(src).map(([path, file]) => ["ui/" + path, file]),
);
