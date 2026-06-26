import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { EntityLink } from "./EntityLink";

describe("EntityLink", () => {
  it("renders a span when onClick is absent", () => {
    render(<EntityLink label="Iron Ore" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Iron Ore")).toBeInTheDocument();
  });

  it("renders a button when onClick is provided", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EntityLink label="Iron Ore" onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "Iron Ore" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("wraps the trigger in a tooltip when peek is provided", async () => {
    const user = userEvent.setup();
    render(<EntityLink label="Iron Ore" peek={<p>Peek content</p>} />);
    await user.hover(screen.getByText("Iron Ore"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Peek content");
  });

  it("renders a suffix with tone", () => {
    render(<EntityLink label="Boss Chest" suffix="· First clear only" suffixTone="gold" />);
    expect(screen.getByText("· First clear only")).toHaveClass("text-gold");
  });

  it("applies grade color to the label", () => {
    render(<EntityLink label="Rare Sword" color="#ff6600" />);
    expect(screen.getByText("Rare Sword")).toHaveStyle({ color: "#ff6600" });
  });

  it("renders a suffix with muted tone", () => {
    render(<EntityLink label="Iron Ore" suffix="· x2" suffixTone="muted" />);
    expect(screen.getByText("· x2")).toHaveClass("text-muted");
  });

  it("renders an icon slot", () => {
    render(<EntityLink label="Iron Ore" icon={<span data-testid="entity-icon" />} />);
    expect(screen.getByTestId("entity-icon")).toBeInTheDocument();
  });

  it("supports peek and onClick together", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EntityLink label="Iron Ore" onClick={onClick} peek={<p>Peek content</p>} />);
    const trigger = screen.getByRole("button", { name: "Iron Ore" });
    await user.hover(trigger);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Peek content");
    await user.click(trigger);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <EntityLink label="Iron Ore" color="#8b5cf6" suffix="· x2" onClick={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
