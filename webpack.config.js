const ExtractTextPlugin = require("extract-text-webpack-plugin");
const webpack = require("webpack");

const isDebug = process.env.NODE_ENV !== 'production';


const stats = {
    colors: true,
    children: false,
    reasons: true,
    timings: true,
    chunks: false,
    chunkModules: false,
    cached: false,
    cachedAssets: false,
};

module.exports = {
    debug: isDebug,
    devtool: 'source-map',

    context: __dirname,

    stats,

    entry: [
        './client/index.tsx',
    ],

    output: {
        filename: './dist/bundle.js',
    },

    resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.css'],
    },

    externals: {
        FB: 'FB',
        Bugsnag: 'Bugsnag',
    },

    module: {
        preLoaders: [
            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            {
                test: /\.js$/,
                loader: 'source-map',
            },
        ],
        loaders: [
            {
                test: /\.tsx?$/,
                loader: 'ts',
            },
            {
                test: /\.json$/,
                loader: 'json',
            },
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract('style', [
                    'css?sourceMap&-minimize&importLoaders=1',
                    'postcss',
                ]),
            },
        ],
    },

    postcss: () => {
        return [
            require('stylelint'),
            require('postcss-import'),
            require('postcss-cssnext'),
            require('postcss-reporter')({ clearMessages: true }),
        ];
    },

    plugins: [
        new ExtractTextPlugin('./dist/styles.css'),
        new webpack.DefinePlugin({
            NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
            GOOGLE_ANALYTICS_ID: JSON.stringify('REDACTED'),
            BUGSNAG_API_KEY: JSON.stringify('REDACTED'),
            FACEBOOK_APP_ID: JSON.stringify(!isDebug ? 'REDACTED' : 'REDACTED'),
        }),
    ],
};
