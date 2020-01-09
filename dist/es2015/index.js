"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const jsdom_1 = require("jsdom");
const node_fetch_1 = require("node-fetch");
const argparse_1 = require("argparse");
function* enumerate(iterator) {
    let index = 0;
    for (const item of iterator) {
        yield [index, item];
        index++;
    }
}
function mkdir(path, options = { recursive: true }) {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, options, error => {
            if (error === null) {
                resolve();
            }
            else {
                reject(error);
            }
        });
    });
}
function writeFile(path, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, data, error => {
            if (error === null) {
                resolve();
            }
            else {
                reject(error);
            }
        });
    });
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function printError(message, exitCode = 1) {
    console.error(message);
    process.exitCode = exitCode;
}
function main() {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const parser = new argparse_1.ArgumentParser({
            version: '0.1.0',
            prog: 'mediafire-dl'
        });
        parser.addArgument(['-o', '--output-directory'], {
            defaultValue: '.',
            dest: 'outputDirectory',
            metavar: 'DIRECTORY'
        });
        parser.addArgument(['-s', '--sleep-ms'], {
            defaultValue: 200,
            dest: 'sleepMs',
            metavar: 'MILLISECONDS',
            type: Number
        });
        parser.addArgument('urls', {
            nargs: '+',
            metavar: 'url'
        });
        const { urls, outputDirectory, sleepMs } = parser.parseArgs();
        if (!Number.isSafeInteger(sleepMs) || sleepMs < 0) {
            printError(`Sleep milliseconds value must be a positive integer`, 2);
            return;
        }
        try {
            yield mkdir(outputDirectory);
        }
        catch (exception) {
            if (exception.code !== 'EEXIST') {
                printError(`${exception.code} error trying to make directory: ${outputDirectory}`, 2);
                return;
            }
        }
        for (const [index, url] of enumerate(urls)) {
            let response;
            try {
                response = yield node_fetch_1.default(url);
            }
            catch (_e) {
                printError(`Network error fetching page URL: ${url}`);
                continue;
            }
            if (!response.ok) {
                printError(`Fetching page URL returned ${response.status}: ${URL}`);
                continue;
            }
            let text;
            try {
                text = yield response.text();
            }
            catch (_f) {
                printError(`Error decoding response text: ${url}`);
                continue;
            }
            let document;
            try {
                document = new jsdom_1.JSDOM(text).window.document;
            }
            catch (_g) {
                printError(`Error creating DOM from response text: ${url}`);
                continue;
            }
            const filename = (_b = (_a = document.querySelector('.filename')) === null || _a === void 0 ? void 0 : _a.textContent, (_b !== null && _b !== void 0 ? _b : null));
            if (filename === null) {
                printError(`Could not find filename in HTML: ${url}`);
                continue;
            }
            const downloadUrl = (_d = (_c = document.querySelector('#download_link .input')) === null || _c === void 0 ? void 0 : _c.getAttribute('href'), (_d !== null && _d !== void 0 ? _d : null));
            if (downloadUrl === null) {
                printError(`Could not find download URL in HTML: ${url}`);
                continue;
            }
            try {
                response = yield node_fetch_1.default(downloadUrl);
            }
            catch (_h) {
                printError(`Network error fetching download URL: ${downloadUrl}`);
                continue;
            }
            if (!response.ok) {
                printError(`Fetching download URL returned ${response.status}: ${downloadUrl}`);
                continue;
            }
            let data;
            try {
                data = yield response.buffer();
            }
            catch (_j) {
                printError(`Error getting response data: ${downloadUrl}`);
                continue;
            }
            const outputPath = path.join(outputDirectory, filename);
            try {
                yield writeFile(outputPath, data);
            }
            catch (exception) {
                printError(`${exception.code} error trying to write file: ${outputPath}`);
                continue;
            }
            console.log(outputPath);
            if (index + 1 !== urls.length) {
                yield sleep(200);
            }
        }
    });
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map