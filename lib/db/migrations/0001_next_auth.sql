-- Drop existing constraints and tables
ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_user_id_users_id_fk";
ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_user_id_users_id_fk";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_invited_by_users_id_fk";

-- Drop and recreate users table with new schema
DROP TABLE IF EXISTS "users" CASCADE;
CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY NOT NULL,
    "name" varchar(100),
    "email" varchar(255) NOT NULL,
    "email_verified" timestamp,
    "image" text,
    "role" varchar(20) DEFAULT 'member' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "deleted_at" timestamp,
    CONSTRAINT "users_email_unique" UNIQUE("email")
);

-- Create NextAuth.js tables
CREATE TABLE IF NOT EXISTS "accounts" (
    "user_id" text NOT NULL,
    "type" text NOT NULL,
    "provider" text NOT NULL,
    "provider_account_id" text NOT NULL,
    "refresh_token" text,
    "access_token" text,
    "expires_at" integer,
    "token_type" text,
    "scope" text,
    "id_token" text,
    "session_state" text,
    PRIMARY KEY ("provider", "provider_account_id"),
    CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "sessions" (
    "session_token" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "expires" timestamp NOT NULL,
    CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" text NOT NULL,
    "token" text NOT NULL,
    "expires" timestamp NOT NULL,
    PRIMARY KEY ("identifier", "token")
);

-- Update activity_logs table
ALTER TABLE "activity_logs" 
    DROP COLUMN IF EXISTS "timestamp",
    ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL,
    ALTER COLUMN "user_id" TYPE text,
    ALTER COLUMN "action" TYPE varchar(50),
    ALTER COLUMN "ip_address" TYPE varchar(50);

-- Update team_members table
ALTER TABLE "team_members" 
    ALTER COLUMN "user_id" TYPE text;

-- Update invitations table
ALTER TABLE "invitations" 
    ADD COLUMN IF NOT EXISTS "token" varchar(100) NOT NULL,
    ADD COLUMN IF NOT EXISTS "expires" timestamp NOT NULL,
    ADD COLUMN IF NOT EXISTS "accepted_at" timestamp,
    DROP COLUMN IF EXISTS "invited_by",
    DROP COLUMN IF EXISTS "invited_at",
    DROP COLUMN IF EXISTS "status",
    ADD CONSTRAINT "invitations_token_unique" UNIQUE("token");

-- Add foreign key constraints
ALTER TABLE "activity_logs" 
    ADD CONSTRAINT "activity_logs_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "team_members" 
    ADD CONSTRAINT "team_members_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
