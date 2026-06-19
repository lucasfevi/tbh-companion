import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Card } from "./Card";

describe("Card", () => {
  it("renders as a div by default and as the requested element via `as`", () => {
    const { container, rerender } = render(<Card>content</Card>);
    expect(container.querySelector("div")).toHaveTextContent("content");

    rerender(
      <ul>
        <Card as="li">item</Card>
      </ul>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("item");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Card>Live stats</Card>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
