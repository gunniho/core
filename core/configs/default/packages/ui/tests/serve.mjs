// serve.mjs — THE GALLERY ON THIS COMPUTER: `node packages/ui/tests/serve.mjs`, then
// http://localhost:4610. It answers what an app of the mind answers for the library: the files
// of ../src under /ui/, and apps/theme.css at /theme.css. It also answers the repo's apps/ folder
// under /apps/, so a page module that moved to the library can be imported and looked at from
// the gallery's console. No sign-in and no mind: components only.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("../src/", import.meta.url));
const apps = fileURLToPath(new URL("../../../apps/", import.meta.url));
const theme = join(apps, "theme.css");
const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html" };
const port = Number(process.env.PORT) || 4610;

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");
  const file = pathname === "/" ? join(src, "gallery.html")
    : pathname === "/theme.css" ? theme
    : pathname.startsWith("/ui/") ? join(src, normalize(pathname.slice(4)))
    : pathname.startsWith("/apps/") ? join(apps, normalize(pathname.slice(6)))
    : null;
  try {
    if (!file || !(file.startsWith(src) || file.startsWith(apps))) throw new Error("not found");
    const body = await readFile(file);
    response.writeHead(200, { "content-type": (types[extname(file)] || "text/plain") + "; charset=utf-8", "cache-control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log("@ritvel/ui gallery: http://localhost:" + port));
