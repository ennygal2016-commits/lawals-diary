import { Heading, Text } from "@react-email/components";

import { EmailLayout, PrimaryButton, fonts, t } from "./layout";

/**
 * Instant email for one notification. Deliberately content-free: who did what and a link — never the words of an
 * entry, note or comment, which stay behind sign-in.
 */
export function NotificationEmail({ line, href, siteUrl }: { line: string; href: string; siteUrl: string }) {
  return (
    <EmailLayout preview={line} siteUrl={siteUrl}>
      <Heading
        as="h1"
        style={{ margin: "0 0 12px", fontFamily: fonts.serif, fontWeight: 400, fontSize: 30, color: t.fg }}
      >
        {line}
      </Heading>
      <Text style={{ margin: "0 0 24px", fontSize: 15, lineHeight: "22px", color: t.muted }}>
        Open the diary to read it.
      </Text>
      <PrimaryButton href={`${siteUrl}${href}`}>Open the diary</PrimaryButton>
    </EmailLayout>
  );
}

export default NotificationEmail;
