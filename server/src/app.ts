import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { staticPlugin } from '@elysiajs/static'
import path from 'path'

import { oAuthRoute } from './routes/oauth'

export const app = new Elysia({ aot: false })
    // .use(staticPlugin({
    //     assets: path.join(__dirname, '../../app/dist'),
    //     prefix: '/',
    //     indexHTML: true
    // }))

    // API Routes
    .use(swagger())
    .use(oAuthRoute)
