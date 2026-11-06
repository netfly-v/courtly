-- CreateEnum
CREATE TYPE "role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "sport" AS ENUM ('PADEL', 'TENNIS', 'SQUASH', 'PICKLEBALL', 'BADMINTON');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "sport" "sport" NOT NULL,
    "hourly_price_cents" INTEGER NOT NULL,
    "open_hour" SMALLINT NOT NULL,
    "close_hour" SMALLINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "court_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "total_price_cents" INTEGER NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'ACTIVE',
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "bookings_court_id_starts_at_idx" ON "bookings"("court_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_starts_at_idx" ON "bookings"("starts_at");

-- CreateIndex
CREATE INDEX "bookings_user_id_starts_at_idx" ON "bookings"("user_id", "starts_at");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Written by hand: rules the Prisma schema cannot express.

-- Lets a GiST index compare plain columns like court_id with "=".
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "courts"
  ADD CONSTRAINT "courts_opening_hours_check"
    CHECK ("open_hour" >= 0 AND "close_hour" <= 24 AND "open_hour" < "close_hour"),
  ADD CONSTRAINT "courts_hourly_price_check"
    CHECK ("hourly_price_cents" > 0);

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_duration_check"
    CHECK ("ends_at" - "starts_at" IN (INTERVAL '1 hour', INTERVAL '2 hours')),
  -- Compared in UTC so the result does not depend on the session time zone.
  ADD CONSTRAINT "bookings_starts_on_the_hour_check"
    CHECK (date_trunc('hour', "starts_at" AT TIME ZONE 'UTC') = "starts_at" AT TIME ZONE 'UTC'),
  ADD CONSTRAINT "bookings_total_price_check"
    CHECK ("total_price_cents" > 0),
  -- The double-booking guard: two active bookings of one court can't overlap.
  -- '[)' includes the start and excludes the end, so 10:00-11:00 and 11:00-12:00 can both exist.
  ADD CONSTRAINT "booking_no_overlap"
    EXCLUDE USING gist (
      "court_id" WITH =,
      tstzrange("starts_at", "ends_at", '[)') WITH &&
    ) WHERE ("status" = 'ACTIVE');
