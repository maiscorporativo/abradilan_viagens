import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const airline = await db.airline.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!airline?.logoPath) {
    return NextResponse.json({ error: "Sem logo" }, { status: 404 });
  }
  try {
    const data = await readUpload(airline.logoPath);
    const ext = airline.logoPath.split(".").pop()?.toLowerCase();
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Blob([new Uint8Array(data)]), {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo indisponível" }, { status: 404 });
  }
}
