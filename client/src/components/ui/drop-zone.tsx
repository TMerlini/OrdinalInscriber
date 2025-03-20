import * as React from "react";
import { cn } from "@/lib/utils";

export interface DropZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  isDragging?: boolean;
}

const DropZone = React.forwardRef<HTMLDivElement, DropZoneProps>(
  ({ className, isDragging, ...props }, ref) => {
    return (
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 hover:bg-gray-50",
          isDragging ? "border-blue-500 bg-blue-50/50" : "border-gray-300",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

DropZone.displayName = "DropZone";

export { DropZone };
