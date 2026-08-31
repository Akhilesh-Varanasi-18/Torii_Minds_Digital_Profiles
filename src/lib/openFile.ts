// Opening a large `data:` URL directly in a new tab is blocked by Chrome
// (top-level data: navigation is disallowed), which shows a blank page until
// reload. Converting to a short-lived Blob URL opens reliably everywhere.

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const bin = atob(b64 ?? "");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Open a file (data URL or normal link) in a new tab, reliably. */
export function openFileNewTab(url?: string) {
  if (!url) return;
  if (url.startsWith("data:")) {
    const blobUrl = URL.createObjectURL(dataUrlToBlob(url));
    window.open(blobUrl, "_blank", "noopener");
    // Give the new tab time to load before releasing the object URL.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } else {
    window.open(url, "_blank", "noopener");
  }
}

/** Trigger a download of a file (data URL or link) with an optional filename. */
export function downloadFile(url?: string, filename?: string) {
  if (!url) return;
  const href = url.startsWith("data:") ? URL.createObjectURL(dataUrlToBlob(url)) : url;
  const a = document.createElement("a");
  a.href = href;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (href !== url) setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
