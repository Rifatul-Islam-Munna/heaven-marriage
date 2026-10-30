import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const runtime = "nodejs";
export const alt = "Niqaha.com — Islamic Matrimony";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public", "logo.png"));
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#fff1f5",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: 60,
      }}
    >
      <img
        src={"data:image/png;base64," + logo.toString("base64")}
        width={420}
        height={310}
        style={{ objectFit: "contain" }}
        alt=""
      />
      <div
        style={{
          display: "flex",
          color: "#be185d",
          fontSize: 64,
          fontWeight: 700,
          marginTop: 25,
        }}
      >
        Niqaha.com
      </div>
      <div
        style={{
          display: "flex",
          color: "#4b5563",
          fontSize: 28,
          marginTop: 14,
        }}
      >
        Islamic Matrimony for Bangladeshis Worldwide
      </div>
    </div>,
    size,
  );
}
