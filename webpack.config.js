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
        './src/index.tsx',
    ],

    output: {
        filename: './dist/bundle.js',
    },

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
    },

    externals: {
        FB: 'FB',
    },

    module: {
        preLoaders: [
            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            {
                test: /\.js$/,
                loader: 'source-map-loader',
            },
        ],
        loaders: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
            },
        ],
    },

    plugins: [],
};
