// gallery.js — THE COMPONENT PREVIEW LIBRARY: every component of @ritvel/ui, live, with the code
// of each example beside it. It is the page of the Design app (apps/design/, on design.<zone>), and on a computer
// `node packages/ui/tests/serve.mjs` serves it. A new component gets an entry in `components`:
// the test (../tests/rules.test.mjs) fails while one is missing.
//
// AN EXAMPLE IS A FUNCTION, and the page shows the function's own text as its code, so what a
// person copies is what runs above it.
import { html, render, useEffect, useState } from "@iterate-com/ui/page";
import { Badge } from "@ritvel/ui/badge.js";
import { Button } from "@ritvel/ui/button.js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@ritvel/ui/card.js";
import { Checkbox } from "@ritvel/ui/checkbox.js";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ritvel/ui/collapsible.js";
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@ritvel/ui/dialog.js";
import { Field, FieldDescription, FieldError, FieldLabel } from "@ritvel/ui/field.js";
import { Input, InputClear, InputGroup } from "@ritvel/ui/input.js";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuShortcut, MenuTrigger } from "@ritvel/ui/menu.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ritvel/ui/select.js";
import { Spinner } from "@ritvel/ui/spinner.js";
import { Switch } from "@ritvel/ui/switch.js";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ritvel/ui/tabs.js";
import { Textarea } from "@ritvel/ui/textarea.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ritvel/ui/tooltip.js";

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const components = [
  {
    id: "button", name: "Button", parts: "Button",
    about: "Runs an action. An onClick that returns a promise keeps the button pending until it settles, so nothing is sent twice.",
    examples: [
      ["Variants", () => html`
        <${Button}>Default<//>
        <${Button} variant="secondary">Secondary<//>
        <${Button} variant="outline">Outline<//>
        <${Button} variant="ghost">Ghost<//>
        <${Button} variant="destructive">Destructive<//>
        <${Button} variant="link">Link<//>`],
      ["Sizes", () => html`
        <${Button} size="sm">Small<//>
        <${Button}>Default<//>
        <${Button} size="lg">Large<//>`],
      ["Pending and disabled", () => html`
        <${Button} onClick=${() => wait(1500)} pendingAnnouncement="Saving">Save<//>
        <${Button} variant="outline" disabled>Disabled<//>`],
      ["As a link", () => html`
        <${Button} variant="outline" render=${html`<a href="#button" />`}>Open<//>`],
    ],
  },
  {
    id: "input", name: "Input", parts: "Input, InputClear, InputGroup",
    about: "One line of text. A group holds the input with a button that clears it.",
    examples: [
      ["Plain", () => html`
        <${Input} aria-label="Name" placeholder="Ada Lovelace" />`],
      ["With a clear button", () => html`
        <${InputGroup}>
          <${Input} type="search" aria-label="Search" placeholder="Type, then clear" />
          <${InputClear} aria-label="Clear search" />
        <//>`],
      ["Controlled", () => {
        const [name, setName] = useState("Carson");
        return html`
          <${Input} aria-label="Name" value=${name} onValueChange=${setName} />
          <p>Hello, ${name || "nobody"}.</p>`;
      }],
    ],
  },
  {
    id: "textarea", name: "Textarea", parts: "Textarea",
    about: "Several lines of text.",
    examples: [
      ["Plain", () => html`
        <${Textarea} aria-label="Note" placeholder="A few words" />`],
    ],
  },
  {
    id: "field", name: "Field", parts: "Field, FieldDescription, FieldError, FieldLabel",
    about: "Ties a control to its label, its description and its error. The error shows once a submit finds the control invalid.",
    examples: [
      ["In a form", () => html`
        <form onSubmit=${event => event.preventDefault()}>
          <${Field} name="email">
            <${FieldLabel}>Email<//>
            <${Input} type="email" placeholder="ada@example.com" required />
            <${FieldDescription}>Where the invitation goes.<//>
            <${FieldError} />
          <//>
          <${Button} type="submit">Invite<//>
        </form>`],
      ["Invalid", () => html`
        <${Field} name="note" invalid>
          <${FieldLabel}>Note<//>
          <${Textarea} />
          <${FieldError}>A note is needed.<//>
        <//>`],
    ],
  },
  {
    id: "select", name: "Select", parts: "Select, SelectContent, SelectItem, SelectTrigger, SelectValue",
    about: "Picks one value from a list that opens beside its trigger. Type to jump to an option.",
    examples: [
      ["In a field", () => html`
        <${Field} name="role">
          <${FieldLabel}>Role<//>
          <${Select} placeholder="Select a role">
            <${SelectTrigger}><${SelectValue} /><//>
            <${SelectContent}>
              <${SelectItem} value="viewer">Viewer<//>
              <${SelectItem} value="editor">Editor<//>
              <${SelectItem} value="owner">Owner<//>
              <${SelectItem} value="guest" disabled>Guest<//>
            <//>
          <//>
        <//>`],
    ],
  },
  {
    id: "menu", name: "Menu", parts: "Menu, MenuContent, MenuItem, MenuSeparator, MenuShortcut, MenuTrigger",
    about: "Actions behind a button. The trigger takes a Button through render.",
    examples: [
      ["Actions", () => html`
        <${Menu}>
          <${MenuTrigger} render=${html`<${Button} variant="outline" />`}>Actions<//>
          <${MenuContent}>
            <${MenuItem} value="rename">Rename<${MenuShortcut}>F2<//><//>
            <${MenuItem} value="duplicate">Duplicate<//>
            <${MenuSeparator} />
            <${MenuItem} value="delete" variant="destructive">Delete<//>
          <//>
        <//>`],
    ],
  },
  {
    id: "dialog", name: "Dialog", parts: "Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger",
    about: "A focused task over the page. Focus moves in, Tab stays inside, and Escape closes it.",
    examples: [
      ["Confirm", () => html`
        <${Dialog}>
          <${DialogTrigger} render=${html`<${Button} variant="outline" />`}>Archive…<//>
          <${DialogBackdrop} />
          <${DialogContent}>
            <${DialogTitle}>Archive this agent?<//>
            <${DialogDescription}>It leaves the sidebar. Its history stays, and you can bring it back.<//>
            <${DialogFooter}>
              <${DialogClose} render=${html`<${Button} variant="ghost" />`}>Cancel<//>
              <${DialogClose} render=${html`<${Button} />`}>Archive<//>
            <//>
          <//>
        <//>`],
    ],
  },
  {
    id: "tooltip", name: "Tooltip", parts: "Tooltip, TooltipContent, TooltipTrigger",
    about: "A short hint on hover and on keyboard focus. Plain text only.",
    examples: [
      ["On a button", () => html`
        <${Tooltip}>
          <${TooltipTrigger} render=${html`<${Button} variant="outline" />`}>Share<//>
          <${TooltipContent}>Anyone with the link can view<//>
        <//>`],
    ],
  },
  {
    id: "tabs", name: "Tabs", parts: "Tabs, TabsList, TabsPanel, TabsTab",
    about: "Related panels, one shown at a time. Arrow keys move between the tabs.",
    examples: [
      ["Settings", () => html`
        <${Tabs} defaultValue="account">
          <${TabsList} aria-label="Settings">
            <${TabsTab} value="account">Account<//>
            <${TabsTab} value="access">Access<//>
            <${TabsTab} value="billing" disabled>Billing<//>
          <//>
          <${TabsPanel} value="account">Your name and your sessions.<//>
          <${TabsPanel} value="access">Who may sign in, and how.<//>
        <//>`],
    ],
  },
  {
    id: "switch", name: "Switch", parts: "Switch",
    about: "Turns one setting on or off, at once.",
    examples: [
      ["In a label", () => html`
        <label><${Switch} defaultChecked /> Notifications</label>
        <label><${Switch} disabled /> Disabled</label>`],
    ],
  },
  {
    id: "checkbox", name: "Checkbox", parts: "Checkbox",
    about: "One choice of several, sent with a form.",
    examples: [
      ["In a label", () => html`
        <label><${Checkbox} defaultChecked /> Remember me</label>
        <label><${Checkbox} /> Send a copy</label>`],
    ],
  },
  {
    id: "collapsible", name: "Collapsible", parts: "Collapsible, CollapsiblePanel, CollapsibleTrigger",
    about: "Shows and hides a panel under its heading.",
    examples: [
      ["Details", () => html`
        <${Collapsible}>
          <${CollapsibleTrigger}>Costs by product<//>
          <${CollapsiblePanel}>
            <p>Workers · USD 4.20</p>
            <p>Durable Objects · USD 1.10</p>
          <//>
        <//>`],
    ],
  },
  {
    id: "card", name: "Card", parts: "Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle",
    about: "A surface for one thing and its actions.",
    examples: [
      ["An agent", () => html`
        <${Card}>
          <${CardHeader}>
            <${CardTitle}>Carson<//>
            <${CardDescription}>Personal butler. Awake since this morning.<//>
          <//>
          <${CardContent}>Three helpers are at work.<//>
          <${CardFooter}><${Button} size="sm">Open chat<//><//>
        <//>`],
    ],
  },
  {
    id: "badge", name: "Badge", parts: "Badge",
    about: "A short label for a state or a count.",
    examples: [
      ["Variants", () => html`
        <${Badge}>Awake<//>
        <${Badge} variant="secondary">3 helpers<//>
        <${Badge} variant="outline">voice<//>
        <${Badge} variant="destructive">1 failed<//>`],
    ],
  },
  {
    id: "spinner", name: "Spinner", parts: "Spinner",
    about: "Says that something loads, to the eye and to a screen reader.",
    examples: [
      ["Alone and in a button", () => html`
        <${Spinner} />
        <${Button} variant="outline" disabled><${Spinner} aria-label="Saving" /> Saving<//>`],
    ],
  },
];

