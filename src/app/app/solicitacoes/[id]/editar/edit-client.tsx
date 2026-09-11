"use client";

import { updateTravelRequest } from "../../actions";
import {
  LinhaDiretaForm, type FormInitial,
} from "@/app/app/linha-direta/form-client";

/**
 * A edição usa exatamente o mesmo formulário da criação — só troca a action e
 * os rótulos. Assim as duas telas nunca divergem em campos ou validação.
 */
export function EditClient({
  id,
  initial,
  defaults,
  attendantName,
}: {
  id: string;
  initial: FormInitial;
  defaults: { name: string; email: string; companyName: string; phone: string };
  attendantName: string;
}) {
  return (
    <LinhaDiretaForm
      defaults={defaults}
      attendantName={attendantName}
      initial={initial}
      action={updateTravelRequest.bind(null, id)}
      submitLabel="Salvar alterações"
      cancelHref={`/app/solicitacoes/${id}`}
    />
  );
}
