import { Heading, Text } from "@react-email/components";

import { EmailLayout, fonts, t } from "./layout";

/**
 * Confirmation to the applicant (and/or guardian) — PRD FR-33. Only the reference and what happens next; nothing
 * from the application itself is repeated in the email.
 */
export function ApplicationReceivedEmail({ reference, siteUrl }: { reference: string; siteUrl: string }) {
  return (
    <EmailLayout preview={`We received your application ${reference}`} siteUrl={siteUrl} audience="applicant">
      <Heading
        as="h1"
        style={{ margin: "0 0 12px", fontFamily: fonts.serif, fontWeight: 400, fontSize: 30, color: t.fg }}
      >
        We received your application
      </Heading>
      <Text style={{ margin: "0 0 8px", fontSize: 15, lineHeight: "22px", color: t.muted }}>
        Your reference number is
      </Text>
      <Text
        style={{
          margin: "0 0 20px",
          fontFamily: fonts.mono,
          fontSize: 22,
          letterSpacing: "0.04em",
          color: t.lavender,
        }}
      >
        {reference}
      </Text>
      <Text style={{ margin: "0 0 12px", fontSize: 15, lineHeight: "22px", color: t.fgSoft }}>
        Please keep it — quote it if you write to us. We read every application ourselves and will contact you
        or your guardian using the details you gave.
      </Text>
      <Text style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: t.faint }}>
        If you didn’t apply, you can ignore this email.
      </Text>
    </EmailLayout>
  );
}

export default ApplicationReceivedEmail;
