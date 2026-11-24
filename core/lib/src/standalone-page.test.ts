// standalone-page.test.ts — the plain pages' stylesheet module is what its script writes from the
// token files today, and the title is text. What a page does with it is app-server.test.ts's.
import { readFileSync } from "node:fs";
import { expect, test, vi } from "vitest";
import { plainPageCssModule, plainPageCssModulePath } from "../scripts/plain-page-css.ts";
import { factsTable, pageFaviconRedirect, standalonePage } from "./standalone-page.ts";

test("theme/plain-page-css.gen.ts is up to date with tokens.css and plain-page.css", () => {
  expect(
    readFileSync(plainPageCssModulePath, "utf8"),
    "stale: run `node core/lib/scripts/plain-page-css.ts`",
  ).toBe(plainPageCssModule());
});

test("the title is text: markup in it is escaped", () => {
  expect(standalonePage({ title: `Backup · <b>"a&b"</b>`, head: "", body: "" })).toContain(
    "<title>Backup · &#60;b&#62;&#34;a&#38;b&#34;&#60;/b&#62;</title>",
  );
});

test("a site favicon stays an inline image and only redirects the three public icon paths", async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><title>A &amp; B</title></svg>';
  const page = { title: "Sign in", head: "", body: "" };
  const request = new Request("https://iterate.example.com/favicon.ico?next=private", {
    headers: { cookie: "session=example" },
  });
  expect(pageFaviconRedirect(request, "/favicon.ico")).toBeNull();
  vi.stubGlobal("__ITERATE_PAGE_FAVICON__", { origin: "https://example.com", svg });
  vi.resetModules();
  const branded = await import("./standalone-page.ts");
  expect(branded.standalonePage(page)).toContain(`href="data:image/svg+xml,${encodeURIComponent(svg)}"`);
  expect(standalonePage(page)).not.toContain(encodeURIComponent(svg));
  for (const path of ["/favicon.ico", "/favicon.svg", "/apple-touch-icon.png"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = branded.pageFaviconRedirect(new Request(request, { method }), path)!;
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(`https://example.com${path}`);
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    }
  }
  expect(branded.pageFaviconRedirect(request, "/sign-in")).toBeNull();
  expect(branded.pageFaviconRedirect(new Request(request, { method: "POST" }), "/favicon.ico")).toBeNull();
  expect(branded.pageFaviconRedirect(new Request(request, { headers: { upgrade: "websocket" } }), "/favicon.ico")).toBeNull();
});

test("a facts table escapes each label and help, puts the help behind a ? beside the name it explains, and draws no help for a row without it", () => {
  expect(
    factsTable([
      {
        label: 'Who <b>asks</b> "now"',
        value: "<strong>the laptop</strong>",
        help: "It is <i>its</i> own claim.",
      },
      { label: "Code", value: "<strong>WDJB-MJHT</strong>" },
    ]),
  ).toBe(
    '<dl class="facts">' +
      // the value is the caller's HTML, as it was given
      '<div><dt>Who &#60;b&#62;asks&#60;/b&#62; &#34;now&#34; <details class="help"><summary aria-label="About Who &#60;b&#62;asks&#60;/b&#62; &#34;now&#34;">?</summary><p>It is &#60;i&#62;its&#60;/i&#62; own claim.</p></details></dt><dd><strong>the laptop</strong></dd></div>' +
      "<div><dt>Code</dt><dd><strong>WDJB-MJHT</strong></dd></div>" +
      "</dl>",
  );
});
