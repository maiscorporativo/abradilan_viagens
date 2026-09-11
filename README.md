# Portal ABRADILAN

Portal de viagens e eventos dos associados da **ABRADILAN**, operado pela Mais
Corporativo. Reúne em um único sistema, com um login e um banco:

1. **Consulta e solicitação de aéreo** — link para o sistema externo já existente;
2. **Eventos ABRADILAN** — check-in de viagens **+ sistema de convites integrado**
   (opcional por evento);
3. **Linha direta de viagens** — briefing do associado disparado direto ao
   WhatsApp de um atendente dedicado.

Construído sobre a plataforma de check-in (`checkin/plataforma`), com o sistema
de convites (`sistema_convite`, originalmente Express + SQLite nativo) **portado**
para a mesma stack.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Linguagem | TypeScript |
| Banco | Prisma — SQLite em desenvolvimento, **PostgreSQL em produção** |
| UI | Tailwind CSS 4 + componentes próprios + lucide-react + fonte Inter |
| Gráficos | Recharts |
| PDF / QR / XLSX | pdf-lib · qrcode · jsqr (leitura de QR) · xlsx |
| Autenticação | Sessões JWT em cookie httpOnly (jose) + bcryptjs |
| Mensageria | SMTP (nodemailer) e WhatsApp (Evolution API), com fallback `wa.me` |

## Como rodar

```bash
cd plataforma
npm install
cp .env.example .env   # e preencha
npm run setup          # cria o banco e popula o seed
npm run dev            # http://localhost:3000
```

**Acessos criados pelo seed:**

| Perfil | Acesso | Rota |
|---|---|---|
| Staff (Master) | `admin@abradilan.local` / `admin123` | `/login` |
| Associado ABRADILAN | `associado@abradilan.local` / `abradilan123` | `/entrar` |
| Empresa convidada | `distribuidoraexemplo` / `empresa123` | `/empresa/login` |
| Passageira demo | CPF `111.222.333-44` / PIN `123456` | `/portal/login` |

> Troque as senhas e o `AUTH_SECRET` antes de qualquer uso real.

## Níveis de acesso

| Área | Rota | Quem entra |
|---|---|---|
| Administrativa | `/admin` | Staff (`MASTER`, `AGENTE`, `VISUALIZADOR`) |
| **Associado** | `/app` | Associado ABRADILAN (e-mail + senha) |
| Empresa convidada | `/empresa` | Empresa de um evento (login + senha da cota) |
| Passageiro | `/portal` | Passageiro de uma viagem (CPF + PIN) |
| Convite digital | `/convite/<token>` | Público, pelo link único do convite |

## Área do associado (`/app`)

Hub com os três serviços. O card do aéreo aponta para `AEREO_URL`; os outros
dois levam a `/app/eventos` e `/app/linha-direta`.

**Linha direta:** o briefing é detalhado, no espírito do TripIt — o associado
monta o **itinerário em multi-trechos** (quantas pernas quiser, com data e
horário preferido por trecho), cadastra os **passageiros nominalmente** (nome
como no documento, nascimento, documento e validade, nacionalidade, fidelidade,
restrições) e ativa os **blocos de serviço** que precisa:

| Bloco | Campos |
|---|---|
| Aéreo | classe, companhia preferida, bagagem, assento, programa de fidelidade |
| Hospedagem | cidade, check-in/out, categoria, quartos, tipo, rede, café, referência |
| Transporte terrestre | traslado, aluguel de carro (categoria, retirada, devolução, motorista adicional), motorista à disposição |
| Serviços de apoio | seguro, câmbio, visto/documentação, chip internacional, ingresso de feira |

O itinerário vira `TravelSegment[]`, os passageiros viram `TravelPassenger[]` e
o resto fica em `TravelRequest` — que também guarda um **resumo denormalizado**
(origem, destino, datas, tipo) só para a fila do staff e a home do associado
listarem sem carregar os filhos. O `kind` (aéreo/hotel/pacote/evento) é deduzido
dos serviços marcados, em vez de perguntado.

A mensagem enviada ao WhatsApp em `LINHA_DIRETA_WHATSAPP` traz tudo, em seções:

- com a Evolution API configurada, o envio é automático;
- sem ela, o sistema devolve um link `wa.me` com a mensagem pronta;
- sem `LINHA_DIRETA_WHATSAPP`, a solicitação é apenas registrada.

**Cópia ao solicitante:** por padrão o associado recebe um comprovante do que
pediu, por e-mail (HTML) e WhatsApp, com protocolo, itinerário, passageiros,
serviços e link de acompanhamento. A caixa *"Receber uma cópia desta
solicitação"* permite desligar. A cópia é independente do disparo ao atendente:
falhar nela nunca invalida o pedido — o resultado fica em `copyLog`.

**Acompanhamento pelo associado** (`/app/solicitacoes`):

| Ação | Quando é permitida |
|---|---|
| Ver o briefing completo | sempre |
| Alterar | somente enquanto o status é `NOVO` |
| Cancelar | até o status `FECHADO` |
| Reenviar a cópia | sempre |

A edição usa **o mesmo formulário** da criação (só troca a action e os rótulos),
e ao salvar reenvia o briefing ao atendente marcado como *alterado* — assim os
dois lados não se dessincronizam. Depois que alguém assume o atendimento a
edição é bloqueada, porque o atendente já pode ter cotado com base no que
recebeu.

O staff acompanha e muda o status da fila em `/admin/solicitacoes`.

