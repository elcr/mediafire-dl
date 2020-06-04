import { ArgumentParser } from 'argparse'
import packageJSON from '../package.json'


type CommandLineArguments = {
    commandLineUrls: ReadonlyArray<string>
    outputDirectory: string
    sleepMs: number
    input: string | null
}


export function parseCommandLineArguments(): CommandLineArguments {
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
