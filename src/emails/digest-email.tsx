import { Heading, Link, Section, Text } from "@react-email/components";

import { EmailLayout, PrimaryButton, fonts, t } from "./layout";

export type DigestItem = { line: string; href: string; when: string };

/** The daily digest: one line per notification, newest first, each linking into the diary. No private content. */
export function DigestEmail({
  items,
  siteUrl,
  date,
}: {
  items: DigestItem[];
  siteUrl: string;
  date: string;
}) {
  const summary = `${items.length} ${items.length === 1 ? "thing" : "things"} in your diary`;
  return (
    <EmailLayout preview={summary} siteUrl={siteUrl}>
      <Text
        style={{
          margin: "0 0 8px",
          fontFamily: fonts.mono,
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: t.muted,
        }}
      >
        {date}
      </Text>
      <Heading
        as="h1"
        style={{ margin: "0 0 20px", fontFamily: fonts.serif, fontWeight: 400, fontSize: 30, color: t.fg }}
      >
        {summary}
      </Heading>
      <Section style={{ margin: "0 0 24px" }}>
        {items.map((item, i) => (
          <Text
            key={i}
            style={{
              margin: 0,
              padding: "10px 0",
              borderTop: i === 0 ? "none" : `1px solid ${t.border}`,
              fontSize: 15,
              lineHeight: "22px",
              color: t.fgSoft,
            }}
          >
            <Link href={`${siteUrl}${item.href}`} style={{ color: t.fg, textDecoration: "none" }}>
              {item.line}
            </Link>
            <br />
            <span style={{ fontFamily: fonts.mono, fontSize: 12, color: t.faint }}>{item.when}</span>
          </Text>
        ))}
      </Section>
      <PrimaryButton href={`${siteUrl}/admin`}>Open the diary</PrimaryButton>
    </EmailLayout>
  );
}

export default DigestEmail;
