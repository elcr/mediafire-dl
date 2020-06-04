import fs from 'fs'
import readline from 'readline'
import type { Readable, Writable } from 'stream'


export function mkdir(path: string, options = { recursive: true }): Promise<void> {
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


export function readLinesToArray(input: Readable): Promise<string[]> {
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


export function createReadStream(path: string, encoding = 'utf-8'): Promise<Readable> {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(path, encoding)
        stream.on('error', reject)
        stream.on('ready', () => resolve(stream))
    })
}


export function createWriteStream(path: string): Promise<Writable> {
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


export function pipeStream(input: Pipeable, output: Writable): Promise<void> {
    return new Promise(resolve => {
        input.pipe(output)
        input.on('end', resolve)
    })
}
