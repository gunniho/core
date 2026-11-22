// The default config's component library (core/configs/default/packages/ui): its own rules hold
// over the template, so a mind is born with pages that take their controls from @ritvel/ui, pin
// one UI SDK and link the library's sheet first. The rules are the template's own file, which a
// mind runs over its repo too.
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
// @ts-expect-error -- a plain module of the template, with no types
import { problems } from "../../configs/default/packages/ui/tests/rules.mjs";

test("the template's pages keep the rules of @ritvel/ui", () => {
  expect(problems(fileURLToPath(new URL("../../configs/default/", import.meta.url)))).toEqual([]);
});
