/** Tom de cor do Badge para cada status do sistema (uso em server e client). */
export function statusTone(status: string): string {
  switch (status) {
    case "CONFIRMADO":
    case "CONCLUIDO":
    case "CONCLUIDA":
    case "RESOLVIDO":
      return "green";
    case "PENDENTE":
    case "PLANEJAMENTO":
    case "NOVO":
      return "amber";
    case "EM_ANDAMENTO":
    case "INSCRICOES":
    case "EM_ATENDIMENTO":
    case "RESPONDIDO":
      return "blue";
    case "RECUSADO":
    case "CANCELADO":
    case "ATRASADO":
      return "rose";
    default:
      return "slate";
  }
}
