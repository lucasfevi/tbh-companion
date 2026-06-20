import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders label above value by default", () => {
    const { container } = render(<StatCard label="Session XP" value="1.2K" />);
    const text = container.querySelector(".flex.flex-col")?.textContent;
    expect(text).toBe("Session XP1.2K");
  });

  it("renders value before label when valueFirst is set", () => {
    const { container } = render(<StatCard label="Session XP" value="1.2K" valueFirst />);
    const text = container.querySelector(".flex.flex-col")?.textContent;
    expect(text).toBe("1.2KSession XP");
  });

  it("renders the optional detail line", () => {
    render(<StatCard label="Common chests" value="42" detail="12/hr" />);
    expect(screen.getByText("12/hr")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<StatCard label="Session XP" value="1.2K" detail="12/hr" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the highlight variant with an accent value and label after value order", () => {
    render(<StatCard label="Market value" value="$1,284.50" variant="highlight" />);
    const value = screen.getByText("$1,284.50");
    expect(value.className).toContain("text-accent");
  });

  it("shows a help cursor on the highlight variant only when title is set", () => {
    const { container: withTitle } = render(
      <StatCard label="Market value" value="$1.2K" variant="highlight" title="tooltip" />,
    );
    expect(withTitle.querySelector(".cursor-help")).not.toBeNull();

    const { container: withoutTitle } = render(
      <StatCard label="Market value" value="$1.2K" variant="highlight" />,
    );
    expect(withoutTitle.querySelector(".cursor-help")).toBeNull();
  });
});
