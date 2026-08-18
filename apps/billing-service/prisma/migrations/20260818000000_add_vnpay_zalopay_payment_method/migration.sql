-- AlterEnum: Add VNPAY and ZALOPAY, remove CARD from PaymentMethod
-- Migration: add_vnpay_zalopay_payment_method

-- Step 1: Create new enum with all values
CREATE TYPE "PaymentMethod_new" AS ENUM ('CASH', 'VNPAY', 'ZALOPAY');

-- Step 2: Migrate existing column (CARD -> CASH as fallback, existing CASH stays)
ALTER TABLE "payment"
  ALTER COLUMN "payment_method" TYPE "PaymentMethod_new"
  USING (
    CASE "payment_method"::text
      WHEN 'CASH' THEN 'CASH'::"PaymentMethod_new"
      WHEN 'CARD' THEN 'CASH'::"PaymentMethod_new"
      ELSE 'CASH'::"PaymentMethod_new"
    END
  );

-- Step 3: Drop old enum and rename new one
DROP TYPE "PaymentMethod";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
