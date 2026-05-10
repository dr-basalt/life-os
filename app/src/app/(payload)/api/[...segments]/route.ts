import { handlePayload } from '@payloadcms/next/utilities'
import { NextRequest } from 'next/server'
import configPromise from '@payload-config'

type Params = Promise<{ segments: string[] }>

async function handler(req: NextRequest, { params }: { params: Params }) {
  const resolvedParams = await params
  return handlePayload(req, configPromise, resolvedParams.segments)
}

export const GET = handler
export const POST = handler
export const DELETE = handler
export const PATCH = handler
export const PUT = handler
export const OPTIONS = handler
