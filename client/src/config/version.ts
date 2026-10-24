export const CLIENT_VERSION = '1.0.0';

export function parseSemver(version: string): [number, number, number] {
  const parts = version.trim().split('.').map((p) => parseInt(p, 10));
  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  const patch = parts[2] ?? 0;
  return [isNaN(major) ? 0 : major, isNaN(minor) ? 0 : minor, isNaN(patch) ? 0 : patch];
}

export function isVersionSupported(clientVer: string, minVer: string): boolean {
  const [cMaj, cMin, cPat] = parseSemver(clientVer);
  const [mMaj, mMin, mPat] = parseSemver(minVer);

  if (cMaj !== mMaj) {
    return cMaj > mMaj;
  }
  if (cMin !== mMin) {
    return cMin > mMin;
  }
  return cPat >= mPat;
}
