import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";

// Logo é pública (aparece no formulário do convidado e no portal).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { logoPath: true },
  });
  if (!trip?.logoPath) {
    return NextResponse.json({ error: "Sem logo" }, { status: 404 });
  }
  try {
    const data = await readUpload(trip.logoPath);
    const ext = trip.logoPath.split(".").pop()?.toLowerCase();
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Blob([new Uint8Array(data)]), {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo indisponível" }, { status: 404 });
  }
}
