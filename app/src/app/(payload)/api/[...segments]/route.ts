import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'
import { NextRequest } from 'next/server'
import config from '@payload-config'

type RestHandler = (req: NextRequest, args: { params: { segments: string[] } }) => Promise<Response>
type AsyncParams = { params: Promise<{ segments: string[] }> }

function wrap(handler: RestHandler) {
  return async (req: NextRequest, args: AsyncParams) => {
    const params = await args.params
    return handler(req, { params })
  }
}

export const GET = wrap(REST_GET(config))
export const POST = wrap(REST_POST(config))
export const DELETE = wrap(REST_DELETE(config))
export const PATCH = wrap(REST_PATCH(config))
export const PUT = wrap(REST_PUT(config))
export const OPTIONS = wrap(REST_OPTIONS(config))
