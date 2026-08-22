/*
# Add background styling columns to farm_profile

Adds brightness, overlay opacity, and blur effect columns for both
login and dashboard background images. All nullable with sensible defaults
applied in the application layer.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farm_profile' AND column_name = 'login_bg_brightness') THEN
    ALTER TABLE farm_profile ADD COLUMN login_bg_brightness real;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farm_profile' AND column_name = 'login_bg_overlay') THEN
    ALTER TABLE farm_profile ADD COLUMN login_bg_overlay real;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farm_profile' AND column_name = 'login_bg_blur') THEN
    ALTER TABLE farm_profile ADD COLUMN login_bg_blur real;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farm_profile' AND column_name = 'dashboard_bg_brightness') THEN
    ALTER TABLE farm_profile ADD COLUMN dashboard_bg_brightness real;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farm_profile' AND column_name = 'dashboard_bg_overlay') THEN
    ALTER TABLE farm_profile ADD COLUMN dashboard_bg_overlay real;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farm_profile' AND column_name = 'dashboard_bg_blur') THEN
    ALTER TABLE farm_profile ADD COLUMN dashboard_bg_blur real;
  END IF;
END $$;
