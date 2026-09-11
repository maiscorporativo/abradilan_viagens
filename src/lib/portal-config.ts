import "server-only";

// ---------------------------------------------------------------------------
// Configuração do Portal ABRADILAN lida do ambiente.
// Centraliza os pontos que o cliente ainda vai definir (URL do sistema de
// aéreo, WhatsApp do atendente da linha direta) para que só exista um lugar
// a alterar quando os valores definitivos chegarem.
// ---------------------------------------------------------------------------

/** URL pública do portal — base dos links de convite e dos QR codes. */
export function baseUrl() {
  return (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** Sistema externo de consulta e solicitação de aéreo. */
export function aereoUrl() {
  return process.env.AEREO_URL || "https://travellink.pontodeviagem.tur.br/";
}

/** WhatsApp do atendente dedicado que recebe os briefings da linha direta. */
export function linhaDiretaPhone() {
  return process.env.LINHA_DIRETA_WHATSAPP || "";
}

export function linhaDiretaName() {
  return process.env.LINHA_DIRETA_NOME || "Atendimento Mais Corporativo";
}

export function linhaDiretaConfigured() {
  return !!linhaDiretaPhone();
}
