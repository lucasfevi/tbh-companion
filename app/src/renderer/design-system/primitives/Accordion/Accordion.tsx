import type { ReactNode } from "react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { LuChevronDown } from "react-icons/lu";
import { cn, cva } from "../../lib/variants";

type Variant = "default" | "panel" | "card";

const rootVariants = cva("", {
  variants: {
    variant: {
      default: "flex flex-col gap-3.5",
      panel: "overflow-hidden rounded-lg border border-border",
      card: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const triggerVariants = cva(
  "flex w-full cursor-pointer items-center justify-between gap-2 text-left",
  {
    variants: {
      variant: {
        default: "text-[13px] font-semibold text-muted",
        panel: "bg-panel px-3 py-2.5 text-[13px] font-semibold text-muted hover:bg-card",
        card: "text-xs font-semibold text-fg",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const panelContentVariants = cva(
  "overflow-hidden transition-[height] duration-200 ease-out h-(--accordion-panel-height) data-[starting-style]:h-0 data-[ending-style]:h-0",
  {
    variants: {
      variant: {
        default: "",
        panel: "",
        card: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const panelInnerVariants = cva("", {
  variants: {
    variant: {
      default: "",
      panel: "flex flex-col gap-3.5 border-t border-border bg-bg/50 px-3 py-3",
      card: "mt-1.5",
    },
  },
  defaultVariants: { variant: "default" },
});

/**
 * One collapsible section per instance (not a multi-item accordion group) —
 * matches the old `<details>`-based component's API. Each Accordion owns its
 * own internal Base UI Root+Item with a single fixed item value, so multiple
 * Accordions on a page toggle fully independently of each other.
 */
export function Accordion({
  title,
  children,
  variant = "default",
  className,
}: {
  title: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <BaseAccordion.Root className={cn(rootVariants({ variant }), className)}>
      <BaseAccordion.Item>
        <BaseAccordion.Header>
          <BaseAccordion.Trigger className={cn(triggerVariants({ variant }), "group")}>
            <span>{title}</span>
            <LuChevronDown
              aria-hidden
              className="size-3 shrink-0 text-muted transition-transform duration-150 group-data-[panel-open]:rotate-180"
            />
          </BaseAccordion.Trigger>
        </BaseAccordion.Header>
        <BaseAccordion.Panel className={panelContentVariants({ variant })}>
          <div className={panelInnerVariants({ variant })}>{children}</div>
        </BaseAccordion.Panel>
      </BaseAccordion.Item>
    </BaseAccordion.Root>
  );
}
