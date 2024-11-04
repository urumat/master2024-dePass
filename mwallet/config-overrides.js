// config-overrides.js
const webpack = require('webpack');

module.exports = function override(config) {
    // Configuración de polyfills para módulos de Node.js
    config.resolve.fallback = {
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        assert: require.resolve('assert'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        url: require.resolve('url'),
        buffer: require.resolve('buffer'),
        zlib: require.resolve('browserify-zlib'),
    };

    // Configura Buffer y process como globales
    config.plugins.push(
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser'
        })
    );

    return config;
};
