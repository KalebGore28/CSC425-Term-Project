import { Elysia } from 'elysia'
import { createQwikCity } from '@builder.io/qwik-city/middleware/node'
import qwikCityPlan from '@qwik-city-plan' // Auto-generated Qwik City routes
import render from '../../../app/server/entry.ssr' // Qwik SSR entry (Cloudflare compatible)

export const qwikSsrPlugin = new Elysia().all('*', async ({ request, set }) => {
    const { router, notFound } = createQwikCity({
        render,
        qwikCityPlan,
        getOrigin: (req) => req.url, // ✅ Fix: Provide getOrigin
    })

    const response = await router(request)

    if (response) {
        return response
    } else {
        set.status = 404
        return 'Not Found'
    }
})