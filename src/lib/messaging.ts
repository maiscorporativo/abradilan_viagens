import "server-only";
import nodemailer from "nodemailer";
import { onlyDigits } from "./utils";

// ---------------------------------------------------------------------------
// Envio de vouchers por e-mail (SMTP) e WhatsApp (Evolution API).
// Configuração via variáveis de ambiente no .env — ver README.
// ---------------------------------------------------------------------------

export type SendResult = { ok: boolean; error?: string };

export function emailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function whatsappConfigured() {
  return !!(
    process.env.EVOLUTION_URL &&
    process.env.EVOLUTION_APIKEY &&
    process.env.EVOLUTION_INSTANCE
  );
}

export async function sendEmailWithPdf(opts: {
  to: string;
  subject: string;
  text: string;
  fileName: string;
  pdfBytes: Uint8Array;
}): Promise<SendResult> {
  if (!emailConfigured()) {
    return {
      ok: false,
      error: "SMTP não configurado (defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env).",
    };
  }
  if (!opts.to) return { ok: false, error: "Passageiro sem e-mail cadastrado." };

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      attachments: [
        {
          filename: opts.fileName,
          content: Buffer.from(opts.pdfBytes),
          contentType: "application/pdf",
        },
      ],
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha no envio SMTP." };
  }
}

/** Normaliza telefone brasileiro para o formato aceito pela Evolution (E.164 sem +). */
export function normalizeWhatsappNumber(phone: string): string | null {
  let digits = onlyDigits(phone);
  if (!digits) return null;
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  // 10-11 dígitos = DDD + número sem código do país
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  if (digits.length < 12 || digits.length > 15) return null;
  return digits;
}

export async function sendWhatsappPdf(opts: {
  phone: string;
  caption: string;
  fileName: string;
  pdfBytes: Uint8Array;
}): Promise<SendResult> {
  if (!whatsappConfigured()) {
    return {
      ok: false,
      error:
        "Evolution API não configurada (defina EVOLUTION_URL, EVOLUTION_APIKEY e EVOLUTION_INSTANCE no .env).",
    };
  }
  const number = normalizeWhatsappNumber(opts.phone);
  if (!number) {
    return { ok: false, error: "Telefone inválido ou não cadastrado." };
  }

  const base = process.env.EVOLUTION_URL!.replace(/\/+$/, "");
  const instance = encodeURIComponent(process.env.EVOLUTION_INSTANCE!);
  try {
    const res = await fetch(`${base}/message/sendMedia/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.EVOLUTION_APIKEY!,
      },
      body: JSON.stringify({
        number,
        mediatype: "document",
        mimetype: "application/pdf",
        fileName: opts.fileName,
        caption: opts.caption,
        media: Buffer.from(opts.pdfBytes).toString("base64"),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Evolution respondeu ${res.status}: ${body.slice(0, 200)}`,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao contatar a Evolution API.",
    };
  }
}

// ---------------------------------------------------------------------------
// Mensagens de texto (linha direta e convites de evento)
// Os envios de voucher acima carregam PDF; aqui basta texto.
// ---------------------------------------------------------------------------

/**
 * Link wa.me com a mensagem pré-preenchida. É o fallback usado quando a
 * Evolution API não está configurada — o operador clica e envia manualmente,
 * mesmo comportamento do sistema de convites de origem.
 */
export function whatsappLink(phone: string, message: string): string | null {
  const number = normalizeWhatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export async function sendWhatsappText(opts: {
  phone: string;
  message: string;
}): Promise<SendResult> {
  if (!whatsappConfigured()) {
    return {
      ok: false,
      error:
        "Evolution API não configurada (defina EVOLUTION_URL, EVOLUTION_APIKEY e EVOLUTION_INSTANCE no .env).",
    };
  }
  const number = normalizeWhatsappNumber(opts.phone);
  if (!number) return { ok: false, error: "Telefone inválido ou não cadastrado." };

  const base = process.env.EVOLUTION_URL!.replace(/\/+$/, "");
  const instance = encodeURIComponent(process.env.EVOLUTION_INSTANCE!);
  try {
    const res = await fetch(`${base}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.EVOLUTION_APIKEY!,
      },
      body: JSON.stringify({ number, text: opts.message }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Evolution respondeu ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao contatar a Evolution API.",
    };
  }
}

/**
 * Remove a marcação de negrito do WhatsApp (*texto*) para uso em e-mail.
 * As mesmas mensagens servem aos dois canais; só o WhatsApp entende os
 * asteriscos, que no corpo de um e-mail viram ruído.
 */
export function stripWhatsappMarkup(message: string): string {
  return message.replace(/\*([^*\n]+)\*/g, "$1");
}

/** E-mail simples (sem anexo) — usado nos convites de evento. */
export async function sendEmailText(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<SendResult> {
  if (!emailConfigured()) {
    return {
      ok: false,
      error: "SMTP não configurado (defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env).",
    };
  }
  if (!opts.to) return { ok: false, error: "Destinatário sem e-mail cadastrado." };

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // O QR code e o banner entram no HTML como data: URI, e Gmail/Outlook
      // descartam imagens nesse formato. Com esta opção o nodemailer converte
      // cada uma em anexo embutido (cid:), que os clientes exibem.
      attachDataUrls: true,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      // A alternativa em texto nunca deve carregar a marcação do WhatsApp:
      // é ela que o cliente mostra quando o HTML é bloqueado.
      text: stripWhatsappMarkup(opts.text),
      html: opts.html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha no envio SMTP." };
  }
}
