export const ROLES = {
  MASTER: "MASTER",
  AGENTE: "AGENTE",
  VISUALIZADOR: "VISUALIZADOR",
} as const;
export type Role = keyof typeof ROLES;

export const ROLE_LABELS: Record<string, string> = {
  MASTER: "Master",
  AGENTE: "Agente",
  VISUALIZADOR: "Visualizador",
};

export const TRIP_STATUS: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  INSCRICOES: "Inscrições abertas",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  ARQUIVADA: "Arquivada",
};

export const RSVP_STATUS: Record<string, string> = {
  PENDENTE: "Pendente",
  CONFIRMADO: "Confirmado",
  RECUSADO: "Recusado",
  CANCELADO: "Cancelado",
};

export const TASK_STATUS: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  ATRASADO: "Atrasado",
};

export const TICKET_STATUS: Record<string, string> = {
  NOVO: "Novo",
  EM_ATENDIMENTO: "Em atendimento",
  RESPONDIDO: "Respondido",
  RESOLVIDO: "Resolvido",
};

export const DOC_KINDS: Record<string, string> = {
  PASSAPORTE: "Passaporte",
  RG: "RG / Identidade",
  VISTO: "Visto",
  SEGURO: "Seguro viagem",
  FOTO: "Foto",
  OUTRO: "Outro",
};

export const TRIP_DOC_CATEGORIES: Record<string, string> = {
  GERAL: "Geral",
  VOUCHER: "Voucher",
  SEGURO: "Seguro",
  INGRESSO: "Ingresso",
  OUTRO: "Outro",
};

export const VOUCHER_KINDS: Record<string, string> = {
  AEREO: "Aéreo",
  HOSPEDAGEM: "Hospedagem",
  COMPLETO: "Completo (aéreo + hospedagem)",
  PERSONALIZADO: "Personalizado",
};

// Seções disponíveis para composição de um template de voucher
export const VOUCHER_SECTIONS: Record<string, string> = {
  passenger: "Dados do passageiro",
  flights: "Voos",
  accommodation: "Hospedagem",
  emergency: "Contato de emergência",
  itinerary: "Cronograma resumido",
  freeText: "Texto livre",
};

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

// ---------------------------------------------------------------------------
// Portal ABRADILAN — área do associado, linha direta e módulo de convites
// ---------------------------------------------------------------------------

export const TRIP_KINDS: Record<string, string> = {
  VIAGEM: "Viagem",
  EVENTO: "Evento",
};

export const ASSOCIATE_ROLES: Record<string, string> = {
  ASSOCIADO: "Associado",
  GESTOR: "Gestor",
};

export const TRAVEL_REQUEST_KINDS: Record<string, string> = {
  AEREO: "Aéreo",
  HOTEL: "Hospedagem",
  PACOTE: "Pacote completo (aéreo + hotel)",
  EVENTO: "Viagem para evento / feira",
  OUTRO: "Outro",
};

export const TRAVEL_REQUEST_STATUS: Record<string, string> = {
  NOVO: "Novo",
  EM_ATENDIMENTO: "Em atendimento",
  COTADO: "Cotado",
  FECHADO: "Fechado",
  CANCELADO: "Cancelado",
};

export const INVITE_KINDS: Record<string, string> = {
  RESPONSAVEL: "Responsável da empresa",
  CONVIDADO: "Convidado da empresa",
  INDIVIDUAL: "Convite individual",
};

export const INVITE_STATUS: Record<string, string> = {
  PENDENTE: "Pendente",
  ENVIADO: "Convite enviado",
  CONFIRMADO: "Presença confirmada",
  RECUSADO: "Recusado",
  CREDENCIADO: "Credenciado",
  CANCELADO: "Cancelado",
};

export const TABLE_SHAPES: Record<string, string> = {
  REDONDA: "Redonda",
  RETANGULAR: "Retangular",
};

export const DELIVERY_CHANNELS: Record<string, string> = {
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
};

// ---------------------------------------------------------------------------
// Linha direta — briefing detalhado (itinerário, serviços e passageiros)
// ---------------------------------------------------------------------------

export const TRIP_TYPES: Record<string, string> = {
  SO_IDA: "Somente ida",
  IDA_VOLTA: "Ida e volta",
  MULTITRECHO: "Multi-trechos",
};

export const TIME_PREFERENCES: Record<string, string> = {
  QUALQUER: "Qualquer horário",
  MANHA: "Manhã",
  TARDE: "Tarde",
  NOITE: "Noite",
};

export const CABIN_CLASSES: Record<string, string> = {
  ECONOMICA: "Econômica",
  PREMIUM: "Econômica premium",
  EXECUTIVA: "Executiva",
  PRIMEIRA: "Primeira classe",
};

export const SEAT_PREFERENCES: Record<string, string> = {
  INDIFERENTE: "Indiferente",
  JANELA: "Janela",
  CORREDOR: "Corredor",
};

export const HOTEL_CATEGORIES: Record<string, string> = {
  INDIFERENTE: "Indiferente",
  "3": "3 estrelas",
  "4": "4 estrelas",
  "5": "5 estrelas",
};

export const ROOM_TYPES: Record<string, string> = {
  SINGLE: "Single (1 pessoa)",
  DUPLO: "Duplo (cama de casal)",
  TWIN: "Twin (2 camas)",
  SUITE: "Suíte",
};

export const CAR_CATEGORIES: Record<string, string> = {
  ECONOMICO: "Econômico",
  INTERMEDIARIO: "Intermediário",
  EXECUTIVO: "Executivo",
  SUV: "SUV",
  VAN: "Van / minivan",
};

export const TRAVEL_PASSENGER_TYPES: Record<string, string> = {
  TITULAR: "Titular",
  ACOMPANHANTE: "Acompanhante",
  COLABORADOR: "Colaborador",
  CONVIDADO: "Convidado",
};

export const TRAVEL_DOC_TYPES: Record<string, string> = {
  PASSAPORTE: "Passaporte",
  RG: "RG",
  CPF: "CPF",
  OUTRO: "Outro",
};

// ---------------------------------------------------------------------------
// Etapas do atendimento da linha direta
// A ordem de STAGE_FLOW é a régua visual mostrada ao atendente e ao associado.
// CANCELADO fica de fora do fluxo: é uma saída, não uma etapa.
// ---------------------------------------------------------------------------

export const STAGE_FLOW = [
  "NOVO",
  "EM_ATENDIMENTO",
  "COTADO",
  "FECHADO",
] as const;

/** O que cada etapa significa, na linguagem do associado. */
export const STAGE_DESCRIPTION: Record<string, string> = {
  NOVO: "Solicitação recebida e enviada ao atendente.",
  EM_ATENDIMENTO: "O atendente está buscando as melhores opções.",
  COTADO: "As opções estão prontas — escolha a que preferir.",
  FECHADO: "Opção escolhida. O atendente segue com a emissão.",
  CANCELADO: "Solicitação cancelada.",
};

export const CURRENCIES: Record<string, string> = {
  BRL: "R$",
  USD: "US$",
  EUR: "€",
};