## Eventos e o módulo de convites

Um `Trip` representa **uma viagem ou um evento** (`kind = VIAGEM | EVENTO`). Em
**Configurações → Evento e convites** o campo **“Usar o sistema de convites”**
(`invitesEnabled`) liga ou desliga o módulo por evento — as abas abaixo só
aparecem quando ele está ativo, e nada do fluxo de check-in é afetado:

| Aba | O que faz |
|---|---|
| Empresas e cotas | Empresas convidadas com cota, login e senha próprios; processar a expiração da data-limite |
| Convidados | Emissão, disparo (e-mail/WhatsApp, individual ou em lote) e cancelamento dos convites |
| Mapa de mesas | Salão em SVG: arraste as mesas, clique para acomodar convidado em mesa/cadeira |
| Credenciamento | Check-in lendo o QR pela câmera ou digitando o código curto |
| Relatórios | Seis relatórios de impressão + exportação XLSX |

O mapa de mesas também pode ser desligado sozinho (`tablesEnabled`), para
eventos sem lugar marcado.

**Fluxo de trabalho:**

1. Crie o evento (`kind = EVENTO`) e ative os convites nas configurações
   (local, horário, traje, data-limite, hotéis, comodidades, textos).
2. Cadastre as empresas com suas cotas — o sistema gera login e senha, e o
   responsável já entra inscrito quando informado.
3. Envie o convite do responsável: a mensagem **inclui login e senha** da
   plataforma, além do QR code, mapa e hotéis.
4. As empresas acessam `/empresa`, completam seus dados e inscrevem convidados
   até a cota — o convite é disparado automaticamente na inscrição.
5. Monte o mapa de mesas e acomode os convidados.
6. Na data-limite, **Processar expiração**: as cotas não usadas voltam ao pool
   de convites individuais e as empresas param de inscrever.
7. No dia, use o **Credenciamento** para o check-in por QR.

Cada convidado recebe `/convite/<token>` com QR code, data, local com link do
Google Maps, mesa e cadeira, hotéis, comodidades e o botão de confirmar
presença. Todo convite tem também um **código curto de 6 dígitos**, digitável na
recepção quando não há como ler o QR.

## Identidade visual

Paleta ABRADILAN em `src/app/globals.css`, sobre os mesmos nomes de rampa do sistema
de origem (`brand`, `sun`, `ember`) — por isso a troca de identidade não exigiu
reescrever componentes:

| Rampa | Cor | Uso |
|---|---|---|
| `brand` | azul `#1690d0` | primária |
| `sun` | azul-marinho `#0f2836` | cabeçalhos e apoio |
| `ember` | verde-limão `#a0bf27` | destaques |

Tipografia: **Rubik** (a mesma do site institucional).

> Os logos em `public/logo-abradilan*.png` vieram do projeto `portal_abradilan` e
> devem ser substituídos pelos arquivos oficiais fornecidos pelo cliente, se houver
> versões mais recentes. O favicon é um recorte do símbolo do logo.

## Variáveis de ambiente

Veja `.env.example`. Além das do check-in (`DATABASE_URL`, `AUTH_SECRET`, SMTP,
Evolution), o portal usa:

| Variável | Para quê |
|---|---|
| `BASE_URL` | URL pública — base dos links de convite e dos QR codes |
| `AEREO_URL` | Destino do card “Consulta e solicitação de aéreo” |
| `LINHA_DIRETA_WHATSAPP` | WhatsApp do atendente dedicado (DDD + número) |
| `LINHA_DIRETA_NOME` | Nome exibido do atendente |

> **Atenção:** o WhatsApp usa `EVOLUTION_URL`, `EVOLUTION_APIKEY` e
> `EVOLUTION_INSTANCE`. O `.env` do projeto de origem trazia os nomes
> `EVOLUTION_API_URL` / `EVOLUTION_API_KEY`, que o código não lê — o que deixava
> o envio silenciosamente desabilitado. Aqui já está corrigido.

## Produção (`abradilanviagens.mais.tur.br`)

1. Trocar o `datasource` do `prisma/schema.prisma` para `postgresql` e apontar
   `DATABASE_URL` ao banco gerenciado.
2. Definir `BASE_URL=https://abradilanviagens.mais.tur.br` — os QR codes já emitidos
   dependem dessa URL.
3. Definir `STORAGE_DIR` para uma pasta persistente fora do diretório do deploy
   (cada deploy substitui a pasta do app).
4. `npm run build && npm run start`.

## Estrutura

```
src/
  lib/
    invites.ts          tokens, códigos curtos, cotas e expiração
    invite-messages.ts  textos e HTML do convite (WhatsApp e e-mail)
    invite-dispatch.ts  disparo por canal, com fallback e log de envio
    briefing.ts         mensagem da linha direta
    portal-config.ts    AEREO_URL, WhatsApp do atendente, BASE_URL
    auth / session      staff, associado, empresa e passageiro
  app/
    entrar/             login do associado
    app/                área do associado (hub, eventos, linha direta, senha)
    empresa/            login e painel da empresa convidada
    convite/[token]/    convite digital público com QR e RSVP
    admin/
      associates/       CRUD de associados
      solicitacoes/     fila da linha direta
      t/[tripId]/       módulos da viagem/evento (inclui companies, invites,
                        tables, credenciamento, relatorios)
    portal/             área do passageiro (inalterada)
    api/                arquivos, vouchers e exportação XLSX
prisma/                 schema + seed
```
