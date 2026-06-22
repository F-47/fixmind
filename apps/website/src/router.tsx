import { Link as RouterLink, type LinkProps as RouterLinkProps } from "react-router-dom";
import { useEffect } from "react";

type LinkProps = Omit<RouterLinkProps, "to"> & { to: string };

export function Link({ to, onClick, ...rest }: LinkProps) {
  return (
    <RouterLink
      to={to}
      onClick={(event) => {
        onClick?.(event);
        const hash = typeof to === "string" ? new URL(to, window.location.origin).hash : "";
        if (!hash) return;
        requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView()));
      }}
      {...rest}
    />
  );
}

export function usePageMeta(title: string, description: string): void {
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [title, description]);
}
