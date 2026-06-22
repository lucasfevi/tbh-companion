import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { ItemIcon } from "./ItemIcon";

describe("ItemIcon", () => {
  it("renders the image with the given src", () => {
    const { container } = render(<ItemIcon src="tbh-asset://icon/SWORD_300001" color="#e8c45a" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "tbh-asset://icon/SWORD_300001");
  });

  it("applies a gradient background and border tinted by the given color", () => {
    const { container } = render(<ItemIcon src="x" color="#e8c45a" />);
    const box = container.querySelector("span");
    expect(box?.style.background).toContain("linear-gradient");
    expect(box?.style.borderColor).toMatch(/^rgba\(232, 196, 90/);
  });

  it("applies the size variant", () => {
    const { container: small } = render(<ItemIcon src="x" color="#e8c45a" size="sm" />);
    const { container: large } = render(<ItemIcon src="x" color="#e8c45a" size="lg" />);
    expect(small.querySelector("span")?.className).toContain("size-9");
    expect(large.querySelector("span")?.className).toContain("size-14");
  });

  it("hides the image on load error", () => {
    const { container } = render(<ItemIcon src="bad-src" color="#e8c45a" />);
    const img = container.querySelector("img")!;
    img.dispatchEvent(new Event("error"));
    expect(img.style.visibility).toBe("hidden");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<ItemIcon src="tbh-asset://icon/SWORD_300001" color="#e8c45a" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
