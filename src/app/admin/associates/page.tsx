import { db } from "@/lib/db";
import { requireMaster } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AssociatesClient } from "./associates-client";

export default async function AssociatesPage() {
  await requireMaster();
  const associates = await db.associate.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { travelRequests: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Associados ABRADILAN"
        subtitle="Contas de acesso à área do associado: aéreo, eventos e linha direta."
      />
      <AssociatesClient
        associates={associates.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          companyName: a.companyName,
          cnpj: a.cnpj,
          phone: a.phone,
          role: a.role,
          active: a.active,
          mustChangePassword: a.mustChangePassword,
          requestCount: a._count.travelRequests,
        }))}
      />
    </div>
  );
}
