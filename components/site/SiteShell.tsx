import type { ReactNode } from "react";

type SiteShellProps = {
  children: ReactNode;
  /** Dark-on-marble header from the top (booking, legal, appointment pages). */
  lightHeader?: boolean;
};

export function SiteShell({ children, lightHeader = false }: SiteShellProps) {
  return (
    <div className={`site-shell${lightHeader ? " site-shell--light" : ""}`}>
      {children}
    </div>
  );
}
