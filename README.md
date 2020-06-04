# mediafire-dl

Commandline tool to download files from [Mediafire](https://www.mediafire.com/).


## Installation

If you have Node installed, you can just save and run [the file in `dist`](https://github.com/elcr/mediafire-dl/blob/master/dist/index.js). It has no dependencies. It should run on all the [currently supported versions of Node](https://en.wikipedia.org/wiki/Node.js#Releases) as of 2020, although I've only tried it on version 13.

If you don't have Node installed, you can try the standalone binaries [on the Releases page](https://github.com/elcr/mediafire-dl/releases). I don't use them myself so your mileage may vary.

## Usage
See `mediafire-dl --help` for the full usage. Here's some examples.

Download files to the working directory:
```
mediafire-dl https://www.mediafire.com/file/some-file https://www.mediafire.com/file/some-other-file
```

Download to a different directory:
```
mediafire-dl --output-directory ~/Downloads https://www.mediafire.com/file/some-file https://www.mediafire.com/file/some-other-file
```

Instead of passing URLs directly, read them from some other file:
```
mediafire-dl --input ~/Documents/mediafire-urls.txt
```

Read URLs from `stdin`:
```
mediafire-dl --input -
```
