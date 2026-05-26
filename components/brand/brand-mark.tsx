import { clsx } from "clsx";

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-11 w-11",
  lg: "h-14 w-14"
};

type BrandMarkProps = {
  className?: string;
  size?: keyof typeof sizeClasses;
  title?: string;
};

export function BrandMark({ className, size = "md", title = "Mercury Books" }: BrandMarkProps) {
  return (
    <svg
      aria-label={title}
      className={clsx(sizeClasses[size], "shrink-0", className)}
      role="img"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#0B1220" height="48" rx="12" width="48" />
      <path
        d="M11 36V12h7.2L24 24.45 29.8 12H37v24h-6.15V24.45l-4.2 8.05h-5.3l-4.2-8.05V36H11Z"
        fill="#F8FAFC"
      />
      <path
        d="M24 24.45 29.8 12H37v24h-6.15V24.45l-4.2 8.05H24v-8.05Z"
        fill="#E8F4F1"
      />
      <path
        d="M18.2 12 24 24.45 29.8 12"
        fill="none"
        stroke="#14B8A6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path
        d="M14.75 17.7h3.25M14.75 21.7h2.3M30.1 17.7h3.15M30.95 21.7h2.3"
        stroke="#0B1220"
        strokeLinecap="round"
        strokeWidth="1.45"
      />
      <path d="M14.2 39h19.6" stroke="#14B8A6" strokeLinecap="round" strokeWidth="2.6" />
      <rect fill="none" height="38" opacity="0.18" rx="9" stroke="#FFFFFF" width="38" x="5" y="5" />
    </svg>
  );
}
