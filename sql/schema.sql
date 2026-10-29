-- ReserveHub: テーブル定義

-- 予約枠テーブル
CREATE TABLE IF NOT EXISTS reservation_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'reserved')),
    CONSTRAINT chk_reservation_slots_end_after_start
        CHECK (end_at > start_at)
);

-- 予約テーブル
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL
        REFERENCES reservation_slots(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ユーザーテーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 確定済み予約は、1つの予約枠につき1件まで
-- キャンセル済みの予約履歴は保持する
CREATE UNIQUE INDEX IF NOT EXISTS uq_reservations_active_slot
    ON reservations(slot_id)
    WHERE status = 'confirmed';

-- 予約枠の開始日時による検索を高速化
CREATE INDEX IF NOT EXISTS idx_reservation_slots_start_at
    ON reservation_slots(start_at);

-- 予約テーブルにuser_idを追加
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
