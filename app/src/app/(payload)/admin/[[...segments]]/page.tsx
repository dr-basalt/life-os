import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '@/app/importMap'
import configPromise from '@payload-config'

type Props = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

export const generateMetadata = (props: Props) =>
  generatePageMetadata({ config: configPromise, ...props })

export default function Page(props: Props) {
  return RootPage({ config: configPromise, importMap, ...props })
}
