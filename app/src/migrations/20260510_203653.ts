import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_users_role" AS ENUM('admin', 'agent', 'viewer');
  CREATE TYPE "payload"."enum_objectives_type" AS ENUM('life', 'business', 'health', 'product', 'learning');
  CREATE TYPE "payload"."enum_objectives_status" AS ENUM('active', 'completed', 'paused', 'abandoned');
  CREATE TYPE "payload"."enum_key_results_type" AS ENUM('numeric', 'boolean', 'milestone');
  CREATE TYPE "payload"."enum_key_results_status" AS ENUM('on_track', 'at_risk', 'behind', 'completed');
  CREATE TYPE "payload"."enum_tasks_status" AS ENUM('todo', 'in_progress', 'done', 'cancelled', 'waiting');
  CREATE TYPE "payload"."enum_tasks_energy_level" AS ENUM('low', 'medium', 'high');
  CREATE TYPE "payload"."enum_victories_type" AS ENUM('milestone', 'habit', 'insight', 'delivery', 'relationship');
  CREATE TYPE "payload"."enum_victories_impact" AS ENUM('small', 'medium', 'large', 'epic');
  CREATE TYPE "payload"."enum_data_gates_type" AS ENUM('api', 'git', 'obsidian', 'syncthing', 'server', 'saas', 'rss', 'webhook');
  CREATE TYPE "payload"."enum_data_gates_status" AS ENUM('active', 'paused', 'error', 'pending');
  CREATE TYPE "payload"."enum_ui_schemas_layout" AS ENUM('dashboard', 'list', 'detail', 'form', 'graph', 'fullscreen');
  CREATE TABLE IF NOT EXISTS "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "payload"."enum_users_role" DEFAULT 'admin',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."objectives" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"type" "payload"."enum_objectives_type" DEFAULT 'business',
  	"status" "payload"."enum_objectives_status" DEFAULT 'active',
  	"okr_cycle" varchar,
  	"deadline" timestamp(3) with time zone,
  	"confidence" numeric,
  	"emoji" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."key_results" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"objective_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"type" "payload"."enum_key_results_type" DEFAULT 'numeric',
  	"unit" varchar,
  	"current_value" numeric,
  	"target_value" numeric,
  	"baseline_value" numeric,
  	"confidence" numeric,
  	"status" "payload"."enum_key_results_status" DEFAULT 'on_track',
  	"due_date" timestamp(3) with time zone,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."tasks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"status" "payload"."enum_tasks_status" DEFAULT 'todo',
  	"priority" numeric,
  	"energy_level" "payload"."enum_tasks_energy_level",
  	"estimated_minutes" numeric,
  	"due_date" timestamp(3) with time zone,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."victories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"type" "payload"."enum_victories_type" DEFAULT 'milestone',
  	"impact" "payload"."enum_victories_impact" DEFAULT 'medium',
  	"date" timestamp(3) with time zone NOT NULL,
  	"description" varchar,
  	"objective_id" integer,
  	"key_result_id" integer,
  	"emoji" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."data_gates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "payload"."enum_data_gates_type" NOT NULL,
  	"status" "payload"."enum_data_gates_status" DEFAULT 'pending',
  	"url" varchar,
  	"description" varchar,
  	"last_sync" timestamp(3) with time zone,
  	"sync_interval_minutes" numeric,
  	"config" jsonb,
  	"error_message" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."ui_schemas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"page_id" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"intent" varchar,
  	"layout" "payload"."enum_ui_schemas_layout" DEFAULT 'dashboard',
  	"widgets" jsonb,
  	"version" varchar DEFAULT '1.0.0',
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"objectives_id" integer,
  	"key_results_id" integer,
  	"tasks_id" integer,
  	"victories_id" integer,
  	"data_gates_id" integer,
  	"ui_schemas_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  DO $$ BEGIN
   ALTER TABLE "payload"."key_results" ADD CONSTRAINT "key_results_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "payload"."objectives"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."victories" ADD CONSTRAINT "victories_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "payload"."objectives"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."victories" ADD CONSTRAINT "victories_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "payload"."key_results"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_objectives_fk" FOREIGN KEY ("objectives_id") REFERENCES "payload"."objectives"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_key_results_fk" FOREIGN KEY ("key_results_id") REFERENCES "payload"."key_results"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tasks_fk" FOREIGN KEY ("tasks_id") REFERENCES "payload"."tasks"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_victories_fk" FOREIGN KEY ("victories_id") REFERENCES "payload"."victories"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_data_gates_fk" FOREIGN KEY ("data_gates_id") REFERENCES "payload"."data_gates"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ui_schemas_fk" FOREIGN KEY ("ui_schemas_id") REFERENCES "payload"."ui_schemas"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE INDEX IF NOT EXISTS "objectives_updated_at_idx" ON "payload"."objectives" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "objectives_created_at_idx" ON "payload"."objectives" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "key_results_objective_idx" ON "payload"."key_results" USING btree ("objective_id");
  CREATE INDEX IF NOT EXISTS "key_results_updated_at_idx" ON "payload"."key_results" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "key_results_created_at_idx" ON "payload"."key_results" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "tasks_updated_at_idx" ON "payload"."tasks" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "tasks_created_at_idx" ON "payload"."tasks" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "victories_objective_idx" ON "payload"."victories" USING btree ("objective_id");
  CREATE INDEX IF NOT EXISTS "victories_key_result_idx" ON "payload"."victories" USING btree ("key_result_id");
  CREATE INDEX IF NOT EXISTS "victories_updated_at_idx" ON "payload"."victories" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "victories_created_at_idx" ON "payload"."victories" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "data_gates_updated_at_idx" ON "payload"."data_gates" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "data_gates_created_at_idx" ON "payload"."data_gates" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "ui_schemas_page_id_idx" ON "payload"."ui_schemas" USING btree ("page_id");
  CREATE INDEX IF NOT EXISTS "ui_schemas_updated_at_idx" ON "payload"."ui_schemas" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "ui_schemas_created_at_idx" ON "payload"."ui_schemas" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_objectives_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("objectives_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_key_results_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("key_results_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_tasks_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("tasks_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_victories_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("victories_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_data_gates_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("data_gates_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_ui_schemas_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("ui_schemas_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX IF NOT EXISTS "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."objectives" CASCADE;
  DROP TABLE "payload"."key_results" CASCADE;
  DROP TABLE "payload"."tasks" CASCADE;
  DROP TABLE "payload"."victories" CASCADE;
  DROP TABLE "payload"."data_gates" CASCADE;
  DROP TABLE "payload"."ui_schemas" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TYPE "payload"."enum_users_role";
  DROP TYPE "payload"."enum_objectives_type";
  DROP TYPE "payload"."enum_objectives_status";
  DROP TYPE "payload"."enum_key_results_type";
  DROP TYPE "payload"."enum_key_results_status";
  DROP TYPE "payload"."enum_tasks_status";
  DROP TYPE "payload"."enum_tasks_energy_level";
  DROP TYPE "payload"."enum_victories_type";
  DROP TYPE "payload"."enum_victories_impact";
  DROP TYPE "payload"."enum_data_gates_type";
  DROP TYPE "payload"."enum_data_gates_status";
  DROP TYPE "payload"."enum_ui_schemas_layout";`)
}
