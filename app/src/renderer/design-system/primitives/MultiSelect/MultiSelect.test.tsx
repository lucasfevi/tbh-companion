import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { MultiSelect, type MultiSelectGroup, type MultiSelectOption } from "./MultiSelect";

const GRADES: MultiSelectOption[] = [
  { value: "RARE", label: "Rare" },
  { value: "EPIC", label: "Epic" },
  { value: "ARCANA", label: "Arcana" },
  { value: "IMMORTAL", label: "Immortal" },
];

const GROUPS: MultiSelectGroup[] = [
  { label: "Offense", options: [{ value: "atk", label: "Attack" }] },
  { label: "Defense", options: [{ value: "hp", label: "Health" }] },
];

function Controlled({
  options = GRADES,
  initial = [],
  searchable = true,
  onValueChange,
}: {
  options?: MultiSelectOption[] | MultiSelectGroup[];
  initial?: string[];
  searchable?: boolean;
  onValueChange?: (value: string[]) => void;
}) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <MultiSelect
      options={options}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      label="Grade"
      allLabel="All grades"
      searchable={searchable}
    />
  );
}

function getTrigger() {
  return screen.getByRole("combobox", { name: /grade/i });
}

describe("MultiSelect", () => {
  it("shows the all-label when nothing is selected", () => {
    render(<Controlled />);
    expect(screen.getByText("All grades")).toBeInTheDocument();
  });

  it("selects an option and reports its value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Controlled onValueChange={onValueChange} />);
    await user.click(getTrigger());
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Arcana"));
    expect(onValueChange).toHaveBeenCalledWith(["ARCANA"]);
  });

  it("summarizes multiple selections as a count", () => {
    render(<Controlled initial={["ARCANA", "IMMORTAL"]} />);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("shows the single label when exactly one is selected", () => {
    render(<Controlled initial={["EPIC"]} />);
    expect(screen.getByText("Epic")).toBeInTheDocument();
  });

  it("clears the selection via the clear button", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Controlled initial={["ARCANA"]} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: /clear grade/i }));
    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it("filters options by the search input", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(getTrigger());
    const search = await screen.findByPlaceholderText("Search…");
    await user.type(search, "imm");
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Immortal")).toBeInTheDocument();
    expect(within(listbox).queryByText("Rare")).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing matches the search", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(getTrigger());
    const search = await screen.findByPlaceholderText("Search…");
    await user.type(search, "zzzz");
    expect(screen.getByText("No matches.")).toBeInTheDocument();
  });

  it("renders group labels for grouped options", async () => {
    const user = userEvent.setup();
    render(<Controlled options={GROUPS} />);
    await user.click(getTrigger());
    expect(await screen.findByText("Offense")).toBeInTheDocument();
    expect(screen.getByText("Defense")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Controlled initial={["EPIC"]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
