import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";

// Banner é público (aparece na home do portal do passageiro).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { bannerPath: true },
  });
  if (!trip?.bannerPath) {
    return NextResponse.json({ error: "Sem banner" }, { status: 404 });
  }
  try {
    const data = await readUpload(trip.bannerPath);
    const ext = trip.bannerPath.split(".").pop()?.toLowerCase();
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Blob([new Uint8Array(data)]), {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo indisponível" }, { status: 404 });
  }
}
