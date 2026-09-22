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
  /*
    Les salles parisiennes forment le club « réel » : elles exigent la
    proximité, donc un pointage y suppose d'être sur place.

    Les deux salles lyonnaises servent au TEST et sont marquées
    `requiresProximity: false` : elles acceptent un pointage à distance. Cela
    permet de dérouler le parcours complet — scan, validation serveur,
    présence enregistrée — depuis n'importe où, sans se rendre à Lyon. La
    distance reste mesurée et tracée, simplement elle ne bloque plus.
  */
  const [bastille, nation, montreuil, lyonPartDieu, lyonConfluence] =
    await Promise.all([
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
    prisma.site.create({
      data: {
        slug: "lyon-part-dieu",
        name: "ClubSport Lyon Part-Dieu",
        address: "17 rue du Docteur Bouchut",
        city: "Lyon",
        postalCode: "69003",
        latitude: 45.7605,
        longitude: 4.8572,
        nfcTagId: "nfc-lyon-part-dieu-entree",
        // Salle de test : pointage possible sans être sur place.
        requiresProximity: false,
      },
    }),
    prisma.site.create({
      data: {
        slug: "lyon-confluence",
        name: "ClubSport Lyon Confluence",
        address: "112 cours Charlemagne",
        city: "Lyon",
        postalCode: "69002",
        latitude: 45.7405,
        longitude: 4.8180,
        nfcTagId: "nfc-lyon-confluence-entree",
        requiresProximity: false,
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
  const coachLyon = await createUser(
    "coach.lyon@clubsport.fr",
    "Élodie",
    "Fontaine",
    "COACH",
    lyonPartDieu.id,
  );
  // Membre rattaché à Lyon : permet de tester le pointage sans toucher au
  // compte parisien, dont l'historique sert aux captures d'écran.
  const memberLyon = await createUser(
    "membre.lyon@clubsport.fr",
    "Karim",
    "Benali",
    "MEMBER",
    lyonPartDieu.id,
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
      { userId: coachLyon.id, plan: "premium", status: "ACTIVE", endsAt: inOneYear },
      // ACTIVE : une adhésion inactive interdit la réservation, donc le
      // pointage. Ce compte doit pouvoir dérouler le parcours de bout en bout.
      { userId: memberLyon.id, plan: "standard", status: "ACTIVE", endsAt: inOneYear },
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
      {
        slug: "crossfit-lyon",
        name: "CrossFit",
        description:
          "Circuit fonctionnel en petit groupe, charges adaptées à chacun. Salle de test lyonnaise.",
        durationMin: 60,
        level: "all",
        siteId: lyonPartDieu.id,
      },
      {
        slug: "yoga-lyon",
        name: "Yoga doux",
        description:
          "Postures tenues et respiration, fin de journée. Salle de test lyonnaise.",
        durationMin: 60,
        level: "all",
        siteId: lyonPartDieu.id,
      },
      {
        slug: "aviron-lyon",
        name: "Aviron indoor",
        description:
          "Travail d'endurance sur ergomètre, face à la Saône. Salle de test lyonnaise.",
        durationMin: 45,
        level: "all",
        siteId: lyonConfluence.id,
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

  /*
    Séances lyonnaises. Elles ne suivent pas la boucle ci-dessus parce que
    l'heure y est calculée en MINUTES depuis maintenant, et non à heure fixe :
    le pointage n'est accepté que dans une fenêtre de ±30 minutes autour du
    début. Une séance « à 9 h » n'est donc testable qu'à 9 h.

    Ces trois-là sont posées autour de l'instant du seed, ce qui rend le
    parcours immédiatement testable : on relance `db:seed` et on peut pointer
    dans la foulée.
  */
  const lyonPlan: Array<{
    slug: string;
    minutesFromNow: number;
    coachId: string;
    capacity: number;
    why: string;
  }> = [
    {
      slug: "crossfit-lyon",
      minutesFromNow: 5,
      coachId: coachLyon.id,
      capacity: 12,
      why: "commence dans 5 min : cas nominal, pointage accepté",
    },
    {
      slug: "yoga-lyon",
      minutesFromNow: -10,
      coachId: coachLyon.id,
      capacity: 15,
      why: "a commencé il y a 10 min : le retardataire peut encore pointer",
    },
    {
      slug: "aviron-lyon",
      minutesFromNow: 180,
      coachId: coachLyon.id,
      capacity: 10,
      why: "dans 3 h : hors fenêtre, démontre le refus NO_BOOKING",
    },
  ];

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

  const lyonSessions: Awaited<ReturnType<typeof prisma.session.create>>[] = [];
  for (const p of lyonPlan) {
    const activity = byslug[p.slug];
    const startsAt = new Date(Date.now() + p.minutesFromNow * 60_000);
    const endsAt = new Date(startsAt.getTime() + activity.durationMin * 60_000);
    lyonSessions.push(
      await prisma.session.create({
        data: {
          activityId: activity.id,
          siteId: activity.siteId,
          coachId: p.coachId,
          startsAt,
          endsAt,
          capacity: p.capacity,
          // SCHEDULED même pour celle qui a déjà commencé : le pointage exige
          // ce statut, et la séance est effectivement en cours.
          status: "SCHEDULED",
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

  /*
    Le membre lyonnais est inscrit aux TROIS séances : sans réservation dans
    la salle scannée, le serveur refuse le pointage (NO_BOOKING). C'est ce qui
    rend le parcours testable immédiatement après le seed.
  */
  for (const s of lyonSessions) {
    await prisma.booking.create({
      data: { userId: memberLyon.id, sessionId: s.id, status: "BOOKED" },
    });
  }

  console.log("\nSalles de test lyonnaises (pointage sans contrainte de distance)");
  console.table(
    lyonPlan.map((p, i) => ({
      activité: byslug[p.slug].name,
      borne: [lyonPartDieu, lyonConfluence].find(
        (site) => site.id === byslug[p.slug].siteId,
      )?.nfcTagId,
      début: lyonSessions[i].startsAt.toLocaleTimeString("fr-FR"),
      cas: p.why,
    })),
  );

  console.log("\nComptes de démonstration (mot de passe : Password123!)");
  console.table([
    { email: "admin@clubsport.fr", role: "ADMIN" },
    { email: "coach@clubsport.fr", role: "COACH" },
    { email: "membre@clubsport.fr", role: "MEMBER" },
    { email: "nouveau@clubsport.fr", role: "MEMBER (onboarding à faire)" },
    { email: "membre.lyon@clubsport.fr", role: "MEMBER (salles de test Lyon)" },
    { email: "coach.lyon@clubsport.fr", role: "COACH (Lyon)" },
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
