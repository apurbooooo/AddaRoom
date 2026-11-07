export function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be" || url.hostname.endsWith("youtube.com")) {
      const id = url.hostname === "youtu.be" ? url.pathname.slice(1).split("/")[0] : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
  } catch {}
  return null;
}

export function validateDirectMediaUrl(input: string): { ok: true; url: string } | { ok: false; reason: string } {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "Use an http(s) browser-playable media URL." };
    const filename = url.pathname.toLowerCase().split("/").pop() || "";
    const extension = filename.includes(".") ? filename.split(".").pop() : undefined;
    if (extension && !["mp4", "webm", "ogg", "ogv", "m4v", "mov"].includes(extension)) return { ok: false, reason: "This URL does not look like a supported browser video file. The server must still provide a compatible video MIME type." };
    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false, reason: "Enter a valid http(s) URL." };
  }
}
