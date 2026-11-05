/**
 * Seeds reference data (cities, vendor categories, venue features, default
 * budget categories and checklist) and, if ADMIN_EMAIL + ADMIN_PASSWORD are
 * set, the first admin account. Safe to run many times: existing rows are
 * updated by slug, and an existing admin is never overwritten.
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/index";

type Names = [mk: string, sq: string, en: string];

// slug, [mk, sq, en], region
const cities: [string, Names, string][] = [
  ["skopje", ["Скопје", "Shkup", "Skopje"], "skopje"],
  ["bitola", ["Битола", "Manastir", "Bitola"], "pelagonia"],
  ["kumanovo", ["Куманово", "Kumanovë", "Kumanovo"], "northeastern"],
  ["prilep", ["Прилеп", "Prilep", "Prilep"], "pelagonia"],
  ["tetovo", ["Тетово", "Tetovë", "Tetovo"], "polog"],
  ["veles", ["Велес", "Veles", "Veles"], "vardar"],
  ["shtip", ["Штип", "Shtip", "Štip"], "eastern"],
  ["ohrid", ["Охрид", "Ohër", "Ohrid"], "southwestern"],
  ["gostivar", ["Гостивар", "Gostivar", "Gostivar"], "polog"],
  ["strumica", ["Струмица", "Strumicë", "Strumica"], "southeastern"],
  ["kavadarci", ["Кавадарци", "Kavadar", "Kavadarci"], "vardar"],
  ["kochani", ["Кочани", "Koçan", "Kočani"], "eastern"],
  ["kichevo", ["Кичево", "Kërçovë", "Kičevo"], "southwestern"],
  ["struga", ["Струга", "Strugë", "Struga"], "southwestern"],
  ["radovish", ["Радовиш", "Radovish", "Radoviš"], "southeastern"],
  ["gevgelija", ["Гевгелија", "Gjevgjeli", "Gevgelija"], "southeastern"],
  ["debar", ["Дебар", "Dibër", "Debar"], "southwestern"],
  ["kriva-palanka", ["Крива Паланка", "Kriva Pallankë", "Kriva Palanka"], "northeastern"],
  ["sveti-nikole", ["Свети Николе", "Shën Nikollë", "Sveti Nikole"], "vardar"],
  ["negotino", ["Неготино", "Negotinë", "Negotino"], "vardar"],
  ["delchevo", ["Делчево", "Dellçevë", "Delčevo"], "eastern"],
  ["vinica", ["Виница", "Vinicë", "Vinica"], "eastern"],
  ["resen", ["Ресен", "Resnjë", "Resen"], "pelagonia"],
  ["probishtip", ["Пробиштип", "Probishtip", "Probištip"], "eastern"],
  ["berovo", ["Берово", "Berovë", "Berovo"], "eastern"],
  ["kratovo", ["Кратово", "Kratovë", "Kratovo"], "northeastern"],
  ["krushevo", ["Крушево", "Krushevë", "Kruševo"], "pelagonia"],
  ["makedonski-brod", ["Македонски Брод", "Brod", "Makedonski Brod"], "southwestern"],
  ["valandovo", ["Валандово", "Vallandovë", "Valandovo"], "southeastern"],
  ["demir-hisar", ["Демир Хисар", "Demir Hisar", "Demir Hisar"], "pelagonia"],
];

const categories: ["VENUE" | "BAND" | "PHOTO_VIDEO", Names][] = [
  ["VENUE", ["Ресторани и сали", "Restorante dhe salla", "Restaurants & halls"]],
  ["BAND", ["Музика и оркестри", "Muzikë dhe orkestra", "Music & bands"]],
  ["PHOTO_VIDEO", ["Фото и видео", "Foto dhe video", "Photo & video"]],
];

const venueFeatures: [string, Names][] = [
  ["parking", ["Паркинг", "Parking", "Parking"]],
  ["garden", ["Градина / отворен простор", "Kopsht / hapësirë e jashtme", "Garden / outdoor area"]],
  ["accommodation", ["Сместување", "Akomodim", "Accommodation"]],
  ["accessible", ["Пристап за лица со попреченост", "Qasje për persona me aftësi të kufizuara", "Wheelchair accessible"]],
  ["stage", ["Бина за оркестар", "Skenë për orkestrën", "Band stage"]],
  ["dance-floor", ["Подиум за игра", "Pistë vallëzimi", "Dance floor"]],
  ["air-conditioning", ["Клима", "Klimë", "Air conditioning"]],
  ["kids-corner", ["Детско катче", "Kënd për fëmijë", "Kids' corner"]],
  ["lake-view", ["Поглед на езеро", "Pamje nga liqeni", "Lake view"]],
  ["own-decor", ["Сопствена декорација", "Dekor i vetë lokalit", "In-house decor"]],
];

const musicGenres: [string, Names][] = [
  ["narodna", ["Народна", "Muzikë popullore", "Macedonian folk"]],
  ["zabavna", ["Забавна", "Muzikë zbavitëse", "Pop (zabavna)"]],
  ["stara-gradska", ["Стара градска", "Këngë të vjetra qytetare", "Old town songs"]],
  ["zurli-tapani", ["Зурли и тапани", "Surle dhe daulle", "Zurla and drums"]],
  ["albanska", ["Албанска", "Muzikë shqipe", "Albanian"]],
  ["romska", ["Ромска", "Muzikë rome", "Roma music"]],
  ["turska", ["Турска", "Muzikë turke", "Turkish"]],
  ["pop-rok", ["Поп и рок", "Pop dhe rok", "Pop and rock"]],
  ["dzez", ["Џез и лаунџ", "Xhaz dhe lounge", "Jazz and lounge"]],
  ["klasicna", ["Класична", "Muzikë klasike", "Classical"]],
  ["dj", ["ДЈ", "DJ", "DJ"]],
];

const budgetCategories: [string, Names][] = [
  ["venue", ["Ресторан / сала", "Restoranti / salla", "Restaurant / venue"]],
  ["drinks", ["Пијалоци", "Pijet", "Drinks"]],
  ["music", ["Музика / оркестар", "Muzika / orkestra", "Music / band"]],
  ["photo-video", ["Фото и видео", "Foto dhe video", "Photo & video"]],
  ["dress", ["Венчаница", "Fustani i nusesë", "Wedding dress"]],
  ["suit", ["Одело за младоженецот", "Kostumi i dhëndrit", "Groom's suit"]],
  ["rings", ["Бурми", "Unazat", "Rings"]],
  ["decor-flowers", ["Декорација и цвеќе", "Dekor dhe lule", "Decor & flowers"]],
  ["cake", ["Торта", "Torta", "Cake"]],
  ["invitations", ["Покани", "Ftesat", "Invitations"]],
  ["hair-makeup", ["Фризура и шминка", "Flokët dhe grimi", "Hair & makeup"]],
  ["transport", ["Превоз / автомобили", "Transporti / makinat", "Transport / cars"]],
  ["ceremony", ["Црква / матичар", "Kisha / ofiqari", "Church / civil ceremony"]],
  ["engagement", ["Веридба", "Fejesa", "Engagement"]],
  ["bachelorette", ["Моминска вечер", "Mbrëmja e vajzave", "Bachelorette party"]],
  ["gifts", ["Подароци за кумови и родители", "Dhurata për kumbarët dhe prindërit", "Gifts for кум/кума & parents"]],
  ["honeymoon", ["Меден месец", "Muaji i mjaltit", "Honeymoon"]],
  ["other", ["Останато", "Të tjera", "Other"]],
];

// slug, [mk, sq, en], monthsBefore
const checklist: [string, Names, number][] = [
  ["set-date-budget", ["Одредете датум и буџет", "Caktoni datën dhe buxhetin", "Set the date and budget"], 12],
  ["guest-estimate", ["Направете груба листа на гости", "Bëni një listë të përafërt të të ftuarve", "Make a rough guest estimate"], 12],
  ["book-venue", ["Резервирајте ресторан и платете капара", "Rezervoni restorantin dhe paguani kaparin", "Book the restaurant and pay the deposit"], 12],
  ["choose-kum", ["Изберете кум и кума", "Zgjidhni kumbarin dhe kumbarën", "Choose the кум and кума"], 12],
  ["book-band", ["Резервирајте оркестар", "Rezervoni orkestrën", "Book the band"], 11],
  ["book-photo", ["Резервирајте фотограф и видео", "Rezervoni fotografin dhe videon", "Book photo and video"], 11],
  ["dress", ["Изберете венчаница", "Zgjidhni fustanin e nusesë", "Choose the wedding dress"], 9],
  ["decor", ["Договорете декорација", "Merreni vesh për dekorin", "Arrange the decor"], 9],
  ["church-date", ["Закажете црква / матичар", "Caktoni kishën / ofiqarin", "Book the church or civil ceremony"], 9],
  ["invitation-design", ["Изберете дизајн на покани", "Zgjidhni dizajnin e ftesave", "Choose the invitation design"], 7],
  ["cars", ["Резервирајте автомобили", "Rezervoni makinat", "Book the cars"], 7],
  ["hair-makeup", ["Закажете фризура и шминка", "Rezervoni flokët dhe grimin", "Book hair and makeup"], 7],
  ["rings", ["Купете бурми", "Blini unazat", "Buy the rings"], 4],
  ["suit", ["Изберете одело", "Zgjidhni kostumin", "Choose the suit"], 4],
  ["menu-tasting", ["Дегустација и конечно мени", "Degustimi dhe menyja përfundimtare", "Menu tasting and final menu"], 4],
  ["cake", ["Нарачајте торта", "Porositni tortën", "Order the cake"], 4],
  ["send-invitations", ["Испратете покани", "Dërgoni ftesat", "Send the invitations"], 2],
  ["collect-rsvp", ["Соберете потврди од гостите", "Mblidhni konfirmimet e të ftuarve", "Collect RSVPs"], 2],
  ["civil-papers", ["Подгответе документи за матичар", "Përgatitni dokumentet për ofiqarin", "Prepare civil registry papers"], 2],
  ["seating", ["Направете распоред на седење", "Bëni planin e uljes", "Make the seating plan"], 0],
  ["final-count", ["Јавете конечен број гости на ресторанот", "Njoftoni restorantin për numrin përfundimtar", "Give the final guest count to the restaurant"], 0],
  ["day-schedule", ["Направете распоред за денот", "Bëni orarin e ditës", "Make the day-of schedule"], 0],
  ["final-payments", ["Платете ги последните рати", "Paguani pagesat përfundimtare", "Make the final payments"], 0],
  ["reviews", ["Оставете рецензии за вендорите", "Lini vlerësime për shërbimet", "Review your vendors"], -1],
];

async function seedReferenceData() {
  for (const [i, [slug, [nameMk, nameSq, nameEn], region]] of cities.entries()) {
    const data = { nameMk, nameSq, nameEn, region, sortOrder: i };
    await prisma.city.upsert({ where: { slug }, update: {}, create: { slug, ...data } });
  }
  for (const [i, [key, [nameMk, nameSq, nameEn]]] of categories.entries()) {
    const data = { nameMk, nameSq, nameEn, sortOrder: i };
    await prisma.vendorCategory.upsert({ where: { key }, update: {}, create: { key, ...data } });
  }
  for (const [i, [slug, [nameMk, nameSq, nameEn]]] of venueFeatures.entries()) {
    const data = { nameMk, nameSq, nameEn, sortOrder: i };
    await prisma.venueFeature.upsert({ where: { slug }, update: {}, create: { slug, ...data } });
  }
  for (const [i, [slug, [nameMk, nameSq, nameEn]]] of musicGenres.entries()) {
    const data = { nameMk, nameSq, nameEn, sortOrder: i };
    await prisma.musicGenre.upsert({ where: { slug }, update: {}, create: { slug, ...data } });
  }
  for (const [i, [slug, [nameMk, nameSq, nameEn]]] of budgetCategories.entries()) {
    const data = { nameMk, nameSq, nameEn, sortOrder: i };
    await prisma.budgetTemplateCategory.upsert({ where: { slug }, update: {}, create: { slug, ...data } });
  }
  for (const [i, [slug, [titleMk, titleSq, titleEn], monthsBefore]] of checklist.entries()) {
    const data = { titleMk, titleSq, titleEn, monthsBefore, sortOrder: i };
    await prisma.checklistTemplateItem.upsert({ where: { slug }, update: {}, create: { slug, ...data } });
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account.");
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.roles.includes("ADMIN")) {
      await prisma.user.update({ where: { id: existing.id }, data: { roles: { push: "ADMIN" } } });
      console.log(`Gave admin role to existing user ${email}.`);
    }
    return;
  }
  const userId = randomUUID();
  await prisma.user.create({
    data: {
      id: userId,
      email,
      name: "Admin",
      emailVerified: true,
      roles: ["ADMIN"],
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
  });
  console.log(`Created admin account ${email}.`);
}

async function main() {
  await seedReferenceData();
  await seedAdmin();
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
