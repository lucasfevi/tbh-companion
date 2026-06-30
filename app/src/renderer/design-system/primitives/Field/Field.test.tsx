import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Field } from "./Field";

describe("Field", () => {
  it("renders label above children with an optional hint below", () => {
    render(
      <Field label="Poll interval (seconds)" hint="Changing this resets the current session.">
        <input />
      </Field>,
    );
    expect(screen.getByText("Poll interval (seconds)")).toBeInTheDocument();
    expect(screen.getByText("Changing this resets the current session.")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("associates the input with the label via implicit <label> wrapping", () => {
    render(
      <Field label="Search">
        <input />
      </Field>,
    );
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <Field label="Poll interval (seconds)" hint="Resets the session.">
        <input />
      </Field>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows a Tooltip (not a native title attribute) on the label when title is set", async () => {
    const user = userEvent.setup();
    render(
      <Field label="Search" title="Filters the visible rows">
        <input />
      </Field>,
    );
    const label = screen.getByText("Search").closest("label");
    expect(label).not.toHaveAttribute("title");

    await user.hover(label!);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Filters the visible rows");
  });
});
