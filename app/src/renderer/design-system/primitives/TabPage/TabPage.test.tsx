import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { TabPage } from "./TabPage";

describe("TabPage", () => {
  it("renders its children", () => {
    render(
      <TabPage>
        <p>Section content</p>
      </TabPage>,
    );
    expect(screen.getByText("Section content")).toBeInTheDocument();
  });

  it("merges a custom className onto the base layout", () => {
    const { container } = render(<TabPage className="p-4">content</TabPage>);
    expect(container.firstElementChild).toHaveClass("p-4", "flex", "flex-col");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <TabPage>
        <p>Content</p>
      </TabPage>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
