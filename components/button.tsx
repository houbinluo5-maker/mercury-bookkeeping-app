import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "border-marine bg-marine text-white shadow-sm hover:border-ink hover:bg-ink",
  secondary: "border-line bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-ink",
  danger: "border-red-200 bg-white text-red-700 shadow-sm hover:border-red-300 hover:bg-red-50"
};

export function buttonClassName(variant: ButtonVariant = "secondary", className?: string) {
  return clsx(
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-marine/10 disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    className
  );
}

export function Button({
  children,
  className,
  variant = "secondary",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={buttonClassName(variant, className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
