-- ========================================================
-- 🛵 DeliveryPick (딜리버리픽) v1.2 데이터베이스 및 스토리지 스크립트
-- ========================================================

-- 1. deliveries 테이블 컬럼 확장
-- 서비스 닉네임은 소셜 제공자 정보와 분리해 관리한다.
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nickname TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_unique_idx
  ON profiles (lower(nickname)) WHERE nickname IS NOT NULL;
DROP POLICY IF EXISTS "본인 프로필 조회" ON profiles;
CREATE POLICY "본인 프로필 조회" ON profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "본인 프로필 생성" ON profiles;
CREATE POLICY "본인 프로필 생성" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "본인 프로필 수정" ON profiles;
CREATE POLICY "본인 프로필 수정" ON profiles FOR UPDATE USING (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE ON TABLE profiles TO authenticated;

CREATE OR REPLACE FUNCTION check_nickname_exists(input_nickname TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE lower(nickname) = lower(trim(input_nickname))
    UNION ALL
    SELECT 1 FROM deliveries WHERE lower(user_nickname) = lower(trim(input_nickname))
  );
$$;
GRANT EXECUTE ON FUNCTION check_nickname_exists(TEXT) TO authenticated;

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS sido TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS sigungu TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS kakao_place_id TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS place_url TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS user_nickname TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS user_avatar_url TEXT;
-- 별점은 0.5점 단위 입력을 지원한다.
ALTER TABLE deliveries ALTER COLUMN rating TYPE NUMERIC(2,1) USING rating::NUMERIC(2,1);
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_rating_range;
ALTER TABLE deliveries ADD CONSTRAINT deliveries_rating_range CHECK (rating >= 0.5 AND rating <= 5.0);
-- 같은 가게의 재등록 게시물을 최초 등록 게시물에 연결한다.
-- 최초 등록 게시물은 NULL, 이후 리뷰는 최초 게시물 ID를 가진다.
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS root_delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS deliveries_root_delivery_id_created_at_idx
  ON deliveries(root_delivery_id, created_at DESC);

-- 기존 중복 게시물은 카카오 장소 ID를 우선 사용하고, 없으면 공백을 제거한 가게명+지역으로 묶는다.
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY COALESCE(
        NULLIF(kakao_place_id, ''),
        lower(regexp_replace(name, '\\s+', '', 'g')) || '|' || COALESCE(sido, '') || '|' || COALESCE(sigungu, '')
      )
      ORDER BY created_at ASC, id ASC
    ) AS first_id,
    row_number() OVER (
      PARTITION BY COALESCE(
        NULLIF(kakao_place_id, ''),
        lower(regexp_replace(name, '\\s+', '', 'g')) || '|' || COALESCE(sido, '') || '|' || COALESCE(sigungu, '')
      )
      ORDER BY created_at ASC, id ASC
    ) AS position
  FROM deliveries
  WHERE root_delivery_id IS NULL
)
UPDATE deliveries AS d
SET root_delivery_id = ranked.first_id
FROM ranked
WHERE d.id = ranked.id AND ranked.position > 1;

-- 후속 리뷰는 최초 등록자가 만든 메뉴명만 사용할 수 있다. 가격도 최초 메뉴를 따른다.
CREATE OR REPLACE FUNCTION enforce_canonical_review_menu()
RETURNS TRIGGER AS $$
DECLARE
  canonical_price INTEGER;
BEGIN
  SELECT root_menu.price INTO canonical_price
  FROM deliveries child
  JOIN delivery_menus root_menu ON root_menu.delivery_id = child.root_delivery_id
  WHERE child.id = NEW.delivery_id AND root_menu.name = NEW.name;

  IF EXISTS (SELECT 1 FROM deliveries WHERE id = NEW.delivery_id AND root_delivery_id IS NOT NULL) THEN
    IF canonical_price IS NULL THEN
      RAISE EXCEPTION '최초 등록자가 등록한 메뉴만 리뷰할 수 있습니다.';
    END IF;
    NEW.price := canonical_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_canonical_menu_on_review ON delivery_menus;
CREATE TRIGGER enforce_canonical_menu_on_review
BEFORE INSERT OR UPDATE ON delivery_menus
FOR EACH ROW EXECUTE FUNCTION enforce_canonical_review_menu();

