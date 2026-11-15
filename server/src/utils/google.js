import { OAuth2Client } from 'google-auth-library';

let client;

/** Verifies a Google ID token (signature, expiry, audience) and returns its payload. Throws if invalid. */
export async function verifyGoogleCredential(credential) {
  client ||= new OAuth2Client();
  const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  return ticket.getPayload();
}
