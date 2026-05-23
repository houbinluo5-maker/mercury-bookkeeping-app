import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "border-marine bg-marine text-white hover:bg-ink",
  secondary: "border-line bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
  danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
};

export function buttonClassName(variant: ButtonVariant = "secondary", className?: string) {
  return clsx(
    "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
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
