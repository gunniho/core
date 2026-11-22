// styled.js — HOW A RITVEL COMPONENT GETS ITS LOOK. `styled(Base, "button", { variant: "default" })`
// answers a component that renders `Base` (a UI SDK part, or a tag name) with the class
// `rv-button`, and turns each named variant prop into a `data-` attribute (`data-variant`,
// `data-size`) that ui.css styles. `defaults` are props the part gets unless the caller passes
// its own. Everything else, `className` and `render` too, passes through.
import { createElement } from "react";
import { renderElement } from "@ui-sdk/react/primitive";

const join = (...names) => names.filter(Boolean).join(" ");

export function styled(Base, name, variants = {}, defaults = {}) {
  const className = "rv-" + name;
  function Styled({ className: extra, ...given }) {
    const props = { ...defaults, ...given };
    for (const [key, fallback] of Object.entries(variants)) {
      const value = props[key] ?? fallback;
      delete props[key];
      if (value != null) props["data-" + key] = value;
    }
    // A plain tag has no state: UI SDK's renderElement gives it the `render` prop its parts have.
    if (typeof Base === "string") {
      const { render, ...rest } = props;
      return renderElement(Base, { ...rest, className: join(className, extra) }, render);
    }
    // A UI SDK part takes a class as a function of its state.
    props.className = typeof extra === "function" ? state => join(className, extra(state)) : join(className, extra);
    return createElement(Base, props);
  }
  Styled.displayName = className;
  return Styled;
}
