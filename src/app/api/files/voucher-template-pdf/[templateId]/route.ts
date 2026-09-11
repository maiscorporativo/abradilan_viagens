import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaffSession } from "@/lib/session";
import { canAccessTrip } from "@/lib/auth";
import { readUpload } from "@/lib/storage";

// Serve o PDF-base do template para o editor visual (somente staff da viagem).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  const template = await db.voucherTemplate.findUnique({ where: { id: templateId } });
  if (!template?.backgroundPdfPath) {
    return NextResponse.json({ error: "Sem PDF" }, { status: 404 });
  }

  const staff = await getStaffSession();
  if (!staff || !(await canAccessTrip(staff, template.tripId))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await readUpload(template.backgroundPdfPath);
    return new NextResponse(new Blob([new Uint8Array(data)]), {
      headers: { "Content-Type": "application/pdf" },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo indisponível" }, { status: 404 });
  }
}
