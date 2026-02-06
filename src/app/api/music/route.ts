import path from "path";
import { readdir } from "fs/promises";
import { NextResponse } from "next/server";

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".aac",
  ".webm",
  ".flac",
]);

export async function GET() {
  const musicDir = path.join(process.cwd(), "public", "music");

  try {
    const entries = await readdir(musicDir, { withFileTypes: true });

    const tracks = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => {
        if (name.startsWith(".")) {
          return false;
        }
        const extension = path.extname(name).toLowerCase();
        return extension === "" || AUDIO_EXTENSIONS.has(extension);
      })
      .sort((a, b) => a.localeCompare(b))
      .map((name) => `/music/${encodeURIComponent(name)}`);

    return NextResponse.json(
      { tracks },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { tracks: [] as string[] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

