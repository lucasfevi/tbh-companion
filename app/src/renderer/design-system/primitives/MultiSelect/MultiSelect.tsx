import { type ReactNode } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { LuCheck, LuChevronDown, LuX } from "react-icons/lu";
import { cn } from "../../lib/variants";
import { Tooltip } from "../Tooltip/Tooltip";

export type MultiSelectOption = { value: string; label: string };
export type MultiSelectGroup = { label: string; options: MultiSelectOption[] };

type ComboGroup = { value: string; items: MultiSelectOption[] };

function isGrouped(
  options: MultiSelectOption[] | MultiSelectGroup[],
): options is MultiSelectGroup[] {
  return options.length > 0 && "options" in options[0];
}

function defaultSummary(selected: MultiSelectOption[], allLabel: string): string {
  if (selected.length === 0) return allLabel;
  if (selected.length === 1) return selected[0].label;
  return `${selected.length} selected`;
}

/**
 * Searchable, optionally-grouped, multi-value dropdown built on Base UI's
 * Combobox. The trigger summarizes the current selection (or `allLabel` when
 * empty) and opens a popup with an in-place search box and a checked-state list.
 * `value` is the array of selected option values; `[]` means "no selection"
 * (the consumer's filter should treat that as "all").
 */
export function MultiSelect({
  options,
  value,
  onValueChange,
  label,
  searchable = true,
  allLabel = "All",
  summarize,
  disabled,
  className,
  title,
}: {
  options: MultiSelectOption[] | MultiSelectGroup[];
  value: string[];
  onValueChange: (value: string[]) => void;
  label?: ReactNode;
  searchable?: boolean;
  allLabel?: string;
  summarize?: (selected: MultiSelectOption[]) => string;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const grouped = isGrouped(options);
  const flatOptions = grouped ? options.flatMap((group) => group.options) : options;
  const selectedSet = new Set(value);
  const selectedObjects = flatOptions.filter((option) => selectedSet.has(option.value));
  const items: MultiSelectOption[] | ComboGroup[] = grouped
    ? options.map((group) => ({ value: group.label, items: group.options }))
    : flatOptions;

  const { contains } = Combobox.useFilter();

  const trigger = (
    <Combobox.Trigger className="group flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-card py-1.5 pl-2.5 pr-2 text-left text-[13px] text-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-ideal/50 disabled:cursor-not-allowed disabled:opacity-50 data-[popup-open]:z-50">
      <span className="min-w-0 truncate">
        <Combobox.Value>
          {(selected: MultiSelectOption[]) =>
            summarize ? summarize(selected) : defaultSummary(selected, allLabel)
          }
        </Combobox.Value>
      </span>
      <span className="flex w-6 shrink-0 items-center justify-center">
        <LuChevronDown
          className="text-muted transition-transform duration-150 group-data-[popup-open]:rotate-180"
          aria-hidden
        />
      </span>
    </Combobox.Trigger>
  );

  const renderItem = (option: MultiSelectOption) => (
    <Combobox.Item
      key={option.value}
      value={option}
      className="flex w-full cursor-default items-center gap-2 px-2.5 py-1.5 text-left text-[13px] leading-snug outline-none data-[highlighted]:bg-panel data-[selected]:font-semibold data-[selected]:text-fg"
    >
      <span className="flex w-4 shrink-0 items-center justify-center text-accent">
        <Combobox.ItemIndicator>
          <LuCheck aria-hidden />
        </Combobox.ItemIndicator>
      </span>
      <span className="min-w-0 truncate">{option.label}</span>
    </Combobox.Item>
  );

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Combobox.Root<MultiSelectOption, true>
        multiple
        items={items as MultiSelectOption[]}
        value={selectedObjects}
        onValueChange={(next) => onValueChange((next ?? []).map((option) => option.value))}
        isItemEqualToValue={(a, b) => a.value === b.value}
        itemToStringLabel={(option) => option.label}
        filter={searchable ? contains : null}
        disabled={disabled}
      >
        {label != null ? (
          <Combobox.Label className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {label}
          </Combobox.Label>
        ) : null}

        <div className="relative">
          {title ? <Tooltip trigger={trigger}>{title}</Tooltip> : trigger}

          {value.length > 0 && !disabled ? (
            <button
              type="button"
              aria-label={`Clear ${typeof label === "string" ? label.toLowerCase() : "selection"}`}
              onClick={() => onValueChange([])}
              className="absolute inset-y-0 right-6 z-10 flex w-5 items-center justify-center text-muted hover:text-fg"
            >
              <LuX aria-hidden />
            </button>
          ) : null}
        </div>

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="z-50">
            <Combobox.Popup className="max-h-60 w-(--anchor-width) overflow-y-auto rounded-md border border-border bg-card pb-1 shadow-[0_8px_24px_rgb(0_0_0/0.45)]">
              {searchable ? (
                <div className="p-1.5">
                  <Combobox.Input
                    placeholder="Search…"
                    className="w-full rounded-md border border-border bg-bg px-2 py-1 text-[13px] text-fg outline-none focus-visible:border-ideal/50"
                  />
                </div>
              ) : null}
              <Combobox.Empty>
                <span className="block px-2.5 py-2 text-xs text-muted">No matches.</span>
              </Combobox.Empty>
              <Combobox.List>
                {grouped
                  ? (group: ComboGroup) => (
                      <Combobox.Group key={group.value} items={group.items}>
                        <Combobox.GroupLabel className="px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                          {group.value}
                        </Combobox.GroupLabel>
                        <Combobox.Collection>
                          {(option: MultiSelectOption) => renderItem(option)}
                        </Combobox.Collection>
                      </Combobox.Group>
                    )
                  : (option: MultiSelectOption) => renderItem(option)}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
