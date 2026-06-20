import { Dialog as BaseDialog } from "@base-ui/react/dialog";

/**
 * Thin re-exports of Base UI's Title/Close parts, kept out of Dialog.tsx so
 * that file only exports its one named component — co-locating multiple
 * component exports in one file breaks Fast Refresh boundary detection
 * (react-refresh/only-export-components).
 */
export const DialogTitle = BaseDialog.Title;
export const DialogClose = BaseDialog.Close;
