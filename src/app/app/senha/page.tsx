import { requireAssociate } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { SenhaClient } from "./senha-client";

export default async function SenhaPage() {
  const session = await requireAssociate();
  const associate = await db.associate.findUnique({
    where: { id: session.associateId },
    select: { mustChangePassword: true },
  });

  return (
    <>
      <PageHeader
        title="Minha senha"
        subtitle="Altere a senha de acesso à área do associado."
      />
      <SenhaClient mustChange={!!associate?.mustChangePassword} />
    </>
  );
}
