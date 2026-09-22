import type { Metadata } from "next";
import { resolveLocale } from "../../i18n/translations";
import { seoPages } from "../../i18n/seo-pages";
import { SeoPage, seoMetadata } from "../seo-page";

const PATH = "/services";
type Props = { searchParams?: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = resolveLocale((await searchParams)?.lang);
  return seoMetadata(PATH, locale, seoPages.services[locale].meta);
}

export default async function ServicesPage({ searchParams }: Props) {
  const locale = resolveLocale((await searchParams)?.lang);
  return <SeoPage locale={locale} path={PATH} content={seoPages.services[locale]} />;
}
