import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export type SelectFieldOption = {
  value: string | number;
  label: string;
};

type SelectFieldVariant = "default" | "ideal";

const triggerClasses: Record<SelectFieldVariant, string> = {
  default: "border-border bg-card text-fg",
  ideal: "border-ideal/30 bg-bg/50 font-semibold text-ideal",
};

const optionTextClasses: Record<SelectFieldVariant, string> = {
  default: "text-fg",
  ideal: "text-ideal",
};

function SelectChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={cn("shrink-0 text-muted transition-transform duration-150", open && "rotate-180")}
      aria-hidden
    >
      <path
        d="M2.5 4.5 6 8 9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SelectField({
  label,
  variant = "default",
  footer,
  footerAlign = "start",
  className,
  options,
  value,
  onValueChange,
  disabled,
}: {
  label?: ReactNode;
  variant?: SelectFieldVariant;
  footer?: ReactNode;
  footerAlign?: "start" | "end";
  className?: string;
  options: SelectFieldOption[];
  value: string | number;
  onValueChange: (value: string | number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("flex flex-col gap-1", className)}>
      {label ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</span>
      ) : null}
      <div className={cn("relative", open && "z-30")}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          className={cn(
            "flex w-full min-w-0 items-center justify-between gap-2 rounded-md border py-1.5 pl-2.5 pr-2 text-left text-[13px]",
            "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-ideal/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            triggerClasses[variant],
          )}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          <span className="min-w-0 truncate">{selected?.label ?? "—"}</span>
          <span className="flex w-6 shrink-0 items-center justify-center">
            <SelectChevron open={open} />
          </span>
        </button>
        {open ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute top-[calc(100%+4px)] right-0 left-0 z-30 max-h-52 overflow-y-auto rounded-md border border-border bg-card py-1 shadow-[0_8px_24px_rgb(0_0_0/0.45)]"
          >
            {options.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "w-full px-2.5 py-1.5 text-left text-[13px] leading-snug",
                      optionTextClasses[variant],
                      isSelected ? "bg-ideal/15 font-semibold" : "font-normal hover:bg-panel",
                    )}
                    onClick={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      {footer != null ? (
        <div
          className={cn(
            "min-h-[1.125rem] text-[10px] leading-none",
            footerAlign === "end" ? "text-right" : "text-left",
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
