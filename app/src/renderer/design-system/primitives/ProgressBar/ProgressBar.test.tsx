import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("sets the fill width from percent", () => {
    const { container } = render(<ProgressBar percent={42} />);
    const fill = container.querySelector(".bg-accent");
    expect(fill).toHaveStyle({ width: "42%" });
  });

  it("renders the optional label below the bar", () => {
    render(<ProgressBar percent={50} label={<span>50/100</span>} />);
    expect(screen.getByText("50/100")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<ProgressBar percent={50} label={<span>50%</span>} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
