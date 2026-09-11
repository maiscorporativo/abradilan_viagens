"use client";

import { Printer } from "lucide-react";

/**
 * Casca dos relatórios impressos: cabeçalho com timbrado do evento e botão
 * de impressão que some no papel (@media print).
 */
export function PrintShell({
  title,
  subtitle,
  letterheadSrc,
  children,
}: {
  title: string;
  subtitle: string;
  letterheadSrc?: string | null;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-4xl bg-white p-8 text-slate-900 print:p-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 14mm; }
          body { background: #fff; }
          tr, .avoid-break { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mb-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </button>
      </div>

      {letterheadSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={letterheadSrc} alt="" className="mb-6 w-full" />
      )}

      <header className="mb-6 border-b-2 border-slate-800 pb-3">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </header>

      {children}

      <footer className="mt-8 border-t border-slate-200 pt-3 text-[11px] text-slate-400">
        Portal ABRADILAN · gerado em {new Date().toLocaleString("pt-BR")}
      </footer>
    </main>
  );
}
