import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { staticPlugin } from '@elysiajs/static'
import path from 'path'


export const app = new Elysia({ aot: false })
    .use(swagger())
    .use(staticPlugin({
        assets: path.join(__dirname, '../../app/dist'),
        prefix: '/',
        indexHTML: true
    }))