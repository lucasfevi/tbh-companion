(function () {
  const RELEASES_LATEST_PAGE =
    "https://github.com/lucasfevi/tbh-companion/releases/latest";
  const RELEASES_API =
    "https://api.github.com/repos/lucasfevi/tbh-companion/releases/latest";

  const heroLink = document.getElementById("hero-download");
  const footerLink = document.getElementById("footer-download");
  const releaseMeta = document.getElementById("release-meta");
  const downloadMeta = document.getElementById("download-meta");
  const releaseVersion = document.getElementById("release-version");
  const releaseSize = document.getElementById("release-size");
  const downloadVersion = document.getElementById("download-version");
  const downloadSize = document.getElementById("download-size");

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    const digits = unit === 0 ? 0 : 1;
    return `${size.toFixed(digits)} ${units[unit]}`;
  }

  function pickInstaller(assets) {
    if (!Array.isArray(assets)) return null;
    return assets.find(function (asset) {
      const name = (asset.name || "").toLowerCase();
      if (!name.endsWith(".exe")) return false;
      if (name.endsWith(".blockmap")) return false;
      if (name.endsWith(".yml")) return false;
      return true;
    });
  }

  function applyFallback() {
    if (heroLink) heroLink.href = RELEASES_LATEST_PAGE;
    if (footerLink) footerLink.href = RELEASES_LATEST_PAGE;
  }

  function applyRelease(release, asset) {
    const url = asset.browser_download_url;
    const version = release.tag_name || "";
    const sizeLabel = formatBytes(asset.size);

    if (heroLink) heroLink.href = url;
    if (footerLink) footerLink.href = url;

    if (version) {
      if (releaseVersion) releaseVersion.textContent = version;
      if (downloadVersion) downloadVersion.textContent = version;
    }
    if (sizeLabel) {
      if (releaseSize) releaseSize.textContent = sizeLabel;
      if (downloadSize) downloadSize.textContent = sizeLabel;
    }

    if (releaseMeta) releaseMeta.hidden = false;
    if (downloadMeta) downloadMeta.hidden = false;
  }

  fetch(RELEASES_API, { headers: { Accept: "application/vnd.github+json" } })
    .then(function (res) {
      if (!res.ok) throw new Error("GitHub API " + res.status);
      return res.json();
    })
    .then(function (release) {
      const asset = pickInstaller(release.assets);
      if (!asset || !asset.browser_download_url) {
        applyFallback();
        return;
      }
      applyRelease(release, asset);
    })
    .catch(function () {
      applyFallback();
    });
})();
