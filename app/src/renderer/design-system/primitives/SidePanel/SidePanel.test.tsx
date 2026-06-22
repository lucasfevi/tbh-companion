import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { SidePanel } from "./SidePanel";
import { Button } from "../Button/Button";

function ControlledSidePanel({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
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
        Open panel
      </Button>
      <SidePanel
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
        title="Panel title"
      >
        <p>Panel content</p>
      </SidePanel>
    </div>
  );
}

describe("SidePanel", () => {
  it("opens on trigger click and renders children", async () => {
    const user = userEvent.setup();
    render(<ControlledSidePanel />);
    expect(screen.queryByText("Panel content")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open panel" }));
    expect(await screen.findByText("Panel content")).toBeInTheDocument();
  });

  it("exposes an accessible name on the popup via the title prop", async () => {
    const user = userEvent.setup();
    render(<ControlledSidePanel />);
    await user.click(screen.getByRole("button", { name: "Open panel" }));
    expect(await screen.findByRole("dialog", { name: "Panel title" })).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ControlledSidePanel />);
    await user.click(screen.getByRole("button", { name: "Open panel" }));
    await screen.findByText("Panel content");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Panel content")).not.toBeInTheDocument());
  });

  it("closes on backdrop click", async () => {
    const user = userEvent.setup();
    render(<ControlledSidePanel />);
    await user.click(screen.getByRole("button", { name: "Open panel" }));
    await screen.findByText("Panel content");

    const backdrop = document.body.querySelector(".fixed.inset-0");
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);
    await waitFor(() => expect(screen.queryByText("Panel content")).not.toBeInTheDocument());
  });

  it("closes via the close button", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ControlledSidePanel onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Open panel" }));
    await screen.findByText("Panel content");

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByText("Panel content")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("restores focus to the trigger when closed", async () => {
    const user = userEvent.setup();
    render(<ControlledSidePanel />);
    const trigger = screen.getByRole("button", { name: "Open panel" });
    await user.click(trigger);
    await screen.findByText("Panel content");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Panel content")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("reports open state changes via onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ControlledSidePanel onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Open panel" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
  });

  it("has no detectable accessibility violations when open", async () => {
    const user = userEvent.setup();
    render(<ControlledSidePanel />);
    await user.click(screen.getByRole("button", { name: "Open panel" }));
    await screen.findByText("Panel content");
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
