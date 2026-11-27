// search-namespace.ts — A DESTROY THAT EMPTIES THE MIND'S AI SEARCH NAMESPACE BEFORE IT GOES.
// The stack makes the namespace (`Cloudflare.AI.SearchNamespace`), and the mind makes the
// instances in it while it runs, through its binding (`itx.search.create`): so no instance is a
// resource of the stack, and Alchemy's provider deletes the namespace alone. Cloudflare refuses
// that while the namespace holds an instance (7066, `namespace_not_empty`), and the whole destroy
// would fail with it.
//
// A destroy erases the mind, as it empties the mind's bucket of files: each instance of the
// namespace is deleted, with all it indexed, and then Alchemy's own delete runs. The mind Worker
// holds the namespace as a binding, so Alchemy deletes that Worker first and nothing makes an
// instance meanwhile. A deploy is not touched.
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as AiSearch from "@distilled.cloud/cloudflare/aisearch";
import * as Provider from "alchemy/Provider";
import type { ProviderError } from "alchemy/Provider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

type NamespaceService = Provider.ProviderService<Cloudflare.AI.SearchNamespace>;
type Namespace = Parameters<NamespaceService["delete"]>[0]["output"];
type InstanceOfNamespace = { accountId: string; namespace: string; id: string };

/** A page of instances, and how many pages at most: more than an account may hold (5,000 by
 *  default), and an end for a namespace whose instances Cloudflare lists after their delete. */
const PAGE = 100;
const MAX_PAGES = 100;

/** Alchemy's provider `base` of an AI Search namespace, whose `delete` first deletes every
 *  instance in the namespace. The account's own `default` namespace is never emptied: Alchemy
 *  never deletes it, and it may hold what is not the mind's.
 *
 *  Alchemy's engine calls the variant in `modes` (`providerForMode`) when the provider is
 *  registered for two, not the registered service's own `delete`: so the live variant is wrapped
 *  too (./container-snapshots.ts). */
export function emptiedBeforeDeleteProvider(
  base: NamespaceService,
  calls: {
    /** One page of the namespace's instances, by id; none for a namespace that is gone. */
    instanceIds: (namespace: Namespace) => Effect.Effect<ReadonlyArray<string>, ProviderError>;
    deleteInstance: (instance: InstanceOfNamespace) => Effect.Effect<unknown, ProviderError>;
  },
  /** Between two pages: Cloudflare may list an instance for a moment after its delete. */
  pause: Effect.Effect<void> = Effect.sleep("1 second"),
): NamespaceService {
  const wrap = (service: NamespaceService): NamespaceService => ({
    ...service,
    delete: (input) =>
      Effect.gen(function* () {
        const namespace = input.output;
        if (namespace.name !== "default")
          for (let page = 0; page < MAX_PAGES; page += 1) {
            const ids = yield* calls.instanceIds(namespace);
            if (ids.length === 0) break;
            for (const id of ids)
              yield* calls.deleteInstance({
                accountId: namespace.accountId,
                namespace: namespace.name,
                id,
              });
            yield* pause;
          }
        // an instance that is still there fails this, so the stack's state keeps the namespace
        return yield* service.delete(input);
      }),
  });
  const wrapped = wrap(base);
  if (!base.modes) return wrapped;
  return { ...wrapped, modes: { ...base.modes, live: Effect.map(base.modes.live, wrap) } };
}

/** The stack's provider of AI Search namespaces: put it over `Cloudflare.providers()`, which it
 *  overrides for this type. */
export const SearchNamespaceProviders = () =>
  Provider.effect(
    Cloudflare.AI.SearchNamespace,
    Effect.gen(function* () {
      // the deploy's Cloudflare credentials and HTTP client, which Alchemy's own calls use
      const context = yield* Effect.context<AiSearch.CloudflareOpContext>();
      return emptiedBeforeDeleteProvider(yield* Cloudflare.AI.SearchNamespace.Provider, {
        instanceIds: ({ accountId, name }) =>
          AiSearch.listNamespaceInstances({ accountId, namespace: name, perPage: PAGE }).pipe(
            Effect.map(({ result }) => result.map(({ id }) => id)),
            Effect.catchTag("NamespaceNotFound", () => Effect.succeed([])),
            Effect.provideContext(context),
          ),
        deleteInstance: (instance) =>
          AiSearch.deleteNamespaceInstance(instance).pipe(
            // gone already: deleted by a person, or listed for a moment after its delete
            Effect.catchTag("AiSearchInstanceNotFound", () => Effect.void),
            Effect.catchTag("NamespaceNotFound", () => Effect.void),
            Effect.provideContext(context),
          ),
      });
    }),
  ).pipe(Layer.provide(Cloudflare.AI.SearchNamespaceProvider()));
