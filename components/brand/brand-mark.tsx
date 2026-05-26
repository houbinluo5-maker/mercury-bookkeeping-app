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
        d="M13 14.75c0-1.24 1.01-2.25 2.25-2.25H24v23H15.25A2.25 2.25 0 0 1 13 33.25v-18.5Z"
        fill="#F8FAFC"
      />
      <path
        d="M24 12.5h8.75c1.24 0 2.25 1.01 2.25 2.25v18.5c0 1.24-1.01 2.25-2.25 2.25H24v-23Z"
        fill="#E8F2EF"
      />
      <path d="M24 12.5v23" stroke="#123A55" strokeLinecap="round" strokeWidth="2" />
      <path
        d="M17.5 19.5h3.75M17.5 24h3.75M26.75 19.5h3.75M26.75 24h3.75"
        stroke="#123A55"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M15.5 31.25c5.05-4.92 11.95-4.92 17 0"
        fill="none"
        stroke="#287A68"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <path
        d="M14.5 10.75h19"
        opacity="0.42"
        stroke="#8BC7B7"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
