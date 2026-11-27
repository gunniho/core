// The handles are names, not binding objects: the platform answers a returned RpcTarget as its
// expression and walks it again on every later verb (./images.ts), so `get(name)` makes no call,
// and `create` answers the new instance's info, never a handle that a second walk would create
// again. The binding is the mind's own namespace, so a name here is never another mind's; what
// could still reach outside the mind is refused (`refuseOutsideTheMind`). An instance over the
// mind's own bucket is refused with the rest, since a config names a bucket and not a binding:
// a file of the mind goes in by its path instead (`items.uploadFile`), read here from the bucket.
import { RpcTarget } from "capnweb";
import { codedError, releasedAnswer, releaseRpcSessions } from "iterate/lib";
import type {
  CfSearchApi,
  CfSearchInstanceApi,
  CfSearchItemApi,
  CfSearchItemContent,
  CfSearchItemsApi,
  CfSearchJobApi,
  CfSearchJobsApi,
} from "iterate/api";

/** AI Search's own ceiling for one file (a text, or a PDF it reads with OCR), and under a third
 *  of a Workers RPC message's 32 MiB, since the bytes cross two hops. */
const ITEM_MAX_BYTES = 10 * 1024 * 1024;

/** The sources an instance of the mind may have: its own storage (no `type`), which takes
 *  uploads, and Cloudflare's crawl of a site on the account. Any other names a store of the
 *  account by its name, as `r2` names a bucket, and the account may hold another mind's. */
const SOURCE_TYPES: ReadonlySet<unknown> = new Set([undefined, "web-crawler"]);

const refusal = (message: string) => codedError("INVALID_INPUT", `itx.search: ${message}`);

function refuseOutsideTheMind(verb: "create" | "update", config: unknown) {
  if (typeof config !== "object" || config === null || Array.isArray(config))
    throw refusal(`${verb} takes a config object`);
  const given = config as Record<string, unknown>;
  if (verb === "create" && (typeof given.id !== "string" || given.id === ""))
    throw refusal("create takes { id }, the new instance's name");
  if (!SOURCE_TYPES.has(given.type))
    throw refusal(
      `an instance has its own storage (no \`type\`) or is a web crawl (\`type: "web-crawler"\`); ${JSON.stringify(given.type)} names a store of the account, which may be another mind's. Upload the files instead: \`search.get(name).items.uploadFile(path)\` for a file of the mind, \`.items.upload(name, content)\` for any other`,
    );
  for (const key of ["namespace", "new_namespace"])
    if (key in given)
      throw refusal(`\`${key}\` is not the caller's to name: the namespace is the mind's own`);
}

/** THE BINDING'S ERROR FOR WHAT IS NOT THERE, an instance, an item or a job: the caller's to
 *  handle. It reaches this Worker as a plain `Error` with its class in the message
 *  (`AiSearchNotFoundError: item_not_found`; measured against Cloudflare, 27 Nov 2026), and the
 *  types declare an error of that name, so either is read. Answers Cloudflare's own word for what
 *  is missing (`ai_search_not_found`, `item_not_found`, `job_not_found`), or null for any other
 *  failure. */
const NOT_FOUND_IN_MESSAGE = /^AiSearchNotFoundError:\s*/;
function missingOf(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (typeof message !== "string") return null;
  if (NOT_FOUND_IN_MESSAGE.test(message)) return message.replace(NOT_FOUND_IN_MESSAGE, "");
  return name === "AiSearchNotFoundError" ? message : null;
}

/** Every failure but that one is left as the binding threw it. */
async function refusingWhatIsMissing<T>(call: () => PromiseLike<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    const missing = missingOf(error);
    if (missing === null) throw error;
    throw refusal(`there is no such instance, item or job (AI Search: ${missing})`);
  }
}

/** One call through the handles in `held`, which the binding hands out for an instance, its
 *  items or its jobs: its answer is copied, and the answer and the handles are released, since
 *  each may hold a session to AI Search open until then (iterate/lib `releasedAnswer`). */
