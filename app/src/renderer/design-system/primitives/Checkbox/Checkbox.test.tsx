import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Checkbox } from "./Checkbox";

function ControlledCheckbox({ onCheckedChange }: { onCheckedChange?: (checked: boolean) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next);
        onCheckedChange?.(next);
      }}
      label="Show grade column"
    />
  );
}

describe("Checkbox", () => {
  it("toggles checked state on click", async () => {
    const user = userEvent.setup();
    render(<ControlledCheckbox />);
    const box = screen.getByRole("checkbox", { name: "Show grade column" });
    expect(box).toHaveAttribute("aria-checked", "false");

    await user.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");

    await user.click(box);
    expect(box).toHaveAttribute("aria-checked", "false");
  });

  it("toggles by clicking the label text", async () => {
    const user = userEvent.setup();
    render(<ControlledCheckbox />);
    await user.click(screen.getByText("Show grade column"));
    expect(screen.getByRole("checkbox", { name: "Show grade column" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("reports changes via onCheckedChange", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<ControlledCheckbox onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole("checkbox", { name: "Show grade column" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox checked={false} onCheckedChange={onCheckedChange} disabled label="Disabled box" />,
    );
    const box = screen.getByRole("checkbox", { name: "Disabled box" });
    expect(box).toHaveAttribute("aria-disabled", "true");

    await user.click(box);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("supports a bare box via aria-label", () => {
    render(<Checkbox checked onCheckedChange={() => {}} aria-label="Bare box" />);
    expect(screen.getByRole("checkbox", { name: "Bare box" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<ControlledCheckbox />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
