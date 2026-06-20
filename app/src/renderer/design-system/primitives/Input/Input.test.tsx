import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Input } from "./Input";

describe("Input", () => {
  it("renders a text input and forwards typed values", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input placeholder="Search items..." onChange={onChange} />);
    const input = screen.getByPlaceholderText("Search items...");

    await user.type(input, "hi");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("merges a custom className onto the base styling", () => {
    render(<Input className="max-w-xs" placeholder="Search" />);
    expect(screen.getByPlaceholderText("Search")).toHaveClass("max-w-xs", "rounded-md");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Input aria-label="Search items" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
