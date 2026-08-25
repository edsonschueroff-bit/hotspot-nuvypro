import React from "react";
import { Button } from "./Button";

export function PrimaryButton({
  children,
  icon,
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  size = "md",
  fullWidth = false,
  className = "",
  ...props
}) {
  return (
    <Button
      variant="primary"
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

export default PrimaryButton;
