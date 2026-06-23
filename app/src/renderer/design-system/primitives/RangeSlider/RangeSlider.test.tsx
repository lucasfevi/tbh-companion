import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { RangeSlider } from "./RangeSlider";

function ControlledRangeSlider({
  onValueChange,
  initial = [1, 100],
}: {
  onValueChange?: (value: [number, number]) => void;
  initial?: [number, number];
}) {
  const [value, setValue] = useState<[number, number]>(initial);
  return (
    <RangeSlider
      min={1}
      max={100}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      label="Level"
    />
  );
}

describe("RangeSlider", () => {
  it("renders two thumbs bound to the value tuple", () => {
    render(<ControlledRangeSlider initial={[20, 60]} />);
    const thumbs = screen.getAllByRole("slider");
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "20");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "60");
  });

  it("shows the formatted current range in the readout", () => {
    render(<ControlledRangeSlider initial={[10, 40]} />);
    expect(screen.getByText("Lv 10 – Lv 40")).toBeInTheDocument();
  });

  it("changes the low thumb via keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ControlledRangeSlider initial={[20, 60]} onValueChange={onValueChange} />);
    const [lowThumb] = screen.getAllByRole("slider");
    lowThumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith([21, 60]);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<ControlledRangeSlider initial={[20, 60]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
