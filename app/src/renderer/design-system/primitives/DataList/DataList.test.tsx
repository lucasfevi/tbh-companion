import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { DataList, DataListRow } from "./DataList";

describe("DataList", () => {
  it("renders a bordered shell by default", () => {
    const { container } = render(
      <DataList>
        <DataListRow index={0}>Row 1</DataListRow>
      </DataList>,
    );
    expect(container.firstElementChild).toHaveClass("rounded-lg", "border", "border-border");
  });

  it("drops the border when shell is none", () => {
    const { container } = render(
      <DataList shell="none">
        <DataListRow index={0}>Row 1</DataListRow>
      </DataList>,
    );
    expect(container.firstElementChild).not.toHaveClass("border");
  });

  it("applies overflow-y-auto when scrollable", () => {
    const { container } = render(<DataList scrollable>content</DataList>);
    expect(container.firstElementChild).toHaveClass("overflow-y-auto");
  });
});

describe("DataListRow", () => {
  it("alternates background by even/odd index", () => {
    render(
      <>
        <DataListRow index={0}>Even row</DataListRow>
        <DataListRow index={1}>Odd row</DataListRow>
      </>,
    );
    expect(screen.getByText("Even row")).toHaveClass("bg-panel");
    expect(screen.getByText("Odd row")).not.toHaveClass("bg-panel");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <DataList>
        <DataListRow index={0}>Row 1</DataListRow>
        <DataListRow index={1}>Row 2</DataListRow>
      </DataList>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
