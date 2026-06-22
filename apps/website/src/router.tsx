import { Link as RouterLink, type LinkProps as RouterLinkProps } from "react-router-dom";
import { useEffect } from "react";

type LinkProps = Omit<RouterLinkProps, "to"> & { to: string };

export function Link({ to, onClick, ...rest }: LinkProps) {
  return (
    <RouterLink
      to={to}
      onClick={onClick}
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
