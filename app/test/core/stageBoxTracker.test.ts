import { describe, it, expect } from "vitest";
import {
  loadStageBoxTrackerRoutes,
  canonicalTrackerBoxId,
  resolveTrackedDropBoxId,
} from "../../src/core/stageBoxTracker";

describe("stageBoxTracker", () => {
  it("loads canonical routes from bundled stage_boxes.json", () => {
    const routes = loadStageBoxTrackerRoutes();
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.every((route) => route.dropStageRangeLabel.length > 0)).toBe(true);
  });

  it("maps duplicate ItemKeys to canonical tracker ids", () => {
    expect(canonicalTrackerBoxId(920501)).toBe(920501);
    expect(canonicalTrackerBoxId(920004)).toBe(920003);
    expect(canonicalTrackerBoxId(910501)).toBeNull();
  });

  it("resolveTrackedDropBoxId requires tracked route and enabled level", () => {
    const enabled = new Set([920151, 920003]);
    const isTrackedRoute = (boxId: number) => boxId === 920151 || boxId === 920003;

    expect(resolveTrackedDropBoxId(920151, enabled, isTrackedRoute)).toBe(920151);
    expect(resolveTrackedDropBoxId(920004, enabled, isTrackedRoute)).toBe(920003);
    expect(resolveTrackedDropBoxId(920501, enabled, isTrackedRoute)).toBeNull();
    expect(resolveTrackedDropBoxId(920151, new Set(), isTrackedRoute)).toBeNull();
  });
});
