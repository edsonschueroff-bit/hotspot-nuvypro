import React from "react";
import { Button } from "./Button";

export function SecondaryButton({
  children,
  icon,
  variant = "secondary",
  size = "md",
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  fullWidth = false,
  className = "",
  ...props
}) {
  return (
    <Button
      variant={variant === "outline" ? "secondary" : variant}
      type={type}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      size={size}
      fullWidth={fullWidth}
      icon={icon}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

export default SecondaryButton;
