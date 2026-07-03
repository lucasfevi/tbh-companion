import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { DataTable, DataTableRow } from "./DataTable";

describe("DataTable", () => {
  it("left-aligns headers and cells by default (not the browser's centered <th> default)", () => {
    render(
      <DataTable columns={[{ label: "Time" }, { label: "Chest" }]}>
        <DataTableRow index={0} cells={[{ content: "10:00 PM" }, { content: "Common chest" }]} />
      </DataTable>,
    );
    expect(screen.getByText("Time")).toHaveClass("text-left");
    expect(screen.getByText("Time")).not.toHaveClass("text-right");
    expect(screen.getByText("Common chest")).not.toHaveClass("text-right");
  });

  it("right-aligns a column's header and cell when align is right", () => {
    render(
      <DataTable columns={[{ label: "Time" }, { label: "Gold", align: "right" }]}>
        <DataTableRow
          index={0}
          cells={[{ content: "10:00 PM" }, { content: "+100", align: "right" }]}
        />
      </DataTable>,
    );
    expect(screen.getByText("Gold")).toHaveClass("text-right");
    expect(screen.getByText("+100")).toHaveClass("text-right");
  });

  it("applies a fixed pixel width to a column via colgroup, shared by header and cells", () => {
    const { container } = render(
      <DataTable columns={[{ label: "Time", width: "88px" }, { label: "Chest" }]}>
        <DataTableRow index={0} cells={[{ content: "10:00 PM" }, { content: "Common chest" }]} />
      </DataTable>,
    );
    const cols = container.querySelectorAll("col");
    expect(cols[0]).toHaveStyle({ width: "88px" });
    expect(cols[1]).not.toHaveAttribute("style");
  });

  it("alternates row background by even/odd index", () => {
    render(
      <DataTable columns={[{ label: "Time" }]}>
        <DataTableRow index={0} cells={[{ content: "Even row" }]} />
        <DataTableRow index={1} cells={[{ content: "Odd row" }]} />
      </DataTable>,
    );
    expect(screen.getByText("Even row").closest("tr")).toHaveClass("bg-panel");
    expect(screen.getByText("Odd row").closest("tr")).not.toHaveClass("bg-panel");
  });

  it("caps the scroll area at maxHeight when set", () => {
    const { container } = render(
      <DataTable columns={[{ label: "Time" }]} maxHeight="168px">
        <DataTableRow index={0} cells={[{ content: "Row" }]} />
      </DataTable>,
    );
    expect(container.firstElementChild).toHaveClass("overflow-y-auto");
    expect(container.firstElementChild).toHaveStyle({ maxHeight: "168px" });
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <DataTable columns={[{ label: "Time" }, { label: "Chest" }]}>
        <DataTableRow index={0} cells={[{ content: "10:00 PM" }, { content: "Common chest" }]} />
      </DataTable>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
