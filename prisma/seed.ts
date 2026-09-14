import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Date à J+n, à l'heure voulue (heure locale). */
function at(dayOffset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Nettoyage…");
  await prisma.booking.deleteMany();
  await prisma.session.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.site.deleteMany();

  console.log("Sites…");
  const [bastille, nation, montreuil] = await Promise.all([
    prisma.site.create({
      data: {
        slug: "paris-bastille",
        name: "ClubSport Bastille",
        address: "12 rue de la Roquette",
        city: "Paris",
        postalCode: "75011",
        latitude: 48.8534,
        longitude: 2.3719,
        nfcTagId: "nfc-bastille-entree",
      },
    }),
    prisma.site.create({
      data: {
        slug: "paris-nation",
        name: "ClubSport Nation",
        address: "4 avenue du Trône",
        city: "Paris",
        postalCode: "75012",
        latitude: 48.8483,
        longitude: 2.3958,
        nfcTagId: "nfc-nation-entree",
      },
    }),
    prisma.site.create({
      data: {
        slug: "montreuil",
        name: "ClubSport Montreuil",
        address: "31 rue de Paris",
        city: "Montreuil",
        postalCode: "93100",
        latitude: 48.8624,
        longitude: 2.4433,
        nfcTagId: "nfc-montreuil-entree",
      },
    }),
  ]);

  console.log("Utilisateurs…");
  const password = await bcrypt.hash("Password123!", 10);

  async function createUser(
    email: string,
    firstName: string,
    lastName: string,
    role: Role,
    siteId: string,
    onboarded = true,
  ) {
    return prisma.user.create({
      data: {
        email,
        passwordHash: password,
        firstName,
        lastName,
        role,
        onboarded,
        preferredSiteId: siteId,
        phone: "06 12 34 56 78",
      },
    });
  }

  const admin = await createUser(
    "admin@clubsport.fr",
    "Amina",
    "Diallo",
    "ADMIN",
    bastille.id,
  );
  const coach = await createUser(
    "coach@clubsport.fr",
    "Marc",
    "Lefèvre",
    "COACH",
    bastille.id,
  );
  const coach2 = await createUser(
    "coach2@clubsport.fr",
    "Sofia",
    "Marchetti",
    "COACH",
    nation.id,
  );
  const member = await createUser(
    "membre@clubsport.fr",
    "Julie",
    "Bernard",
    "MEMBER",
    bastille.id,
  );
  const member2 = await createUser(
    "membre2@clubsport.fr",
    "Thomas",
    "Nguyen",
    "MEMBER",
    nation.id,
  );
  // Compte volontairement NON onboardé : permet de démontrer le parcours
  // d'onboarding en soutenance sans devoir créer un compte à la volée.
  const fresh = await createUser(
    "nouveau@clubsport.fr",
    "Léa",
    "Moreau",
    "MEMBER",
    bastille.id,
    false,
  );
  await prisma.user.update({
    where: { id: fresh.id },
    data: { preferredSiteId: null, phone: null },
  });

  console.log("Adhésions…");
  const inOneYear = new Date();
  inOneYear.setFullYear(inOneYear.getFullYear() + 1);
  await prisma.membership.createMany({
    data: [
      { userId: admin.id, plan: "premium", status: "ACTIVE", endsAt: inOneYear },
      { userId: coach.id, plan: "premium", status: "ACTIVE", endsAt: inOneYear },
      { userId: coach2.id, plan: "premium", status: "ACTIVE", endsAt: inOneYear },
      { userId: member.id, plan: "standard", status: "ACTIVE", endsAt: inOneYear },
      { userId: member2.id, plan: "standard", status: "PENDING", endsAt: inOneYear },
    ],
  });

  console.log("Activités…");
  const activities = await Promise.all(
    [
      {
        slug: "yoga-vinyasa",
        name: "Yoga Vinyasa",
        description:
          "Enchaînements dynamiques synchronisés sur la respiration. Tapis fournis, venez 10 minutes en avance.",
        durationMin: 60,
        level: "all",
        siteId: bastille.id,
      },
      {
        slug: "escalade-bloc",
        name: "Escalade bloc",
        description:
          "Séance encadrée sur le mur de bloc. Chaussons disponibles à l'accueil, niveau intermédiaire conseillé.",
        durationMin: 90,
        level: "intermediate",
        siteId: bastille.id,
      },
      {
        slug: "hiit",
        name: "HIIT",
        description:
          "Intervalles haute intensité en petit groupe. Prévoyez une serviette et une bouteille d'eau.",
        durationMin: 45,
        level: "advanced",
        siteId: nation.id,
      },
      {
        slug: "natation-technique",
        name: "Natation technique",
        description:
          "Travail des quatre nages en petit comité, correction individuelle par le coach.",
        durationMin: 60,
        level: "intermediate",
        siteId: nation.id,
      },
      {
        slug: "boxe-loisir",
        name: "Boxe loisir",
        description:
          "Initiation et perfectionnement, travail au sac et aux pattes d'ours. Gants prêtés sur demande.",
        durationMin: 75,
        level: "all",
        siteId: montreuil.id,
      },
      {
        slug: "pilates",
        name: "Pilates",
        description:
          "Renforcement profond et mobilité, accessible en sortie de blessure.",
        durationMin: 55,
        level: "all",
        siteId: montreuil.id,
      },
    ].map((a) => prisma.activity.create({ data: a })),
  );

  const byslug = Object.fromEntries(activities.map((a) => [a.slug, a]));

  console.log("Séances…");
  const plan: Array<{
    slug: string;
    day: number;
    hour: number;
    coachId: string;
    capacity: number;
  }> = [];

  // 3 semaines de planning : passé (pour l'historique) et futur (pour réserver).
  for (let day = -7; day <= 14; day++) {
    plan.push({ slug: "yoga-vinyasa", day, hour: 9, coachId: coach.id, capacity: 14 });
    plan.push({ slug: "escalade-bloc", day, hour: 18, coachId: coach.id, capacity: 10 });
    if (day % 2 === 0) {
      plan.push({ slug: "hiit", day, hour: 12, coachId: coach2.id, capacity: 12 });
      plan.push({ slug: "boxe-loisir", day, hour: 19, coachId: coach2.id, capacity: 16 });
    }
    if (day % 3 === 0) {
      plan.push({ slug: "natation-technique", day, hour: 8, coachId: coach2.id, capacity: 8 });
      plan.push({ slug: "pilates", day, hour: 17, coachId: coach.id, capacity: 12 });
    }
  }

  const sessions = [];
  for (const p of plan) {
    const activity = byslug[p.slug];
    const startsAt = at(p.day, p.hour);
    const endsAt = new Date(startsAt.getTime() + activity.durationMin * 60_000);
    sessions.push(
      await prisma.session.create({
        data: {
          activityId: activity.id,
          siteId: activity.siteId,
          coachId: p.coachId,
          startsAt,
          endsAt,
          capacity: p.capacity,
          status: p.day < 0 ? "DONE" : "SCHEDULED",
        },
      }),
    );
  }

  console.log("Réservations…");
  const now = new Date();
  const past = sessions.filter((s) => s.startsAt < now).slice(-6);
  const upcoming = sessions.filter((s) => s.startsAt > now).slice(0, 5);

  for (const s of past) {
    await prisma.booking.create({
      data: {
        userId: member.id,
        sessionId: s.id,
        status: "ATTENDED",
        checkedInAt: s.startsAt,
        checkInMethod: "web",
      },
    });
  }
  for (const [i, s] of upcoming.entries()) {
    await prisma.booking.create({
      data: {
        userId: member.id,
        sessionId: s.id,
        status: i === 0 ? "CONFIRMED" : "BOOKED",
      },
    });
  }
  // Quelques inscriptions d'un second membre pour que les listes admin
  // ne montrent pas un club à un seul adhérent.
  for (const s of upcoming.slice(0, 3)) {
    await prisma.booking.create({
      data: { userId: member2.id, sessionId: s.id, status: "BOOKED" },
    });
  }

  console.log("\nComptes de démonstration (mot de passe : Password123!)");
  console.table([
    { email: "admin@clubsport.fr", role: "ADMIN" },
    { email: "coach@clubsport.fr", role: "COACH" },
    { email: "membre@clubsport.fr", role: "MEMBER" },
    { email: "nouveau@clubsport.fr", role: "MEMBER (onboarding à faire)" },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
