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
  size?: "default" | "compact";
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
  size,
  ...props
}: PushableButtonProps) {
  const Component = as as any;

  return (
    <Component
      className={cn(
        "pushable outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 select-none",
        disabled && "opacity-50 pointer-events-none",
        isTile && "tile",
        size === "compact" && "compact",
        className
      )}
      disabled={Component === "button" ? disabled : undefined}
      {...props}
    >
      <span className="shadow-layer" />
      <span className={cn("edge-layer", edgeClassName)} style={edgeStyle} />
      <span
        className={cn(
          "front-layer font-bold select-none",
          size === "compact" ? "text-xs font-black tracking-wider uppercase" : "text-lg text-white",
          frontClassName
        )}
        style={frontStyle}
      >
        {children}
      </span>
    </Component>
  );
}
