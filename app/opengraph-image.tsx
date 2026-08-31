import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

export const alt = "73Kit — TYT UVL-15W browser radio programming"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

function BrandMark() {
  return (
    <svg width="360" height="256" viewBox="0 0 180 128">
      <defs>
        <linearGradient
          id="path"
          x1="12"
          y1="90"
          x2="172"
          y2="72"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3B2AC7" />
          <stop offset="1" stopColor="#211A82" />
        </linearGradient>
        <linearGradient
          id="signal"
          x1="96"
          y1="10"
          x2="155"
          y2="72"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2ED8D4" />
          <stop offset="1" stopColor="#1AA8AE" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="86" r="10" fill="url(#path)" />
      <path
        d="M18 86h29c13 0 16-10 20-25 4-14 11-22 21-22 14 0 18 13 23 31l6 22c4 14 11 21 21 21 9 0 16-7 24-15l10-10"
        fill="none"
        stroke="url(#path)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M151 88h21v21"
        fill="none"
        stroke="url(#path)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M100 42c20 0 36 16 36 36M100 16c34 0 62 28 62 62"
        fill="none"
        stroke="url(#signal)"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default async function OpenGraphImage() {
  const spaceGrotesk = await readFile(
    join(process.cwd(), "assets/brand/space-grotesk-semibold.ttf")
  )

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#F7F7FC",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 64,
        }}
      >
        <BrandMark />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#211A82",
              fontFamily: "Space Grotesk",
              fontSize: 112,
              fontWeight: 600,
              letterSpacing: -6,
              lineHeight: 1,
            }}
          >
            73Kit
          </div>
          <div
            style={{
              color: "#4B5563",
              fontFamily: "Space Grotesk",
              fontSize: 34,
              fontWeight: 500,
              marginTop: 24,
            }}
          >
            Local-first radio programming
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Space Grotesk",
          data: spaceGrotesk,
          style: "normal",
          weight: 600,
        },
      ],
    }
  )
}
