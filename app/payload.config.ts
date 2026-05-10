import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'

// Collections
import { Objectives } from './src/collections/Objectives'
import { KeyResults } from './src/collections/KeyResults'
import { Tasks } from './src/collections/Tasks'
import { Victories } from './src/collections/Victories'
import { DataGates } from './src/collections/DataGates'
import { UiSchemas } from './src/collections/UiSchemas'
import { Users } from './src/collections/Users'

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve('./src'),
    },
    meta: {
      titleSuffix: '— SternOS',
    },
  },
  collections: [
    Users,
    Objectives,
    KeyResults,
    Tasks,
    Victories,
    DataGates,
    UiSchemas,
  ],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || 'stern-os-secret-change-in-prod',
  typescript: {
    outputFile: path.resolve('./src/payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    schemaName: 'payload',
  }),
  cors: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://app.stern-os.ori3com.cloud',
  ],
})
