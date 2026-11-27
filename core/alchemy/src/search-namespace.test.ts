// A destroy of the mind's AI Search namespace, which holds the instances that the mind made
// (search-namespace.ts), against a pretend Alchemy provider and pretend Cloudflare calls.
import assert from "node:assert/strict";
import { test } from "node:test";
import type * as Cloudflare from "@alchemy.run/cloudflare";
import { providerForMode, type ProviderService } from "alchemy/Provider";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { emptiedBeforeDeleteProvider } from "./search-namespace.ts";

const namespace = { accountId: "account-1", name: "iterate-example-com-search" };

void test("each instance of the namespace is deleted, a page at a time, and then the namespace", async () => {
  const run = destroy({ pages: [["docs", "tenant-1"], ["tenant-2"]] });
  await Effect.runPromise(run.provider.delete(deleteInput()));
  assert.deepEqual(run.calls, [
    "delete instance docs",
    "delete instance tenant-1",
    "delete instance tenant-2",
    "delete namespace",
  ]);
  assert.deepEqual(run.deleted[0], {
    accountId: "account-1",
    namespace: "iterate-example-com-search",
    id: "docs",
  });
});

void test("a namespace with no instance is deleted with no other call", async () => {
  const run = destroy({ pages: [] });
  await Effect.runPromise(run.provider.delete(deleteInput()));
  assert.deepEqual(run.calls, ["delete namespace"]);
});

void test("an instance that will not go fails the destroy, and the namespace stays", async () => {
  const run = destroy({ pages: [["docs"]], deleteFails: { _tag: "Forbidden" } });
  const exit = await Effect.runPromiseExit(run.provider.delete(deleteInput()));
  assert.equal(Exit.isFailure(exit), true);
  assert.deepEqual(run.calls, []);
});

void test("instances that Cloudflare keeps listing end the pages, and Alchemy's delete decides", async () => {
  const run = destroy({ pages: "always", namespaceFails: { _tag: "CloudflareError" } });
  const exit = await Effect.runPromiseExit(run.provider.delete(deleteInput()));
  assert.equal(Exit.isFailure(exit), true);
  assert.equal(run.calls.length, 100);
  assert.equal(run.calls.includes("delete namespace"), false);
});

void test("the account's own default namespace is never emptied", async () => {
  const run = destroy({ pages: [["someone-elses"]] });
  await Effect.runPromise(run.provider.delete(deleteInput({ ...namespace, name: "default" })));
  assert.deepEqual(run.calls, ["delete namespace"]);
});

void test("Alchemy's engine reaches the wrapped delete through the provider's live mode", async () => {
  // a dual registration: the engine calls `providerForMode(service, mode)`
  const run = destroy({ pages: [["docs"]], dual: true });
  const live = await Effect.runPromise(providerForMode(run.provider, "live"));
  await Effect.runPromise(live.delete(deleteInput()));
  assert.deepEqual(run.calls, ["delete instance docs", "delete namespace"]);
  // the local variant stays Alchemy's own
  const local = await Effect.runPromise(providerForMode(run.provider, "local"));
  await Effect.runPromise(local.delete(deleteInput()));
  assert.deepEqual(run.calls.slice(2), ["delete namespace"]);
});

type NamespaceService = ProviderService<Cloudflare.AI.SearchNamespace>;

/** The wrapper over a pretend Alchemy provider whose delete records the call, or fails with
 *  `namespaceFails`, and pretend Cloudflare calls: `pages` are the instances that each listing
 *  answers in turn (`"always"`: one instance, however often it is deleted), and an instance's
 *  delete records the call, or fails with `deleteFails`. `dual`: the provider is registered for
 *  two modes, as `ProviderLayer.dual` makes it. */
function destroy(options: {
  pages: string[][] | "always";
  deleteFails?: { _tag: string };
  namespaceFails?: { _tag: string };
  dual?: boolean;
}) {
  const calls: string[] = [];
  const deleted: object[] = [];
  const pages = options.pages === "always" ? null : [...options.pages];
  // The cast: of the provider, only `delete` is called here.
  const variant = {
    delete: () =>
      options.namespaceFails
        ? Effect.fail(options.namespaceFails)
        : Effect.sync(() => void calls.push("delete namespace")),
  } as unknown as NamespaceService;
  const base = options.dual
    ? { ...variant, modes: { live: Effect.succeed(variant), local: Effect.succeed(variant) } }
    : variant;
  const provider = emptiedBeforeDeleteProvider(
    base,
    {
      instanceIds: () => Effect.sync(() => (pages ? (pages.shift() ?? []) : ["stuck"])),
      deleteInstance: (instance) =>
        options.deleteFails
          ? Effect.fail(options.deleteFails)
          : Effect.sync(() => {
              deleted.push(instance);
              calls.push(`delete instance ${instance.id}`);
            }),
    },
    Effect.void,
  );
  return { provider, calls, deleted };
}

// The cast: the wrapper reads only `output` of its input.
function deleteInput(output: object = namespace) {
  return { id: "Search", output } as unknown as Parameters<NamespaceService["delete"]>[0];
}
