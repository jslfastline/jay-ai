import { config, emailConfigured } from './config.js';

export { emailConfigured };

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

export interface VerificationEmail {
  to: string;
  name: string;
  code: string;
  link: string;
  expiresInMinutes: number;
}

export interface DeliveryResult {
  delivered: boolean;
  /** Present only when delivery failed, for server-side logging. */
  reason?: string;
}

/**
 * Sends a verification code email through EmailJS. When EmailJS is not
 * configured the code is printed to the server console instead, so the
 * registration flow remains testable without scraping secrets into the client.
 */
export async function sendVerificationEmail(message: VerificationEmail): Promise<DeliveryResult> {
  if (!emailConfigured()) {
    console.warn(
      `[jay-ai-server] Email not configured — verification code for ${message.to} is ` +
        `${message.code} (valid ${message.expiresInMinutes} min). ` +
        'Set EMAILJS_SERVICE_ID / EMAILJS_TEMPLATE_ID / EMAILJS_PUBLIC_KEY to send real email.'
    );
    return { delivered: false, reason: 'email_not_configured' };
  }

  const body: Record<string, unknown> = {
    service_id: config.email.serviceId,
    template_id: config.email.templateId,
    user_id: config.email.publicKey,
    template_params: {
      to_email: message.to,
      email: message.to,
      to_name: message.name,
      name: message.name,
      code: message.code,
      verification_link: message.link,
      app_name: config.email.appName,
      expiry_minutes: String(message.expiresInMinutes),
    },
  };
  if (config.email.privateKey) body.accessToken = config.email.privateKey;

  try {
    const response = await fetch(EMAILJS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`[jay-ai-server] EmailJS send failed (${response.status}): ${detail}`);
      return { delivered: false, reason: `emailjs_${response.status}` };
    }
    return { delivered: true };
  } catch (error) {
    console.error(`[jay-ai-server] EmailJS send error: ${(error as Error).message}`);
    return { delivered: false, reason: 'emailjs_network' };
  }
}
