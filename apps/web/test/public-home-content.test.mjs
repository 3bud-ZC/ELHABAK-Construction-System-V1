import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/public-home.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const translations = readFileSync(new URL("../src/i18n/translations.ts", import.meta.url), "utf8");
const directionSync = readFileSync(new URL("../src/app/direction-sync.tsx", import.meta.url), "utf8");

test("public website exposes stronger conversion routes", () => {
  assert.match(page, /whatsappHref/);
  assert.match(page, /mobileQuickNav/);
  assert.match(translations, /requestInspection/);
  assert.match(translations, /whatsappCta/);
});

test("public website presents platform before services and includes FAQ", () => {
  const platformIndex = page.indexOf('id="platform"');
  const servicesIndex = page.indexOf('id="services"');
  assert.ok(platformIndex > -1, "platform section exists");
  assert.ok(servicesIndex > -1, "services section exists");
  assert.ok(platformIndex < servicesIndex, "platform section should appear before services");
  assert.match(page, /faq-section/);
  assert.match(translations, /faq:/);
});

test("public website has richer SEO and accessible hero titles", () => {
  assert.match(layout, /openGraph/);
  assert.match(layout, /twitter/);
  assert.match(layout, /metadataBase/);
  assert.match(page, /generateMetadata/);
  assert.match(page, /ELHABAK Construction \| Design, Construction & Finishing in Sohag/);
  assert.match(page, /aria-label=\{t\.home\.heroTitle\}/);
});

test("public website has responsive styles for the new conversion surfaces", () => {
  assert.match(css, /mobile-quick-nav/);
  assert.match(css, /faq-section/);
  assert.match(css, /whatsapp/);
});

test("public website syncs document direction before paint on language changes", () => {
  assert.match(directionSync, /useLayoutEffect/);
  assert.match(layout, /elhabak-lang-boot/);
});
