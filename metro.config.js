const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const sharedDist = path.resolve(__dirname, 'vendor/gharfix-shared/dist/index.js');
const originalResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@gharfix/shared') {
    return { filePath: sharedDist, type: 'sourceFile' };
  }
  if (originalResolve) {
    return originalResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
