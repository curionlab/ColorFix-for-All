import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://curionlab.github.io',
  base: '/ColorFix-for-All/',
  integrations: [react(), tailwind({
    applyBaseStyles: true,
  })],
  output: 'static',
});
