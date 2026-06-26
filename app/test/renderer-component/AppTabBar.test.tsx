import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { AppTabBar } from "../../src/renderer/components/AppTabBar";

describe("AppTabBar", () => {
  beforeEach(() => {
    window.tbh = {
      openOverlay: vi.fn(),
      openBoxTracker: vi.fn(),
    } as unknown as typeof window.tbh;
  });

  it("renders tablist roles and reports tab changes", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<AppTabBar tab="live" onTabChange={onTabChange} />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Live" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(onTabChange).toHaveBeenCalledWith("settings");
  });

  it("renders overlay toolbar alongside the tab list", () => {
    render(<AppTabBar tab="live" onTabChange={() => {}} />);
    expect(screen.getByRole("toolbar", { name: "Overlays" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mini/i })).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<AppTabBar tab="live" onTabChange={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
