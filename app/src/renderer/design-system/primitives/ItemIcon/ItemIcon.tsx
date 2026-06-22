import { cn, cva, type VariantProps } from "../../lib/variants";

const iconBoxVariants = cva(
  "flex shrink-0 items-center justify-center overflow-hidden rounded-md border",
  {
    variants: {
      size: { xs: "size-4 p-0.5", sm: "size-9 p-1", md: "size-11 p-1.5", lg: "size-14 p-2" },
    },
    defaultVariants: { size: "sm" },
  },
);

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Item icon box with a grade-tinted gradient background and border, matching
 * the game's own item tooltip styling. `color` is a resolved hex string (e.g.
 * from gradeColor()) rather than a raw grade — keeps this primitive free of
 * app-specific grade-palette knowledge, consistent with the portability rule.
 */
export function ItemIcon({
  src,
  color,
  size,
  className,
}: { src: string; color: string; className?: string } & VariantProps<typeof iconBoxVariants>) {
  return (
    <span
      className={cn(iconBoxVariants({ size }), className)}
      style={{
        background: `linear-gradient(135deg, ${hexToRgba(color, 0.25)}, ${hexToRgba(color, 0.08)})`,
        borderColor: hexToRgba(color, 0.4),
      }}
    >
      <img
        src={src}
        alt=""
        className="size-full object-contain [image-rendering:pixelated]"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
      />
    </span>
  );
}
