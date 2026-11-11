const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      // dist/seed.js and dist/explain.js, built like the API.
      additionalEntryPoints: [
        { entryName: 'seed', entryPath: './src/seed/seed.ts' },
        { entryName: 'explain', entryPath: './src/explain/explain.ts' },
      ],
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      // OpenAPI schemas from *.dto.ts and *.view.ts types, validators and comments.
      transformers: [
        {
          name: '@nestjs/swagger/plugin',
          options: { dtoFileNameSuffix: ['.dto.ts', '.view.ts'], classValidatorShim: true, introspectComments: true },
        },
      ],
    }),
  ],
};
