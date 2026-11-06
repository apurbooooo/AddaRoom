import { describe, expect, it, beforeEach } from "vitest";
import {
  AVATAR_CATALOG,
  DEFAULT_AVATAR_ID,
  getAvatarById,
  getAvatarVariant,
  resolveAvatarId,
  getSavedAvatarId,
  saveAvatarId,
  AVATAR_PREF_KEY,
} from "@/lib/avatar-catalog";
import fs from "fs";
import path from "path";

describe("Avatar Catalog and System", () => {
  it("contains unique avatar IDs without duplicates", () => {
    const ids = AVATAR_CATALOG.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("contains all required character illustration types", () => {
    const ids = AVATAR_CATALOG.map((a) => a.id);
    expect(ids).toContain("retro-gamer-midnight");
    expect(ids).toContain("cyberpunk-dev-midnight");
    expect(ids).toContain("persona-female-pfp");
    expect(ids).toContain("persona-male-pfp");
    expect(ids).toContain("astro-cat-midnight");
    expect(ids).toContain("isometric-terminal-midnight");
  });

  it("verifies all avatar SVG files exist on disk in public/avatars/", () => {
    for (const avatar of AVATAR_CATALOG) {
      const filePath = path.join(process.cwd(), "public", avatar.src.replace(/^\//, ""));
      expect(fs.existsSync(filePath), `Avatar file missing: ${filePath}`).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("<svg");
      expect(content).toContain("</svg>");
      // Verify safe SVG: no executable script tags or inline script handlers
      expect(content).not.toContain("<script");
      expect(content).not.toContain("javascript:");
    }
  });

  it("verifies AddaRoom brand logo exists on disk in public/brand/addaroom-logo.svg", () => {
    const logoPath = path.join(process.cwd(), "public/brand/addaroom-logo.svg");
    expect(fs.existsSync(logoPath), "Logo file missing").toBe(true);
    const content = fs.readFileSync(logoPath, "utf-8");
    expect(content).toContain("<svg");
    expect(content).toContain("</svg>");
    expect(content).not.toContain("<script");
  });

  it("resolves avatar by valid ID", () => {
    const gamer = getAvatarById("retro-gamer-midnight");
    expect(gamer.id).toBe("retro-gamer-midnight");
    expect(gamer.src).toBe("/avatars/retro-gamer-midnight.svg");
  });

  it("gracefully falls back to default avatar for unknown or legacy emoji avatar ID", () => {
    const fallbackFromEmoji = getAvatarById("👑");
    expect(fallbackFromEmoji.id).toBe(DEFAULT_AVATAR_ID);

    const fallbackFromUnknown = getAvatarById("unknown_custom_id_999");
    expect(fallbackFromUnknown.id).toBe(DEFAULT_AVATAR_ID);

    const fallbackFromNull = getAvatarById(null);
    expect(fallbackFromNull.id).toBe(DEFAULT_AVATAR_ID);
  });

  it("deterministically derives avatar variant from a seed without random flickering", () => {
    const seed1 = "participant_abc_123";
    const variant1 = getAvatarVariant(seed1);
    const variant2 = getAvatarVariant(seed1);
    expect(variant1.id).toBe(variant2.id);

    const seed2 = "participant_xyz_789";
    const variant3 = getAvatarVariant(seed2);
    expect(typeof variant3.id).toBe("string");
    expect(AVATAR_CATALOG.some((a) => a.id === variant3.id)).toBe(true);
  });

  it("resolves avatar preference with correct precedence", () => {
    // Valid catalog ID takes precedence
    expect(resolveAvatarId("astro-cat-midnight")).toBe("astro-cat-midnight");

    // Invalid/emoji ID falls back to deterministic seed
    const resolvedFromSeed = resolveAvatarId("👑", "seed_participant_42");
    expect(resolvedFromSeed).toBe(getAvatarVariant("seed_participant_42").id);

    // No preference and no seed falls back to default
    expect(resolveAvatarId(null)).toBe(DEFAULT_AVATAR_ID);
  });
});
