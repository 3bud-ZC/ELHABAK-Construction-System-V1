import type { Metadata } from "next";
import { resolveLocale } from "../../i18n/translations";
import { seoPages } from "../../i18n/seo-pages";
import { SeoPage, seoMetadata, serviceLd } from "../seo-page";

const PATH = "/architectural-design";
type Props = { searchParams?: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = resolveLocale((await searchParams)?.lang);
  return seoMetadata(PATH, locale, seoPages.architecturalDesign[locale].meta);
}

export default async function ArchitecturalDesignPage({ searchParams }: Props) {
  const locale = resolveLocale((await searchParams)?.lang);
  const content = seoPages.architecturalDesign[locale];
  return (
    <SeoPage
      locale={locale}
      path={PATH}
      content={content}
      extraLd={serviceLd(locale, PATH, content.title, content.meta.description)}
    />
  );
}
