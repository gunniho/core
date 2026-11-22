import { createElement } from "react";
import { Input as Base, InputClear as BaseClear, InputGroup as BaseGroup } from "@ui-sdk/react/input";
import { styled } from "./styled.js";

export const Input = styled(Base, "input");
export const InputGroup = styled(BaseGroup, "input-group");

const Clear = styled(BaseClear, "input-clear");
const cross = createElement("svg", { viewBox: "0 0 16 16", "aria-hidden": true },
  createElement("path", { d: "m4 4 8 8m0-8-8 8" }));

/** Empties the input of its group. Name it: `aria-label="Clear search"`. */
export const InputClear = ({ children = cross, ...props }) => createElement(Clear, props, children);
