import { test } from "node:test";
import assert from "node:assert/strict";
import {
  companyContact,
  normalizePhoneToE164,
  telHref,
  whatsappHref
} from "../../../packages/contracts/src/index.ts";

const EXPECTED_E164 = "+201111130918";
const EXPECTED_WA = "201111130918";

test("canonical contact values are the machine-readable source of truth", () => {
  assert.equal(companyContact.phoneE164, EXPECTED_E164);
  assert.equal(companyContact.whatsappNumber, EXPECTED_WA);
});

test("normalizePhoneToE164 handles the stored display format", () => {
  // The exact presentation string shown on the site: "(+20) 011 111 309 18".
  assert.equal(normalizePhoneToE164(companyContact.phone), EXPECTED_E164);
});

test("normalizePhoneToE164 handles +20 international variants", () => {
  assert.equal(normalizePhoneToE164("+20 111 113 0918"), EXPECTED_E164);
  assert.equal(normalizePhoneToE164("+201111130918"), EXPECTED_E164);
  assert.equal(normalizePhoneToE164("00201111130918"), EXPECTED_E164);
  // Trunk zero carried after the country code - the exact bug this pass fixes.
  assert.equal(normalizePhoneToE164("+20 0111 113 0918"), EXPECTED_E164);
  assert.equal(normalizePhoneToE164("+2001111130918"), EXPECTED_E164);
});

test("normalizePhoneToE164 handles domestic 011... and formatted variants", () => {
  assert.equal(normalizePhoneToE164("01111130918"), EXPECTED_E164);
  assert.equal(normalizePhoneToE164("011 111 309 18"), EXPECTED_E164);
  assert.equal(normalizePhoneToE164("(011) 111-30918"), EXPECTED_E164);
  assert.equal(normalizePhoneToE164("  0111 113 0918  "), EXPECTED_E164);
  // Bare national significant number (no trunk 0).
  assert.equal(normalizePhoneToE164("1111130918"), EXPECTED_E164);
});

test("normalizePhoneToE164 rejects empty and implausible input", () => {
  assert.equal(normalizePhoneToE164(""), null);
  assert.equal(normalizePhoneToE164("   "), null);
  assert.equal(normalizePhoneToE164(null), null);
  assert.equal(normalizePhoneToE164(undefined), null);
  assert.equal(normalizePhoneToE164("+20 123"), null);
  assert.equal(normalizePhoneToE164("abcdefghij"), null);
  assert.equal(normalizePhoneToE164("12345"), null);
});

test("whatsappHref produces a valid wa.me URL - no trunk zero after +20", () => {
  const href = whatsappHref(companyContact, "مرحبًا، أرغب في الاستفسار عن خدمات الحباك");
  assert.ok(href.startsWith(`https://wa.me/${EXPECTED_WA}?text=`), `unexpected href: ${href}`);
  assert.doesNotMatch(href, /wa\.me\/2001/); // never "+20" + trunk "0"
  const encoded = new URL(href).searchParams.get("text");
  assert.equal(encoded, "مرحبًا، أرغب في الاستفسار عن خدمات الحباك");
});

test("whatsappHref works without a message and with English text", () => {
  assert.equal(whatsappHref(companyContact), `https://wa.me/${EXPECTED_WA}`);
  const href = whatsappHref(companyContact, "Hello, I would like to ask about ELHABAK services");
  assert.equal(new URL(href).searchParams.get("text"), "Hello, I would like to ask about ELHABAK services");
});

test("telHref produces a valid E.164 tel: link", () => {
  assert.equal(telHref(companyContact), `tel:${EXPECTED_E164}`);
});
