import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge variant="statusReady">Ready</Badge>);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Badge variant="full">Full</Badge>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
