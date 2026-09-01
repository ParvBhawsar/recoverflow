import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "64px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #3567ff 0%, #2448d7 100%)",
          color: "white",
          fontSize: "22px",
          fontWeight: 800,
          letterSpacing: "-1.5px",
        }}
      >
        RF
      </div>
    ),
    size,
  );
}
