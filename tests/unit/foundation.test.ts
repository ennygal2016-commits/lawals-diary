import { describe, expect, it } from "vitest";

import { adminFilterSchema, ageOn, applicationSchema } from "@/lib/validation/foundation";

const today = "2026-11-03";
const adult = {
  applicant_name: "Tolu Adeyemi",
  applicant_dob: "2000-05-01",
  applicant_email: "Tolu@Example.com",
  school: "University of Lagos",
  level: "tertiary",
  class_year: "Year 2",
  amount_requested: "1250.555",
  reason: "Tuition for the second semester, after my father’s shop closed.",
  consent_data: "on",
  consent_contact: "on",
};
const schema = applicationSchema(today);

describe("application form (PRD FR-32)", () => {
  it("accepts a complete adult application, normalising email and amount", () => {
    const r = schema.parse(adult);
    expect(r.applicant_email).toBe("tolu@example.com");
    expect(r.amount_requested).toBe(1250.56);
    expect(r.consent_data).toBe(true);
    expect(r.guardian_name).toBeUndefined();
  });

  it("requires both consents, an email, school, level, class and a real reason", () => {
    const errors = (input: object) =>
      schema
        .safeParse(input)
        .error?.issues.map((i) => String(i.path[0]))
        .sort() ?? [];
    expect(errors({ ...adult, consent_data: undefined, consent_contact: "off" })).toEqual([
      "consent_contact",
      "consent_data",
    ]);
    expect(errors({ ...adult, applicant_email: "" })).toEqual(["applicant_email"]);
    expect(errors({ ...adult, level: "university" })).toEqual(["level"]);
    expect(errors({ ...adult, reason: "pls" })).toEqual(["reason"]);
    expect(errors({ ...adult, reason: "x".repeat(2001) })).toEqual(["reason"]);
    expect(errors({ ...adult, school: " ", class_year: "" })).toEqual(["class_year", "school"]);
  });

  it("applicants under 18 need a guardian with a phone or email; a guardian email counts as the contact", () => {
    const minor = { ...adult, applicant_dob: "2013-02-10", applicant_email: "" };
    const issues = schema
      .safeParse(minor)
      .error?.issues.map((i) => String(i.path[0]))
      .sort();
    expect(issues).toEqual(["applicant_email", "guardian_name", "guardian_phone"]);
    const ok = schema.safeParse({
      ...minor,
      guardian_name: "Funmi Adeyemi",
      guardian_email: "funmi@example.com",
    });
    expect(ok.success).toBe(true);
  });

  it("checks amounts, dates, phones and the honeypot", () => {
    expect(schema.safeParse({ ...adult, amount_requested: "0" }).success).toBe(false);
    expect(schema.safeParse({ ...adult, amount_requested: "100001" }).success).toBe(false);
    expect(schema.safeParse({ ...adult, amount_requested: "abc" }).success).toBe(false);
    expect(schema.safeParse({ ...adult, applicant_dob: "2030-01-01" }).success).toBe(false);
    expect(schema.safeParse({ ...adult, applicant_dob: "2001-02-30" }).success).toBe(false);
    expect(schema.safeParse({ ...adult, applicant_phone: "+234 803 555 0101" }).success).toBe(true);
    expect(schema.safeParse({ ...adult, applicant_phone: "call me maybe" }).success).toBe(false);
    expect(schema.safeParse({ ...adult, website: "http://spam.example" }).success).toBe(false);
  });

  it("ageOn counts whole years", () => {
    expect(ageOn("2008-11-03", today)).toBe(18);
    expect(ageOn("2008-11-04", today)).toBe(17);
  });
});

describe("admin filters", () => {
  it("strips anything that could break a PostgREST filter", () => {
    const f = adminFilterSchema.parse({
      q: "FDN-2026-0042),status.eq.new,(x",
      status: "bogus",
      level: "secondary",
      page: "-3",
    });
    expect(f).toEqual({ q: "FDN-2026-0042 status.eq.new x", status: "all", level: "secondary", page: 1 });
    expect(adminFilterSchema.parse({ q: "  Ọlá  O’Brien  " }).q).toBe("Ọlá O Brien");
    expect(adminFilterSchema.parse({}).status).toBe("all");
  });
});
