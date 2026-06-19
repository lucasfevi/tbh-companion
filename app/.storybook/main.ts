import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/renderer/design-system/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  // Storybook runs its own Vite instance, separate from electron.vite.config.ts's
  // renderer build — Tailwind v4's @theme/@import processing needs this plugin
  // registered here too, or styles.css's classes never get compiled.
  async viteFinal(viteConfig) {
    const { mergeConfig } = await import("vite");
    return mergeConfig(viteConfig, {
      plugins: [tailwindcss()],
    });
  },
};

export default config;
