import { TextField } from "@radix-ui/themes";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof TextField.Root>
>(({ className, ...props }, forwardedRef) => (
  <TextField.Root
    ref={forwardedRef}
    data-slot="input"
    size="3"
    variant="surface"
    className={cn("otter-input", className)}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
