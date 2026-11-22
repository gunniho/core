# @ritvel/ui

The mind's own components: [UI SDK](https://ui-sdk.dev)'s behaviors (focus, keyboard, popups,
selection, ARIA) with one look, on the variables of `apps/theme.css`. A page of this mind takes its buttons, fields, menus and
dialogs from here, not from `@iterate-com/ui/components/ui/*` and not from `@ui-sdk/*` directly.

There is no build and no npm package: `src/` holds plain modules and one style sheet, an app
serves them under `/ui/`, and the page's import map names them `@ritvel/ui/`.

```
packages/ui/
  src/<component>.js   one module for each component: UI SDK's parts with a class `rv-<name>`
  src/styled.js        how a part gets its class, its variants and its default props
  src/ui.css           the look of every `rv-` class, on the variables of apps/theme.css
  src/gallery.html     the preview library: every component, live, with its code (gallery.js)
  files.ts             `ritvelUi`: the files of src/, as an app serves them
  tests/               the rules below as a test, and the gallery's local server
```

## Use a component

```js
import { html } from "@iterate-com/ui/page";
import { Button } from "@ritvel/ui/button.js";
import { Field, FieldError, FieldLabel } from "@ritvel/ui/field.js";
import { Input } from "@ritvel/ui/input.js";

html`<${Field} name="email">
  <${FieldLabel}>Email<//>
  <${Input} type="email" required />
  <${FieldError} />
<//>
<${Button} variant="outline" size="sm" onClick=${save}>Save<//>`;
```

- **Parts compose.** A Select is `Select`, `SelectTrigger`, `SelectValue`, `SelectContent` and
  `SelectItem`; `src/gallery.js` shows each component whole.
- **State is `value` and `onValueChange`** (`open` and `onOpenChange`, `checked` and
  `onCheckedChange`), or `defaultValue` when the component may keep it.
- **`render` picks the element**: `<${MenuTrigger} render=${html`<${Button} variant="outline" />`}>`,
  `<${Button} render=${html`<a href="/sign-in" />`}>`.
- **A one-off look** goes in `className` and the app's own CSS, which wins over `ui.css`.
- Every prop a wrapper does not name goes to UI SDK's part. Its docs for the pinned version:
  `https://unpkg.com/@ui-sdk/react@<version>/docs/llms.txt`, and `docs/components/<name>.md`
  beside it.

## See the components

`https://design.<zone>` is the preview library, for members: each component live, in the
light theme and a dark one, with the code of every example to copy. `apps/design/` serves it
from this folder, so it shows the code the other apps load.

## Give an app the library

Every app of the template has it. For an app of your own:

1. `app.ts`: `import { ritvelUi } from "../../packages/ui/files.ts";` and spread `...ritvelUi`
   into the `files` of `serveFiles`.
2. `index.html`, in the import map: the three `@ui-sdk/` lines and `"@ritvel/ui/": "/ui/"`, as
   `apps/dash/index.html` has them.
3. `index.html`, **before** the kit's style sheet: `<link rel="stylesheet" href="/ui/ui.css" />`.
   The first line of `ui.css` fixes the order of the page's cascade layers, and the first sheet
   to name them decides it.

## Add a component

1. Read UI SDK's page for it (`docs/components/<name>.md` of the pinned version): its parts, and
   the `data-` attributes its states set.
2. `src/<name>.js`: wrap each part with `styled(Part, "<name>")`. A part that needs no look of its
   own (a root that renders nothing, a trigger that takes a Button) is exported as it is.
3. `src/ui.css`: style `.rv-<name>` and its states, with the variables of `apps/theme.css`.
   Hover inside `@media (hover: hover)`, a ring on `:focus-visible`, entry and exit on
   `data-starting-style` and `data-ending-style`, and the transition named in the
   reduced-motion block at the end.
4. `src/gallery.js`: an entry in `components`, with an example for each thing it does. The page
   shows each example's own code. Look at it in both themes and work it with the keyboard:
   `node packages/ui/tests/serve.mjs`, then http://localhost:4610.

When UI SDK has no component for the job, build one from its behaviors (`@ui-sdk/core`,
`docs/core.md`) in `src/`, never in an app.

## Pins

Every page pins the same builds in its import map: `@iterate-com/ui` (which brings React), and
`@ui-sdk/react` with `@ui-sdk/core` at one exact version. `@ui-sdk/react` loads with `*` before
its name, so it takes React and the core from the page's map and never a second copy. UI SDK is
a beta that changes often: to move the pin, change it in every `index.html` and in
`src/gallery.html` together, read its changelog, then open the gallery and each wired app.

## Rules, and the test that holds them

`tests/rules.mjs` is the rules as one function, and
`node --test packages/ui/tests/rules.test.mjs` runs it over this repo. It fails when:

- a file under `apps/` imports `@ui-sdk/` directly;
- a file under `apps/` imports a kit primitive that this library has
  (`@iterate-com/ui/components/ui/button`, `input`, `textarea`, `card`, `badge`, `spinner`, …),
  unless `notMovedYet` in `tests/rules.mjs` names it; a page that has moved leaves the list;
- a page that maps `@ritvel/ui/` lacks `/ui/ui.css` before the kit's sheet, or pins another
  UI SDK version than the gallery;
- a component of `src/` is missing from the gallery.

The kit's larger parts stay the kit's: the Dash shell, the chat, `ContextView`, the repo IDE.
A page that a server writes as HTML, with no React in it, is outside this library.
