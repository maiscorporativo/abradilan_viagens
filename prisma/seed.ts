import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { AIRLINES, AIRPORTS } from "../src/lib/catalog-data";

const db = new PrismaClient();


async function main() {
  // Usuário master inicial
  const email = "admin@abradilan.local";
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    await db.user.create({
      data: {
        name: "Administrador",
        email,
        role: "MASTER",
        passwordHash: await bcrypt.hash("admin123", 10),
      },
    });
    console.log(`Usuário master criado: ${email} / senha: admin123`);
  }

  // Catálogos globais
  for (const [code, name] of AIRLINES) {
    await db.airline.upsert({
      where: { code },
      update: {},
      create: { code, name },
    });
  }
  for (const [iata, name, city, country] of AIRPORTS) {
    await db.airport.upsert({
      where: { iata },
      update: {},
      create: { iata, name, city, country },
    });
  }
  console.log(
    `Catálogos: ${AIRLINES.length} cias aéreas e ${AIRPORTS.length} aeroportos.`
  );

  // Viagem de demonstração (criada apenas uma vez)
  const demoSlug = "viagem-demonstracao";
  if (!(await db.trip.findUnique({ where: { slug: demoSlug } }))) {
    const trip = await db.trip.create({
      data: {
        name: "Viagem Demonstração — Mallorca 2026",
        clientName: "Empresa Exemplo S.A.",
        slug: demoSlug,
        destination: "Palma de Mallorca, Espanha",
        startDate: new Date(Date.UTC(2026, 8, 10)),
        endDate: new Date(Date.UTC(2026, 8, 17)),
        status: "INSCRICOES",
        primaryColor: "#1690d0",
        formToken: "demo-formulario-mallorca",
        formWelcome:
          "Bem-vindo! Preencha seus dados com atenção — eles serão usados na emissão das passagens e reservas.",
      },
    });

    const g1 = await db.tripGroup.create({
      data: { tripId: trip.id, name: "G1", color: "#0284c7" },
    });
    const g2 = await db.tripGroup.create({
      data: { tripId: trip.id, name: "G2", color: "#d97706" },
    });
    await db.tripGroup.create({
      data: { tripId: trip.id, name: "Staff", color: "#7c3aed" },
    });

    const titular = await db.passenger.create({
      data: {
        tripId: trip.id,
        type: "TITULAR",
        name: "Maria Oliveira",
        email: "maria@example.com",
        phone: "(41) 99999-0001",
        cpf: "11122233344",
        birthDate: new Date(Date.UTC(1985, 4, 12)),
        passportNumber: "FP123456",
        city: "Curitiba",
        uf: "PR",
        category: "Cliente Premiado",
        rsvpStatus: "CONFIRMADO",
        pin: "123456",
        groupId: g1.id,
        formFilledAt: new Date(),
        dietary: "Intolerância a lactose",
        emergencyName: "João Oliveira",
        emergencyPhone: "(41) 99999-0002",
      },
    });
    await db.passenger.create({
      data: {
        tripId: trip.id,
        type: "ACOMPANHANTE",
        titularId: titular.id,
        name: "Carlos Oliveira",
        email: "carlos@example.com",
        cpf: "55566677788",
        birthDate: new Date(Date.UTC(1983, 10, 3)),
        city: "Curitiba",
        uf: "PR",
        category: "Cliente Premiado",
        rsvpStatus: "CONFIRMADO",
        pin: "654321",
        groupId: g1.id,
        formFilledAt: new Date(),
      },
    });
    await db.passenger.create({
      data: {
        tripId: trip.id,
        type: "TITULAR",
        name: "Ana Souza",
        email: "ana@example.com",
        cpf: "99988877766",
        birthDate: new Date(Date.UTC(1990, 1, 25)),
        city: "São Paulo",
        uf: "SP",
        category: "Diretoria",
        rsvpStatus: "PENDENTE",
        pin: "111222",
        groupId: g2.id,
      },
    });

    const flight = await db.flight.create({
      data: {
        tripId: trip.id,
        scope: "INTERNACIONAL",
        flightNumber: "LA8065",
        airlineCode: "LA",
        airlineName: "LATAM Airlines",
        originIata: "GRU",
        originName: "São Paulo, Brasil",
        destIata: "MAD",
        destName: "Madri, Espanha",
        depDateTime: new Date(Date.UTC(2026, 8, 9, 22, 30)),
        arrDateTime: new Date(Date.UTC(2026, 8, 10, 13, 15)),
        locator: "ABCD12",
      },
    });
    await db.flightPassenger.create({
      data: { flightId: flight.id, passengerId: titular.id, seat: "12A" },
    });

    const hotel = await db.accommodation.create({
      data: {
        tripId: trip.id,
        name: "Hotel Playa Esperanza",
        address: "Carrer de les Sivines, 4",
        city: "Palma de Mallorca",
        country: "Espanha",
        checkIn: new Date(Date.UTC(2026, 8, 10)),
        checkOut: new Date(Date.UTC(2026, 8, 17)),
        notes: "Café da manhã incluído.",
      },
    });
    await db.accommodationPassenger.create({
      data: {
        accommodationId: hotel.id,
        passengerId: titular.id,
        roomNumber: "204",
        roomType: "DBL",
      },
    });

    await db.itineraryItem.createMany({
      data: [
        {
          tripId: trip.id,
          date: new Date(Date.UTC(2026, 8, 10)),
          startTime: "14:00",
          title: "Chegada e check-in no hotel",
          location: "Hotel Playa Esperanza",
          sortOrder: 1,
        },
        {
          tripId: trip.id,
          date: new Date(Date.UTC(2026, 8, 10)),
          startTime: "20:00",
          endTime: "22:30",
          title: "Jantar de boas-vindas",
          location: "Restaurante do hotel",
          sortOrder: 2,
        },
        {
          tripId: trip.id,
          date: new Date(Date.UTC(2026, 8, 11)),
          startTime: "09:00",
          endTime: "17:00",
          title: "City Tour em Palma",
          location: "Saída do lobby",
          sortOrder: 3,
        },
      ],
    });

    await db.muralPost.create({
      data: {
        tripId: trip.id,
        title: "Bem-vindos à viagem!",
        message:
          "Fiquem atentos aos horários do cronograma. Qualquer dúvida, usem o Suporte aqui do portal.",
        author: "Organização",
      },
    });

    await db.voucherTemplate.create({
      data: {
        tripId: trip.id,
        name: "Voucher Internacional",
        kind: "COMPLETO",
        accentColor: "#1690d0",
        headerText:
          "Apresente este voucher nos balcões de atendimento. Documento pessoal e intransferível.",
        footerText:
          "Emergências durante a viagem: contate a equipe da agência pelo telefone informado no grupo oficial.",
        sections: JSON.stringify([
          { key: "passenger" },
          { key: "flights" },
          { key: "accommodation" },
          { key: "emergency" },
        ]),
      },
    });

    console.log(
      `Viagem demo criada. Formulário público: /f/demo-formulario-mallorca · Passageira demo: CPF 111.222.333-44, PIN 123456`
    );
  }

  await seedAbradilan();
}

