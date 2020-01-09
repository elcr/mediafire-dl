import 'source-map-support/register'

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

import { JSDOM } from 'jsdom'
import fetch, { Response } from 'node-fetch'
import { ArgumentParser } from 'argparse'


function * enumerate<T>(iterator: Iterable<T>) {
    let index = 0
    for (const item of iterator) {
        yield [ index, item ] as [ number, T ]
        index++
    }
}


function mkdir(path: string, options = { recursive: true }) {
    return new Promise<void>((resolve, reject) => {
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


function writeFile(path: string, data: Buffer) {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(path, data, error => {
            if (error === null) {
                resolve()
            }
            else {
                reject(error)
            }
        })
    })
}


function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms))
}


function printError(message: string, exitCode: 0 | 1 | 2 = 1) {
    console.error(message)
    process.exitCode = exitCode
}


function readLinesToArray(input: NodeJS.ReadableStream) {
    return new Promise<string[]>(resolve => {
        const reader = readline.createInterface({
            input,
            terminal: false
        })
        const lines: string[] = []
        reader.on('line', line => lines.push(line))
        reader.on('close', () => resolve(lines))
    })
}


function createReadStream(path: string, options = { encoding: 'utf-8' }) {
    return new Promise<fs.ReadStream>((resolve, reject) => {
        const stream = fs.createReadStream(path, options)
        stream.on('error', reject)
        stream.on('ready', () => resolve(stream))
    })
}


async function main() {
    const parser = new ArgumentParser({
        version: '0.1.0',
        prog: 'mediafire-dl'
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
    parser.addArgument('commandlineUrls', {
        nargs: '*',
        metavar: 'url'
    })

    type Arguments = {
        commandlineUrls: ReadonlyArray<string>
        outputDirectory: string
        sleepMs: number
        input: string | null
    }
    const {
        commandlineUrls,
        outputDirectory,
        sleepMs,
        input
    }: Arguments = parser.parseArgs()

    let urls = commandlineUrls
    if (input === '-') {
        urls = await readLinesToArray(process.stdin)
    }
    else if (input !== null) {
        let stream: fs.ReadStream
        try {
            stream = await createReadStream(input)
        }
        catch (exception) {
            printError(`${exception.code} error opening input file: ${input}`, 2)
            return
        }
        urls = await readLinesToArray(stream)
    }
    else if (commandlineUrls.length === 0) {
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

    for (const [ index, url ] of enumerate(urls)) {
        let response: Response
        try {
            response = await fetch(url)
        }
        catch {
            printError(`Network error fetching page URL: ${url}`)
            continue
        }
        if (!response.ok) {
            printError(`Fetching page URL returned ${response.status}: ${URL}`)
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

        let document: Document
        try {
            document = new JSDOM(text).window.document
        }
        catch {
            printError(`Error creating DOM from response text: ${url}`)
            continue
        }

        const filename = document.querySelector('.filename')
            ?.textContent
            ?? null
        if (filename === null) {
            printError(`Could not find filename in HTML: ${url}`)
            continue
        }

        const downloadUrl = document.querySelector('#download_link .input')
            ?.getAttribute('href')
            ?? null
        if (downloadUrl === null) {
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

        let data: Buffer
        try {
            data = await response.buffer()
        }
        catch {
            printError(`Error getting response data: ${downloadUrl}`)
            continue
        }

        const outputPath = path.join(outputDirectory, filename)
        try {
            await writeFile(outputPath, data)
        }
        catch (exception) {
            printError(`${exception.code} error trying to write file: ${outputPath}`)
            continue
        }

        console.log(outputPath)

        if (index + 1 !== urls.length) {
            await sleep(sleepMs)
        }
    }
}


if (require.main === module) {
    main()
}