async function answered<T>(held: readonly unknown[], call: () => PromiseLike<T>): Promise<T> {
  let streamed = false;
  try {
    const answer = await refusingWhatIsMissing(() => releasedAnswer(call()));
    streamed = answer instanceof ReadableStream;
    return answer;
  } finally {
    // a stream (`chatCompletions` with `stream: true`) is read after this, through that session
    if (!streamed) releaseRpcSessions(held);
  }
}

/** What the binding takes for a file: a text as it is, bytes as a Blob. */
function itemContentOf(content: CfSearchItemContent): string | Blob {
  const bytes =
    typeof content === "string"
      ? content.length // a text's UTF-8 is no shorter than the text
      : content instanceof Uint8Array || content instanceof ArrayBuffer
        ? content.byteLength
        : null;
  if (bytes === null) throw refusal("an item's content is a text, or its bytes (a Uint8Array)");
  if (bytes > ITEM_MAX_BYTES)
    throw refusal(`an item is at most ${ITEM_MAX_BYTES} bytes, and this one is ${bytes}`);
  return typeof content === "string" ? content : new Blob([content]);
}

/** The mind's files, as `uploadFile` reads one: R2's `get`. */
type MindFiles = Pick<R2Bucket, "get">;

/** A file's key is its path without the leading slash (./images.ts). */
function fileKeyOf(path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.length < 2 || path.endsWith("/"))
    throw refusal(`${JSON.stringify(path)} is not a file path like "/docs/notes.md"`);
  return path.replace(/^\/+/, "");
}

/** A file of the mind as the binding takes it: its bytes, with its own content type. Its size is
 *  known before a byte is read, so a file too large for an item is never read. */
async function mindFileOf(files: MindFiles, key: string): Promise<Blob> {
  const object = await files.get(key);
  if (!object) throw refusal(`the mind has no file at "/${key}"`);
  if (object.size > ITEM_MAX_BYTES) {
    await object.body.cancel();
    throw refusal(
      `an item is at most ${ITEM_MAX_BYTES} bytes, and the file "/${key}" is ${object.size}`,
    );
  }
  return new Blob([await object.arrayBuffer()], { type: object.httpMetadata?.contentType });
}

function itemNameOf(name: unknown): string {
  if (typeof name !== "string" || name === "")
    throw refusal("an item has a name, whose extension tells its format (`notes.md`)");
  return name;
}

export function cfSearch(binding: AiSearchNamespace, files: MindFiles): CfSearchApi {
  function chatCompletions(
    request: Parameters<CfSearchApi["chatCompletions"]>[0] & { stream: true },
  ): Promise<ReadableStream>;
  function chatCompletions(
    request: Parameters<CfSearchApi["chatCompletions"]>[0],
  ): Promise<AiSearchMultiChatCompletionsResponse>;
  function chatCompletions(
    request: Parameters<CfSearchApi["chatCompletions"]>[0],
  ): Promise<ReadableStream | AiSearchMultiChatCompletionsResponse> {
    return answered([], () => binding.chatCompletions(request));
  }
  return {
    list: (params) => answered([], () => binding.list(params)),
    async create(config) {
      refuseOutsideTheMind("create", config);
      const instance = await refusingWhatIsMissing(() => binding.create(config));
      try {
        return await releasedAnswer(instance.info());
      } catch {
        // the instance is made, so the create is not answered as a failure: its id is what is known
        return { id: config.id };
      } finally {
        releaseRpcSessions([instance]);
      }
    },
    get: (name) => new SearchInstanceTarget(binding, files, name),
    delete: (name) => answered([], () => binding.delete(name)),
    search: (request) => answered([], () => binding.search(request)),
    chatCompletions,
  };
}

