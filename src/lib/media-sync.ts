export function projectedPlaybackTime(currentTime: number, playing: boolean, sentAt?: number, now = Date.now()): number {
  if (!playing || sentAt === undefined) return currentTime;
  return currentTime + Math.max(0, now - sentAt) / 1000;
}

export function shouldAcceptPlaybackVersion(version: number | undefined, lastVersion: number): boolean {
  return version === undefined || version > lastVersion;
}
