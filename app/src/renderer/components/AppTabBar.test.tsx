import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppTabBar } from "./AppTabBar";

describe("AppTabBar", () => {
  it("renders tablist roles and reports tab changes", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<AppTabBar tab="live" onTabChange={onTabChange} />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Live" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(onTabChange).toHaveBeenCalledWith("settings");
  });
});
