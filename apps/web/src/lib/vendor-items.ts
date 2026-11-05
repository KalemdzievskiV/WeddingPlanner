import "server-only";
import type { Extra, Hall, MenuPackage, ServicePackage } from "@svadba/db";
import { pickLocalized, type Locale } from "@svadba/shared";
import { getTranslations } from "next-intl/server";
import type { EditorItem } from "@/components/vendor/item-editor";
import { formatApprox, formatMoney } from "./format";

const s = (v: number | null | undefined) => (v == null ? "" : String(v));

/** Turns DB rows into list items (title, summary lines, form defaults) for the vendor editor. */
export async function toEditorItems(locale: Locale) {
  const t = await getTranslations({ locale, namespace: "vendor.prices" });
  const money = (amount: number, currency: "EUR" | "MKD") =>
    `${formatMoney(amount, currency, locale)} (${t("approx", { price: formatApprox(amount, currency, locale) })})`;

  return {
    hall: (h: Hall): EditorItem => ({
      id: h.id,
      title: h.name,
      details: [
        h.capacityMin ? t("guestsRange", { min: h.capacityMin, max: h.capacityMax }) : t("guestsMax", { max: h.capacityMax }),
        ...(h.description ? [h.description] : []),
      ],
      values: { name: h.name, capacityMin: s(h.capacityMin), capacityMax: s(h.capacityMax), description: h.description ?? "" },
    }),
    menu: (m: MenuPackage): EditorItem => ({
      id: m.id,
      title: pickLocalized(m, "name", locale),
      details: [
        [t("perPerson", { price: money(m.pricePerPerson, m.currency) }), m.minGuests ? t("minGuestsShort", { count: m.minGuests }) : ""]
          .filter(Boolean)
          .join(" · "),
        m.courses.join(" · "),
        m.drinks === "CUSTOM" ? (m.drinksNote ?? "") : t(`drinksOptions.${m.drinks}`),
      ].filter(Boolean),
      values: {
        nameMk: m.nameMk,
        nameSq: m.nameSq ?? "",
        nameEn: m.nameEn ?? "",
        pricePerPerson: s(m.pricePerPerson),
        currency: m.currency,
        minGuests: s(m.minGuests),
        courses: m.courses.join("\n"),
        drinks: m.drinks,
        drinksNote: m.drinksNote ?? "",
      },
    }),
    extra: (e: Extra): EditorItem => ({
      id: e.id,
      title: pickLocalized(e, "name", locale),
      details: [`${money(e.price, e.currency)} ${t(`units.${e.unit}`)}`],
      values: { nameMk: e.nameMk, nameSq: e.nameSq ?? "", nameEn: e.nameEn ?? "", price: s(e.price), currency: e.currency, unit: e.unit },
    }),
    package: (p: ServicePackage): EditorItem => ({
      id: p.id,
      title: pickLocalized(p, "name", locale),
      details: [
        [
          money(p.price, p.currency),
          p.hours ? t("hoursShort", { count: p.hours }) : "",
          p.members ? t("membersShort", { count: p.members }) : "",
          p.extraHourPrice ? t("extraHourShort", { price: formatMoney(p.extraHourPrice, p.currency, locale) }) : "",
        ]
          .filter(Boolean)
          .join(" · "),
        p.includes.join(" · "),
      ].filter(Boolean),
      values: {
        nameMk: p.nameMk,
        nameSq: p.nameSq ?? "",
        nameEn: p.nameEn ?? "",
        price: s(p.price),
        currency: p.currency,
        hours: s(p.hours),
        members: s(p.members),
        extraHourPrice: s(p.extraHourPrice),
        includes: p.includes.join("\n"),
      },
    }),
  };
}