class SearchInstanceTarget extends RpcTarget implements CfSearchInstanceApi {
  readonly #binding: AiSearchNamespace;
  readonly #files: MindFiles;
  readonly #name: string;
  constructor(binding: AiSearchNamespace, files: MindFiles, name: string) {
    super();
    this.#binding = binding;
    this.#files = files;
    this.#name = name;
  }
  #call<T>(verb: (instance: AiSearchInstance) => PromiseLike<T>): Promise<T> {
    const instance = this.#binding.get(this.#name);
    return answered([instance], () => verb(instance));
  }
  search(request: Parameters<CfSearchInstanceApi["search"]>[0]) {
    return this.#call((instance) => instance.search(request));
  }
  chatCompletions(
    request: Parameters<CfSearchInstanceApi["chatCompletions"]>[0] & { stream: true },
  ): Promise<ReadableStream>;
  chatCompletions(
    request: Parameters<CfSearchInstanceApi["chatCompletions"]>[0],
  ): Promise<AiSearchChatCompletionsResponse>;
  chatCompletions(
    request: Parameters<CfSearchInstanceApi["chatCompletions"]>[0],
  ): Promise<ReadableStream | AiSearchChatCompletionsResponse> {
    return this.#call((instance) => instance.chatCompletions(request));
  }
  async update(config: Parameters<CfSearchInstanceApi["update"]>[0]) {
    refuseOutsideTheMind("update", config);
    return this.#call((instance) => instance.update(config));
  }
  info() {
    return this.#call((instance) => instance.info());
  }
  stats() {
    return this.#call((instance) => instance.stats());
  }
  get items(): CfSearchItemsApi {
    return new SearchItemsTarget(this.#binding, this.#files, this.#name);
  }
  get jobs(): CfSearchJobsApi {
    return new SearchJobsTarget(this.#binding, this.#name);
  }
}

class SearchItemsTarget extends RpcTarget implements CfSearchItemsApi {
  readonly #binding: AiSearchNamespace;
  readonly #files: MindFiles;
  readonly #name: string;
  constructor(binding: AiSearchNamespace, files: MindFiles, name: string) {
    super();
    this.#binding = binding;
    this.#files = files;
    this.#name = name;
  }
  #call<T>(verb: (items: AiSearchItems) => PromiseLike<T>): Promise<T> {
    const instance = this.#binding.get(this.#name);
    const items = instance.items;
    return answered([instance, items], () => verb(items));
  }
  list(params?: Parameters<CfSearchItemsApi["list"]>[0]) {
    return this.#call((items) => items.list(params));
  }
  async upload(...[name, content, options]: Parameters<CfSearchItemsApi["upload"]>) {
    const file = itemContentOf(content);
    return this.#call((items) => items.upload(itemNameOf(name), file, options));
  }
  async uploadAndPoll(...[name, content, options]: Parameters<CfSearchItemsApi["uploadAndPoll"]>) {
    const file = itemContentOf(content);
    return this.#call((items) => items.uploadAndPoll(itemNameOf(name), file, options));
  }
  async uploadFile(...[path, options = {}]: Parameters<CfSearchItemsApi["uploadFile"]>) {
    const { name, wait, pollIntervalMs, timeoutMs, ...upload } = options;
    const key = fileKeyOf(path);
    const itemName = itemNameOf(name === undefined ? key : name);
    const file = await mindFileOf(this.#files, key);
    return this.#call((items) =>
      wait
        ? items.uploadAndPoll(itemName, file, {
            ...upload,
            ...(pollIntervalMs !== undefined && { pollIntervalMs }),
            ...(timeoutMs !== undefined && { timeoutMs }),
          })
        : items.upload(itemName, file, upload),
    );
  }
  get(itemId: string): CfSearchItemApi {
    return new SearchItemTarget(this.#binding, this.#name, itemId);
  }
  delete(itemId: string) {
    return this.#call((items) => items.delete(itemId));
  }
}

class SearchItemTarget extends RpcTarget implements CfSearchItemApi {
  readonly #binding: AiSearchNamespace;
  readonly #name: string;
  readonly #itemId: string;
  constructor(binding: AiSearchNamespace, name: string, itemId: string) {
    super();
    this.#binding = binding;
    this.#name = name;
    this.#itemId = itemId;
  }
  #call<T>(verb: (item: AiSearchItem) => PromiseLike<T>): Promise<T> {
    const instance = this.#binding.get(this.#name);
    const items = instance.items;
    const item = items.get(this.#itemId);
    return answered([instance, items, item], () => verb(item));
  }
  info() {
    return this.#call((item) => item.info());
  }
  // The binding answers a stream, which holds its session open while it is read: so it is read
  // here, to the bytes, before the handles are released.
  download() {
    return this.#call(async (item) => {
      const file = await item.download();
      try {
        const { contentType, filename, size } = file;
        return { data: await boundedBytesOf(file.body), contentType, filename, size };
      } finally {
        releaseRpcSessions([file]);
      }
    });
  }
  sync() {
    return this.#call((item) => item.sync());
  }
  logs(params?: Parameters<CfSearchItemApi["logs"]>[0]) {
    return this.#call((item) => item.logs(params));
  }
  chunks(params?: Parameters<CfSearchItemApi["chunks"]>[0]) {
    return this.#call((item) => item.chunks(params));
  }
}

