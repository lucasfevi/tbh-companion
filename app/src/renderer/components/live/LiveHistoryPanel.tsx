import type { ReactNode } from "react";
import { PanelSection } from "../../design-system/primitives/PanelSection/PanelSection";
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
    <PanelSection title={title} boxed>
      <LiveScrollList empty={empty}>{children}</LiveScrollList>
    </PanelSection>
  );
}
