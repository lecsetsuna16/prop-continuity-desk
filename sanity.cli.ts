import type { CliConfig } from 'sanity/cli';

// Keep config loading independent of the CLI's runtime module graph.
export default {
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  deployment: {
    appId: 'sjeoy9fswf180xhccecrn2ks',
    autoUpdates: false,
  },
} satisfies CliConfig;
