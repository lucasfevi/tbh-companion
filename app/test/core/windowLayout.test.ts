import { describe, it, expect } from "vitest";
import {
  clampRectToWorkArea,
  normalizeWindowLayoutEntry,
  resolveDisplayForLayout,
  toAbsoluteBounds,
  toRelativeLayout,
  workAreasMatch,
  type DisplayLike,
} from "../../src/core/windowLayout";

const secondary: DisplayLike = {
  id: 2,
  workArea: { x: 1920, y: 0, width: 1920, height: 1080 },
};

const primary: DisplayLike = {
  id: 1,
  workArea: { x: 0, y: 0, width: 1920, height: 1080 },
};

describe("windowLayout", () => {
  it("workAreasMatch compares full work area", () => {
    expect(workAreasMatch(primary.workArea, { ...primary.workArea })).toBe(true);
    expect(workAreasMatch(primary.workArea, secondary.workArea)).toBe(false);
  });

  it("normalizeWindowLayoutEntry clamps size and rejects invalid", () => {
    const valid = normalizeWindowLayoutEntry(
      {
        x: 40,
        y: 60,
        width: 280,
        height: 400,
        displayId: 2,
        displayWorkArea: secondary.workArea,
      },
      { minWidth: 300, minHeight: 360, requireWidth: true, requireHeight: true },
    );
    expect(valid).toEqual({
      x: 40,
      y: 60,
      width: 300,
      height: 400,
      displayId: 2,
      displayWorkArea: secondary.workArea,
    });

    expect(normalizeWindowLayoutEntry({ x: 1, y: 2 }, { requireHeight: true })).toBeNull();
    expect(
      normalizeWindowLayoutEntry(
        { x: 1, y: 2, displayId: 1, displayWorkArea: { x: 0, y: 0, width: 0, height: 10 } },
        {},
      ),
    ).toBeNull();
  });

  it("resolveDisplayForLayout matches by id then work area fingerprint", () => {
    const saved = {
      displayId: 99,
      displayWorkArea: secondary.workArea,
      x: 10,
      y: 20,
    };
    expect(resolveDisplayForLayout(saved, [primary, secondary])?.id).toBe(2);

    const replugged = [{ id: 77, workArea: secondary.workArea }];
    expect(resolveDisplayForLayout(saved, replugged)?.id).toBe(77);
    expect(resolveDisplayForLayout(saved, [primary])).toBeNull();
  });

  it("toAbsoluteBounds uses display work area offsets", () => {
    const entry = {
      x: 100,
      y: 50,
      width: 320,
      height: 480,
      displayId: 2,
      displayWorkArea: secondary.workArea,
    };
    const bounds = toAbsoluteBounds(entry, secondary.workArea, { width: 340, height: 520 });
    expect(bounds).toEqual({ x: 2020, y: 50, width: 320, height: 480 });
  });

  it("clampRectToWorkArea shifts partially off-screen frames", () => {
    const workArea = primary.workArea;
    const clamped = clampRectToWorkArea({ x: -50, y: 1000, width: 900, height: 700 }, workArea);
    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(380);
    expect(clamped.width).toBe(900);
    expect(clamped.height).toBe(700);
  });

  it("toRelativeLayout round-trips through toAbsoluteBounds", () => {
    const frame = { x: 2020, y: 80, width: 340, height: 520 };
    const entry = toRelativeLayout(frame, secondary, { width: 340, height: 520 });
    const restored = toAbsoluteBounds(entry, secondary.workArea, { width: 340, height: 520 });
    expect(restored).toEqual(frame);
  });

  it("unplugged monitor: relative offsets apply to a fallback work area", () => {
    const entry = toRelativeLayout({ x: 2020, y: 80, width: 340, height: 520 }, secondary, {
      width: 340,
      height: 520,
    });
    expect(resolveDisplayForLayout(entry, [primary])).toBeNull();
    const onPrimary = toAbsoluteBounds(entry, primary.workArea, { width: 340, height: 520 });
    expect(onPrimary.x).toBe(100);
    expect(onPrimary.y).toBe(80);
  });
});
