const path = require('path')


module.exports = {
    target: 'node',
    node: {
        __dirname: false,
        __filename: false
    },
    entry: path.join(__dirname, 'src', 'index.ts'),
    output: {
        filename: 'index.js',
        path: path.join(__dirname, 'dist')
    },
    devtool: 'inline-source-map',
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: '/node_modules/',
                loader: 'ts-loader'
            },
            {
                test: /\.js$/,
                enforce: 'pre',
                loader: 'source-map-loader'
            }
        ]
    },
    mode: 'development'
}
