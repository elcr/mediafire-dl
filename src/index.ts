import 'source-map-support/register'

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { Readable, Writable } from 'stream'

import fetch, { Response } from 'node-fetch'
import { ArgumentParser } from 'argparse'

import packageJSON from '../package.json'


type PrintArguments = {
    stream?: NodeJS.WriteStream
    end?: string
    clear?: boolean
}


function print(message: string, { stream = process.stdout, end = '\n', clear = true }: PrintArguments = {}) {
    if (clear) {
        stream.clearLine(0)
    }
    stream.cursorTo(0)
    stream.write(message + end)
}


type PrintErrorArguments = {
    code?: 0 | 1 | 2
}


function printError(message: string, { code = 1 }: PrintErrorArguments = {}) {
    print(message, { stream: process.stderr, clear: false })
    process.exitCode = code
}


function * enumerate<T>(iterator: Iterable<T>, start = 0, step = 1): Iterable<[ number, T ]> {
    let index = start
    for (const item of iterator) {
        yield [ index, item ]
        index += step
    }
}


function mkdir(path: string, options = { recursive: true }): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, options, error => {
            if (error === null) {
                resolve()
            }
            else {
                reject(error)
            }
        })
    })
}


function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}


function readLinesToArray(input: Readable): Promise<string[]> {
    return new Promise(resolve => {
        const reader = readline.createInterface({
            input,
            terminal: false
        })
        const lines: string[] = []
        reader.on('line', line => lines.push(line))
        reader.on('close', () => resolve(lines))
    })
}


function createReadStream(path: string, encoding = 'utf-8'): Promise<Readable> {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(path, encoding)
        stream.on('error', reject)
        stream.on('ready', () => resolve(stream))
    })
}


function createWriteStream(path: string): Promise<Writable> {
    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(path)
        stream.on('error', reject)
        stream.on('ready', () => resolve(stream))
    })
}


interface Pipeable {
    on(event: 'end', callback: () => void): void
    pipe(output: Writable): void
}


function pipeStream(input: Pipeable, output: Writable): Promise<void> {
    return new Promise(resolve => {
        input.pipe(output)
        input.on('end', resolve)
    })
}


type CommandLineArguments = {
    commandLineUrls: ReadonlyArray<string>
    outputDirectory: string
    sleepMs: number
    input: string | null
}


function parseCommandLineArguments(): CommandLineArguments {
    const parser = new ArgumentParser({
        version: packageJSON.version,
        prog: packageJSON.name
    })
    parser.addArgument(['-o', '--output-directory'], {
        defaultValue: '.',
        dest: 'outputDirectory',
        metavar: 'DIRECTORY'
    })
    parser.addArgument(['-s', '--sleep-ms'], {
        defaultValue: 200,
        dest: 'sleepMs',
        metavar: 'MILLISECONDS',
        type: Number
    })
    parser.addArgument(['-i', '--input'], {
        dest: 'input',
        metavar: 'FILE'
    })
    parser.addArgument('commandLineUrls', {
        nargs: '*',
        metavar: 'url'
    })
    return parser.parseArgs()
}


async function main() {
    const {
        commandLineUrls,
        outputDirectory,
        sleepMs,
        input
    } = parseCommandLineArguments()

    let urls = commandLineUrls
    if (input === '-') {
        urls = await readLinesToArray(process.stdin)
    }
    else if (input !== null) {
        let stream: Readable
        try {
            stream = await createReadStream(input)
        }
        catch (exception) {
            printError(`${exception.code} error opening input file: ${input}`, { code: 2 })
            return
        }
        urls = await readLinesToArray(stream)
    }
    else if (commandLineUrls.length === 0) {
        printError(`URL(s) required when not using '--input'`, { code: 2 })
        return
    }

    if (!Number.isSafeInteger(sleepMs) || sleepMs < 0) {
        printError(`Sleep milliseconds value must be a positive integer`, { code: 2 })
        return
    }

    try {
        await mkdir(outputDirectory)
    }
    catch (exception) {
        if (exception.code !== 'EEXIST') {
            printError(`${exception.code} error trying to make directory: ${outputDirectory}`, { code: 2 })
            return
        }
    }

    for (const [ index, url ] of enumerate(urls, 1)) {
        print(`☐ ${url}`, { end: '' })

        let response: Response
        try {
            response = await fetch(url)
        }
        catch {
            printError(`☒ ${url} - Network error fetching page URL`)
            continue
        }
        if (!response.ok) {
            printError(`☒ ${url} - Fetching page URL returned ${response.status}`)
            continue
        }

        let text: string
        try {
            text = await response.text()
        }
        catch {
            printError(`☒ ${url} - Error decoding response text`)
            continue
        }

        const filename = text.match(/class="filename">(.+?)</)?.[1]
        if (filename === undefined) {
            printError(`☒ ${url} - Could not find filename in HTML`)
            continue
        }

        const downloadUrl = text.match(/"Download file"\s+href="(.+?)"/)?.[1]
        if (downloadUrl === undefined) {
            printError(`☒ ${url} - Could not find download URL in HTML`)
            continue
        }

        const outputPath = path.join(outputDirectory, filename)
        print(`☐ ${url} -> "${outputPath}"`, { end: '', clear: false })

        try {
            response = await fetch(downloadUrl)
        }
        catch {
            printError(`☒ ${url} -> "${outputPath}" - Network error fetching download URL`)
            continue
        }
        if (!response.ok) {
            printError(`☒ ${url} -> "${outputPath}" - Fetching download URL returned ${response.status}`)
            continue
        }

        let outputStream: Writable
        try {
            outputStream = await createWriteStream(outputPath)
        }
        catch (exception) {
            printError(`☒ ${url} -> "${outputPath}" - ${exception.code} error opening output file`)
            continue
        }

        try {
            await pipeStream(response.body, outputStream)
        }
        catch {
            printError(`☒ ${url} -> "${outputPath}" - Error writing response data`)
            continue
        }

        print(`🗹 ${url} -> "${outputPath}"`)

        if (index !== urls.length) {
            await sleep(sleepMs)
        }
    }
}


main()
