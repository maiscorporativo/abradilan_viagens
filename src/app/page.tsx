import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Users, Building2 } from "lucide-react";

const doors = [
  {
    href: "/entrar",
    icon: Building2,
    title: "Área do Associado",
    description:
      "Solicitação de aéreo, eventos ABRADILAN e linha direta para pedidos de viagem.",
  },
  {
    href: "/portal/login",
    icon: Users,
    title: "Área do Passageiro",
    description: "Seus dados, voos, roteiro, recados e documentos da viagem.",
  },
  {
    href: "/login",
    icon: ShieldCheck,
    title: "Área Administrativa",
    description: "Equipe da organização: gestão de eventos, viagens e convites.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-sun-600 via-sun-500 to-brand-700 px-4 py-12">
      <div className="mb-10 text-center">
        <Image
          src="/logo-abradilan-branco.png"
          alt="ABRADILAN"
          width={220}
          height={60}
          priority
          className="mx-auto mb-5 h-auto w-52"
        />
        <p className="text-sm text-white/80">
          Portal de viagens e eventos dos associados
        </p>
      </div>

      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {doors.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur transition hover:border-white/40 hover:bg-white/20"
          >
            <Icon className="mb-3 h-8 w-8 text-white" strokeWidth={1.75} />
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-white/75">{description}</p>
          </Link>
        ))}
      </div>

      <p className="mt-10 flex items-center gap-2 text-[11px] text-white/60">
        © {new Date().getFullYear()} ABRADILAN · operado por
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mais-branco.png" alt="Mais Corporativo" className="h-4 w-auto" />
      </p>
    </main>
  );
}
