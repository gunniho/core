import * as Base from "@ui-sdk/react/dialog";
import { styled } from "./styled.js";

export const Dialog = Base.Dialog;
/** Unstyled: give them a button, `render=${html`<${Button} />`}`. */
export const DialogTrigger = Base.DialogTrigger;
export const DialogClose = Base.DialogClose;
export const DialogBackdrop = styled(Base.DialogBackdrop, "backdrop");
export const DialogContent = styled(Base.DialogContent, "dialog");
export const DialogTitle = styled(Base.DialogTitle, "dialog-title");
export const DialogDescription = styled(Base.DialogDescription, "dialog-description");
/** The row of buttons at the foot of a dialog. */
export const DialogFooter = styled("div", "dialog-footer");
