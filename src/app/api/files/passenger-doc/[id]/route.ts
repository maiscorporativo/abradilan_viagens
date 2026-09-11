import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaffSession, getPassengerSession } from "@/lib/session";
import { canAccessTrip } from "@/lib/auth";
import { readUpload } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await db.passengerDocument.findUnique({
    where: { id },
    include: { passenger: { select: { tripId: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const staff = await getStaffSession();
  const passenger = await getPassengerSession();
  const isOwner = passenger && passenger.passengerId === doc.passengerId;
  const staffAllowed = staff && (await canAccessTrip(staff, doc.passenger.tripId));
  if (!staffAllowed && !isOwner) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await readUpload(doc.filePath);
    return new NextResponse(new Blob([new Uint8Array(data)]), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo indisponível" }, { status: 404 });
  }
}
