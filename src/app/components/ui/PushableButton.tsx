import React from "react";
import { cn } from "./utils";

interface PushableButtonProps extends React.HTMLAttributes<HTMLElement> {
  as?: "button" | "div" | "span";
  frontClassName?: string;
  edgeClassName?: string;
  frontStyle?: React.CSSProperties;
  edgeStyle?: React.CSSProperties;
  disabled?: boolean;
  isTile?: boolean;
}

export function PushableButton({
  children,
  className,
  frontClassName,
  edgeClassName,
  frontStyle,
  edgeStyle,
  as = "button",
  disabled,
  isTile,
  ...props
}: PushableButtonProps) {
  const Component = as as any;

  return (
    <Component
      className={cn(
        "pushable outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        disabled && "opacity-50 pointer-events-none",
        isTile && "tile",
        className
      )}
      disabled={Component === "button" ? disabled : undefined}
      {...props}
    >
      <span className="shadow-layer" />
      <span className={cn("edge-layer", edgeClassName)} style={edgeStyle} />
      <span className={cn("front-layer text-lg font-bold select-none", frontClassName)} style={frontStyle}>
        {children}
      </span>
    </Component>
  );
}
