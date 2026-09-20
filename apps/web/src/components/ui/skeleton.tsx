import {
  Skeleton as RadixSkeleton,
  type SkeletonProps,
} from "@radix-ui/themes";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <RadixSkeleton
      data-slot="skeleton"
      className={cn("otter-skeleton", className)}
      {...props}
    />
  );
}

export { Skeleton };
