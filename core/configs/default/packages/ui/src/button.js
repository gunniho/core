import { Button as Base } from "@ui-sdk/react/button";
import { styled } from "./styled.js";

/** variant: default | secondary | outline | ghost | destructive | link.
 *  size: default | sm | lg | icon | icon-sm. An `onClick` that returns a promise keeps the
 *  button pending until it settles. */
export const Button = styled(Base, "button", { variant: "default", size: "default" });
