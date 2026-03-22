import { dkimVerify } from "mailauth";

export interface EmailVerificationResult {
  verified: boolean;
  domain: string | null;
  subject: string | null;
  body: string | null;
  error?: string;
}

export async function verifyEmail(emlContent: Buffer): Promise<EmailVerificationResult> {
  try {
    const result = await dkimVerify(emlContent);

    // Check if any DKIM signature passed
    const passed = result.results?.some(
      (r: { status: { result: string } }) => r.status?.result === "pass"
    );

    if (!passed) {
      return {
        verified: false,
        domain: null,
        subject: null,
        body: null,
        error: "DKIM verification failed: no valid signature found",
      };
    }

    // Extract domain from the first passing result
    const passingResult = result.results.find(
      (r: { status: { result: string } }) => r.status?.result === "pass"
    );
    const signingDomain = passingResult?.signingDomain ?? passingResult?.status?.comment ?? null;

    // Parse headers and body from the raw .eml
    const emlString = emlContent.toString("utf-8");
    const headerEndIdx = emlString.indexOf("\r\n\r\n");
    const rawHeaders = headerEndIdx >= 0 ? emlString.slice(0, headerEndIdx) : emlString;
    const rawBody = headerEndIdx >= 0 ? emlString.slice(headerEndIdx + 4) : "";

    // Extract subject from headers
    const subjectMatch = rawHeaders.match(/^Subject:\s*(.+?)(?:\r?\n(?!\s)|$)/im);
    const subject = subjectMatch?.[1]?.trim() ?? null;

    // Use the body text (strip HTML tags for a rough plaintext extraction)
    const body = rawBody.replace(/<[^>]*>/g, "").trim() || null;

    return {
      verified: true,
      domain: signingDomain,
      subject,
      body,
    };
  } catch (err) {
    return {
      verified: false,
      domain: null,
      subject: null,
      body: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
