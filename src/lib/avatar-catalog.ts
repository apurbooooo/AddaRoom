/**
 * AddaRoom Avatar Catalog
 *
 * Single source of truth for all available avatar assets.
 * Add new entries here to extend the gallery.
 */

export interface AvatarMeta {
    /** Stable identifier — based on filename, never changes */
    id: string;
    /** Display label shown in picker */
    label: string;
    /** Public path relative to /public */
    src: string;
    /** Descriptive alt text */
    alt: string;
}

export const AVATAR_CATALOG: AvatarMeta[] = [
    {
        id: "retro-gamer-midnight",
        label: "Gamer",
        src: "/avatars/retro-gamer-midnight.svg",
        alt: "Retro gamer wearing a lime gaming headset",
    },
    {
        id: "cyberpunk-dev-midnight",
        label: "Cyberpunk",
        src: "/avatars/cyberpunk-dev-midnight.svg",
        alt: "Cyberpunk developer with neon purple hair and cyber eye implant",
    },
    {
        id: "persona-female-pfp",
        label: "Persona F",
        src: "/avatars/persona-female-pfp.svg",
        alt: "Female persona with purple flowing hair",
    },
    {
        id: "persona-male-pfp",
        label: "Persona M",
        src: "/avatars/persona-male-pfp.svg",
        alt: "Male persona in professional attire",
    },
    {
        id: "astro-cat-midnight",
        label: "Astro Cat",
        src: "/avatars/astro-cat-midnight.svg",
        alt: "Cute cat in a space helmet among the stars",
    },
    {
        id: "isometric-terminal-midnight",
        label: "Terminal",
        src: "/avatars/isometric-terminal-midnight.svg",
        alt: "Isometric terminal screen with green code",
    },
    {
        id: "creator-midnight",
        label: "Creator",
        src: "/avatars/creator-midnight.svg",
        alt: "Creative person with locs and green accent hoodie",
    },
    {
        id: "music-producer-midnight",
        label: "Producer",
        src: "/avatars/music-producer-midnight.svg",
        alt: "Music producer wearing purple headphones",
    },
    {
        id: "scientist-midnight",
        label: "Scientist",
        src: "/avatars/scientist-midnight.svg",
        alt: "Scientist in a lab coat with blue glasses",
    },
    {
        id: "explorer-midnight",
        label: "Explorer",
        src: "/avatars/explorer-midnight.svg",
        alt: "Explorer wearing a wide-brim hat with a leaf",
    },
    {
        id: "scholar-midnight",
        label: "Scholar",
        src: "/avatars/scholar-midnight.svg",
        alt: "Scholar with reading glasses holding an open book",
    },
];

/** Default avatar ID for new users */
export const DEFAULT_AVATAR_ID = "persona-male-pfp";

/** LocalStorage key for remembering the user's last avatar choice */
export const AVATAR_PREF_KEY = "addaroom_avatar_id";

/**
 * Returns the AvatarMeta for a given ID, or the default avatar if the ID is unknown.
 */
export function getAvatarById(id?: string | null): AvatarMeta {
    if (!id) return AVATAR_CATALOG.find(a => a.id === DEFAULT_AVATAR_ID)!;
    return AVATAR_CATALOG.find(a => a.id === id) ?? AVATAR_CATALOG.find(a => a.id === DEFAULT_AVATAR_ID)!;
}

/**
 * Derives a deterministic avatar ID from a stable seed (participantId or similar).
 * Falls back to the catalog position based on seed hash — no randomization during render.
 */
export function getAvatarVariant(seed: string): AvatarMeta {
    if (!seed) return getAvatarById(DEFAULT_AVATAR_ID);
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return AVATAR_CATALOG[hash % AVATAR_CATALOG.length];
}

/**
 * Reads the saved avatar preference from localStorage.
 * Returns null if none saved or running server-side.
 */
export function getSavedAvatarId(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(AVATAR_PREF_KEY);
    } catch {
        return null;
    }
}

/**
 * Saves the user's avatar preference to localStorage.
 */
export function saveAvatarId(id: string): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(AVATAR_PREF_KEY, id);
    } catch {}
}

/**
 * Resolves the best avatar ID for a session context.
 * Priority: locally stored pref > provided value > deterministic fallback from seed.
 */
export function resolveAvatarId(storedId: string | null, seed?: string): string {
    const stored = storedId?.trim();
    if (stored && AVATAR_CATALOG.some(a => a.id === stored)) {
        return stored;
    }
    if (seed) {
        return getAvatarVariant(seed).id;
    }
    return DEFAULT_AVATAR_ID;
}
