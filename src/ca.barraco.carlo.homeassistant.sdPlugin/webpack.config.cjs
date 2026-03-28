const path = require("path");

module.exports = {
    entry: {
        "plugin/js/main": "./plugin/js/main.ts",
        "pi/js/main": "./pi/js/main.ts",
        "pi/js/credentials": "./pi/js/credentials.ts",
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist/runtime"),
        clean: true,
    },
    resolve: {
        extensions: [".ts", ".js"],
        extensionAlias: {
            ".js": [".ts", ".js"],
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: "ts-loader",
                    options: {
                        configFile: path.resolve(__dirname, "tsconfig.json"),
                    },
                },
                exclude: /node_modules/,
            },
        ],
    },
    target: ["web", "es2020"],
    devtool: "source-map",
};
