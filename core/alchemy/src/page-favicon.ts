/** Read the same public image that the mind's primary site serves. Bundling it keeps visits
 *  to the platform's own pages under their existing data-image policies. */
export async function pageFaviconBuild(zone: string, controlPlane: string, get = fetch) {
  const origin = `https://${zone === controlPlane ? "www." : ""}${zone}`;
  const url = `${origin}/favicon.svg`;
  const response = await get(url, {
    headers: { accept: "image/svg+xml" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (response.status !== 200 || type !== "image/svg+xml" || !response.body) {
    await response.body?.cancel();
    throw new Error(`Expected a public SVG at ${url}, received HTTP ${response.status} (${type || "no content type"}).`);
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let svg = "";
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > 256 * 1024) throw new Error(`The favicon at ${url} exceeds 256 KiB.`);
    svg += decoder.decode(chunk, { stream: true });
  }
  svg += decoder.decode();
  if (!/<svg[\s/>]/.test(svg)) throw new Error(`No SVG image found at ${url}.`);

  const define = { __ITERATE_PAGE_FAVICON__: JSON.stringify({ origin, svg }) };
  return { input: { transform: { define } } };
}
