import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Dialog, DialogClose, DialogTitle } from "./Dialog";
import { Button } from "../Button/Button";

function ControlledDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button
        size="sm"
        onClick={() => {
          setOpen(true);
          onOpenChange?.(true);
        }}
      >
        Open dialog
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
      >
        <DialogTitle>Dialog title</DialogTitle>
        <p>Dialog content</p>
        <input type="text" aria-label="dialog input" />
        <DialogClose render={<Button>Got it</Button>} />
      </Dialog>
    </div>
  );
}

describe("Dialog", () => {
  it("moves focus into the dialog when opened", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
  });

  it("traps Tab focus within the dialog", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);
    const outsideTrigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(outsideTrigger);
    await screen.findByRole("dialog");

    // Base UI implements the trap with invisible focus-guard sentinels
    // rendered as siblings of the dialog popup (not descendants), so
    // toContainElement would be the wrong assertion — what actually matters
    // is that focus never lands back on content outside the dialog (e.g.
    // the trigger that opened it) while cycling through Tab stops.
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(document.activeElement).not.toBe(outsideTrigger);
      expect(document.activeElement).not.toBe(document.body);
    }
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("restores focus to the trigger when closed", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("dismisses via the DialogClose-rendered button", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ControlledDialog onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("dismisses on backdrop click", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog");

    // The backdrop is the sibling element rendered just before the popup
    // inside the portal — find it via its fixed-inset styling hook.
    const backdrop = document.body.querySelector(".fixed.inset-0");
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("has no detectable accessibility violations when open", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog");
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
