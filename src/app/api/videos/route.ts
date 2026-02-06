import path from "path";
import { readdir } from "fs/promises";
import { NextResponse } from "next/server";

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);

export async function GET() {
  const imagesDir = path.join(process.cwd(), "public", "images");

  try {
    const entries = await readdir(imagesDir, { withFileTypes: true });

    const videos = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => `/images/${encodeURIComponent(name)}`);

    return NextResponse.json(
      { videos },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { videos: [] as string[] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
