import * as Base from "@ui-sdk/react/select";
import { styled } from "./styled.js";

export const Select = Base.Select;
export const SelectValue = Base.SelectValue;
export const SelectGroup = Base.SelectGroup;
export const SelectLabel = styled(Base.SelectLabel, "field-label");
/** size: default | sm. */
export const SelectTrigger = styled(Base.SelectTrigger, "select-trigger", { size: "default" });
export const SelectContent = styled(Base.SelectContent, "popup", {}, { sideOffset: 4 });
export const SelectItem = styled(Base.SelectItem, "item");
export const SelectGroupLabel = styled(Base.SelectGroupLabel, "group-label");
export const SelectSeparator = styled(Base.SelectSeparator, "separator");
