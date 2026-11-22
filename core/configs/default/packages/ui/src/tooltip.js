import * as Base from "@ui-sdk/react/tooltip";
import { styled } from "./styled.js";

export const Tooltip = Base.Tooltip;
/** Unstyled: give it the control it describes, `render=${html`<${Button} size="icon" />`}`. */
export const TooltipTrigger = Base.TooltipTrigger;
export const TooltipContent = styled(Base.TooltipContent, "tooltip", {}, { sideOffset: 6 });
