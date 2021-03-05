[![Follow on Twitter](https://img.shields.io/twitter/follow/pownjs.svg?logo=twitter)](https://twitter.com/pownjs)
![NPM](https://img.shields.io/npm/v/@pown/request.svg)
[![Fury](https://img.shields.io/badge/version-2x%20Fury-red.svg)](https://github.com/pownjs/lobby)
![default workflow](https://github.com/pownjs/leaks/actions/workflows/default.yaml/badge.svg)
[![SecApps](https://img.shields.io/badge/credits-SecApps-black.svg)](https://secapps.com)

# Pown Request

This is a simple library and pownjs command for performing requests. The module comes with its own Scheduler.

## Credits

This tool is part of [secapps.com](https://secapps.com) open-source initiative.

```
  ___ ___ ___   _   ___ ___  ___
 / __| __/ __| /_\ | _ \ _ \/ __|
 \__ \ _| (__ / _ \|  _/  _/\__ \
 |___/___\___/_/ \_\_| |_|  |___/
  https://secapps.com
```

### Authors

* [@pdp](https://twitter.com/pdp) - https://pdparchitect.github.io/www/

## Quickstart

This tool is meant to be used as part of [Pown.js](https://github.com/pownjs/pown), but it can be invoked separately as an independent tool.

Install Pown first as usual:

```sh
$ npm install -g pown@latest
```

Install request:

```sh
$ pown modules install @pown/request
```

Invoke directly from Pown:

```sh
$ pown request
```

### Standalone Use

Install this module locally from the root of your project:

```sh
$ npm install @pown/request --save
```

Once done, invoke pown cli:

```sh
$ POWN_ROOT=. ./node_modules/.bin/pown-cli request
```

You can also use the global pown to invoke the tool locally:

```sh
$ POWN_ROOT=. pown request
```

## Usage

> **WARNING**: This pown command is currently under development and as a result will be subject to breaking changes.

```
pown-cli request [url]

Send requests

Options:
  --version                                                                   Show version number  [boolean]
  --help                                                                      Show help  [boolean]
  --url-prefix                                                                Add prefix to each url  [string]
  --url-suffix                                                                Add suffix to each url  [string]
  --filter-response-code, --response-code, --code, --filter-status, --status  Filter responses with code  [string] [default: ""]
  --content-sniff-size, --content-sniff, --sniff, --sniff-size                Specify the size of the content sniff  [number] [default: 5]
  --print                                                                     Print response body  [boolean] [default: false]
  --download, --output                                                        Download response body  [boolean] [default: false]
  --method, -X                                                                Custom method  [string]
  --header, -H                                                                Custom header  [string]
  --accept-unauthorized, -k, --insecure                                       Accept unauthorized TLS errors  [boolean] [default: false]
  --request-concurrency, -c                                                   The number of requests to send at the same time  [number] [default: Infinity]
  --task-concurrency, -C                                                      The number of request tasks to run at the same time  [number] [default: Infinity]
```
