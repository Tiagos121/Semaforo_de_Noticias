import tailwind from '@tailwindcss/postcss'

export default {
  css: {
    postcss: {
      plugins: [tailwind()],
    },
  },
}
