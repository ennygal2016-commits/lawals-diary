import type * as React from "react";
import { Body, Container, Head, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";

import { tokenHex } from "@/lib/design-tokens";
import { SITE_NAME } from "@/lib/site";

/** Our tokens as plain hex (email clients don't support CSS variables). */
export const t = {
  bg: tokenHex("bg"),
  surface: tokenHex("surface"),
  border: tokenHex("border"),
  fg: tokenHex("fg"),
  fgSoft: tokenHex("fg-soft"),
  muted: tokenHex("muted"),
  faint: tokenHex("faint"),
  accent: tokenHex("accent"),
  accentInk: tokenHex("accent-ink"),
  lavender: tokenHex("lavender"),
};

/** Instrument Serif / Geist aren't safe in email; these fall back to the closest system faces. */
export const fonts = {
  serif: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  sans: "Geist, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'Geist Mono', ui-monospace, Menlo, Consolas, monospace",
};

/**
 * Shared shell for every email: dark Nocturne page, the rings wordmark in text, one card, and a footer that says
 * how to change email settings. No images, no tracking pixels.
 */
export function EmailLayout({
  preview,
  siteUrl,
  audience = "partners",
  children,
}: {
  preview: string;
  siteUrl: string;
  /** "partners" (notifications) or "applicant" (foundation confirmations — no Settings link). */
  audience?: "partners" | "applicant";
  children: React.ReactNode;
}) {
  return (
    <Html lang="en-CA">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: "32px 12px", backgroundColor: t.bg, fontFamily: fonts.sans }}>
        <Container style={{ maxWidth: 520, margin: "0 auto" }}>
          <Text style={{ margin: "0 0 20px", fontFamily: fonts.serif, fontSize: 24, color: t.fg }}>
            <span style={{ color: t.accent }}>◯</span>
            <span style={{ color: t.lavender, marginLeft: -6 }}>◯</span> {SITE_NAME}
          </Text>
          <Section
            style={{
              backgroundColor: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 20,
              padding: "28px 28px 24px",
            }}
          >
            {children}
          </Section>
          <Hr style={{ borderColor: t.border, margin: "24px 0 12px" }} />
          {audience === "partners" ? (
            <Text style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: t.faint }}>
              Private to the two of you. Choose instant, daily or no emails in{" "}
              <Link
                href={`${siteUrl}/admin/settings#notifications-heading`}
                style={{ color: t.muted, textDecoration: "underline" }}
              >
                Settings
              </Link>
              .
            </Text>
          ) : (
            <Text style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: t.faint }}>
              {SITE_NAME} Foundation ·{" "}
              <Link href={`${siteUrl}/foundation`} style={{ color: t.muted, textDecoration: "underline" }}>
                {siteUrl.replace(/^https?:\/\//, "")}/foundation
              </Link>
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  );
}

export function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: t.accent,
        color: t.accentInk,
        fontWeight: 600,
        fontSize: 15,
        textDecoration: "none",
        padding: "12px 20px",
        borderRadius: 12,
      }}
    >
      {children}
    </Link>
  );
}
