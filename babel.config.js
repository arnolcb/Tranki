module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin', // <- Debe ser el ÚLTIMO plugin
  ],
};
