// biome-ignore-all lint/a11y/noLabelWithoutControl: Callers provide htmlFor or nest the associated control.
import { Text } from "@radix-ui/themes";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Label({
  className,
  color: _color,
  ...props
}: ComponentProps<"label">) {
  return (
    <Text
      as="label"
      data-slot="label"
      size="2"
      weight="medium"
      className={cn("otter-label", className)}
      {...props}
    />
  );
}

export { Label };
