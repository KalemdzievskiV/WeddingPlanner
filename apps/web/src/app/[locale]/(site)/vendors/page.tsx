import { redirect } from "@/i18n/navigation";
import { localeFrom } from "@/lib/locale";

export default async function VendorsIndex({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await localeFrom(params);
  const sp = await searchParams;
  const query = Object.fromEntries(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"));
  return redirect({ href: { pathname: "/vendors/venues", query }, locale });
}
