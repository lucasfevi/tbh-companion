import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Section } from "./Section";

describe("Section", () => {
  it("renders a heading and children", () => {
    render(
      <Section title="App info">
        <p>Version 1.2.3</p>
      </Section>,
    );
    expect(screen.getByRole("heading", { name: "App info" })).toBeInTheDocument();
    expect(screen.getByText("Version 1.2.3")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <Section title="App info">
        <p>Content</p>
      </Section>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
