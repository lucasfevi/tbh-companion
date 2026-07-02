import { describe, it, expect } from "vitest";
import {
  loadStageBoxTrackerRoutes,
  canonicalTrackerBoxId,
  resolveTrackedDropBoxId,
  resolveTrackedDropBoxIdForStage,
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

  it("resolveTrackedDropBoxIdForStage picks the enabled route for the current map", () => {
    const routes = loadStageBoxTrackerRoutes();
    const torment80 = routes.find((route) => route.boxId === 920801);
    expect(torment80?.dropStageKeys).toContain(4103);

    const enabled = new Set([920801]);
    expect(resolveTrackedDropBoxIdForStage(4103, enabled, routes)).toBe(920801);
    expect(resolveTrackedDropBoxIdForStage(4103, new Set(), routes)).toBeNull();
    expect(resolveTrackedDropBoxIdForStage(9999, enabled, routes)).toBeNull();
  });
});