class SearchJobsTarget extends RpcTarget implements CfSearchJobsApi {
  readonly #binding: AiSearchNamespace;
  readonly #name: string;
  constructor(binding: AiSearchNamespace, name: string) {
    super();
    this.#binding = binding;
    this.#name = name;
  }
  #call<T>(verb: (jobs: AiSearchJobs) => PromiseLike<T>): Promise<T> {
    const instance = this.#binding.get(this.#name);
    const jobs = instance.jobs;
    return answered([instance, jobs], () => verb(jobs));
  }
  list(params?: Parameters<CfSearchJobsApi["list"]>[0]) {
    return this.#call((jobs) => jobs.list(params));
  }
  create(params?: Parameters<CfSearchJobsApi["create"]>[0]) {
    return this.#call((jobs) => jobs.create(params));
  }
  get(jobId: string): CfSearchJobApi {
    return new SearchJobTarget(this.#binding, this.#name, jobId);
  }
}

class SearchJobTarget extends RpcTarget implements CfSearchJobApi {
  readonly #binding: AiSearchNamespace;
  readonly #name: string;
  readonly #jobId: string;
  constructor(binding: AiSearchNamespace, name: string, jobId: string) {
    super();
    this.#binding = binding;
    this.#name = name;
    this.#jobId = jobId;
  }
  #call<T>(verb: (job: AiSearchJob) => PromiseLike<T>): Promise<T> {
    const instance = this.#binding.get(this.#name);
    const jobs = instance.jobs;
    const job = jobs.get(this.#jobId);
    return answered([instance, jobs, job], () => verb(job));
  }
  info() {
    return this.#call((job) => job.info());
  }
  logs(params?: Parameters<CfSearchJobApi["logs"]>[0]) {
    return this.#call((job) => job.logs(params));
  }
  cancel() {
    return this.#call((job) => job.cancel());
  }
}

async function boundedBytesOf(body: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let read = await reader.read(); !read.done; read = await reader.read()) {
    size += read.value.byteLength;
    if (size > ITEM_MAX_BYTES) {
      await reader.cancel();
      throw refusal(`the item is more than ${ITEM_MAX_BYTES} bytes, more than one call carries`);
    }
    chunks.push(read.value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return bytes;
}

export const SEARCH_ROOT_DESCRIPTION =
  'Cloudflare AI Search, the mind\'s own instances: each indexes files and answers questions over them, by meaning, by keyword, or both. `search.create({ id: "docs" })` makes one with its own storage (`index_method: { vector: true, keyword: true }` for hybrid search) and answers its info; `search.list()`; `search.delete(id)`. `search.get(id)` is its handle: `.items.upload("notes.md", textOrBytes)` (indexing takes minutes, and a search finds an item once its `status` is "completed": `.uploadAndPoll(name, content, { timeoutMs })` waits for that, 30 s unless `timeoutMs` says more; the name\'s extension tells the format: text, Markdown, PDF, Office, HTML, images; at most 10 MiB), `.items.uploadFile("/docs/notes.md", { wait?, metadata? })` indexes a file of the mind by its path, its bytes never visiting the script, `.items.list()` · `.items.delete(itemId)` · `.items.get(itemId).info()` · `.chunks()` · `.download()`; `.search({ query, ai_search_options?: { retrieval: { max_num_results, filters } } })` → { search_query, chunks: [{ score, text, item: { key, metadata } }] }; `.chatCompletions({ messages })` → an answer written from the chunks it found (billed as Workers AI); `.stats()` · `.info()` · `.update(config)`. Several instances at once: `search.search({ query, ai_search_options: { instance_ids: ["docs", "mail"] } })`, each chunk with its `instance_id`';
