import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Popover } from "./Popover";
import { Button } from "../Button/Button";

function ControlledPopover({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
        trigger={<Button size="sm">Columns</Button>}
        aria-label="Visible columns"
      >
        <p>Panel content</p>
      </Popover>
      <button type="button">outside</button>
    </div>
  );
}

describe("Popover", () => {
  it("opens on trigger click and renders children", async () => {
    const user = userEvent.setup();
    render(<ControlledPopover />);
    expect(screen.queryByText("Panel content")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Columns" }));
    expect(await screen.findByText("Panel content")).toBeInTheDocument();
  });

  it("closes on outside click", async () => {
    const user = userEvent.setup();
    render(<ControlledPopover />);
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Panel content");

    await user.click(screen.getByRole("button", { name: "outside" }));
    await waitFor(() => expect(screen.queryByText("Panel content")).not.toBeInTheDocument());
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ControlledPopover />);
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Panel content");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Panel content")).not.toBeInTheDocument());
  });

  it("returns focus to the trigger when closed via Escape", async () => {
    const user = userEvent.setup();
    render(<ControlledPopover />);
    const trigger = screen.getByRole("button", { name: "Columns" });
    await user.click(trigger);
    await screen.findByText("Panel content");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Panel content")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("reports open state changes via onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ControlledPopover onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Columns" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
  });

  it("exposes an accessible name on the popup (role=dialog needs aria-label)", async () => {
    const user = userEvent.setup();
    render(<ControlledPopover />);
    await user.click(screen.getByRole("button", { name: "Columns" }));
    expect(await screen.findByRole("dialog", { name: "Visible columns" })).toBeInTheDocument();
  });

  it("has no detectable accessibility violations when open", async () => {
    const user = userEvent.setup();
    render(<ControlledPopover />);
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Panel content");
    // The popup renders via a portal into document.body, outside the
    // render()-returned container, so scan the whole document instead.
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
