import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../../design-system/primitives/Button/Button";

const SHOW_THRESHOLD = 400;

function findScrollableAncestor(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Floating "scroll to top" affordance for the Lookup tab's long item grid.
 * App.tsx's <main> is the only scrollable ancestor (everything else is
 * static), but this stays a generic DOM walk rather than assuming that.
 */
export function BackToTop() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = findScrollableAncestor(buttonRef.current);
    containerRef.current = container;
    if (!container) return;

    const onScroll = () => setVisible(container.scrollTop > SHOW_THRESHOLD);
    onScroll();
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Button
      ref={buttonRef}
      variant="icon"
      size="sm"
      className={cn(
        "fixed right-5 bottom-5 z-40 rounded-full border border-border bg-card shadow-lg transition-opacity",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      title="Back to top"
    >
      ↑
    </Button>
  );
}
