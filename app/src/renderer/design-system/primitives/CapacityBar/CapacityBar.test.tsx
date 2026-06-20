import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { CapacityBar } from "./CapacityBar";

describe("CapacityBar", () => {
  it("sets the fill width from percent and the variant's color class", () => {
    render(<CapacityBar percent={60} variant="blue" role="progressbar" aria-label="Capacity" />);
    const track = screen.getByRole("progressbar");
    const fill = track.firstElementChild;
    expect(fill).toHaveStyle({ width: "60%" });
    expect(fill).toHaveClass("bg-status-info");
  });

  it("applies compact sizing", () => {
    render(
      <CapacityBar percent={50} variant="gray" compact role="progressbar" aria-label="Compact" />,
    );
    expect(screen.getByRole("progressbar")).toHaveClass("h-1.5");
  });

  it("forwards arbitrary HTML attributes (e.g. aria-valuenow)", () => {
    render(
      <CapacityBar
        percent={50}
        variant="red"
        role="progressbar"
        aria-valuenow={50}
        aria-label="Items"
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <CapacityBar percent={50} variant="blue" role="progressbar" aria-label="Capacity" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
