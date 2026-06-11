import type { ReactNode } from "react";

export function TabHeader({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="m-0 text-lg font-semibold">{title}</h1>
      {intro ? <p className="m-0 text-[13px] leading-snug text-muted">{intro}</p> : null}
      {children}
    </header>
  );
}
