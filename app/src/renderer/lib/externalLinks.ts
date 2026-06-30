export const GITHUB_REPO = "https://github.com/lucasfevi/tbh-companion";
export const GITHUB_RELEASES = `${GITHUB_REPO}/releases`;
export const DISCORD_URL = "https://discord.gg/nykUjMNZkY";
export const BUYMEACOFFEE_URL = "https://buymeacoffee.com/lucasfevi";

export function githubReleaseUrl(version: string): string {
  const tag = version.startsWith("v") ? version : `v${version}`;
  return `${GITHUB_RELEASES}/tag/${tag}`;
}
