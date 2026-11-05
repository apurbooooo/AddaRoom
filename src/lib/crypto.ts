import crypto from "crypto";

export function generateRoomCode(): string {
  // Format: 3 characters - 4 characters (unpredictable, url-safe, no ambiguous characters like 0/O, 1/I/l)
  const charset = "23456789abcdefghjkmnpqrstuvwxyz";
  const getRand = (len: number) => {
    let res = "";
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      res += charset[bytes[i] % charset.length];
    }
    return res;
  };
  return `${getRand(3)}-${getRand(4)}`;
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
