const url = require('url')
const util = require('util')
const http = require('http')
const zlib = require('zlib')
const https = require('https')
const isGzip = require('is-gzip')
const isDeflate = require('is-deflate')
const performanceNow = require('performance-now')

const EMPTY_OBJECT = Object.freeze({})
const EMPTY_BUFFER = Buffer.alloc(0)

const getHeader = (headers, search) => {
    search = search.toLocaleLowerCase()

    for (let [name, value] of Object.entries(headers)) {
        if (name.toLocaleLowerCase() == search) {
            if (Array.isArray(value)) {
                return value[0]
            }
            else {
                return value
            }
        }
    }
}

let gunzipAsync

try {
    gunzipAsync = util.promisify(zlib.gunzip.bind(zlib))
}
catch (e) {
    gunzipAsync = (input) => input
}

let deflateAsync

try {
    deflateAsync = util.promisify(zlib.deflate.bind(zlib))
}
catch (e) {
    deflateAsync = (input) => input
}

let brotliDecompressAsync

try {
    brotliDecompressAsync = util.promisify(zlib.brotliDecompress.bind(zlib))
}
catch (e) {
    brotliDecompressAsync = (input) => input
}

const transport = {
    'http:': http,
    'https:': https
}

const requestCleanup = async(req) => {
    // NOTE: force socket closure just in case

    try {
        req.socket.destroy()
    }
    catch (e) {
        // pass
    }
}

const maybeUnzip = async(buf, headers) => {
    try {
        // NOTE: guard against acidental problems as the method does not ensure decompression

        const contentEncoding = (getHeader(headers, 'content-encoding') || '').toLowerCase().trim()

        switch (contentEncoding) {
            case 'gzip':
                return await gunzipAsync(buf)

            case 'deflate':
                return await deflateAsync(buf)

            case 'br':
                return await brotliDecompressAsync(buf)
        }

        if (isGzip(buf)) {
            return await gunzipAsync(buf)
        }
        else
        if (isDeflate(buf)) {
            return await deflateAsync(buf)
        }
    }
    catch (e) {
        if (process.env.NODE_ENV !== 'production') {
            console.error(e)
        }
    }

    return buf
}

