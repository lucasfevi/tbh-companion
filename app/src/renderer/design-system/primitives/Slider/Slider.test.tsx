import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Slider } from "./Slider";

function ControlledSlider({
  onValueChange,
  initial = 50,
}: {
  onValueChange?: (value: number) => void;
  initial?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Slider
      min={0}
      max={100}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      label="Volume"
      formatValue={(n) => `${n}%`}
    />
  );
}

describe("Slider", () => {
  it("renders a thumb bound to the value", () => {
    render(<ControlledSlider initial={75} />);
    const thumb = screen.getByRole("slider");
    expect(thumb).toHaveAttribute("aria-valuenow", "75");
  });

  it("shows the formatted current value in the readout", () => {
    render(<ControlledSlider initial={42} />);
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("changes the thumb via keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ControlledSlider initial={50} onValueChange={onValueChange} />);
    const thumb = screen.getByRole("slider");
    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith(51);
  });

  it("does not change value when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Slider
        min={0}
        max={100}
        value={50}
        disabled
        onValueChange={onValueChange}
        label="Volume"
        formatValue={(n) => `${n}%`}
      />,
    );
    const thumb = screen.getByRole("slider");
    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<ControlledSlider initial={50} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
