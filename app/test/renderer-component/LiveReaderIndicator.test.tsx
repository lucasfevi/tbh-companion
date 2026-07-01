import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LiveMemoryStatus } from "../../shared/types";

const state = vi.hoisted(() => ({ status: null as LiveMemoryStatus | null }));

vi.mock("../../src/renderer/lib/useLiveMemory", () => ({
  useLiveMemory: () => ({ snapshot: null, status: state.status }),
}));

function status(overrides: Partial<LiveMemoryStatus> = {}): LiveMemoryStatus {
  return {
    running: true,
    attached: true,
    pid: 100,
    gameVersion: "1.00.21",
    supported: true,
    ...overrides,
  };
}

async function renderIndicator() {
  const { LiveReaderIndicator } = await import("../../src/renderer/components/LiveReaderIndicator");
  return render(<LiveReaderIndicator />);
}

beforeEach(() => {
  state.status = null;
});

describe("LiveReaderIndicator", () => {
  it("renders nothing when the reader is off (no status)", async () => {
    const { container } = await renderIndicator();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing after the reader stops (running:false)", async () => {
    state.status = status({ running: false, attached: false, supported: false });
    const { container } = await renderIndicator();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows 'waiting for game' while running but not yet attached", async () => {
    state.status = status({ attached: false });
    await renderIndicator();
    expect(screen.getByText("Live: waiting for game")).toBeInTheDocument();
  });

  it("shows attached when attached to a supported version", async () => {
    state.status = status();
    await renderIndicator();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows degraded with the unsupported note when the version has no offsets", async () => {
    state.status = status({
      supported: false,
      note: "live stats unavailable for game v9.9.9",
    });
    await renderIndicator();
    const chip = screen.getByText("Live: unsupported");
    expect(chip).toBeInTheDocument();
    expect(chip.closest("[title]")).toHaveAttribute(
      "title",
      "live stats unavailable for game v9.9.9",
    );
  });
});
