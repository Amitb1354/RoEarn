import Fingerprint2 from 'fingerprintjs2';

/**
 * Generates a deterministic hardware/browser fingerprint.
 * Combines canvas fingerprint, user agent and hardware concurrency.
 * Returns a string that can be stored and compared server‑side.
 */
export async function getFingerprint() {
  const components = await Fingerprint2.getPromise();
  const values = components.map(c => c.value).join('---');
  return values;
}
