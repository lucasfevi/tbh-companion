import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Select, type SelectOption } from "./Select";

const OPTIONS: SelectOption[] = [
  { value: 1, label: "Torment 1-1" },
  { value: 2, label: "Torment 1-2" },
  { value: 3, label: "Torment 1-3" },
];

function ControlledSelect(props: Partial<React.ComponentProps<typeof Select>> = {}) {
  const [value, setValue] = useState<string | number>(props.value ?? 1);
  return (
    <Select
      label="Map"
      options={OPTIONS}
      {...props}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        props.onValueChange?.(next);
      }}
    />
  );
}

describe("Select", () => {
  it("shows the selected option's label in the trigger", () => {
    render(<ControlledSelect />);
    expect(screen.getByRole("combobox", { name: "Map" })).toHaveTextContent("Torment 1-1");
  });

  it("opens the listbox on click and lists every option", async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);
    await user.click(screen.getByRole("combobox", { name: "Map" }));
    expect(await screen.findByRole("option", { name: "Torment 1-2" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Torment 1-3" })).toBeInTheDocument();
  });

  it("opens via keyboard (Enter) and selects via arrow-key navigation", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ControlledSelect onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Map" });
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("option", { name: "Torment 1-2" })).toBeInTheDocument();

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onValueChange).toHaveBeenCalled());
    expect(screen.getByRole("combobox", { name: "Map" })).toHaveTextContent("Torment 1-2");
  });

  it("closes on Escape without changing the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ControlledSelect onValueChange={onValueChange} />);
    await user.click(screen.getByRole("combobox", { name: "Map" }));
    expect(await screen.findByRole("option", { name: "Torment 1-2" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "Torment 1-2" })).not.toBeInTheDocument(),
    );
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("closes on outside click", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ControlledSelect />
        <button type="button">outside</button>
      </div>,
    );
    await user.click(screen.getByRole("combobox", { name: "Map" }));
    expect(await screen.findByRole("option", { name: "Torment 1-2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "outside" }));
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "Torment 1-2" })).not.toBeInTheDocument(),
    );
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    render(<ControlledSelect disabled />);
    await user.click(screen.getByRole("combobox", { name: "Map" }));
    expect(screen.queryByRole("option", { name: "Torment 1-2" })).not.toBeInTheDocument();
  });

  it("reserves a fixed-height footer slot regardless of whether the footer's own content is visible", () => {
    // Real consumers (e.g. TrackerFarmStageSelect) always pass a footer and
    // toggle its *inner* content's visibility via `invisible`, rather than
    // mounting/unmounting the footer prop itself — that's what prevents
    // layout shift per docs/STYLING.md. This locks in that the wrapper slot
    // is present either way.
    const { container, rerender } = render(<ControlledSelect footer={<span>Reset</span>} />);
    expect(container.querySelector(".min-h-\\[1\\.125rem\\]")).not.toBeNull();

    rerender(<ControlledSelect footer={<span className="invisible">Reset</span>} />);
    expect(container.querySelector(".min-h-\\[1\\.125rem\\]")).not.toBeNull();
  });

  it("renders a hidden sizing span per option so the trigger's intrinsic width matches the widest label", () => {
    // The trigger stacks one `invisible` aria-hidden span per option behind
    // the visible BaseSelect.Value via CSS grid, so its natural width is
    // driven by the widest option label rather than whichever one is
    // currently selected — this prevents the trigger (and any flex-wrap
    // layout containing it) from reflowing on every selection. jsdom has no
    // layout engine, so this only asserts the structural contract.
    const { container } = render(<ControlledSelect />);
    for (const option of OPTIONS) {
      const hiddenSpan = Array.from(container.querySelectorAll('span[aria-hidden="true"]')).find(
        (el) => el.textContent === option.label,
      );
      expect(hiddenSpan).toBeDefined();
      expect(hiddenSpan).toHaveClass("invisible");
    }
    expect(screen.getByRole("combobox", { name: "Map" })).toHaveTextContent("Torment 1-1");
  });

  it("shows a Tooltip (not a native title attribute) on the trigger when title is set", async () => {
    render(<ControlledSelect title="Sort by" />);
    const trigger = screen.getByRole("combobox", { name: "Map" });
    expect(trigger).not.toHaveAttribute("title");

    trigger.focus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Sort by");
  });

  it("has no detectable accessibility violations when closed", async () => {
    const { container } = render(<ControlledSelect />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no detectable accessibility violations when open", async () => {
    const user = userEvent.setup();
    const { container } = render(<ControlledSelect />);
    await user.click(screen.getByRole("combobox", { name: "Map" }));
    await screen.findByRole("option", { name: "Torment 1-2" });
    expect(await axe(container)).toHaveNoViolations();
  });
});
