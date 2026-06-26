import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemLink } from "../../src/renderer/components/ItemLink";
import type { LookupBoxSources, LookupItem } from "../../shared/types";

vi.mock("../../src/renderer/components/lookup/ItemCard", () => ({
  ItemCard: ({ item }: { item: LookupItem }) => <div data-testid="item-peek">{item.name}</div>,
}));

vi.mock("../../src/renderer/components/lookup/BoxPeekCard", () => ({
  BoxPeekCard: ({ box }: { box: LookupBoxSources }) => <div data-testid="box-peek">{box.name}</div>,
}));

const sampleItem = { name: "Iron Ore" } as LookupItem;
const sampleBox = { name: "Boss Chest", firstDropOnly: false } as LookupBoxSources;
const firstClearBox = { name: "First-clear Chest", firstDropOnly: true } as LookupBoxSources;

describe("ItemLink", () => {
  it("shows first-clear suffix for firstDropOnly boxes", () => {
    render(
      <ItemLink node={{ type: "box", id: 1 }} name="Boss Chest" peekBox={() => firstClearBox} />,
    );
    expect(screen.getByText("· First clear only")).toHaveClass("text-gold");
  });

  it("uses a custom suffix when the box is not first-clear only", () => {
    render(
      <ItemLink
        node={{ type: "box", id: 1 }}
        name="Boss Chest"
        suffix="· x2"
        peekBox={() => sampleBox}
      />,
    );
    expect(screen.getByText("· x2")).toBeInTheDocument();
  });

  it("wraps item links with an item peek card", async () => {
    const user = userEvent.setup();
    render(
      <ItemLink node={{ type: "item", id: 42 }} name="Iron Ore" peekItem={() => sampleItem} />,
    );
    await user.hover(screen.getByText("Iron Ore"));
    expect(await screen.findByTestId("item-peek")).toHaveTextContent("Iron Ore");
  });

  it("wraps box links with a box peek card", async () => {
    const user = userEvent.setup();
    render(<ItemLink node={{ type: "box", id: 7 }} name="Boss Chest" peekBox={() => sampleBox} />);
    await user.hover(screen.getByText("Boss Chest"));
    expect(await screen.findByTestId("box-peek")).toHaveTextContent("Boss Chest");
  });

  it("calls onNavigate with the lookup node when clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const node = { type: "item" as const, id: 42 };
    render(
      <ItemLink node={node} name="Iron Ore" onNavigate={onNavigate} peekItem={() => sampleItem} />,
    );
    await user.click(screen.getByRole("button", { name: "Iron Ore" }));
    expect(onNavigate).toHaveBeenCalledWith(node);
  });
});
