// rules.mjs — THE RULES OF @ritvel/ui (../README.md, "Rules") as one function: `problems(root)`
// answers every broken rule of the config repo at `root`, as a sentence each, and an empty list
// when all hold. rules.test.mjs runs it in a mind's checkout, and iterate/core runs it over the
// template (core/lib/src/config-default-ui.test.ts).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

// PAGES NOT MOVED YET. A page leaves this list in the commit that moves it to @ritvel/ui, and no
// page joins it.
export const notMovedYet = ["apps/meet/public/app.js", "apps/onboarding/public/app.js"];

function walk(root, folder, found = []) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.endsWith(".xcodeproj")) continue;
    const path = join(folder, entry.name);
    if (entry.isDirectory()) walk(root, path, found);
    else if (/\.(js|mjs|ts|html)$/.test(entry.name)) found.push(relative(root, path));
  }
  return found;
}

export function problems(root) {
  const read = (path) => readFileSync(join(root, path), "utf8");
  const found = [];
  const appFiles = walk(root, join(root, "apps"));
  const components = readdirSync(join(root, "packages/ui/src"))
    .filter((name) => name.endsWith(".js"))
    .map((name) => name.slice(0, -3))
    .filter((name) => name !== "styled" && name !== "gallery");

  for (const path of appFiles)
    if (/from\s+["']@ui-sdk\//.test(read(path)))
      found.push(`${path} imports @ui-sdk/ itself: take the component from @ritvel/ui, or add it to packages/ui/src`);

  const kit = new RegExp(`@iterate-com/ui/components/ui/(${components.join("|")})["']`);
  const using = appFiles.filter((path) => kit.test(read(path)));
  for (const path of using)
    if (!notMovedYet.includes(path))
      found.push(`${path} takes a primitive from the kit that @ritvel/ui has`);
  for (const path of notMovedYet)
    if (appFiles.includes(path) && !using.includes(path))
      found.push(`${path} has moved to @ritvel/ui: take it out of notMovedYet`);

  const pins = (text) => [...text.matchAll(/@ui-sdk\/(?:react|core)@([^/"]+)/g)].map((match) => match[1]);
  const [version] = pins(read("packages/ui/src/gallery.html"));
  const pages = [...appFiles.filter((path) => path.endsWith(".html")), "packages/ui/src/gallery.html"]
    .filter((path) => read(path).includes('"@ritvel/ui/"'));
  if (!pages.some((path) => path.startsWith("apps/"))) found.push("no app's page maps @ritvel/ui/");
  for (const path of pages) {
    const text = read(path);
    const sheet = text.indexOf('href="/ui/ui.css"');
    const kitSheet = text.search(/href="[^"]*@iterate-com\/ui@[^"]*\.css"/);
    if (sheet < 0) found.push(`${path} does not link /ui/ui.css`);
    else if (kitSheet >= 0 && kitSheet < sheet) found.push(`${path} links /ui/ui.css after the kit's sheet`);
    if ([...new Set(pins(text))].join() !== version)
      found.push(`${path} pins another UI SDK than the gallery's ${version}`);
  }

  const gallery = read("packages/ui/src/gallery.js");
  for (const name of components)
    if (!gallery.includes(`"@ritvel/ui/${name}.js"`)) found.push(`the gallery lacks ${name}`);
  return found;
}