// ---------------------------------------------------------------------------
// Portal ABRADILAN: associado de demonstração e evento com o módulo de convites
// ligado, para exercitar cotas, convite digital, mesas e credenciamento.
// ---------------------------------------------------------------------------
async function seedAbradilan() {
  const associateEmail = "associado@abradilan.local";
  if (!(await db.associate.findUnique({ where: { email: associateEmail } }))) {
    await db.associate.create({
      data: {
        name: "Maria Souza",
        email: associateEmail,
        companyName: "Distribuidora Exemplo S.A.",
        cnpj: "00.000.000/0001-00",
        phone: "(11) 99999-0000",
        role: "GESTOR",
        passwordHash: await bcrypt.hash("abradilan123", 10),
        mustChangePassword: false,
      },
    });
    console.log(`Associado demo: ${associateEmail} / senha: abradilan123`);
  }

  const eventSlug = "evento-demonstracao-abradilan";
  if (await db.trip.findUnique({ where: { slug: eventSlug } })) return;

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);

  const event = await db.trip.create({
    data: {
      kind: "EVENTO",
      name: "Jantar ABRADILAN 2026",
      clientName: "ABRADILAN",
      slug: eventSlug,
      destination: "São Paulo, SP",
      startDate: new Date(Date.UTC(2026, 10, 12)),
      status: "INSCRICOES",
      description:
        "Jantar anual da ABRADILAN com as distribuidoras de produtos farmacêuticos associadas e convidados institucionais.",
      formToken: "demo-formulario-evento-abradilan",
      invitesEnabled: true,
      tablesEnabled: true,
      eventTime: "20:00",
      venueName: "Espaço Exemplo",
      venueAddress: "Av. Paulista, 1000 - São Paulo/SP",
      dressCode: "Traje esporte fino",
      inviteDeadline: deadline,
      individualPool: 10,
      emailTitle: "Jantar ABRADILAN 2026",
      emailText:
        "Temos o prazer de convidá-lo(a) para o jantar anual da ABRADILAN, que reúne as distribuidoras e operadores logísticos de produtos farmacêuticos do Brasil.",
      emailFooter: "Convite pessoal e intransferível · Jantar ABRADILAN 2026",
      hotels: JSON.stringify([
        {
          nome: "Hotel Exemplo Paulista",
          endereco: "Rua Exemplo, 200",
          telefone: "(11) 3000-0000",
          distancia: "500 m",
        },
      ]),
      facilities: JSON.stringify([
        { titulo: "Estacionamento", descricao: "Valet no local, cortesia para convidados." },
      ]),
    },
  });

  const password = "empresa123";
  const company = await db.eventCompany.create({
    data: {
      tripId: event.id,
      companyName: "Distribuidora Exemplo S.A.",
      contactName: "Maria Souza",
      contactRole: "Diretora de Relações Institucionais",
      email: "associado@abradilan.local",
      phone: "(11) 99999-0000",
      login: "distribuidoraexemplo",
      passwordHash: await bcrypt.hash(password, 10),
      provisionalPassword: password,
      quota: 4,
    },
  });

  // Mesas do salão, distribuídas em grade.
  for (let n = 1; n <= 6; n++) {
    await db.eventTable.create({
      data: {
        tripId: event.id,
        number: n,
        capacity: 8,
        x: 100 + ((n - 1) % 3) * 170,
        y: 110 + Math.floor((n - 1) / 3) * 170,
      },
    });
  }

  await db.invite.create({
    data: {
      tripId: event.id,
      companyId: company.id,
      kind: "RESPONSAVEL",
      name: company.contactName,
      role: company.contactRole,
      email: company.email,
      phone: company.phone,
      token: crypto.randomBytes(16).toString("hex"),
      code: String(crypto.randomInt(0, 1_000_000)).padStart(6, "0"),
    },
  });

  console.log(
    `Evento ABRADILAN demo criado com convites ligados. Empresa: login "distribuidoraexemplo" / senha: ${password}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
