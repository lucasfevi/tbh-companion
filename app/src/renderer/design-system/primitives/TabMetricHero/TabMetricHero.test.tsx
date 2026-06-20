import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { TabMetricHero } from "./TabMetricHero";

describe("TabMetricHero", () => {
  it("renders primary, center, and action slots", () => {
    render(
      <TabMetricHero
        primary={<span>1.2K XP/hr</span>}
        center={<span>500 gold/hr</span>}
        action={<button type="button">Reset</button>}
      />,
    );
    expect(screen.getByText("1.2K XP/hr")).toBeInTheDocument();
    expect(screen.getByText("500 gold/hr")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("omits the action slot when not provided", () => {
    render(<TabMetricHero primary={<span>1.2K XP/hr</span>} center={<span>500 gold/hr</span>} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <TabMetricHero
        primary={<span>1.2K XP/hr</span>}
        center={<span>500 gold/hr</span>}
        action={<button type="button">Reset</button>}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