const requestInternal = (request, resolve) => {
    const { type = 'base', method = 'GET', uri, version = 'HTTP/1.1', headers: _headers = EMPTY_OBJECT, body, info, timeout = 30000, follow = false, download = true, correctHeaders = true, rejectUnauthorized = true, ...rest } = request

    const headers = { ..._headers }

    if (body && body.length) {
        if (correctHeaders && !getHeader(headers, 'transfer-encoding') && !getHeader(headers, 'content-length')) {
            headers['content-length'] = body.length
        }
    }

    const now = performanceNow()

    const transaction = {
        type,

        method,
        uri,
        version,
        headers,
        body,

        responseVersion: version,
        responseCode: 0,
        responseMessage: '',
        responseHeaders: EMPTY_OBJECT,
        responseBody: EMPTY_BUFFER,

        info: {
            ...info,

            startTime: now,
            stopTime: now
        }
    }

    const options = {
        ...rest,

        ...url.parse(uri),

        method,
        headers,

        rejectUnauthorized
    }

    const responseBodyDataChunks = []

    if (!transport[options.protocol]) {
        throw new Error(`Unsupported transport ${options.protocol}`)
    }

    const req = transport[options.protocol].request(options)

    let connectTimeout

    if (timeout) {
        req.setTimeout(timeout)

        connectTimeout = setTimeout(() => {
            req.emit('timeout')
        }, timeout)
    }

    req.on('response', async(res) => {
        clearTimeout(connectTimeout)

        if (follow && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.destroy()

            await requestCleanup(req)

            requestInternal({ ...request, uri: url.resolve(transaction.uri, res.headers.location) }, resolve)

            return
        }

        transaction.responseCode = res.statusCode
        transaction.responseMessage = res.statusMessage
        transaction.responseHeaders = res.headers

        if (!download) {
            res.destroy()

            await requestCleanup(req)

            transaction.info.stopTime = performanceNow()
            transaction.responseBody = EMPTY_BUFFER

            resolve(transaction)

            return
        }

        res.on('timeout', async(error) => {
            error = error || new Error(`Timeout`)

            await requestCleanup(req)

            transaction.info.error = error
            transaction.info.stopTime = performanceNow()
            transaction.responseBody = await maybeUnzip(Buffer.concat(responseBodyDataChunks), transaction.responseHeaders || {})

            resolve(transaction)
        })

        res.on('aborted', async(error) => {
            error = error || new Error(`Aborted`)

            await requestCleanup(req)

            transaction.info.error = error
            transaction.info.stopTime = performanceNow()
            transaction.responseBody = await maybeUnzip(Buffer.concat(responseBodyDataChunks), transaction.responseHeaders || {})

            resolve(transaction)
        })

        res.on('abort', async(error) => {
            error = error || new Error(`Abort`)

            await requestCleanup(req)

            transaction.info.error = error
            transaction.info.stopTime = performanceNow()
            transaction.responseBody = await maybeUnzip(Buffer.concat(responseBodyDataChunks), transaction.responseHeaders || {})

            resolve(transaction)
        })

        res.on('error', async(error) => {
            error = error || new Error(`Error`)

            await requestCleanup(req)

            transaction.info.error = error
            transaction.info.stopTime = performanceNow()
            transaction.responseBody = await maybeUnzip(Buffer.concat(responseBodyDataChunks), transaction.responseHeaders || {})

            resolve(transaction)
        })

        let dataTimeout

        dataTimeout = setTimeout(() => {
            res.emit('timeout')
        }, timeout)

        res.on('data', (data) => {
            clearTimeout(dataTimeout)

            responseBodyDataChunks.push(data)

            dataTimeout = setTimeout(() => {
                res.emit('timeout')
            }, timeout)
        })

        res.on('end', async() => {
            clearTimeout(dataTimeout)

            await requestCleanup(req)

            transaction.info.stopTime = performanceNow()
            transaction.responseBody = await maybeUnzip(Buffer.concat(responseBodyDataChunks), transaction.responseHeaders)

            resolve(transaction)
        })
    })

    req.on('timeout', async(error) => {
        clearTimeout(connectTimeout)

        error = error || new Error(`Timeout`)

        await requestCleanup(req)

        transaction.info.error = error
        transaction.info.stopTime = performanceNow()
        transaction.responseBody = await maybeUnzip(Buffer.concat(responseBodyDataChunks), transaction.responseHeaders || {})

        resolve(transaction)
    })

    req.on('aborted', async(error) => {
        clearTimeout(connectTimeout)

        error = error || new Error(`Aborted`)

        await requestCleanup(req)

        transaction.info.error = error
        transaction.info.stopTime = performanceNow()
        transaction.responseBody = await maybeUnzip(Buffer.concat(responseBodyDataChunks), transaction.responseHeaders || {})

        resolve(transaction)
    })

    req.on('abort', async(error) => {
        clearTimeout(connectTimeout)

        error = error || new Error(`Abort`)

        await requestCleanup(req)

        transaction.info.error = error
        transaction.info.stopTime = performanceNow()
        transaction.responseBody = await maybeUnzip(Buffer.concat(responseBodyDataChunks), transaction.responseHeaders || {})

        resolve(transaction)
    })

    req.on('error', async(error) => {
        clearTimeout(connectTimeout)

        error = error || new Error(`Error`)

        await requestCleanup(req)

        transaction.info.error = error
        transaction.info.stopTime = performanceNow()
        transaction.responseBody = await maybeUnzip(Buffer.concat(responseBodyDataChunks), transaction.responseHeaders || {})

        resolve(transaction)
    })

    req.end(body)
}

const request = (request) => new Promise((resolve, reject) => {
    try {
        // all paths are happy paths

        requestInternal(request, resolve)
    }
    catch (e) {
        reject(e)
    }
})

module.exports = { request }
