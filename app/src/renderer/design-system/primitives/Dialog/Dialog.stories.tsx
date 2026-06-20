import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog, DialogClose, DialogTitle } from "./Dialog";
import { Button } from "../Button/Button";

/**
 * Generic modal chrome (backdrop + centered panel) built on Base UI's
 * Dialog. Unlike the old WhatsNewModal, this gets a real focus trap (Tab
 * cycles within the dialog), focus moves into the popup on open, and focus
 * returns to the trigger on close — all handled by Base UI, not hand-rolled.
 * Compose `DialogTitle` for the accessible heading and `DialogClose` (via
 * its `render` prop) for any element that should close the dialog.
 */
function ControlledDialog(props: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {props.children}
      </Dialog>
    </>
  );
}

const meta = {
  title: "Design System/Dialog",
  component: Dialog,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ControlledDialog>
      <div className="flex flex-col gap-3">
        <DialogTitle className="m-0 text-lg font-semibold text-fg">Dialog title</DialogTitle>
        <p className="m-0 text-sm text-muted">Some dialog content goes here.</p>
        <div className="mt-1 flex justify-end gap-2">
          <DialogClose render={<Button>Close</Button>} />
        </div>
      </div>
    </ControlledDialog>
  ),
  args: { open: false, onOpenChange: () => {}, children: null },
};

/**
 * Worked example of the exact composition WhatsNewModal.tsx uses — a kicker
 * label above the title (not part of the generic Dialog chrome, since it's
 * content-specific), a bullet list, an external link, and two dismiss paths
 * (an action ButtonLink that also dismisses, plus DialogClose for "Got it").
 * Content here is stubbed; the real component wires this to IPC.
 */
export const WhatsNewModalExample: Story = {
  render: () => (
    <ControlledDialog>
      <div className="flex flex-col gap-3">
        <div>
          <p className="m-0 text-xs font-semibold uppercase text-accent">Updated</p>
          <DialogTitle className="m-0 mt-1 text-lg font-semibold text-fg">
            TBH Companion v1.15.0
          </DialogTitle>
        </div>
        <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
          <li>
            Design system migration: buttons, selects, and dialogs now share one component library.
          </li>
          <li>Fixed a chevron-spacing bug in dropdown menus.</li>
        </ul>
        <a
          href="#"
          className="inline-flex w-fit text-sm font-semibold text-accent underline decoration-accent/60 underline-offset-4"
        >
          Full release notes on GitHub
        </a>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <DialogClose render={<Button>Got it</Button>} />
        </div>
      </div>
    </ControlledDialog>
  ),
  args: { open: false, onOpenChange: () => {}, children: null },
};
