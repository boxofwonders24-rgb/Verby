const { VitePlugin } = require('@electron-forge/plugin-vite');

module.exports = {
  packagerConfig: {
    asar: true,
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {},
    },
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.js',
          config: 'vite.main.config.mjs',
          target: 'main',
        },
        {
          entry: 'src/main/preload.js',
          config: 'vite.preload.config.mjs',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mjs',
        },
      ],
    }),
  ],
};
