// rules.test.mjs — the rules of @ritvel/ui over this repo: `node --test packages/ui/tests/rules.test.mjs`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { problems } from "./rules.mjs";

test("the pages of this repo keep the rules of @ritvel/ui", () => {
  assert.deepEqual(problems(fileURLToPath(new URL("../../../", import.meta.url))), []);
});
