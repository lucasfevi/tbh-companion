import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { HintBanner } from "./HintBanner";

describe("HintBanner", () => {
  it("renders its children", () => {
    render(<HintBanner>Player.log not found beside your save.</HintBanner>);
    expect(screen.getByText("Player.log not found beside your save.")).toBeInTheDocument();
  });

  it("merges a custom className onto the base styling", () => {
    render(<HintBanner className="border-l-muted text-muted">Hint</HintBanner>);
    expect(screen.getByText("Hint")).toHaveClass("border-l-muted", "text-muted", "rounded-md");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<HintBanner>Hint text</HintBanner>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
