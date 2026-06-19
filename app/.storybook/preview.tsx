import type { Preview } from "@storybook/react-vite";
// Same stylesheet the real app loads — Tailwind v4's `@theme` tokens and the
// `body { bg-bg text-fg }` base rule apply identically here, so stories
// preview against the real app background/tokens, not Storybook's defaults.
import "../src/renderer/styles.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
      },
    },
  },
};

export default preview;
