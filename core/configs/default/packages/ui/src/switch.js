import { createElement } from "react";
import { Switch as Base, SwitchThumb } from "@ui-sdk/react/switch";
import { styled } from "./styled.js";

const Root = styled(Base, "switch");
const Thumb = styled(SwitchThumb, "switch-thumb");

/** A switch with its thumb. Wrap it and its text in a `<label>`, or name it with `aria-label`. */
export const Switch = props => createElement(Root, props, createElement(Thumb));
