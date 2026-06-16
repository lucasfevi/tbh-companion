import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import { clampPanelPosition } from "../../lib/anchoredPanelPosition";

function clampToViewport(
  trigger: DOMRect,
  panelW: number,
  panelH: number,
): Pick<CSSProperties, "left" | "top"> {
  return clampPanelPosition(trigger, panelW, panelH, window.innerWidth, window.innerHeight);
}

export function AnchoredPanel({
  open,
  onOpenChange,
  trigger,
  children,
  className,
  minWidth = 200,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (props: {
    ref: React.RefObject<HTMLButtonElement | null>;
    onClick: () => void;
    "aria-expanded": boolean;
    "aria-controls": string;
  }) => ReactNode;
  children: ReactNode;
  className?: string;
  minWidth?: number;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    position: "fixed",
    visibility: "hidden",
    minWidth,
  });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const place = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const panel = panelRef.current;
      const panelW = panel?.offsetWidth ?? minWidth;
      const panelH = panel?.offsetHeight ?? 0;
      const { left, top } = clampToViewport(triggerRect, panelW, panelH);
      setPanelStyle({
        position: "fixed",
        left,
        top,
        zIndex: 50,
        minWidth,
        visibility: "visible",
      });
    };

    place();
    const frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [open, minWidth]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: () => onOpenChange(!open),
        "aria-expanded": open,
        "aria-controls": panelId,
      })}
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="false"
              className={cn(
                "rounded-md border border-border bg-panel p-2.5 shadow-[0_8px_24px_rgb(0_0_0/0.45)]",
                className,
              )}
              style={panelStyle}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
