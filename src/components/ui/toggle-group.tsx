import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      size: {
        default: "h-6 px-2",
        sm: "h-5 px-1.5 text-[10px]",
        icon: "size-6 p-0",
      },
    },
    defaultVariants: { size: "default" },
  }
);

// Base UI's ToggleGroup uses an array even in single-select mode; expose a
// scalar API so callers pass a plain string.
function ToggleGroup<Value extends string>({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<
  ToggleGroupPrimitive.Props<Value>,
  "value" | "defaultValue" | "onValueChange" | "multiple"
> & {
  value?: Value;
  defaultValue?: Value;
  onValueChange?(value: Value): void;
}) {
  return (
    <ToggleGroupPrimitive<Value>
      data-slot="toggle-group"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5",
        className
      )}
      defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
      onValueChange={
        onValueChange &&
        (([first]) => {
          if (first !== undefined && first !== value) onValueChange(first);
        })
      }
      value={value === undefined ? undefined : [value]}
      {...props}
    />
  );
}

function ToggleGroupItem<Value extends string>({
  className,
  size,
  ...props
}: TogglePrimitive.Props<Value> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive<Value>
      data-slot="toggle-group-item"
      className={cn(toggleVariants({ size }), className)}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
