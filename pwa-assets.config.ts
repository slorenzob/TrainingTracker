import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// The OS masks maskable and Apple icons itself, so fill them edge to edge with the icon's
// ground colour (icon-ground, light theme) instead of the preset's white padding.
const ground = '#f3f5f8'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: ground } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: ground } },
  },
  images: ['public/favicon.svg'],
})
