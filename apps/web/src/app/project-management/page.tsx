import type { Metadata } from "next";
import { resolveLocale } from "../../i18n/translations";
import { seoPages } from "../../i18n/seo-pages";
import { SeoPage, seoMetadata, serviceLd } from "../seo-page";

const PATH = "/project-management";
type Props = { searchParams?: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = resolveLocale((await searchParams)?.lang);
  return seoMetadata(PATH, locale, seoPages.projectManagement[locale].meta);
}

export default async function ProjectManagementPage({ searchParams }: Props) {
  const locale = resolveLocale((await searchParams)?.lang);
  const content = seoPages.projectManagement[locale];
  return (
    <SeoPage
      locale={locale}
      path={PATH}
      content={content}
      extraLd={serviceLd(locale, PATH, content.title, content.meta.description)}
    />
  );
}
