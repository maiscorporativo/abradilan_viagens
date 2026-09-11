import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";

// Timbrado do evento, usado no cabecalho dos relatorios impressos.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { letterheadPath: true },
  });
  const filePath = trip?.letterheadPath;
  if (!filePath) {
    return NextResponse.json({ error: "Sem arquivo" }, { status: 404 });
  }
  try {
    const data = await readUpload(filePath);
    const ext = filePath.split(".").pop()?.toLowerCase();
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Blob([new Uint8Array(data)]), {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo indisponível" }, { status: 404 });
  }
}
