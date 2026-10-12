/**
 * Metro config for the GharFix mobile app.
 *
 * Maps `@gharfix/shared` to the workspace package's TypeScript source so the
 * app works even when `packages/shared/dist` has not been built yet. The
 * coordinator's root `npm install` links the workspace package via symlink;
 * this resolver takes precedence for Metro bundling.
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const sharedSrc = path.resolve(__dirname, '../../packages/shared/src/index.ts');
const originalResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@gharfix/shared') {
    return { filePath: sharedSrc, type: 'sourceFile' };
  }
  if (originalResolve) {
    return originalResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.watchFolders = [path.resolve(__dirname, '../../packages/shared/src')];

module.exports = config;
