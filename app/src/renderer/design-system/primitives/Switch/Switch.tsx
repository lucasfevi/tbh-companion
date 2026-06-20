import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "../../lib/variants";

/**
 * No current boolean-toggle consumer in the app — purely forward-looking,
 * per the plan's "add even though nothing consumes it yet" scope.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label": string;
}) {
  return (
    <BaseSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border bg-card transition-colors data-[checked]:border-accent data-[checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <BaseSwitch.Thumb className="h-3.5 w-3.5 translate-x-0.5 rounded-full bg-muted transition-transform data-[checked]:translate-x-4 data-[checked]:bg-accent-fg" />
    </BaseSwitch.Root>
  );
}
