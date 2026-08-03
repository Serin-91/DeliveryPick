-- 맛집 테이블 생성
CREATE TABLE IF NOT EXISTS restaurants (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  cuisine_type VARCHAR(100),
  location VARCHAR(255),
  rating DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 음식 3개 데이터 삽입
INSERT INTO restaurants (name, cuisine_type, location, rating) VALUES
('한강 경양식', '경양식', '서울 강남구', 4.5),
('신라면옥', '국수', '서울 강남구', 4.8),
('돈코츠 라멘', '일식', '서울 서초구', 4.6);

-- 테이블 조회 (확인용)
SELECT * FROM restaurants;
