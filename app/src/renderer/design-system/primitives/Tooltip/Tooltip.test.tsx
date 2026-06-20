import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Tooltip } from "./Tooltip";

function renderTooltip() {
  return render(
    <Tooltip trigger={<button type="button">Rate</button>} side="top">
      120 XP/hr
    </Tooltip>,
  );
}

describe("Tooltip", () => {
  it("opens on trigger focus and renders content", async () => {
    renderTooltip();
    expect(screen.queryByText("120 XP/hr")).not.toBeInTheDocument();

    screen.getByRole("button", { name: "Rate" }).focus();
    expect(await screen.findByText("120 XP/hr")).toBeInTheDocument();
  });

  it("closes when the trigger blurs", async () => {
    renderTooltip();
    const trigger = screen.getByRole("button", { name: "Rate" });
    trigger.focus();
    await screen.findByText("120 XP/hr");

    trigger.blur();
    await waitFor(() => expect(screen.queryByText("120 XP/hr")).not.toBeInTheDocument());
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderTooltip();
    screen.getByRole("button", { name: "Rate" }).focus();
    await screen.findByText("120 XP/hr");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("120 XP/hr")).not.toBeInTheDocument());
  });

  it("associates the popup with the trigger via aria-describedby", async () => {
    renderTooltip();
    const trigger = screen.getByRole("button", { name: "Rate" });
    trigger.focus();
    const tooltip = await screen.findByRole("tooltip");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
  });

  it("has no detectable accessibility violations when open", async () => {
    renderTooltip();
    screen.getByRole("button", { name: "Rate" }).focus();
    await screen.findByText("120 XP/hr");
    // The popup renders via a portal into document.body, outside the
    // render()-returned container, so scan the whole document instead.
    // "region" is disabled: it demands all page content sit in a landmark,
    // which only makes sense for a full page, not an isolated component
    // fixture — the trigger/popup will live inside the app's existing
    // landmark structure in practice (unlike Popover/Dialog, Base UI's
    // tooltip role isn't in axe's built-in landmark-exempt role list).
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
