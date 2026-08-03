-- ============================================================
-- DeliveryPick 스키마 설정 (모두 멱등 — 여러 번 실행해도 안전)
-- ============================================================

-- 1. deliveries: 작성자 닉네임
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS user_nickname text;

-- 2. deliveries: 지역 정보 (시/도 + 시/군/구)
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS sido text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS sigungu text;

-- 대표 메뉴 사진은 Storage의 객체 경로만 저장한다 (공개 URL/바이너리는 DB에 저장하지 않음)
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS image_path text;

-- 지역 기반 랜덤 추천("오늘 뭐 먹지?") 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS deliveries_region_idx ON public.deliveries (sido, sigungu);

-- 3. 닉네임 중복 검사용 RPC
CREATE OR REPLACE FUNCTION public.check_nickname_exists(input_nickname text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE LOWER(raw_user_meta_data->>'nickname') = LOWER(TRIM(input_nickname))
  );
END;
$$;

-- ============================================================
-- 4. delivery_menus: 맛집별 메뉴 (대표 1개 + 추가 최대 4개)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  name text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  is_representative boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS delivery_menus_delivery_id_idx
  ON public.delivery_menus (delivery_id);
CREATE INDEX IF NOT EXISTS delivery_menus_is_representative_idx
  ON public.delivery_menus (delivery_id, is_representative);

-- 대표 메뉴는 맛집당 정확히 1개만 (부분 유니크 인덱스)
CREATE UNIQUE INDEX IF NOT EXISTS delivery_menus_one_representative_idx
  ON public.delivery_menus (delivery_id)
  WHERE is_representative = true;

-- 메뉴는 맛집당 최대 5개 (지연 제약 트리거)
CREATE OR REPLACE FUNCTION public.enforce_max_five_menus()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.delivery_menus WHERE delivery_id = NEW.delivery_id) > 5 THEN
    RAISE EXCEPTION '메뉴는 맛집당 최대 5개까지 등록할 수 있습니다.';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS delivery_menus_max_five_trigger ON public.delivery_menus;
CREATE CONSTRAINT TRIGGER delivery_menus_max_five_trigger
  AFTER INSERT OR UPDATE ON public.delivery_menus
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_five_menus();

-- ============================================================
-- 5. RLS — 읽기는 공개, 쓰기는 작성자 본인만
-- ============================================================

-- ----- deliveries -----
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 비회원도 목록/상세를 볼 수 있도록 공개 조회로 전환 (구 정책은 정리)
DROP POLICY IF EXISTS "본인 데이터 조회" ON public.deliveries;
DROP POLICY IF EXISTS "맛집 공개 조회" ON public.deliveries;
CREATE POLICY "맛집 공개 조회" ON public.deliveries FOR SELECT USING (true);

DROP POLICY IF EXISTS "본인 데이터 생성" ON public.deliveries;
CREATE POLICY "본인 데이터 생성" ON public.deliveries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 데이터 수정" ON public.deliveries;
CREATE POLICY "본인 데이터 수정" ON public.deliveries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 데이터 삭제" ON public.deliveries;
CREATE POLICY "본인 데이터 삭제" ON public.deliveries FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT ON public.deliveries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;

-- ----- delivery_menus -----
ALTER TABLE public.delivery_menus ENABLE ROW LEVEL SECURITY;

-- 메뉴도 공개 조회 (아니면 비회원 상세·목록에서 메뉴가 비어 보인다)
DROP POLICY IF EXISTS "본인 메뉴 조회" ON public.delivery_menus;
DROP POLICY IF EXISTS "메뉴 공개 조회" ON public.delivery_menus;
CREATE POLICY "메뉴 공개 조회" ON public.delivery_menus FOR SELECT USING (true);

-- 쓰기는 부모 맛집 작성자만 (기존 정책 유지)
DROP POLICY IF EXISTS "본인 메뉴 생성" ON public.delivery_menus;
CREATE POLICY "본인 메뉴 생성" ON public.delivery_menus FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = delivery_menus.delivery_id AND d.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "본인 메뉴 수정" ON public.delivery_menus;
CREATE POLICY "본인 메뉴 수정" ON public.delivery_menus FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = delivery_menus.delivery_id AND d.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = delivery_menus.delivery_id AND d.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "본인 메뉴 삭제" ON public.delivery_menus;
CREATE POLICY "본인 메뉴 삭제" ON public.delivery_menus FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = delivery_menus.delivery_id AND d.user_id = auth.uid()
  ));

-- RLS만으로는 부족하다 — 테이블 권한(GRANT)도 반드시 함께 부여해야 한다
GRANT SELECT ON public.delivery_menus TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.delivery_menus TO authenticated;

-- ============================================================
-- 6. 메뉴 전체 교체 RPC (하나의 트랜잭션 — 삭제 후 삽입 실패로 인한 유실 방지)
-- ============================================================
CREATE OR REPLACE FUNCTION public.replace_delivery_menus(
  p_delivery_id uuid,
  p_menus jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_reps int;
BEGIN
  v_count := jsonb_array_length(p_menus);

  IF v_count IS NULL OR v_count < 1 OR v_count > 5 THEN
    RAISE EXCEPTION '메뉴는 1개 이상 5개 이하로 등록해야 합니다.';
  END IF;

  SELECT COUNT(*) INTO v_reps
  FROM jsonb_array_elements(p_menus) AS m
  WHERE (m->>'is_representative')::boolean IS TRUE;

  IF v_reps <> 1 THEN
    RAISE EXCEPTION '대표 메뉴는 정확히 1개여야 합니다.';
  END IF;

  -- SECURITY INVOKER이므로 RLS가 적용되어 본인 소유 맛집만 조작 가능
  DELETE FROM public.delivery_menus WHERE delivery_id = p_delivery_id;

  INSERT INTO public.delivery_menus (delivery_id, name, price, is_representative, sort_order)
  SELECT
    p_delivery_id,
    btrim(m->>'name'),
    (m->>'price')::integer,
    (m->>'is_representative')::boolean,
    (m->>'sort_order')::integer
  FROM jsonb_array_elements(p_menus) AS m;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_delivery_menus(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_delivery_menus(uuid, jsonb) TO authenticated;

-- ============================================================
-- 7. 대표 메뉴 사진 Storage (공개 조회, 작성자 폴더만 쓰기)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-images',
  'delivery-images',
  true,
  1048576,
  ARRAY['image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 최종 파일명은 {로그인 사용자 UUID}/{맛집 UUID}/representative-*.jpg 형식이다.
-- 사용자는 본인 UUID로 시작하는 폴더에만 업로드·수정·삭제할 수 있다.
DROP POLICY IF EXISTS "대표메뉴 사진 업로드" ON storage.objects;
CREATE POLICY "대표메뉴 사진 업로드" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "대표메뉴 사진 수정" ON storage.objects;
CREATE POLICY "대표메뉴 사진 수정" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'delivery-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'delivery-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "대표메뉴 사진 삭제" ON storage.objects;
CREATE POLICY "대표메뉴 사진 삭제" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'delivery-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
