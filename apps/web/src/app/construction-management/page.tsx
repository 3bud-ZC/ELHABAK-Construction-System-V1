import type { Metadata } from "next";
import { resolveLocale } from "../../i18n/translations";
import { seoPages } from "../../i18n/seo-pages";
import { SeoPage, seoMetadata, serviceLd } from "../seo-page";

const PATH = "/construction-management";
type Props = { searchParams?: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = resolveLocale((await searchParams)?.lang);
  return seoMetadata(PATH, locale, seoPages.constructionManagement[locale].meta);
}

export default async function ConstructionManagementPage({ searchParams }: Props) {
  const locale = resolveLocale((await searchParams)?.lang);
  const content = seoPages.constructionManagement[locale];
  return (
    <SeoPage
      locale={locale}
      path={PATH}
      content={content}
      extraLd={serviceLd(locale, PATH, content.title, content.meta.description)}
    />
  );
}
