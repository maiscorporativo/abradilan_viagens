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
  const doc = await db.tripDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const staff = await getStaffSession();
  if (staff) {
    if (!(await canAccessTrip(staff, doc.tripId))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
  } else {
    const passenger = await getPassengerSession();
    const allowed =
      passenger &&
      passenger.tripId === doc.tripId &&
      doc.visibleToPassenger &&
      (doc.passengerId === null || doc.passengerId === passenger.passengerId);
    if (!allowed) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
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
