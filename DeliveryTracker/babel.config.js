module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@config': './app/config',
            '@components': './app/components',
            '@screens': './app/screens',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
