import 'source-map-support/register'

import path from 'path'
import { Readable, Writable } from 'stream'

import fetch, { Response } from 'node-fetch'

import { print, printError, enumerate, sleep } from './utils'
import {
    readLinesToArray,
    createReadStream,
    mkdir,
    createWriteStream,
    pipeStream
} from './fileSystem'
import { parseCommandLineArguments } from './cli'


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
