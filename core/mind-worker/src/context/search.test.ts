// `itx.search` over a pretend binding: what reaches the mind's AI Search namespace, what is
// refused before it does, and what comes back in place of what no call across RPC can carry.
import { expect, test } from "vitest";
import type { ItxExpression } from "iterate/expression";
import { errorCode } from "iterate/lib";
import { itxAnswerDetachedFromSession, walkSteps } from "../../../itx/src/context/dispatch.ts";
import { cfSearch } from "./search.ts";

test("create answers the new instance's info, and get(name) makes no call", async () => {
  const { binding, calls } = fakeBinding();
  const search = cfSearch(binding, files());
  expect(
    await search.create({ id: "docs", index_method: { vector: true, keyword: true } }),
  ).toEqual({ id: "docs", status: "ready" });
  expect(calls).toEqual([
    ["create", { id: "docs", index_method: { vector: true, keyword: true } }],
    ["docs", "info"],
  ]);
  calls.length = 0;
  const handle = search.get("docs");
  void handle.items;
  void handle.jobs;
  void handle.items.get("item-1");
  expect(calls).toEqual([]);
});

test("the kernel answers a handle as its expression, and each later verb walks it from the root", async () => {
  const { binding, calls, uploads } = fakeBinding();
  const root = { search: cfSearch(binding, files()) };
  // one call of a caller, as a context answers it (core/itx `walkSteps`, then the detached answer)
  const call = async (steps: ItxExpression) => {
    const { value } = await walkSteps({ value: root, receiver: undefined }, steps);
    return itxAnswerDetachedFromSession(value, steps);
  };
  const docs: ItxExpression = ["search", ["get", "docs"]];
  expect(await call(docs)).toEqual({ $itxHandleExpression: docs });
  expect(await call([...docs, "items"])).toEqual({ $itxHandleExpression: [...docs, "items"] });
  expect(await call([...docs, "jobs", ["get", "job-1"]])).toEqual({
    $itxHandleExpression: [...docs, "jobs", ["get", "job-1"]],
  });
  expect(calls).toEqual([]);

  expect(await call([...docs, "items", ["upload", "notes.md", "# Hours"]])).toEqual({
    id: "item-1",
    key: "notes.md",
    status: "queued",
  });
  expect(uploads).toHaveLength(1);
  await call([...docs, "items", ["get", "item-1"], ["chunks", { limit: 2 }]]);
  await call([...docs, "jobs", ["get", "job-1"], ["cancel"]]);
  expect(await call([...docs, ["search", { query: "hours" }]])).toEqual({
    search_query: "hours",
    chunks: [],
  });
  expect(calls).toEqual([
    ["docs", "items", "item-1", "chunks", { limit: 2 }],
    ["docs", "jobs", "job-1", "cancel"],
    ["docs", "search", { query: "hours" }],
  ]);

  // a create is answered as data: a handle would be walked again, and create again
  calls.length = 0;
  expect(await call(["search", ["create", { id: "mail" }]])).toEqual({
    id: "mail",
    status: "ready",
  });
  expect(calls.filter(([verb]) => verb === "create")).toHaveLength(1);
});

test("an instance that is made answers its id when its info does not read", async () => {
  const { binding } = fakeBinding({ infoFails: new Error("AI Search did not answer") });
  expect(await cfSearch(binding, files()).create({ id: "docs" })).toEqual({ id: "docs" });
});

