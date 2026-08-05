-- 기존 delivery_comments 테이블은 존재하지만 API 역할 권한이 빠진 경우의 보정 스크립트
ALTER TABLE public.delivery_comments
  ADD COLUMN IF NOT EXISTS user_nickname TEXT NOT NULL DEFAULT '회원';

ALTER TABLE public.delivery_comments
  ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE public.delivery_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "댓글 공개 조회" ON public.delivery_comments;
CREATE POLICY "댓글 공개 조회"
  ON public.delivery_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "본인 댓글 작성" ON public.delivery_comments;
CREATE POLICY "본인 댓글 작성"
  ON public.delivery_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 댓글 삭제" ON public.delivery_comments;
CREATE POLICY "본인 댓글 삭제"
  ON public.delivery_comments FOR DELETE
  USING (auth.uid() = user_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.delivery_comments TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.delivery_comments TO authenticated;

-- 즐겨찾기 정책과 API 권한을 모두 다시 보정한다.
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 즐겨찾기 조회" ON public.bookmarks;
CREATE POLICY "본인 즐겨찾기 조회"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 즐겨찾기 추가" ON public.bookmarks;
CREATE POLICY "본인 즐겨찾기 추가"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 즐겨찾기 삭제" ON public.bookmarks;
CREATE POLICY "본인 즐겨찾기 삭제"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- 테이블 권한은 anon에도 부여하되, 실제 데이터 접근은 위 RLS가 로그인 사용자 본인만 허용한다.
GRANT SELECT, INSERT, DELETE ON TABLE public.bookmarks TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- 실행 결과가 모두 true인지 SQL Editor 결과표에서 확인한다.
SELECT
  has_table_privilege('authenticated', 'public.bookmarks', 'SELECT') AS bookmark_select_ok,
  has_table_privilege('authenticated', 'public.bookmarks', 'INSERT') AS bookmark_insert_ok,
  has_table_privilege('authenticated', 'public.bookmarks', 'DELETE') AS bookmark_delete_ok,
  has_table_privilege('authenticated', 'public.delivery_comments', 'INSERT') AS comment_insert_ok;
