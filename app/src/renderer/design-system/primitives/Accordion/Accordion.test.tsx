import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Accordion } from "./Accordion";

describe("Accordion", () => {
  it("toggles the panel open and closed on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <Accordion title="Section title">
        <p>Hidden content</p>
      </Accordion>,
    );
    const trigger = screen.getByRole("button", { name: "Section title" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Hidden content")).toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles via keyboard activation (Enter/Space)", async () => {
    const user = userEvent.setup();
    render(
      <Accordion title="Section title">
        <p>Hidden content</p>
      </Accordion>,
    );
    const trigger = screen.getByRole("button", { name: "Section title" });
    trigger.focus();

    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps multiple independent Accordions from affecting each other", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Accordion title="First">
          <p>First content</p>
        </Accordion>
        <Accordion title="Second">
          <p>Second content</p>
        </Accordion>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "First" }));
    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it.each(["default", "panel", "card"] as const)(
    "has no detectable accessibility violations for variant=%s",
    async (variant) => {
      const { container } = render(
        <Accordion title="Section title" variant={variant}>
          <p>Content</p>
        </Accordion>,
      );
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
