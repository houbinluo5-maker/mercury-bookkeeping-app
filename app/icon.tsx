import { ImageResponse } from "next/og";

export const size = {
  height: 32,
  width: 32
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0B1220",
          borderRadius: 7,
          display: "flex",
          height: "32px",
          justifyContent: "center",
          width: "32px"
        }}
      >
        <svg height="24" viewBox="0 0 48 48" width="24">
          <path d="M13 14.75c0-1.24 1.01-2.25 2.25-2.25H24v23H15.25A2.25 2.25 0 0 1 13 33.25v-18.5Z" fill="#F8FAFC" />
          <path d="M24 12.5h8.75c1.24 0 2.25 1.01 2.25 2.25v18.5c0 1.24-1.01 2.25-2.25 2.25H24v-23Z" fill="#E8F2EF" />
          <path d="M24 12.5v23" stroke="#123A55" strokeLinecap="round" strokeWidth="2" />
          <path d="M17.5 19.5h3.75M17.5 24h3.75M26.75 19.5h3.75M26.75 24h3.75" stroke="#123A55" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M15.5 31.25c5.05-4.92 11.95-4.92 17 0" fill="none" stroke="#287A68" strokeLinecap="round" strokeWidth="2.4" />
        </svg>
      </div>
    ),
    {
      ...size
    }
  );
}
