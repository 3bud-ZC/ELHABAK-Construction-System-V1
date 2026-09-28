import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { companyContact } from "../../../packages/contracts/src/index.ts";
import {
  CANONICAL_ORG_ID,
  CANONICAL_WEBSITE_ID,
  CANONICAL_COMPANY_DESCRIPTIONS,
  buildCanonicalOrganization,
  buildCanonicalWebSite,
  buildAboutPageSchema,
  buildContactPageSchema,
  buildBreadcrumbSchema
} from "../src/lib/structured-data.ts";

const seoPagesSource = readFileSync(new URL("../src/i18n/seo-pages.ts", import.meta.url), "utf8");
const sitemapSource = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
const robotsSource = readFileSync(new URL("../src/app/robots.ts", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");

test("homepage jsonLd contains ProfessionalService, GeneralContractor, and FAQPage", () => {
  assert.match(homeSource, /ProfessionalService/);
  assert.match(homeSource, /GeneralContractor/);
  assert.match(homeSource, /"@type": "FAQPage"/);
});

test("canonical Organization identity matches specification", () => {
  const orgAr = buildCanonicalOrganization("ar");
  const orgEn = buildCanonicalOrganization("en");

  assert.equal(orgAr["@id"], "https://elhabak.com/#organization");
  assert.deepEqual(orgAr["@type"], ["Organization", "ProfessionalService", "GeneralContractor"]);
  assert.equal(orgAr.name, "ELHABAK Construction");
  assert.equal(orgAr.legalName, "الحباك للمقاولات والاستشارات الهندسية");
  assert.ok(orgAr.alternateName.includes("الحباك للمقاولات والاستشارات الهندسية"));
  assert.ok(orgAr.alternateName.includes("ELHABAK"));
  assert.ok(orgAr.alternateName.includes("الحباك"));
  assert.equal(orgAr.url, "https://elhabak.com/");
  assert.equal(orgAr.logo, "https://elhabak.com/brand/logo-horizontal.png");
  assert.equal(orgAr.telephone, "+201130666726");
  assert.equal(orgAr.email, "elhabakconstruction.eg@gmail.com");
  assert.equal(orgAr.description, CANONICAL_COMPANY_DESCRIPTIONS.ar);
  assert.equal(orgEn.description, CANONICAL_COMPANY_DESCRIPTIONS.en);

  // Address must be omitted from Organization JSON-LD to avoid unverified postal data
  assert.equal(orgAr.address, undefined, "Organization JSON-LD must not fabricate street address");
  assert.equal(orgAr.foundingDate, undefined, "Organization JSON-LD must not fabricate founding date");
  assert.equal(orgAr.numberOfEmployees, undefined, "Organization JSON-LD must not fabricate employee count");

  // Verified external map reference
  assert.deepEqual(orgAr.sameAs, ["https://maps.app.goo.gl/apBRMCmUquZ6XYXv7"]);
  assert.equal(orgAr.hasMap, "https://maps.app.goo.gl/apBRMCmUquZ6XYXv7");

  // Contact points
  assert.equal(orgAr.contactPoint[0].telephone, "+201130666726");
  assert.equal(orgAr.contactPoint[0].email, "elhabakconstruction.eg@gmail.com");
});

test("canonical WebSite and AboutPage schemas reference Organization correctly", () => {
  const website = buildCanonicalWebSite();
  assert.equal(website["@id"], "https://elhabak.com/#website");
  assert.equal(website.url, "https://elhabak.com/");
  assert.equal(website.name, "ELHABAK Construction");
  assert.deepEqual(website.publisher, { "@id": CANONICAL_ORG_ID });

  const aboutAr = buildAboutPageSchema("ar");
  assert.equal(aboutAr["@type"], "AboutPage");
  assert.equal(aboutAr["@id"], "https://elhabak.com/about#webpage");
  assert.deepEqual(aboutAr.mainEntity, { "@id": CANONICAL_ORG_ID });
  assert.deepEqual(aboutAr.about, { "@id": CANONICAL_ORG_ID });
  assert.deepEqual(aboutAr.isPartOf, { "@id": CANONICAL_WEBSITE_ID });

  const aboutEn = buildAboutPageSchema("en");
  assert.equal(aboutEn["@id"], "https://elhabak.com/about?lang=en#webpage");
  assert.deepEqual(aboutEn.mainEntity, { "@id": CANONICAL_ORG_ID });

  const contactAr = buildContactPageSchema("ar");
  assert.equal(contactAr["@type"], "ContactPage");
  assert.deepEqual(contactAr.mainEntity, { "@id": CANONICAL_ORG_ID });
});

test("structured data JSON-LD serializes and parses without undefined values", () => {
  const fullGraph = {
    "@context": "https://schema.org",
    "@graph": [
      buildCanonicalOrganization("ar"),
      buildCanonicalWebSite(),
      buildAboutPageSchema("ar"),
      buildBreadcrumbSchema("ar", "/about", "من نحن")
    ]
  };

  const jsonString = JSON.stringify(fullGraph);
  assert.doesNotMatch(jsonString, /undefined/);
  assert.doesNotMatch(jsonString, /null/);

  const parsed = JSON.parse(jsonString);
  assert.equal(parsed["@graph"].length, 4);
  assert.equal(parsed["@graph"][0]["@id"], "https://elhabak.com/#organization");
  assert.equal(parsed["@graph"][1]["@id"], "https://elhabak.com/#website");
  assert.equal(parsed["@graph"][2]["@id"], "https://elhabak.com/about#webpage");
});

test("sitemap includes all public company pages and excludes authenticated /app routes", () => {
  assert.match(sitemapSource, /""/);
  assert.match(sitemapSource, /"\/about"/);
  assert.match(sitemapSource, /"\/contact"/);
  assert.match(sitemapSource, /"\/services"/);
  assert.match(sitemapSource, /"\/architectural-design"/);
  assert.match(sitemapSource, /"\/engineering-consultancy"/);
  assert.match(sitemapSource, /"\/construction-management"/);
  assert.match(sitemapSource, /"\/site-supervision"/);
  assert.match(sitemapSource, /"\/project-management"/);
  assert.match(sitemapSource, /route \|\| "\/"/);
  assert.doesNotMatch(sitemapSource, /"\/app/);
});

test("robots.txt allows public crawling and disallows /app", () => {
  assert.match(robotsSource, /sitemap:\s*`\$\{siteUrl\}\/sitemap\.xml`/);
  assert.match(robotsSource, /userAgent:\s*"\*"/);
  assert.match(robotsSource, /allow:\s*"\/"/);
  assert.match(robotsSource, /disallow:\s*\["\/app"\]/);
});

test("About page content contains exact canonical description and answers 'What is ELHABAK Construction?'", () => {
  // Title & Lead
  assert.match(seoPagesSource, /ELHABAK Construction — الحباك للمقاولات والاستشارات الهندسية/);
  assert.ok(seoPagesSource.includes(CANONICAL_COMPANY_DESCRIPTIONS.ar));
  assert.ok(seoPagesSource.includes(CANONICAL_COMPANY_DESCRIPTIONS.en));

  // Explicitly answers 'What is ELHABAK Construction?'
  assert.match(seoPagesSource, /ما هي شركة ELHABAK Construction/);
  assert.match(seoPagesSource, /What is ELHABAK Construction/);

  // Section 17 factual statements
  assert.match(seoPagesSource, /الاسم التجاري/);
  assert.match(seoPagesSource, /Trade Name/);
  assert.match(seoPagesSource, /01130666726/);
  assert.match(seoPagesSource, /\+201130666726/);
});

test("Contact identity uses official phone display 01130666726, E.164 and wa.me", () => {
  assert.equal(companyContact.phone, "01130666726");
  assert.equal(companyContact.phoneE164, "+201130666726");
  assert.equal(companyContact.whatsappNumber, "201130666726");

  assert.match(seoPagesSource, /tel:\+201130666726/);
  assert.match(seoPagesSource, /https:\/\/wa\.me\/201130666726/);
});
