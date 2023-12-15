import { createServer } from 'node:http'
import fetch from 'node-fetch'

const PORT = process.env.PORT || 3000
const SECRET = process.env.SECRET || 'secret'
const server = createServer(async (req, res) => {
    const target = req.headers['__proxy-target']
    const secret = req.headers['__proxy-secret']
    const path = req.url
    console.log(`Proxying to ${target}; Path: ${path}; Secret: ${secret}`)
    if (secret !== SECRET) {
        res.statusCode = 403
        res.end('Proxy Forbidden')
        return
    }
    if (!target) {
        res.statusCode = 400
        res.end('Proxy Bad Request target not specified')
        return
    }
    try {
        const headers = { ...req.headers }
        delete headers.host
        delete headers['accept-encoding'] // You may need to handle compressions separately if required.
        delete headers['content-length'] // You may need to handle compressions separately if required.
        delete headers['__proxy-target']
        delete headers['__proxy-secret']

        let requestBody = []

        req.on('data', (chunk) => {
            requestBody.push(chunk)
        })

        req.on('end', async () => {
            const response = await fetch(target + path, {
                headers: headers,
                method: req.method,
                body: req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(requestBody) : undefined, // Forward body for POST, PUT, etc.
            })
            response.body.pipe(res)
        })
    } catch (e) {
        console.error(e)
        res.statusCode = 500
        res.end('Proxy Internal Server Error')
        return
    }
})

server.listen(PORT, () => console.log(`Listening on port ${PORT}`))
