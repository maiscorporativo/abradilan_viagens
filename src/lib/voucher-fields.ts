// Campos disponíveis para o editor visual de vouchers (modo template PDF).
// Compartilhado entre o editor (client) e o gerador (server).

export type PlacedField = {
  id: string;
  source: string; // chave em FIELD_SOURCES ou "custom"
  label: string;
  custom?: string; // conteúdo quando source === "custom"
  page: number; // índice da página do PDF (0-based)
  x: number; // fração 0..1 da largura (canto esquerdo do texto)
  y: number; // fração 0..1 da altura (topo do texto)
  size: number; // tamanho da fonte em pt
  bold?: boolean;
  color?: string; // hex
};

export const FIELD_SOURCES: Record<string, string> = {
  "passenger.name": "Nome do passageiro",
  "passenger.cpf": "CPF",
  "passenger.rg": "RG",
  "passenger.passport": "Passaporte",
  "passenger.birthDate": "Data de nascimento",
  "passenger.phone": "Telefone",
  "passenger.email": "E-mail",
  "passenger.category": "Categoria",
  "passenger.group": "Grupo",
  "passenger.dietary": "Restrições alimentares",
  "passenger.emergency": "Contato de emergência",
  "trip.name": "Nome da viagem",
  "trip.clientName": "Cliente (empresa)",
  "trip.destination": "Destino",
  "trip.period": "Período da viagem",
  "hotel.name": "Hotel",
  "hotel.address": "Endereço do hotel",
  "hotel.checkIn": "Check-in",
  "hotel.checkOut": "Check-out",
  "hotel.room": "Quarto",
  "hotel.roomType": "Tipo de quarto",
  "flights.summary": "Voos (bloco com todos os trechos)",
  "flights.first": "Primeiro voo (uma linha)",
  "today": "Data de emissão",
  custom: "Texto livre / Observações",
};
