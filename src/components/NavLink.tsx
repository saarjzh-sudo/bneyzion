import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";

interface Props extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
}

export function NavLink({ className = "", activeClassName = "", ...props }: Props) {
  return (
    <RouterNavLink
      {...props}
      className={({ isActive }) =>
        isActive ? `${className} ${activeClassName}`.trim() : className
      }
    />
  );
}
