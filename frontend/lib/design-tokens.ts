export const CARD_SHADOW =
  "shadow-[0_1px_2px_rgba(15,23,42,.04),0_4px_14px_rgba(15,23,42,.06)]";

export const HAZARD_STRIPE_BG =
  "bg-[repeating-linear-gradient(135deg,#f59e0b_0px,#f59e0b_6px,#fbbf24_6px,#fbbf24_12px)]";

export const STATUS_CLASSES = {
  green: {
    bg: "bg-emerald-500",
    text: "text-emerald-600",
    border: "border-emerald-500",
    tintBg: "bg-emerald-50",
  },

  amber: {
    bg: "bg-amber-500",
    text: "text-amber-600",
    border: "border-amber-500",
    tintBg: "bg-amber-50",
  },

  red: {
    bg: "bg-red-500",
    text: "text-red-600",
    border: "border-red-500",
    tintBg: "bg-red-50",
  },

  brand: {
    bg: "bg-blue-600",
    text: "text-blue-600",
    border: "border-blue-600",
    tintBg: "bg-blue-50",
  },
} as const;

export type StatusKey = keyof typeof STATUS_CLASSES;
