const request = require('../lib/request')

const assert = require('assert')

describe('request', () => {
    describe('#fetch()', () => {
        it('must fetch http request', async() => {
            const tran = await request.fetch('http://httpbin.org/get')

            const { responseBody } = tran

            const { url } = JSON.parse(responseBody.toString())

            assert.equal(url, 'https://httpbin.org/get') // NOTE: bug in httpbin
        })

        it('must fetch https request', async() => {
            const tran = await request.fetch('https://httpbin.org/get')

            const { responseBody } = tran

            const { url } = JSON.parse(responseBody.toString())

            assert.equal(url, 'https://httpbin.org/get')
        })

        it('must not download body', async() => {
            const tran = await request.fetch('http://httpbin.org/get', {}, { download: false })

            const { responseBody } = tran

            assert.equal(responseBody.length, 0)
        })

        it('must redirect', async() => {
            const tran = await request.fetch('https://httpbin.org/status/302', {}, { follow: true })

            const { responseCode } = tran

            assert.equal(responseCode, 200)
        })
    })

    describe('#request', () => {
        it('must not download body', async() => {
            const tran = await request.request({ method: 'GET', uri: 'http://httpbin.org/get', download: false })

            const { responseBody } = tran

            assert.equal(responseBody.length, 0)
        })

        it('must redirect', async() => {
            const tran = await request.request({ method: 'GET', uri: 'https://httpbin.org/status/302', follow: true })

            const { responseCode } = tran

            assert.equal(responseCode, 200)
        })
    })
})
