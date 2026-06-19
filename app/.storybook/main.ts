import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/renderer/design-system/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
};

export default config;
