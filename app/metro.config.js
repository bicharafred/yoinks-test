const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuração do Transformer para SVGs
config.transformer.babelTransformerPath =
  require.resolve("react-native-svg-transformer");

// Configuração do Resolver para inverter as extensões aceitas
const { assetExts, sourceExts } = config.resolver;
config.resolver.assetExts = assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...sourceExts, "svg"];

module.exports = config;
