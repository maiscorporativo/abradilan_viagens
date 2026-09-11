import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { FieldEditor } from "./field-editor";
import { ArrowLeft } from "lucide-react";

export default async function VoucherEditorPage({
  params,
}: {
  params: Promise<{ tripId: string; templateId: string }>;
}) {
  const { tripId, templateId } = await params;
  await requireTripWriter(tripId);

  const template = await db.voucherTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template || template.tripId !== tripId) notFound();
  if (!template.backgroundPdfPath) redirect(`/admin/t/${tripId}/vouchers`);

  return (
    <div>
      <Link
        href={`/admin/t/${tripId}/vouchers`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Vouchers
      </Link>
      <PageHeader
        title={`Editor de layout — ${template.name}`}
        subtitle="Adicione campos e arraste-os para a posição exata onde devem ser impressos sobre o template."
      />
      <FieldEditor
        tripId={tripId}
        templateId={templateId}
        pdfUrl={`/api/files/voucher-template-pdf/${templateId}`}
        initialFields={template.fields}
      />
    </div>
  );
}
