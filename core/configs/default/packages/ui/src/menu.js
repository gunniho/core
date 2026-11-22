import * as Base from "@ui-sdk/react/menu";
import { styled } from "./styled.js";

export const Menu = Base.Menu;
/** Unstyled: give it a button, `render=${html`<${Button} variant="outline" />`}`. */
export const MenuTrigger = Base.MenuTrigger;
export const MenuGroup = Base.MenuGroup;
export const MenuRadioGroup = Base.MenuRadioGroup;
export const MenuContent = styled(Base.MenuContent, "popup", {}, { sideOffset: 4 });
/** variant: default | destructive. */
export const MenuItem = styled(Base.MenuItem, "item", { variant: null });
export const MenuCheckboxItem = styled(Base.MenuCheckboxItem, "item");
export const MenuRadioItem = styled(Base.MenuRadioItem, "item");
export const MenuGroupLabel = styled(Base.MenuGroupLabel, "group-label");
export const MenuSeparator = styled(Base.MenuSeparator, "separator");
export const MenuShortcut = styled(Base.MenuShortcut, "shortcut");
