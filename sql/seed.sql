-- ReserveHub: 初期データ投入
-- 同じ開始・終了時刻の予約枠が存在する場合は登録しない

INSERT INTO reservation_slots (start_at, end_at, status)
SELECT seed.start_at, seed.end_at, 'available'
FROM (
    VALUES
        ('2026-10-27 10:00:00+09'::timestamptz, '2026-10-27 11:00:00+09'::timestamptz),
        ('2026-10-27 13:00:00+09'::timestamptz, '2026-10-27 14:00:00+09'::timestamptz),
        ('2026-10-28 10:00:00+09'::timestamptz, '2026-10-28 11:00:00+09'::timestamptz),
        ('2026-10-28 13:00:00+09'::timestamptz, '2026-10-28 14:00:00+09'::timestamptz),
        ('2026-10-29 10:00:00+09'::timestamptz, '2026-10-29 11:00:00+09'::timestamptz),
        ('2026-10-29 13:00:00+09'::timestamptz, '2026-10-29 14:00:00+09'::timestamptz)
) AS seed(start_at, end_at)
WHERE NOT EXISTS (
    SELECT 1
    FROM reservation_slots existing
    WHERE existing.start_at = seed.start_at
      AND existing.end_at = seed.end_at
);

-- 登録結果の確認
SELECT id, start_at, end_at, status
FROM reservation_slots
ORDER BY start_at;
