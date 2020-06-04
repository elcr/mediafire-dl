type PrintArguments = {
    stream?: NodeJS.WriteStream
    end?: string
    clear?: boolean
}


export function print(message: string, { stream = process.stdout, end = '\n', clear = true }: PrintArguments = {}) {
    if (clear) {
        stream.clearLine(0)
    }
    stream.cursorTo(0)
    stream.write(message + end)
}


type PrintErrorArguments = {
    code?: 0 | 1 | 2
}


export function printError(message: string, { code = 1 }: PrintErrorArguments = {}) {
    print(message, { stream: process.stderr, clear: false })
    process.exitCode = code
}


export function * enumerate<T>(iterator: Iterable<T>, start = 0, step = 1): Iterable<[ number, T ]> {
    let index = start
    for (const item of iterator) {
        yield [ index, item ]
        index += step
    }
}


export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
