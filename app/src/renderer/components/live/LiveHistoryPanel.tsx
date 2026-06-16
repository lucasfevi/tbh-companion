import type { ReactNode } from "react";
import { PanelSection } from "../ui/PanelSection";
import { LiveScrollList } from "./LiveScrollList";

export function LiveHistoryPanel({
  title,
  empty,
  children,
}: {
  title: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PanelSection title={title} boxed fill className="min-h-0 flex-1">
      <LiveScrollList empty={empty}>{children}</LiveScrollList>
    </PanelSection>
  );
}
