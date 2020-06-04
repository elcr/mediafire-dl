import 'source-map-support/register'

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { Readable, Writable } from 'stream'

import fetch, { Response } from 'node-fetch'
import { ArgumentParser } from 'argparse'

import packageJSON from '../package.json'


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


function printError(message: string, exitCode: 0 | 1 | 2 = 1) {
    console.error(message)
    process.exitCode = exitCode
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
    pipe: (destination: Writable) => Writable
    on: (event: 'end', callback: () => void) => void
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
            printError(`${exception.code} error opening input file: ${input}`, 2)
            return
        }
        urls = await readLinesToArray(stream)
    }
    else if (commandLineUrls.length === 0) {
        printError(`URL(s) required when not using '--input'`, 2)
        return
    }

    if (!Number.isSafeInteger(sleepMs) || sleepMs < 0) {
        printError(`Sleep milliseconds value must be a positive integer`, 2)
        return
    }

    try {
        await mkdir(outputDirectory)
    }
    catch (exception) {
        if (exception.code !== 'EEXIST') {
            printError(`${exception.code} error trying to make directory: ${outputDirectory}`, 2)
            return
        }
    }

    for (const [ index, url ] of enumerate(urls, 1)) {
        let response: Response
        try {
            response = await fetch(url)
        }
        catch {
            printError(`Network error fetching page URL: ${url}`)
            continue
        }
        if (!response.ok) {
            printError(`Fetching page URL returned ${response.status}: ${url}`)
            continue
        }

        let text: string
        try {
            text = await response.text()
        }
        catch {
            printError(`Error decoding response text: ${url}`)
            continue
        }

        const filename = text.match(/class="filename">(.+?)</)?.[1]
        if (filename === undefined) {
            printError(`Could not find filename in HTML: ${url}`)
            continue
        }

        const downloadUrl = text.match(/"Download file"\s+href="(.+?)"/)?.[1]
        if (downloadUrl === undefined) {
            printError(`Could not find download URL in HTML: ${url}`)
            continue
        }

        try {
            response = await fetch(downloadUrl)
        }
        catch {
            printError(`Network error fetching download URL: ${downloadUrl}`)
            continue
        }
        if (!response.ok) {
            printError(`Fetching download URL returned ${response.status}: ${downloadUrl}`)
            continue
        }

        const outputPath = path.join(outputDirectory, filename)

        let outputStream: Writable
        try {
            outputStream = await createWriteStream(outputPath)
        }
        catch (exception) {
            printError(`${exception.code} error opening output file: ${outputPath}`)
            continue
        }

        try {
            await pipeStream(response.body, outputStream)
        }
        catch {
            printError(`Error writing response data: ${outputPath}`)
            continue
        }

        console.log(outputPath)

        if (index !== urls.length) {
            await sleep(sleepMs)
        }
    }
}


main()
