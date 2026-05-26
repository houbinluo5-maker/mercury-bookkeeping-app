import { ImageResponse } from "next/og";

export const size = {
  height: 180,
  width: 180
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#F5F3EF",
          display: "flex",
          height: "180px",
          justifyContent: "center",
          width: "180px"
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#0B1220",
            borderRadius: 36,
            display: "flex",
            height: "132px",
            justifyContent: "center",
            width: "132px"
          }}
        >
          <svg height="106" viewBox="0 0 48 48" width="106">
            <path d="M11 36V12h7.2L24 24.45 29.8 12H37v24h-6.15V24.45l-4.2 8.05h-5.3l-4.2-8.05V36H11Z" fill="#F8FAFC" />
            <path d="M24 24.45 29.8 12H37v24h-6.15V24.45l-4.2 8.05H24v-8.05Z" fill="#E8F4F1" />
            <path d="M18.2 12 24 24.45 29.8 12" fill="none" stroke="#14B8A6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
            <path d="M14.75 17.7h3.25M14.75 21.7h2.3M30.1 17.7h3.15M30.95 21.7h2.3" stroke="#0B1220" strokeLinecap="round" strokeWidth="1.45" />
            <path d="M14.2 39h19.6" stroke="#14B8A6" strokeLinecap="round" strokeWidth="2.6" />
          </svg>
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
