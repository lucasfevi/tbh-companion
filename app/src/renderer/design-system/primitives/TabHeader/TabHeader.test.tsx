import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { TabHeader } from "./TabHeader";

describe("TabHeader", () => {
  it("renders the title as a top-level heading", () => {
    render(<TabHeader title="Inventory" />);
    expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument();
  });

  it("renders the optional intro paragraph", () => {
    render(<TabHeader title="Inventory" intro="Track your items and their Steam value." />);
    expect(screen.getByText("Track your items and their Steam value.")).toBeInTheDocument();
  });

  it("renders trailing children below the intro", () => {
    render(
      <TabHeader title="Inventory">
        <button type="button">Refresh</button>
      </TabHeader>,
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <TabHeader title="Inventory" intro="Track your items.">
        <button type="button">Refresh</button>
      </TabHeader>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