-- 2. delivery_menus 메뉴 제한 (최대 30개로 확장)
CREATE OR REPLACE FUNCTION check_max_menus_thirty()
RETURNS TRIGGER AS $$
DECLARE
  menu_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO menu_count
  FROM delivery_menus
  WHERE delivery_id = NEW.delivery_id;

  IF menu_count >= 30 THEN
    RAISE EXCEPTION '메뉴는 식당당 최대 30개까지만 등록할 수 있습니다.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_max_thirty_menus ON delivery_menus;
CREATE TRIGGER enforce_max_thirty_menus
BEFORE INSERT ON delivery_menus
FOR EACH ROW EXECUTE FUNCTION check_max_menus_thirty();

-- 3. bookmarks (❤️ 즐겨찾기) 테이블 생성
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  delivery_id UUID REFERENCES deliveries ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, delivery_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 즐겨찾기 조회" ON bookmarks;
CREATE POLICY "본인 즐겨찾기 조회" ON bookmarks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 즐겨찾기 추가" ON bookmarks;
CREATE POLICY "본인 즐겨찾기 추가" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 즐겨찾기 삭제" ON bookmarks;
CREATE POLICY "본인 즐겨찾기 삭제" ON bookmarks FOR DELETE USING (auth.uid() = user_id);
GRANT SELECT, INSERT, DELETE ON TABLE bookmarks TO authenticated;

-- 4. reports (🔥 허위/주작 신고) 테이블 생성
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID REFERENCES deliveries ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  report_type TEXT DEFAULT 'fake' NOT NULL, -- 'fake' | 'info_update'
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(delivery_id, reporter_id)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 신고 작성" ON reports;
CREATE POLICY "본인 신고 작성" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 신고 5회 이상 시 자동 숨김 처리 트리거
CREATE OR REPLACE FUNCTION auto_hide_on_reports()
RETURNS TRIGGER AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM reports WHERE delivery_id = NEW.delivery_id AND report_type = 'fake';

  UPDATE deliveries
  SET report_count = cnt,
      is_hidden = (cnt >= 5)
  WHERE id = NEW.delivery_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_hide_reports ON reports;
CREATE TRIGGER trigger_auto_hide_reports
AFTER INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION auto_hide_on_reports();

-- 5. Supabase Storage 'avatars' 버킷 생성 및 RLS 정책
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "아바타 퍼블릭 조회" ON storage.objects;
CREATE POLICY "아바타 퍼블릭 조회" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "본인 아바타 업로드" ON storage.objects;
CREATE POLICY "본인 아바타 업로드" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "본인 아바타 수정" ON storage.objects;
CREATE POLICY "본인 아바타 수정" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "본인 아바타 삭제" ON storage.objects;
CREATE POLICY "본인 아바타 삭제" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. 맛집 상세 댓글
CREATE TABLE IF NOT EXISTS delivery_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID REFERENCES deliveries ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  user_nickname TEXT NOT NULL DEFAULT '회원',
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE delivery_comments ADD COLUMN IF NOT EXISTS user_nickname TEXT NOT NULL DEFAULT '회원';
ALTER TABLE delivery_comments ADD COLUMN IF NOT EXISTS content TEXT;

CREATE INDEX IF NOT EXISTS delivery_comments_delivery_id_created_at_idx
  ON delivery_comments(delivery_id, created_at);

ALTER TABLE delivery_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "댓글 공개 조회" ON delivery_comments;
CREATE POLICY "댓글 공개 조회" ON delivery_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "본인 댓글 작성" ON delivery_comments;
CREATE POLICY "본인 댓글 작성" ON delivery_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "본인 댓글 삭제" ON delivery_comments;
CREATE POLICY "본인 댓글 삭제" ON delivery_comments FOR DELETE USING (auth.uid() = user_id);
GRANT SELECT ON TABLE delivery_comments TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE delivery_comments TO authenticated;
NOTIFY pgrst, 'reload schema';

-- 7. 대표 메뉴 이미지 저장소
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-images', 'delivery-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "맛집 이미지 공개 조회" ON storage.objects;
CREATE POLICY "맛집 이미지 공개 조회" ON storage.objects
  FOR SELECT USING (bucket_id = 'delivery-images');
DROP POLICY IF EXISTS "본인 맛집 이미지 업로드" ON storage.objects;
CREATE POLICY "본인 맛집 이미지 업로드" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'delivery-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );
DROP POLICY IF EXISTS "본인 맛집 이미지 삭제" ON storage.objects;
CREATE POLICY "본인 맛집 이미지 삭제" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'delivery-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );
