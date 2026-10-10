import { type ButtonProps, Button as RadixButton } from "@radix-ui/themes";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type OtterButtonVariant =
  | "default"
  | "destructive"
  | "ghost"
  | "link"
  | "outline"
  | "secondary";

export type OtterButtonSize =
  | "default"
  | "icon"
  | "icon-lg"
  | "icon-sm"
  | "icon-xs"
  | "lg"
  | "sm"
  | "xs";

export type OtterButtonProps = Omit<
  ButtonProps,
  "color" | "size" | "variant"
> & {
  size?: OtterButtonSize;
  variant?: OtterButtonVariant;
};

const variantMap: Record<
  OtterButtonVariant,
  NonNullable<ButtonProps["variant"]>
> = {
  default: "solid",
  destructive: "soft",
  ghost: "ghost",
  link: "ghost",
  outline: "outline",
  secondary: "soft",
};

const sizeMap: Record<OtterButtonSize, NonNullable<ButtonProps["size"]>> = {
  default: "2",
  icon: "2",
  "icon-lg": "3",
  "icon-sm": "2",
  "icon-xs": "1",
  lg: "3",
  sm: "2",
  xs: "1",
};

const Button = forwardRef<HTMLButtonElement, OtterButtonProps>(
  (
    { className, size = "default", variant = "default", ...props },
    forwardedRef,
  ) => (
    <RadixButton
      ref={forwardedRef}
      color={variant === "destructive" ? "red" : undefined}
      data-icon-only={size.startsWith("icon") || undefined}
      data-slot="button"
      highContrast={variant === "destructive" || variant === "secondary"}
      size={sizeMap[size]}
      variant={variantMap[variant]}
      className={cn(
        "otter-button",
        variant === "link" && "otter-button-link",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button };
