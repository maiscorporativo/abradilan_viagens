import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { getStaffSession, getPassengerSession } from "@/lib/session";
import { canAccessTrip } from "@/lib/auth";
import { generateVoucherPdf } from "@/lib/voucher";

export const maxDuration = 300;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  const url = new URL(req.url);
  const passengerId = url.searchParams.get("passenger");
  const all = url.searchParams.get("all") === "1";

  const staff = await getStaffSession();
  const passengerSession = await getPassengerSession();

  const template = await db.voucherTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) {
    return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
  }

  // Staff precisa ter acesso à viagem; passageiro autenticado só gera o próprio
  if (staff) {
    if (!(await canAccessTrip(staff, template.tripId))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
  } else {
    if (!passengerSession || all || passengerId !== passengerSession.passengerId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  if (all) {
    const passengers = await db.passenger.findMany({
      where: { tripId: template.tripId, blocked: false },
      select: { id: true },
      orderBy: { name: "asc" },
    });

    const zip = new JSZip();
    let generated = 0;
    for (const p of passengers) {
      const result = await generateVoucherPdf(templateId, p.id);
      if (result) {
        zip.file(result.fileName, result.bytes);
        generated++;
      }
    }
    if (generated === 0) {
      return NextResponse.json(
        { error: "Nenhum voucher pôde ser gerado." },
        { status: 400 }
      );
    }
    const content = await zip.generateAsync({ type: "uint8array" });
    return new NextResponse(new Blob([new Uint8Array(content)]), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="vouchers_${templateId}.zip"`,
      },
    });
  }

  if (!passengerId) {
    return NextResponse.json({ error: "Passageiro não informado" }, { status: 400 });
  }
  const result = await generateVoucherPdf(templateId, passengerId);
  if (!result) {
    return NextResponse.json(
      { error: "Não foi possível gerar o voucher." },
      { status: 404 }
    );
  }
  return new NextResponse(new Blob([new Uint8Array(result.bytes)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
    },
  });
}
