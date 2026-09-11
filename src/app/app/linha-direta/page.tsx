import { requireAssociate } from "@/lib/auth";
import { db } from "@/lib/db";
import { linhaDiretaName } from "@/lib/portal-config";
import { PageHeader } from "@/components/ui";
import { LinhaDiretaForm } from "./form-client";

export default async function LinhaDiretaPage() {
  const session = await requireAssociate();
  const associate = await db.associate.findUnique({
    where: { id: session.associateId },
    select: { phone: true },
  });

  return (
    <>
      <PageHeader
        title="Linha direta de viagens"
        subtitle="Conte o que você precisa. O briefing vai direto para o atendente dedicado aos associados ABRADILAN, que retorna com as opções."
      />
      <LinhaDiretaForm
        attendantName={linhaDiretaName()}
        defaults={{
          name: session.name,
          email: session.email,
          companyName: session.companyName,
          phone: associate?.phone ?? "",
        }}
      />
    </>
  );
}
