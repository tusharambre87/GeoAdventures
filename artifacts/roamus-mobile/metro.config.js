const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const apiDist = path.resolve(__dirname, "../../artifacts/api-server/dist");
config.resolver = config.resolver ?? {};
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  new RegExp("^" + escape(apiDist) + "(/.*)?$"),
];

module.exports = config;
