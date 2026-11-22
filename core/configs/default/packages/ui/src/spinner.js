import { createElement } from "react";
import { styled } from "./styled.js";

const Ring = styled("span", "spinner");

/** A spinner that says "Loading" to a screen reader; pass `aria-label` for other words. */
export const Spinner = props => createElement(Ring, { role: "status", "aria-label": "Loading", ...props });
