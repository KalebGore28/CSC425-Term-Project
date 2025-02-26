import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
// import { staticPlugin } from '@elysiajs/static'
// import path from 'path'

import { testRoute } from './routes/testRoute'

import { oAuthRoute } from './routes/oauth'

export const app = new Elysia({ aot: false })
    // .use(staticPlugin({
    //     assets: path.join(__dirname, '../../app/dist'),
    //     prefix: '/',
    //     indexHTML: true
    // }))

    // API Routes
    .use(swagger({
        path: '/docs',
        documentation: {
            info: {
                title: "EventFlow API Documentation",
                version: "0.0.1"
            }
        }
    }))
    .use(oAuthRoute)
    .use(testRoute)
