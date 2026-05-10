import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'
import { NextRequest } from 'next/server'

const configPromise = import('@payload-config')

// Wrapper: résout params async (Next.js 15) avant de passer au handler Payload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function awaitParams(handler: any) {
  return async (req: NextRequest, args: { params: Promise<{ segments: string[] }> }) => {
    const params = await args.params
    return handler(req, { params })
  }
}

export const GET = awaitParams(REST_GET(configPromise))
export const POST = awaitParams(REST_POST(configPromise))
export const DELETE = awaitParams(REST_DELETE(configPromise))
export const PATCH = awaitParams(REST_PATCH(configPromise))
export const PUT = awaitParams(REST_PUT(configPromise))
export const OPTIONS = awaitParams(REST_OPTIONS(configPromise))
