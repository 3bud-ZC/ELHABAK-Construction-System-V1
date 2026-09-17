import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/public-home.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const translations = readFileSync(new URL("../src/i18n/translations.ts", import.meta.url), "utf8");
const directionSync = readFileSync(new URL("../src/app/direction-sync.tsx", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");

test("public website exposes stronger conversion routes", () => {
  assert.match(page, /whatsappHref/);
  assert.match(page, /mobileQuickNav/);
  assert.match(translations, /requestInspection/);
  assert.match(translations, /whatsappCta/);
});

test("public website leads with engineering scope and keeps platform as support", () => {
  const servicesIndex = page.indexOf('id="services"');
  const methodIndex = page.indexOf('id="why"');
  const processIndex = page.indexOf('id="process"');
  const platformIndex = page.indexOf('id="platform"');
  const faqIndex = page.indexOf('id="faq"');
  const contactIndex = page.indexOf('id="contact"');

  assert.ok(servicesIndex > -1, "services section exists");
  assert.ok(methodIndex > -1, "method section exists");
  assert.ok(processIndex > -1, "process section exists");
  assert.ok(platformIndex > -1, "platform section exists");
  assert.ok(faqIndex > -1, "faq section exists");
  assert.ok(contactIndex > -1, "contact section exists");

  // Engineering narrative order: scope -> method -> delivery -> digital support -> FAQ -> contact.
  assert.ok(servicesIndex < methodIndex, "services should appear before method");
  assert.ok(methodIndex < processIndex, "method should appear before delivery process");
  assert.ok(processIndex < platformIndex, "delivery process should appear before the digital platform");
  assert.ok(platformIndex < faqIndex, "platform should appear before FAQ");
  assert.ok(faqIndex < contactIndex, "FAQ should appear before contact");
});

test("public website has richer SEO, JSON-LD and accessible hero titles", () => {
  assert.match(layout, /openGraph/);
  assert.match(layout, /twitter/);
  assert.match(layout, /metadataBase/);
  assert.match(page, /generateMetadata/);
  assert.match(page, /application\/ld\+json/);
  assert.match(page, /ProfessionalService/);
  assert.match(page, /ELHABAK Construction \| Design, Construction & Finishing in Sohag/);
  assert.match(page, /aria-label=\{t\.home\.heroTitle\}/);
});

test("hero keeps one primary conversion action and one secondary action", () => {
  const heroActions = page.slice(page.indexOf('className="hero-actions"'), page.indexOf("</PublicHero>"));
  const buttonCount = (heroActions.match(/<Button/g) ?? []).length;
  assert.equal(buttonCount, 2, "hero should render exactly two actions");
  assert.match(heroActions, /hero-cta--whatsapp/);
  assert.match(heroActions, /hero-cta--ghost/);
});

test("public website has responsive styles for the new conversion surfaces", () => {
  assert.match(css, /mobile-quick-nav/);
  assert.match(css, /faq-section/);
  assert.match(css, /whatsapp/);
});

test("public website keeps the delivery process compact", () => {
  assert.match(page, /process-panel/);
  assert.match(page, /process-grid/);
  assert.match(css, /\.process-grid/);
  assert.doesNotMatch(css, /grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);
  assert.doesNotMatch(css, /min-height:\s*214px/);
});

test("public website syncs document direction before paint on language changes", () => {
  assert.match(directionSync, /useLayoutEffect/);
  assert.match(layout, /elhabak-lang-boot/);
});

test("security headers and CSP are emitted", () => {
  const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(nextConfig, /X-Frame-Options/);
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(nextConfig, /Referrer-Policy/);
  assert.match(nextConfig, /Strict-Transport-Security/);
  assert.match(nextConfig, /microphone=\(self\)/);
  assert.match(proxy, /Content-Security-Policy/);
  assert.match(proxy, /nonce-/);
  assert.match(proxy, /upgrade-insecure-requests/);
});

test("seo route files exist", () => {
  const sitemap = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
  const robots = readFileSync(new URL("../src/app/robots.ts", import.meta.url), "utf8");
  assert.match(sitemap, /MetadataRoute\.Sitemap/);
  assert.match(sitemap, /alternates/);
  assert.match(robots, /sitemap\.xml/);
  assert.match(robots, /disallow/);
});
