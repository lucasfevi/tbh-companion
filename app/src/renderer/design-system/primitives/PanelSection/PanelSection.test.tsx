import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { PanelSection } from "./PanelSection";

describe("PanelSection", () => {
  it("renders a heading and unwrapped children by default", () => {
    render(
      <PanelSection title="Heroes">
        <p>Content</p>
      </PanelSection>,
    );
    expect(screen.getByRole("heading", { name: "Heroes" })).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("wraps children in a Card when boxed", () => {
    const { container } = render(
      <PanelSection title="Heroes" boxed>
        <p>Content</p>
      </PanelSection>,
    );
    expect(container.querySelector(".border-border")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <PanelSection title="Heroes" boxed>
        <p>Content</p>
      </PanelSection>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
