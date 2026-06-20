import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Switch } from "./Switch";

function ControlledSwitch({ onCheckedChange }: { onCheckedChange?: (checked: boolean) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <Switch
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next);
        onCheckedChange?.(next);
      }}
      aria-label="Enable notifications"
    />
  );
}

describe("Switch", () => {
  it("toggles checked state on click", async () => {
    const user = userEvent.setup();
    render(<ControlledSwitch />);
    const toggle = screen.getByRole("switch", { name: "Enable notifications" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("toggles via keyboard activation (Space)", async () => {
    const user = userEvent.setup();
    render(<ControlledSwitch />);
    const toggle = screen.getByRole("switch", { name: "Enable notifications" });
    toggle.focus();

    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("reports checked changes via onCheckedChange", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<ControlledSwitch onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole("switch", { name: "Enable notifications" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Switch
        checked={false}
        onCheckedChange={onCheckedChange}
        disabled
        aria-label="Disabled toggle"
      />,
    );
    const toggle = screen.getByRole("switch", { name: "Disabled toggle" });
    expect(toggle).toHaveAttribute("aria-disabled", "true");

    await user.click(toggle);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<ControlledSwitch />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
