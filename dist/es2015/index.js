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
        parser.addArgument(['-i', '--input'], {
            dest: 'input',
            metavar: 'FILE'
        });
        parser.addArgument('commandlineUrls', {
            nargs: '*',
            metavar: 'url'
        });
        const { commandlineUrls, outputDirectory, sleepMs, input } = parser.parseArgs();
        let urls = commandlineUrls;
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
        else if (commandlineUrls.length === 0) {
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
                yield sleep(200);
            }
        }
    });
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBb0M7QUFFcEMseUJBQXdCO0FBQ3hCLDZCQUE0QjtBQUM1QixxQ0FBb0M7QUFFcEMsaUNBQTZCO0FBQzdCLDJDQUE0QztBQUM1Qyx1Q0FBeUM7QUFHekMsUUFBUyxDQUFDLENBQUMsU0FBUyxDQUFJLFFBQXFCO0lBQ3pDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtJQUNiLEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxFQUFFO1FBQ3pCLE1BQU0sQ0FBRSxLQUFLLEVBQUUsSUFBSSxDQUFtQixDQUFBO1FBQ3RDLEtBQUssRUFBRSxDQUFBO0tBQ1Y7QUFDTCxDQUFDO0FBR0QsU0FBUyxLQUFLLENBQUMsSUFBWSxFQUFFLE9BQU8sR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUU7SUFDdEQsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN6QyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7WUFDNUIsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFO2dCQUNoQixPQUFPLEVBQUUsQ0FBQTthQUNaO2lCQUNJO2dCQUNELE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTthQUNoQjtRQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDO0FBR0QsU0FBUyxTQUFTLENBQUMsSUFBWSxFQUFFLElBQVk7SUFDekMsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN6QyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7WUFDN0IsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFF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