import { createElement } from "react";
import { Checkbox as Base, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { styled } from "./styled.js";

const Root = styled(Base, "checkbox");
const Indicator = styled(CheckboxIndicator, "checkbox-indicator");

/** A checkbox with its mark. Wrap it and its text in a `<label>`, or name it with `aria-label`. */
export const Checkbox = props => createElement(Root, props, createElement(Indicator, { "aria-hidden": true }));
