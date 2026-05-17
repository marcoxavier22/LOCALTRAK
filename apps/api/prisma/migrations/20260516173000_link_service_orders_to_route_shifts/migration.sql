ALTER TABLE "service_orders"
ADD COLUMN IF NOT EXISTS "route_shift_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "service_orders_route_shift_id_key"
ON "service_orders"("route_shift_id");

CREATE INDEX IF NOT EXISTS "service_orders_route_shift_id_idx"
ON "service_orders"("route_shift_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_orders_route_shift_id_fkey'
  ) THEN
    ALTER TABLE "service_orders"
    ADD CONSTRAINT "service_orders_route_shift_id_fkey"
    FOREIGN KEY ("route_shift_id")
    REFERENCES "route_shifts"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
