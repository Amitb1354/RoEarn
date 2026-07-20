import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * Generates a deterministic hardware/browser fingerprint.
 * Uses the FingerprintJS library to obtain a visitor identifier.
 */
export async function getFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  // Return the stable visitorId as the fingerprint string
  return result.visitorId;
}
