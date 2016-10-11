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
                test: /\.css$/,
                loaders: [
                    'style',
                    'css?sourceMap&-minimize&importLoaders=1',
                    'postcss',
                ]
            }
        ],
    },

    postcss: () => {
        return [
            require('postcss-import'),
            require('postcss-cssnext'),
        ];
    }
};