/** An example's code: the text of its function, without the wrapper and the indent. */
function codeOf(example) {
  const source = example.toString().replace(/^\(\) => html`\n?/, "").replace(/`$/, "").replace(/^\(\) => \{\n?/, "").replace(/\}$/, "");
  const lines = source.split("\n").filter((line, index, all) => line.trim() || (index && index < all.length - 1));
  const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^ */)[0].length));
  return lines.map(line => line.slice(indent)).join("\n").trimEnd();
}

function Example({ name, example: Demo }) {
  const [copied, setCopied] = useState(false);
  const code = codeOf(Demo);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    await wait(1500);
    setCopied(false);
  };
  return html`<article className="g-example">
    <header><h3>${name}</h3>
      <${Button} size="sm" variant="ghost" onClick=${copy}>${copied ? "Copied" : "Copy"}<//></header>
    <div className="g-stage"><${Demo} /></div>
    <pre tabIndex="0" aria-label=${name + " code"}><code>${code}</code></pre>
  </article>`;
}

const current = () => components.find(component => "#" + component.id === location.hash) || components[0];

function Gallery() {
  const [shown, setShown] = useState(current);
  // The dark side of apps/theme.css: its colours are light-dark(), so the scheme turns them. A
  // theme that hangs a dark look of its own on `data-sidebar` of <html> shows that one.
  const [dark, setDark] = useState(() => localStorage.getItem("design:theme") === "dark");
  useEffect(() => {
    const follow = () => setShown(current());
    addEventListener("hashchange", follow);
    return () => removeEventListener("hashchange", follow);
  }, []);
  useEffect(() => {
    document.documentElement.style.colorScheme = dark ? "dark" : "";
    document.documentElement.toggleAttribute("data-sidebar", dark);
    localStorage.setItem("design:theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => { document.title = shown.name + " · Ritvel Design"; }, [shown]);

  return html`<div className="g-page">
    <aside className="g-side">
      <a className="g-brand" href="#button">Ritvel Design</a>
      <nav aria-label="Components">${components.map(component => html`
        <a key=${component.id} href=${"#" + component.id}
          aria-current=${component === shown ? "page" : undefined}>${component.name}</a>`)}</nav>
      <label className="g-theme"><${Switch} checked=${dark} onCheckedChange=${setDark} /> Dark</label>
    </aside>
    <main key=${shown.id}>
      <header>
        <h1>${shown.name}</h1>
        <p>${shown.about}</p>
        <pre tabIndex="0" aria-label="Import"><code>${`import { ${shown.parts} } from "@ritvel/ui/${shown.id}.js";`}</code></pre>
      </header>
      ${shown.examples.map(([name, example]) => html`<${Example} key=${name} name=${name} example=${example} />`)}
    </main>
  </div>`;
}

render(html`<${Gallery} />`, document.getElementById("root"));
