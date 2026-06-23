import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { SortControl } from "./SortControl";

const OPTIONS = [
  { value: "name", label: "Name" },
  { value: "grade", label: "Grade" },
];

describe("SortControl", () => {
  it("shows the ascending icon and label when sortDir is asc", () => {
    render(
      <SortControl
        options={OPTIONS}
        sortKey="name"
        onSortKeyChange={() => {}}
        sortDir="asc"
        onSortDirToggle={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Sort ascending" })).toBeInTheDocument();
  });

  it("shows the descending label when sortDir is desc", () => {
    render(
      <SortControl
        options={OPTIONS}
        sortKey="name"
        onSortKeyChange={() => {}}
        sortDir="desc"
        onSortDirToggle={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Sort descending" })).toBeInTheDocument();
  });

  it("toggles direction when the button is clicked", async () => {
    const user = userEvent.setup();
    const onSortDirToggle = vi.fn();
    render(
      <SortControl
        options={OPTIONS}
        sortKey="name"
        onSortKeyChange={() => {}}
        sortDir="asc"
        onSortDirToggle={onSortDirToggle}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Sort ascending" }));
    expect(onSortDirToggle).toHaveBeenCalledOnce();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <SortControl
        options={OPTIONS}
        sortKey="name"
        onSortKeyChange={() => {}}
        sortDir="asc"
        onSortDirToggle={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
