// src/app.ts
import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'

export const app = new Elysia({ aot: false })
	.use(swagger())
	.get('/', 'Hello World!')