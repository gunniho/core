import assert from "node:assert/strict";
import { test } from "node:test";
import { pageFaviconBuild } from "./page-favicon.ts";

void test("the page bundle embeds the primary site's SVG, choosing www when the apex is the control plane", async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><title>Site</title></svg>\n';
  for (const [controlPlane, origin] of [
    ["iterate.example.com", "https://example.com"],
    ["example.com", "https://www.example.com"],
  ]) {
    const build = await pageFaviconBuild("example.com", controlPlane, async (url, init) => {
      assert.equal(url, origin + "/favicon.svg");
      assert.equal(init?.redirect, "error");
      return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8" } });
    });
    assert.deepEqual(JSON.parse(build.input.transform.define.__ITERATE_PAGE_FAVICON__), { origin, svg });
  }
});

void test("a missing or invalid site icon stops the build", async () => {
  for (const res of [
    new Response(null, { status: 404 }),
    new Response("<html/>", { headers: { "content-type": "text/html" } }),
    new Response("empty", { headers: { "content-type": "image/svg+xml" } }),
    new Response("x".repeat(256 * 1024 + 1), { headers: { "content-type": "image/svg+xml" } }),
  ])
    await assert.rejects(pageFaviconBuild("example.com", "iterate.example.com", async () => res), /favicon.svg/);
});
