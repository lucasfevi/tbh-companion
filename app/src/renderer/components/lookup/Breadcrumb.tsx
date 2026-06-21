import { Fragment, useState } from "react";
import { cn } from "../../lib/cn";
import { Popover } from "../../design-system/primitives/Popover/Popover";
import type { LookupNavNode } from "../../lib/useLookupNav";

const MAX_VISIBLE = 4;
const TAIL_COUNT = 2;

interface BreadcrumbProps {
  stack: LookupNavNode[];
  labelFor: (node: LookupNavNode) => string;
  onJump: (index: number) => void;
}

function CrumbButton({
  label,
  isCurrent,
  onClick,
}: {
  label: string;
  isCurrent: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "max-w-[10rem] truncate rounded px-1 py-0.5",
        isCurrent ? "font-semibold text-fg" : "text-muted hover:text-fg hover:underline",
      )}
      disabled={isCurrent}
      onClick={onClick}
      title={label}
      aria-current={isCurrent ? "page" : undefined}
    >
      {label}
    </button>
  );
}

function OverflowMenu({
  nodes,
  labelFor,
  onJump,
  offset,
}: {
  nodes: { node: LookupNavNode; index: number }[];
  labelFor: (node: LookupNavNode) => string;
  onJump: (index: number) => void;
  offset: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      aria-label="Hidden breadcrumb entries"
      trigger={
        <button
          type="button"
          className="rounded px-1 py-0.5 text-muted hover:text-fg"
          title={`${nodes.length} more`}
        >
          … {nodes.length} more
        </button>
      }
    >
      <ul className="m-0 flex max-h-60 list-none flex-col gap-0.5 overflow-y-auto p-0">
        {nodes.map(({ node, index }) => (
          <li key={`${node.type}-${node.id}-${index + offset}`}>
            <button
              type="button"
              className="w-full truncate rounded px-1.5 py-1 text-left text-xs text-fg hover:bg-card"
              onClick={() => {
                setOpen(false);
                onJump(index);
              }}
            >
              {labelFor(node)}
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}

/** Drill-down trail for the Lookup tab's item/box/stage navigation graph. Compacts when it grows. */
export function Breadcrumb({ stack, labelFor, onJump }: BreadcrumbProps) {
  if (stack.length === 0) return null;

  const indexed = stack.map((node, index) => ({ node, index }));
  const lastIndex = stack.length - 1;

  let visible: { node: LookupNavNode; index: number }[];
  let hidden: { node: LookupNavNode; index: number }[] = [];

  if (stack.length <= MAX_VISIBLE) {
    visible = indexed;
  } else {
    const tail = indexed.slice(indexed.length - TAIL_COUNT);
    hidden = indexed.slice(1, indexed.length - TAIL_COUNT);
    visible = [indexed[0], ...tail];
  }

  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs" aria-label="Lookup breadcrumb">
      {visible.map((entry, i) => (
        <Fragment key={`${entry.node.type}-${entry.node.id}-${entry.index}`}>
          {i > 0 ? <span className="text-muted/60">/</span> : null}
          {hidden.length > 0 && entry.index === visible[visible.length - TAIL_COUNT]?.index ? (
            <>
              <OverflowMenu nodes={hidden} labelFor={labelFor} onJump={onJump} offset={0} />
              <span className="text-muted/60">/</span>
            </>
          ) : null}
          <CrumbButton
            label={labelFor(entry.node)}
            isCurrent={entry.index === lastIndex}
            onClick={() => onJump(entry.index)}
          />
        </Fragment>
      ))}
    </nav>
  );
}
