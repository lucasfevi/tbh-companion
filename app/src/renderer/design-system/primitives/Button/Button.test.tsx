import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Button, ButtonLink } from "./Button";

const ALL_VARIANTS = [
  "default",
  "primary",
  "danger",
  "ghost",
  "success",
  "toolbar",
  "link",
  "icon",
] as const;

describe("Button", () => {
  it("defaults to type=button so it never accidentally submits a form", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toHaveAttribute("type", "button");
  });

  it("renders every variant without throwing", () => {
    for (const variant of ALL_VARIANTS) {
      render(<Button variant={variant}>{variant}</Button>);
    }
    for (const variant of ALL_VARIANTS) {
      expect(screen.getByRole("button", { name: variant })).toBeInTheDocument();
    }
  });

  it("calls onClick on mouse click and prevents it when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Enabled</Button>);
    await user.click(screen.getByRole("button", { name: "Enabled" }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Disabled
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Disabled" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates on Enter and Space via native button keyboard semantics", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press me</Button>);
    const button = screen.getByRole("button", { name: "Press me" });
    button.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <>
        <Button variant="primary">Save</Button>
        <Button variant="icon" aria-label="Close">
          ✕
        </Button>
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows a Tooltip (not a native title attribute) when title is set, and falls back aria-label to it", async () => {
    render(
      <Button variant="icon" title="Reset session stats">
        {"↻"}
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Reset session stats" });
    expect(button).not.toHaveAttribute("title");

    button.focus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Reset session stats");
  });

  it("still forwards a caller ref to the underlying DOM button when title is also set", async () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} title="Back to top">
        ↑
      </Button>,
    );
    await waitFor(() => expect(ref.current).toBeInstanceOf(HTMLButtonElement));
    expect(ref.current).toBe(screen.getByRole("button", { name: "Back to top" }));
  });

  it("keeps the plain native title attribute (no Tooltip) when nativeTitle is set", () => {
    render(
      <Button variant="icon" title="Minimize" nativeTitle>
        {"−"}
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Minimize" });
    expect(button).toHaveAttribute("title", "Minimize");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("ButtonLink", () => {
  it("defaults to target=_blank and rel=noopener noreferrer like ExternalLink did", () => {
    render(<ButtonLink href="https://example.com">Open</ButtonLink>);
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <ButtonLink href="https://example.com" variant="primary">
        Open in browser
      </ButtonLink>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