test("a source that names a store of the account is refused, at create and at update", async () => {
  const { binding, calls } = fakeBinding();
  const search = cfSearch(binding, files());
  for (const type of ["r2", "R2", "d1"]) {
    await expect(
      search.create({ id: "docs", type, source: "another-minds-files" }),
    ).rejects.toThrow(/names a store of the account, which may be another mind's/);
    await expect(search.get("docs").update({ type })).rejects.toThrow(
      /names a store of the account/,
    );
  }
  for (const key of ["namespace", "new_namespace"]) {
    await expect(search.create({ id: "docs", [key]: "default" })).rejects.toThrow(
      /the namespace is the mind's own/,
    );
    await expect(search.get("docs").update({ [key]: "default" })).rejects.toThrow(
      /the mind's own/,
    );
  }
  await expect(search.create({} as { id: string })).rejects.toThrow(/create takes \{ id \}/);
  await expect(search.create(null as unknown as { id: string })).rejects.toThrow(
    /a config object/,
  );
  const refused = await search.create({ id: "docs", type: "r2" }).catch((error) => error);
  expect(errorCode(refused)).toBe("INVALID_INPUT");
  expect(calls).toEqual([]);
});

test("a web crawl and a change of an instance's own settings reach the binding as they are", async () => {
  const { binding, calls } = fakeBinding();
  const search = cfSearch(binding, files());
  await search.create({ id: "site", type: "web-crawler", source: "https://example.com" });
  await search.get("site").update({ reranking: true });
  expect(calls).toEqual([
    ["create", { id: "site", type: "web-crawler", source: "https://example.com" }],
    ["site", "info"],
    ["site", "update", { reranking: true }],
  ]);
});

test("a search of one instance and of several, a list and a delete are the binding's own", async () => {
  const { binding, calls } = fakeBinding();
  const search = cfSearch(binding, files());
  expect(await search.get("docs").search({ query: "opening hours" })).toEqual({
    search_query: "opening hours",
    chunks: [],
  });
  await search.search({ query: "hours", ai_search_options: { instance_ids: ["docs", "mail"] } });
  await search.list({ per_page: 5 });
  await search.delete("docs");
  expect(calls).toEqual([
    ["docs", "search", { query: "opening hours" }],
    ["search", { query: "hours", ai_search_options: { instance_ids: ["docs", "mail"] } }],
    ["list", { per_page: 5 }],
    ["delete", "docs"],
  ]);
});

test("an upload carries a text as it is and bytes as a Blob, under the item's name", async () => {
  const { binding, uploads } = fakeBinding();
  const items = cfSearch(binding, files()).get("docs").items;
  await items.upload("notes.md", "# Hours\nOpen 9 to 5.", { metadata: { team: "shop" } });
  await items.uploadAndPoll("scan.pdf", new Uint8Array([37, 80, 68, 70]), { timeoutMs: 5_000 });
  await items.upload("raw.txt", new Uint8Array([104, 105]).buffer);
  expect(uploads[0]).toEqual({
    verb: "upload",
    name: "notes.md",
    content: "# Hours\nOpen 9 to 5.",
    options: { metadata: { team: "shop" } },
  });
  expect(uploads[1]).toMatchObject({ verb: "uploadAndPoll", name: "scan.pdf" });
  expect(uploads[1]!.options).toEqual({ timeoutMs: 5_000 });
  expect(uploads[1]!.content).toBeInstanceOf(Blob);
  expect(new Uint8Array(await (uploads[1]!.content as Blob).arrayBuffer())).toEqual(
    new Uint8Array([37, 80, 68, 70]),
  );
  expect(await (uploads[2]!.content as Blob).text()).toBe("hi");
});

test("a file of the mind is uploaded by its path, with its own content type and under its path's name", async () => {
  const { binding, uploads } = fakeBinding();
  const mind = files({ "docs/notes.md": { text: "# Hours", contentType: "text/markdown" } });
  const items = cfSearch(binding, mind).get("docs").items;
  expect(await items.uploadFile("/docs/notes.md", { metadata: { team: "shop" } })).toEqual({
    id: "item-1",
    key: "docs/notes.md",
    status: "queued",
  });
  await items.uploadFile("/docs/notes.md", { name: "hours.md", wait: true, timeoutMs: 5_000 });
  expect(mind.read).toEqual(["docs/notes.md", "docs/notes.md"]);
  expect(uploads[0]).toMatchObject({
    verb: "upload",
    name: "docs/notes.md",
    options: { metadata: { team: "shop" } },
  });
  const file = uploads[0]!.content as Blob;
  expect(file.type).toBe("text/markdown");
  expect(await file.text()).toBe("# Hours");
  expect(uploads[1]).toMatchObject({
    verb: "uploadAndPoll",
    name: "hours.md",
    options: { timeoutMs: 5_000 },
  });
});

test("a file that is not there, one over 10 MiB and what is no path are refused before any upload", async () => {
  const { binding, uploads } = fakeBinding();
  const mind = files({ "big.pdf": { size: 10 * 1024 * 1024 + 1 } });
  const items = cfSearch(binding, mind).get("docs").items;
  const missing = await items.uploadFile("/docs/gone.md").catch((error) => error);
  expect(String(missing)).toMatch(/the mind has no file at "\/docs\/gone.md"/);
  expect(errorCode(missing)).toBe("INVALID_INPUT");
  await expect(items.uploadFile("/big.pdf")).rejects.toThrow(
    /at most 10485760 bytes, and the file "\/big.pdf" is 10485761/,
  );
  // its size said so: no byte of it was read
  expect(mind.bytesRead).toEqual([]);
  for (const path of ["docs/notes.md", "/", "/docs/", "", 7 as unknown as string])
    await expect(items.uploadFile(path)).rejects.toThrow(/is not a file path like/);
  expect(mind.read).toEqual(["docs/gone.md", "big.pdf"]);
  expect(uploads).toEqual([]);
});

test("an item over 10 MiB, one with no name and one that is no text or bytes are refused before any call", async () => {
  const { binding, calls, uploads } = fakeBinding();
  const items = cfSearch(binding, files()).get("docs").items;
  await expect(items.upload("big.txt", "a".repeat(10 * 1024 * 1024 + 1))).rejects.toThrow(
    /at most 10485760 bytes, and this one is 10485761/,
  );
  await expect(items.upload("big.bin", new Uint8Array(10 * 1024 * 1024 + 1))).rejects.toThrow(
    /at most 10485760 bytes/,
  );
  await expect(items.upload("", "text")).rejects.toThrow(/an item has a name/);
  await expect(items.upload("x.md", { blob: "text" } as unknown as string)).rejects.toThrow(
    /a text, or its bytes/,
  );
  expect(calls).toEqual([]);
  expect(uploads).toEqual([]);
});

test("a download answers the file's bytes in place of the binding's stream", async () => {
  const { binding, calls } = fakeBinding();
  const file = await cfSearch(binding, files()).get("docs").items.get("item-1").download();
  expect(file).toEqual({
    data: new TextEncoder().encode("Open 9 to 5."),
    contentType: "text/markdown",
    filename: "notes.md",
    size: 12,
  });
  expect(calls).toEqual([["docs", "items", "item-1", "download"]]);
});

test("an item's and a job's verbs name the instance, then the item or the job", async () => {
  const { binding, calls } = fakeBinding();
  const docs = cfSearch(binding, files()).get("docs");
  await docs.items.list({ status: "error" });
  await docs.items.delete("item-1");
  await docs.items.get("item-1").chunks({ limit: 2 });
  await docs.jobs.create({ description: "after the import" });
  await docs.jobs.get("job-1").cancel();
  await docs.stats();
  expect(calls).toEqual([
    ["docs", "items", "list", { status: "error" }],
    ["docs", "items", "delete", "item-1"],
    ["docs", "items", "item-1", "chunks", { limit: 2 }],
    ["docs", "jobs", "create", { description: "after the import" }],
    ["docs", "jobs", "job-1", "cancel"],
    ["docs", "stats"],
  ]);
});

test("what is not there is the caller's to handle, and any other failure stays as it was thrown", async () => {
  // as Cloudflare's binding throws it, and as its types name it
  for (const missing of [
    new Error("AiSearchNotFoundError: ai_search_not_found"),
    Object.assign(new Error("ai_search_not_found"), { name: "AiSearchNotFoundError" }),
  ]) {
    const refused = await cfSearch(fakeBinding({ searchFails: missing }).binding, files())
      .get("nowhere")
      .search({ query: "x" })
      .catch((error) => error);
    expect(errorCode(refused)).toBe("INVALID_INPUT");
    expect(refused.message).toBe(
      "itx.search: there is no such instance, item or job (AI Search: ai_search_not_found)",
    );
  }

  for (const other of [
    Object.assign(new Error("upstream"), { name: "AiSearchInternalError" }),
    new Error("the search for AiSearchNotFoundError: x did not run"),
  ])
    await expect(
      cfSearch(fakeBinding({ searchFails: other }).binding, files())
        .get("docs")
        .search({ query: "x" }),
    ).rejects.toBe(other);
});

test("a streamed answer comes back as the binding's stream", async () => {
  const { binding } = fakeBinding();
  const stream = await cfSearch(binding, files())
    .get("docs")
    .chatCompletions({ messages: [{ role: "user", content: "When are you open?" }], stream: true });
  expect(stream).toBeInstanceOf(ReadableStream);
  expect(await new Response(stream).text()).toBe("data: [DONE]\n\n");
});

type Upload = { verb: string; name: string; content: unknown; options: unknown };

/** A namespace that records each call as the names it went through and its argument, and each
 *  upload with what it carried. The casts: a test calls a few methods of each class. */
/** A pretend bucket of the mind's files, each by its key: `read` are the keys asked for, and
 *  `bytesRead` those whose bytes were read. A file with a `size` alone is that large, unread. */
function files(
  held: Record<string, { text?: string; contentType?: string; size?: number }> = {},
) {
  const read: string[] = [];
  const bytesRead: string[] = [];
  return {
    read,
    bytesRead,
    async get(key: string) {
      read.push(key);
      const file = held[key];
      if (!file) return null;
      const bytes = new TextEncoder().encode(file.text || "");
      return {
        size: file.size === undefined ? bytes.byteLength : file.size,
        httpMetadata: { contentType: file.contentType },
        body: { cancel: async () => {} },
        async arrayBuffer() {
          bytesRead.push(key);
          return bytes.buffer;
        },
      };
    },
  } as unknown as Pick<R2Bucket, "get"> & { read: string[]; bytesRead: string[] };
}

function fakeBinding(options: { infoFails?: Error; searchFails?: Error } = {}) {
  const calls: unknown[][] = [];
  const uploads: Upload[] = [];
  const record = (...call: unknown[]) => {
    calls.push(call.filter((part) => part !== undefined));
  };
  const itemOf = (name: string, itemId: string) => ({
    async chunks(params: unknown) {
      record(name, "items", itemId, "chunks", params);
      return { result: [], result_info: { count: 0, total: 0, limit: 2, offset: 0 } };
    },
    async download() {
      record(name, "items", itemId, "download");
      return {
        body: new Response("Open 9 to 5.").body!,
        contentType: "text/markdown",
        filename: "notes.md",
        size: 12,
      };
    },
  });
  const upload = (verb: string) => async (name: string, content: unknown, given: unknown) => {
    uploads.push({ verb, name, content, options: given });
    return { id: "item-1", key: name, status: "queued" };
  };
  const instanceOf = (name: string) => ({
    async info() {
      record(name, "info");
      if (options.infoFails) throw options.infoFails;
      return { id: name, status: "ready" };
    },
    async search(request: { query: string }) {
      record(name, "search", request);
      if (options.searchFails) throw options.searchFails;
      return { search_query: request.query, chunks: [] };
    },
    async chatCompletions(request: { stream?: boolean }) {
      return request.stream
        ? new Response("data: [DONE]\n\n").body!
        : { choices: [{ message: { role: "assistant", content: "9 to 5" } }], chunks: [] };
    },
    async update(config: unknown) {
      record(name, "update", config);
      return { id: name };
    },
    async stats() {
      record(name, "stats");
      return { completed: 1 };
    },
    items: {
      async list(params: unknown) {
        record(name, "items", "list", params);
        return { result: [] };
      },
      upload: upload("upload"),
      uploadAndPoll: upload("uploadAndPoll"),
      get: (itemId: string) => itemOf(name, itemId),
      async delete(itemId: string) {
        record(name, "items", "delete", itemId);
      },
    },
    jobs: {
      async create(params: unknown) {
        record(name, "jobs", "create", params);
        return { id: "job-1", source: "user" };
      },
      get: (jobId: string) => ({
        async cancel() {
          record(name, "jobs", jobId, "cancel");
          return { id: jobId, source: "user" };
        },
      }),
    },
  });
  const binding = {
    get: instanceOf,
    async create(config: { id: string }) {
      record("create", config);
      return instanceOf(config.id);
    },
    async list(params: unknown) {
      record("list", params);
      return { result: [] };
    },
    async delete(name: string) {
      record("delete", name);
    },
    async search(request: unknown) {
      record("search", request);
      return { search_query: "hours", chunks: [] };
    },
  } as unknown as AiSearchNamespace;
  return { binding, calls, uploads };
}
