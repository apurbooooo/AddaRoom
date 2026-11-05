import crypto from "crypto";

export function generateRoomCode(): string {
  // Format: 5 characters - 5 characters (~49.5 bits, no ambiguous 0/O or 1/I/l)
  const charset = "23456789abcdefghjkmnpqrstuvwxyz";
  const getRand = (len: number) => {
    let res = "";
    const limit = 256 - (256 % charset.length);
    while (res.length < len) {
      const bytes = crypto.randomBytes(len - res.length);
      for (const byte of bytes) {
        if (byte < limit) res += charset[byte % charset.length];
        if (res.length === len) break;
      }
    }
    return res;
  };
  return `${getRand(5)}-${getRand(5)}`;
}

export function generateSecureId(prefix = ""): string {
  const rand = crypto.randomBytes(16).toString("hex");
  return prefix ? `${prefix}_${rand}` : rand;
}

export function generateSessionSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function verifySessionSecret(secret: string, hashed: string): boolean {
  const incomingHash = hashSessionSecret(secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(incomingHash, "hex"),
      Buffer.from(hashed, "hex")
    );
  } catch {
    return false;
  }
}

