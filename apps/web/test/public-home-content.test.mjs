import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/public-home.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const translations = readFileSync(new URL("../src/i18n/translations.ts", import.meta.url), "utf8");
const directionSync = readFileSync(new URL("../src/app/direction-sync.tsx", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
const hero = readFileSync(new URL("../src/app/public-hero.tsx", import.meta.url), "utf8");
const processRoute = readFileSync(new URL("../src/app/process-route.tsx", import.meta.url), "utf8");
const faqAccordion = readFileSync(new URL("../src/app/faq-accordion.tsx", import.meta.url), "utf8");
const archCss = readFileSync(new URL("../src/app/public-architecture.css", import.meta.url), "utf8");
const publicSources = [page, hero, processRoute, css, archCss].join("\n");

test("public website exposes stronger conversion routes", () => {
  assert.match(page, /whatsappHref/);
  assert.match(page, /mobileQuickNav/);
  assert.match(translations, /requestInspection/);
  assert.match(translations, /whatsappCta/);
});

test("public website leads with engineering scope and keeps platform as support", () => {
  const aboutIndex = page.indexOf('id="about"');
  const servicesIndex = page.indexOf('id="services"');
  const processIndex = page.indexOf('id="process"');
  const platformIndex = page.indexOf('id="platform"');
  const faqIndex = page.indexOf('id="faq"');
  const contactIndex = page.indexOf('id="contact"');

  assert.ok(aboutIndex > -1, "about section exists");
  assert.ok(servicesIndex > -1, "services section exists");
  assert.ok(processIndex > -1, "process section exists");
  assert.ok(platformIndex > -1, "platform section exists");
  assert.ok(faqIndex > -1, "faq section exists");
  assert.ok(contactIndex > -1, "contact section exists");

  // Engineering narrative order: about -> services -> process -> platform -> FAQ -> contact.
  assert.ok(aboutIndex < servicesIndex, "about should appear before services");
  assert.ok(servicesIndex < processIndex, "services should appear before delivery process");
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
  assert.match(page, /ELHABAK Construction \| Contracting & Engineering Consultancy/);
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

test("delivery process keeps the six canonical stages on one connected route", () => {
  const arabicStages = ["المعاينة", "التصميم", "المقايسة التقريبية", "التنفيذ", "التسليم الابتدائي", "التسليم النهائي"];
  let cursor = translations.indexOf("process: [");
  assert.ok(cursor > -1, "process stages exist in the dictionary");
  for (const stage of arabicStages) {
    const next = translations.indexOf(`["${stage}",`, cursor);
    assert.ok(next > -1, `stage "${stage}" present and in canonical order`);
    cursor = next + 1;
  }
  const englishBlock = translations.slice(translations.lastIndexOf("process: ["));
  const englishStages = englishBlock.slice(0, englishBlock.search(/\],\r?\n\s+contact/));
  assert.equal((englishStages.match(/^\s+\["/gm) ?? []).length, 6, "English keeps six stages too");

  assert.match(page, /<ProcessRoute\s+stages=\{t\.process\}/);
  assert.equal((page.match(/processLayers\s*=/g) ?? []).length, 1);
  // Every stage is real list content: number, title and description stay in the DOM.
  assert.match(processRoute, /<ol className="process-stations"/);
  assert.match(processRoute, /stages\.map\(\(\[title, body\], index\)/);
  assert.match(processRoute, /<h3>\{title\}<\/h3>\s*<p>\{body\}<\/p>/);
  // The drawing is complete by default, so it never depends on scripts or motion.
  assert.match(processRoute, /useState\(total\)/);
  assert.match(processRoute, /prefers-reduced-motion: reduce/);
});

test("homepage keeps every required section and its engineering composition", () => {
  assert.match(hero, /hero-board/);
  assert.match(hero, /BlueprintElevationDraft/);
  assert.match(hero, /BlueprintElevationAxes/);
  assert.match(page, /blueprint-reality/);
  assert.match(page, /services-showcase/);
  assert.match(page, /ProcessRoute/);
  assert.match(page, /platform-pipeline/);
  assert.match(page, /faq-register/);
  assert.match(page, /cta-banner-section/);
  assert.match(page, /<SiteFooter locale=\{locale\} \/>/);
  // Real copy keeps coming from the dictionary rather than being hard-coded away.
  for (const key of ["heroTitle", "heroSubtitle", "aboutLead", "servicesTitle", "processTitle", "digitalTitle", "digitalNote", "faqTitle", "ctaTitle"]) {
    assert.ok(page.includes(`t.home.${key}`), `t.home.${key} is rendered`);
  }
  assert.match(page, /t\.services\.slice\(1\)\.map/);
  assert.match(page, /t\.home\.digitalFeatures\.map/);
});

test("public css keeps restrained, reduced-motion-safe architectural motion", () => {
  for (const selector of [".hero-board", ".hero-built", ".blueprint-reality", ".process-route", ".bp-seq", ".platform-pipeline", ".faq-accordion-panel"]) {
    assert.ok(archCss.includes(selector), selector);
  }
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(archCss, /stroke-dashoffset/);
  assert.match(archCss, /mask-image:\s*linear-gradient/);
  assert.match(archCss, /@media \(max-width:\s*640px\)[\s\S]*\.blueprint-reality/);
  const reduced = archCss.slice(archCss.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  for (const selector of [".hero-built__reveal", ".hero-built__ground", ".hero-cut", ".bp-seq__s", ".process-board__art", ".platform-device", ".platform-pipeline", ".faq-accordion-panel"]) {
    assert.ok(reduced.includes(selector), `reduced motion covers ${selector}`);
  }
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

test("FAQ indexing stays single-sourced and the accordion stays accessible", () => {
  // Single FAQ index in JSX, zero CSS counter duplication
  assert.equal((faqAccordion.match(/faq-accordion-index/g) ?? []).length, 1);
  assert.match(faqAccordion, /String\(index \+ 1\)\.padStart\(2, "0"\)/);
  assert.doesNotMatch(archCss, /counter-increment:\s*faq/);
  assert.doesNotMatch(archCss, /counter\(faq\)/);
  assert.match(faqAccordion, /aria-expanded=\{isOpen\}/);
  assert.match(faqAccordion, /aria-controls=\{itemId\}/);
  assert.match(faqAccordion, /inert=\{!isOpen\}/);
  assert.match(page, /<FaqAccordion items=\{t\.faq\} \/>/);
});

test("digital platform keeps the real product screenshots as the proof", () => {
  assert.match(page, /platform-stage/);
  assert.match(page, /src="\/marketing\/platform-desktop\.webp"/);
  assert.match(page, /src="\/marketing\/platform-mobile\.webp"/);
  // One information pipeline with five stations, fed by the four real channels.
  const pipeline = page.slice(page.indexOf("const platformPipeline = ["), page.indexOf("const platformChannelNodes"));
  assert.equal((pipeline.match(/key: "/g) ?? []).length, 5);
  assert.match(page, /className="platform-channels"/);
  assert.match(page, /platform-channel--primary/);
  // Nothing is drawn over the screenshots and no invented figures appear around them.
  assert.doesNotMatch(page, /platform-callout|platform-control-field/);
  assert.doesNotMatch(css + archCss, /content:\s*"LIVE PROJECT CONTROL"/);
});

test("the retired moving-beam language does not come back", () => {
  for (const retired of [
    "hero-trace-route",
    "heroTraceRoute",
    "hero-survey-field__scan",
    "hero-survey-sweep",
    "hero-datum-travel",
    "process-route-map",
    "process-route-signal",
    "processSurveyNode",
    "platform-control-field",
    "platform-scanner",
    "platform-screen-scan",
    "bp-scan"
  ]) {
    assert.ok(!publicSources.includes(retired), `${retired} must stay retired`);
  }
  // No invented engineering figures: level tags are neutral references, plan dimensions carry no numbers.
  const art = readFileSync(new URL("../src/app/blueprint-art.tsx", import.meta.url), "utf8");
  assert.deepEqual([...art.matchAll(/text: "([^"]+)" }/g)].map((match) => match[1]), ["ROOF", "L02", "L01", "L00"]);
  assert.doesNotMatch(art, /text: "[^"]*d+.d+/, "no decimal measurements in drawing text");
  assert.doesNotMatch(art, /PLAN_LABELS/);
  assert.doesNotMatch(art, /["'][+±]d/, "no signed elevation values");
  // No generated drawing / sheet numbers (A-01 …) on section labels.
  assert.doesNotMatch(archCss, /content:s*"A-"/);
  assert.doesNotMatch(archCss, /counter-(increment|reset):s*sheet/);
  // Decorative technical captions that were not tied to real geometry stay out too.
  for (const label of ["DATUM 00", "GRID A–D", "GRID A–07", "SECTION 03", "DISCIPLINE REGISTER", "18.40 m", "SHEET <bdi>"]) {
    assert.ok(!publicSources.includes(label), `${label} must not be rendered`);
  }
});

test("homepage hero is one building read as drawing, structure and delivery", () => {
  assert.match(page, /image="\/marketing\/hero-delivery\.webp"/);
  const states = page.slice(page.indexOf("const heroStates = ["), page.indexOf("// 5 Canonical Services"));
  assert.deepEqual([...states.matchAll(/key: "(\w+)" as const/g)].map((match) => match[1]), ["design", "execution", "delivery"]);

  // The drawing sits under the photo and the reference marks above it.
  const draft = hero.indexOf("<BlueprintElevationDraft");
  const built = hero.indexOf('className="hero-built"');
  const axes = hero.indexOf("<BlueprintElevationAxes");
  assert.ok(draft > -1 && draft < built && built < axes, "draft → built photo → axes stacking order");
  assert.match(hero, /data-state=\{current\?\.key\}/);
  assert.match(hero, /aria-pressed=\{index === active\}/);

  // The photo is cut along the roofline and revealed across the section cut; never darkened.
  const builtRule = archCss.match(/\.hero-built \{[^}]*\}/)?.[0] ?? "";
  assert.match(builtRule, /clip-path:\s*polygon\(/);
  assert.match(archCss, /\.hero-built__reveal \{[^}]*mask-image:\s*linear-gradient/);
  // The reveal animates transforms only: window and photo counter-slide in sync.
  assert.match(archCss, /\.hero-built__reveal \{[^}]*transform:\s*translate3d\(calc\(\(var\(--cut\) - 8\) \* 1%\)/);
  assert.match(archCss, /\.hero-built__ground \{[^}]*transform:\s*translate3d\(calc\(\(var\(--cut\) - 8\) \* -1%\)/);
  const brightness = Number(archCss.match(/\.hero-built__img \{[^}]*brightness\(([\d.]+)\)/)?.[1]);
  assert.ok(brightness >= 1, `hero photo must not be darkened, received brightness(${brightness})`);
  assert.doesNotMatch(archCss, /@property/, "no main-thread custom-property animation");
});
