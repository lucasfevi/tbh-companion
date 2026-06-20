import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Tabs } from "./Tabs";
import { TabsList, TabsPanel, TabsTab } from "./TabsParts";

function ControlledTabs({ onValueChange }: { onValueChange?: (value: string) => void }) {
  const [value, setValue] = useState("live");
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
    >
      <TabsList>
        <TabsTab value="live">Live</TabsTab>
        <TabsTab value="inventory">Inventory</TabsTab>
        <TabsTab value="settings" disabled>
          Settings
        </TabsTab>
      </TabsList>
      <TabsPanel value="live">Live panel content</TabsPanel>
      <TabsPanel value="inventory">Inventory panel content</TabsPanel>
      <TabsPanel value="settings">Settings panel content</TabsPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renders tablist/tab/tabpanel roles", () => {
    render(<ControlledTabs />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Live" })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Live panel content");
  });

  it("switches the active panel on tab click", async () => {
    const user = userEvent.setup();
    render(<ControlledTabs />);
    await user.click(screen.getByRole("tab", { name: "Inventory" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Inventory panel content");
    expect(screen.getByRole("tab", { name: "Inventory" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Live" })).toHaveAttribute("aria-selected", "false");
  });

  it("switches tabs via arrow-key navigation", async () => {
    const user = userEvent.setup();
    render(<ControlledTabs />);
    screen.getByRole("tab", { name: "Live" }).focus();

    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("tab", { name: "Inventory" })).toHaveAttribute("aria-selected", "true");
  });

  it("skips disabled tabs", () => {
    render(<ControlledTabs />);
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-disabled", "true");
  });

  it("reports value changes via onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ControlledTabs onValueChange={onValueChange} />);
    await user.click(screen.getByRole("tab", { name: "Inventory" }));
    expect(onValueChange).toHaveBeenCalledWith("inventory");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<ControlledTabs />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
