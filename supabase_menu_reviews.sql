-- DeliveryPick 메뉴별 통합 리뷰 마이그레이션
-- Supabase SQL Editor에서 한 번 실행하세요.

-- 별점 UI는 0.5점 단위를 사용하므로 정수형 컬럼을 소수형으로 변경한다.
ALTER TABLE public.deliveries
  ALTER COLUMN rating TYPE NUMERIC(2,1) USING rating::NUMERIC(2,1);

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_rating_range;
ALTER TABLE public.deliveries
  ADD CONSTRAINT deliveries_rating_range CHECK (rating >= 0.5 AND rating <= 5.0);

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS root_delivery_id UUID
  REFERENCES public.deliveries(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS deliveries_root_delivery_id_created_at_idx
  ON public.deliveries(root_delivery_id, created_at DESC);

-- 기존 게시물: 카카오 장소 ID 우선, 없으면 공백 제거 가게명+지역 기준으로 최초 게시물을 찾는다.
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY COALESCE(
        NULLIF(kakao_place_id, ''),
        lower(regexp_replace(name, '\s+', '', 'g')) || '|' || COALESCE(sido, '') || '|' || COALESCE(sigungu, '')
      )
      ORDER BY created_at ASC, id ASC
    ) AS first_id,
    row_number() OVER (
      PARTITION BY COALESCE(
        NULLIF(kakao_place_id, ''),
        lower(regexp_replace(name, '\s+', '', 'g')) || '|' || COALESCE(sido, '') || '|' || COALESCE(sigungu, '')
      )
      ORDER BY created_at ASC, id ASC
    ) AS position
  FROM public.deliveries
  WHERE root_delivery_id IS NULL
)
UPDATE public.deliveries AS d
SET root_delivery_id = ranked.first_id
FROM ranked
WHERE d.id = ranked.id AND ranked.position > 1;

-- 후속 리뷰는 최초 등록자가 만든 메뉴명만 저장할 수 있다.
CREATE OR REPLACE FUNCTION public.enforce_canonical_review_menu()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  canonical_price INTEGER;
  canonical_menu_exists BOOLEAN;
BEGIN
  SELECT root_menu.price, true
  INTO canonical_price, canonical_menu_exists
  FROM deliveries child
  JOIN delivery_menus root_menu ON root_menu.delivery_id = child.root_delivery_id
  WHERE child.id = NEW.delivery_id AND root_menu.name = NEW.name
  LIMIT 1;

  IF EXISTS (SELECT 1 FROM deliveries WHERE id = NEW.delivery_id AND root_delivery_id IS NOT NULL) THEN
    IF NOT COALESCE(canonical_menu_exists, false) THEN
      RAISE EXCEPTION '최초 등록자가 등록한 메뉴만 리뷰할 수 있습니다.';
    END IF;
    NEW.price := canonical_price;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_canonical_menu_on_review ON public.delivery_menus;
CREATE TRIGGER enforce_canonical_menu_on_review
BEFORE INSERT OR UPDATE ON public.delivery_menus
FOR EACH ROW EXECUTE FUNCTION public.enforce_canonical_review_menu();

NOTIFY pgrst, 'reload schema';
