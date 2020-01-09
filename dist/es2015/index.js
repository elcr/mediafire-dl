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
require("source-map-support/register");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
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
function readLinesToArray(input) {
    return new Promise(resolve => {
        const reader = readline.createInterface({
            input,
            terminal: false
        });
        const lines = [];
        reader.on('line', line => lines.push(line));
        reader.on('close', () => resolve(lines));
    });
}
function createReadStream(path, options = { encoding: 'utf-8' }) {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(path, options);
        stream.on('error', reject);
        stream.on('ready', () => resolve(stream));
    });
}
function parseCommandLineArguments() {
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
    parser.addArgument(['-i', '--input'], {
        dest: 'input',
        metavar: 'FILE'
    });
    parser.addArgument('commandLineUrls', {
        nargs: '*',
        metavar: 'url'
    });
    return parser.parseArgs();
}
function main() {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const { commandLineUrls, outputDirectory, sleepMs, input } = parseCommandLineArguments();
        let urls = commandLineUrls;
        if (input === '-') {
            urls = yield readLinesToArray(process.stdin);
        }
        else if (input !== null) {
            let stream;
            try {
                stream = yield createReadStream(input);
            }
            catch (exception) {
                printError(`${exception.code} error opening input file: ${input}`, 2);
                return;
            }
            urls = yield readLinesToArray(stream);
        }
        else if (commandLineUrls.length === 0) {
            printError(`URL(s) required when not using '--input'`, 2);
            return;
        }
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
                yield sleep(sleepMs);
            }
        }
    });
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBb0M7QUFFcEMseUJBQXdCO0FBQ3hCLDZCQUE0QjtBQUM1QixxQ0FBb0M7QUFFcEMsaUNBQTZCO0FBQzdCLDJDQUE0QztBQUM1Qyx1Q0FBeUM7QUFHekMsUUFBUyxDQUFDLENBQUMsU0FBUyxDQUFJLFFBQXFCO0lBQ3pDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtJQUNiLEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxFQUFFO1FBQ3pCLE1BQU0sQ0FBRSxLQUFLLEVBQUUsSUFBSSxDQUFtQixDQUFBO1FBQ3RDLEtBQUssRUFBRSxDQUFBO0tBQ1Y7QUFDTCxDQUFDO0FBR0QsU0FBUyxLQUFLLENBQUMsSUFBWSxFQUFFLE9BQU8sR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUU7SUFDdEQsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN6QyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7WUFDNUIsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFO2dCQUNoQixPQUFPLEVBQUUsQ0FBQTthQUNaO2lCQUNJO2dCQUNELE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTthQUNoQjtRQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDO0FBR0QsU0FBUyxTQUFTLENBQUMsSUFBWSxFQUFFLElBQVk7SUFDekMsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN6QyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7WUFDN0IsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFF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