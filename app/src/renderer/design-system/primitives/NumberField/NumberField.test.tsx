import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { NumberField, NumberInput } from "./NumberField";

describe("NumberInput", () => {
  it("renders the default value", () => {
    render(<NumberInput aria-label="Quantity" defaultValue={5} />);
    expect(screen.getByRole("textbox", { name: "Quantity" })).toHaveValue("5");
  });

  it("steps the value with arrow keys, respecting min/max", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput
        aria-label="Quantity"
        min={0}
        max={2}
        defaultValue={1}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Quantity" });
    input.focus();

    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("2");

    // Already at max — should clamp, not exceed.
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("2");

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveValue("0");
  });

  it("filters non-numeric characters at the keystroke level", async () => {
    const user = userEvent.setup();
    render(<NumberInput aria-label="Quantity" defaultValue={1} />);
    const input = screen.getByRole("textbox", { name: "Quantity" });
    await user.clear(input);
    await user.type(input, "12abc34");
    expect(input).toHaveValue("1234");
  });

  it("fires the consumer's onBlur handler with the native input value, for blur-commit patterns", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(<NumberInput aria-label="Quantity" defaultValue={1} onBlur={onBlur} />);
    const input = screen.getByRole("textbox", { name: "Quantity" });
    await user.clear(input);
    await user.type(input, "42");
    await user.tab();

    expect(onBlur).toHaveBeenCalledTimes(1);
    expect((onBlur.mock.calls[0][0].target as HTMLInputElement).value).toBe("42");
  });

  it("disables the input when disabled", () => {
    render(<NumberInput aria-label="Quantity" defaultValue={1} disabled />);
    expect(screen.getByRole("textbox", { name: "Quantity" })).toBeDisabled();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<NumberInput aria-label="Quantity" defaultValue={1} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("NumberField", () => {
  it("renders the label and reserves a footer slot when footer is passed", () => {
    const { container } = render(
      <NumberField label="Cooldown (min)" defaultValue={5} footer={<span>Reset</span>} />,
    );
    expect(screen.getByText("Cooldown (min)")).toBeInTheDocument();
    expect(container.querySelector(".min-h-\\[1\\.125rem\\]")).not.toBeNull();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<NumberField label="Cooldown (min)" defaultValue={5} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
