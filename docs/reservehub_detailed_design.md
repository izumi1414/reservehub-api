# ReserveHub 詳細設計書

-   文書種別：詳細設計書
-   対象システム：ReserveHub 予約管理API
-   バージョン：1.0
-   前提：基本設計書に準拠

## 1. ディレクトリ構成

``` text
src/
├── app.ts
├── server.ts
├── db/
│   └── pool.ts
├── routes/
│   ├── slot.routes.ts
│   ├── reservation.routes.ts
│   └── report.routes.ts
├── controllers/
│   ├── slot.controller.ts
│   ├── reservation.controller.ts
│   └── report.controller.ts
├── services/
│   ├── slot.service.ts
│   ├── reservation.service.ts
│   └── report.service.ts
├── repositories/
│   ├── slot.repository.ts
│   ├── reservation.repository.ts
│   └── report.repository.ts
├── errors/
│   └── reservation.errors.ts
└── middlewares/
    └── error.middleware.ts
```

### 1.1 各層の責務

  層             責務
  -------------- ------------------------------------------------
  routes         HTTPメソッドとURLをControllerに割り当てる
  controllers    パラメータ取得、入力形式の確認、HTTPレスポンス
  services       業務ルール、トランザクション、業務エラー
  repositories   SQL実行、DB結果の返却
  middlewares    404・例外などの共通エラー処理
  db             PostgreSQL接続プール

## 2. 環境変数

`.env` の例：

``` dotenv
PORT=3000
DATABASE_URL=postgresql://app_user:your_password@localhost:5432/reservation_db
```

実際のパスワードをGitにコミットしない。`.env` は `.gitignore`
に追加し、`.env.example` には値の例だけを記載する。

`pool.ts` では `DATABASE_URL` を使用して `pg.Pool`
を生成する。サーバー起動時に `SELECT 1` などで接続を確認する。

## 3. データベース詳細設計

### 3.1 DDL

``` sql
CREATE TABLE reservation_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved')),
  CHECK (end_at > start_at)
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES reservation_slots(id),
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_reservations_active_slot
  ON reservations(slot_id)
  WHERE status = 'confirmed';

CREATE INDEX idx_reservation_slots_start_at
  ON reservation_slots(start_at);
```

### 3.2 制約の意図

-   `reservation_slots`
    のCHECK制約：終了日時が開始日時より後であることを保証する。
-   ステータスのCHECK制約：許可した値以外を保存させない。
-   外部キー：存在しない予約枠に対する予約を防ぐ。
-   部分UNIQUEインデックス：同じ予約枠に `confirmed`
    の予約が複数できないようにする。
-   インデックス：日付範囲で予約枠を検索する処理を補助する。

### 3.3 状態遷移

予約枠：

``` text
available ──予約成功──> reserved
reserved  ──キャンセル成功──> available
```

予約：

``` text
confirmed ──キャンセル成功──> cancelled
```

予約レコードは削除せず、キャンセル履歴を残す。再予約時は同じ枠に新しい予約レコードを作成する。

## 4. API詳細設計

共通事項： - ベースパス：`/api` - リクエスト／レスポンス：JSON -
UUIDは文字列で受け付ける。 -
不正なパラメータはDBに問い合わせる前に400を返す。 -
認証は本スコープでは行わない。

### 4.1 GET `/api/slots?date=YYYY-MM-DD`

`date` で指定した日を開始日として、その日を含む7日間の予約枠一覧を取得する。

レスポンス例：

``` json
[
  {
    "id": "00000000-0000-4000-8000-000000000001",
    "startAt": "2026-10-25T01:00:00.000Z",
    "endAt": "2026-10-25T02:00:00.000Z",
    "status": "available"
  }
]
```

検索範囲は開始日の0時以上、開始日の7日後の0時未満とする。つまり、開始日を含む7日間を対象とし、終了境界は含めない。日付はアプリケーションで採用するタイムゾーン方針に従って範囲に変換する。日付が欠落・不正な場合は400。

### 4.2 GET `/api/slots/:id`

指定されたUUIDの予約枠を取得する。

-   成功：200
-   不正なUUID：400
-   存在しない枠：404

### 4.3 POST `/api/reservations`

予約を登録する。

リクエスト例：

``` json
{
  "slotId": "00000000-0000-4000-8000-000000000001",
  "customerName": "山田花子",
  "customerEmail": "hanako@example.com"
}
```

入力チェック： - `slotId`：UUID形式 - `customerName`：必須、1〜100文字 -
`customerEmail`：必須、最大255文字、基本的なメール形式 -
不明なフィールドを許可するかどうかはAPI全体で統一する。

成功レスポンス：201 Created。登録した予約情報を返す。

エラー： - 入力不正：400 - 予約枠が存在しない：404 -
予約枠が埋まっている：409 - 想定外のDBエラー：500

#### 予約登録処理フロー

1.  Controllerでリクエストを検証する。
2.  Serviceで `pool.connect()` により専用クライアントを取得する。
3.  `BEGIN` を実行する。
4.  次の条件付きUPDATEを実行して枠を確保する。
5.  更新件数が0なら枠の状態を確認し、存在しなければ404、存在するが利用不可なら409を返すための業務エラーを送出する。
6.  `reservations` に `confirmed` の予約をINSERTする。
7.  `COMMIT` を実行する。
8.  予約情報を返す。
9.  例外時は `ROLLBACK` を試み、例外を上位層へ送る。
10. `finally` で `client.release()` を実行する。

枠確保SQL：

``` sql
UPDATE reservation_slots
SET status = 'reserved'
WHERE id = $1
  AND status = 'available'
RETURNING id;
```

予約INSERT：

``` sql
INSERT INTO reservations
  (slot_id, customer_name, customer_email)
VALUES ($1, $2, $3)
RETURNING id, slot_id, customer_name, customer_email, status, created_at;
```

重要：同一トランザクション内の全SQLは同じ `PoolClient`
で実行する。`pool.query()` と混在させない。

### 4.4 GET `/api/reservations`

予約一覧を取得する。初期版では全件取得でよいが、データが増えた場合はページネーションを追加する。

-   成功：200
-   DBエラー：500

認証がないため、学習用のデータのみを扱うこと。認証導入後はユーザーIDによる絞り込みを追加する。

### 4.5 GET `/api/reservations/:id`

予約IDで予約を1件取得する。

-   成功：200
-   不正なUUID：400
-   存在しない予約：404

### 4.6 PATCH `/api/reservations/:id/cancel`

予約をキャンセルし、予約枠を再開放する。

#### キャンセル処理フロー

1.  Controllerで予約IDの形式を確認する。
2.  Serviceでトランザクションを開始する。
3.  対象予約を取得し、存在とステータスを確認する。必要に応じて
    `SELECT ... FOR UPDATE` で対象行をロックする。
4.  予約が存在しなければ404、すでにキャンセル済みなら409とする。
5.  予約を `cancelled` に更新する。
6.  対応する予約枠を `available` に更新する。
7.  COMMITする。
8.  途中で失敗した場合はROLLBACKし、最後にクライアントを解放する。

予約更新SQL例：

``` sql
UPDATE reservations
SET status = 'cancelled'
WHERE id = $1
  AND status = 'confirmed'
RETURNING id, slot_id, status;
```

枠再開放SQL例：

``` sql
UPDATE reservation_slots
SET status = 'available'
WHERE id = $1
  AND status = 'reserved'
RETURNING id;
```

枠の更新件数が想定と異なる場合は、整合性エラーとしてロールバックする。実装時は同じ枠への予約・キャンセルが競合した場合も想定し、ロック取得順序を統一する。

### 4.7 GET `/api/reports/monthly?month=YYYY-MM`

指定月の予約件数を集計する。`month` は `YYYY-MM`
形式とし、月初以上、翌月月初未満の範囲で集計する。

集計例：

``` sql
SELECT
  COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count
FROM reservations
WHERE created_at >= $1
  AND created_at < $2;
```

この集計は予約の作成月を基準にする。予約枠の利用月を基準に集計したい場合は、`reservation_slots.start_at`
をJOINして範囲条件を設定する。仕様としてどちらを採用するかをAPI実装前に統一する。

## 5. トランザクション実装規約

Service層でトランザクションを管理する。

``` ts
const client = await pool.connect();

try {
  await client.query("BEGIN");

  // 同一clientで必要なSQLを実行する

  await client.query("COMMIT");
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // ロールバック失敗は必要に応じてログに記録する
  }
  throw error;
} finally {
  client.release();
}
```

上記は構造の例であり、実処理・エラー変換・ログ出力はServiceに合わせて実装する。

### 5.1 二重予約防止

-   条件付きUPDATEにより、`available` の枠だけを確保する。
-   同時に複数リクエストが来ても、状態変更に成功したリクエストだけが予約INSERTへ進む。
-   部分UNIQUEインデックスを最終的なDB制約として利用する。
-   PostgreSQLの一意制約違反（SQLSTATE
    `23505`）など、既知の競合を409へ変換する。
-   競合エラーを500として返さないように、エラー変換を設計する。

### 5.2 ロールバック確認

開発時に、枠のUPDATE後、予約INSERT前に意図的なエラーを発生させる。処理後に以下を確認する。

-   予約枠が `available` のままである。
-   予約レコードが追加されていない。
-   DBクライアントが解放されている。

## 6. エラー設計

業務エラー例： - `ReservationNotFoundError` - `SlotNotFoundError` -
`ReservationConflictError` - `ValidationError`

共通エラーミドルウェアはエラー種別に応じてHTTPステータスを決定し、想定外エラーは500にする。レスポンス例：

``` json
{
  "error": {
    "code": "RESERVATION_CONFLICT",
    "message": "この予約枠は利用できません"
  }
}
```

本番相当の設定では、内部SQL・接続文字列・スタックトレースをクライアントに返さず、サーバーログに記録する。

## 7. Repository関数案

  Repository               関数例                   用途
  ------------------------ ------------------------ --------------------
  slot.repository          `findSlotsByDate`        指定日の枠一覧
  slot.repository          `findSlotById`           枠詳細
  slot.repository          `reserveAvailableSlot`   条件付きで枠を確保
  slot.repository          `releaseReservedSlot`    予約枠を再開放
  reservation.repository   `createReservation`      予約INSERT
  reservation.repository   `findReservations`       予約一覧
  reservation.repository   `findReservationById`    予約詳細
  reservation.repository   `cancelReservation`      予約をキャンセル
  report.repository        `getMonthlyReport`       月別集計

トランザクション内で使うRepository関数には `PoolClient`
を引数として渡す。トランザクションを使わない読み取り処理は、必要に応じて
`Pool` を使ってよい。

## 8. 手動確認項目（Postman）

  No.   確認内容                           期待結果
  ----- ---------------------------------- ----------------------------
  1     指定日の枠一覧を取得               200、枠一覧
  2     不正な日付を指定                   400
  3     存在しない枠IDを取得               404
  4     空き枠を予約                       201、予約情報
  5     同じ枠を再予約                     409
  6     不正な予約者情報で登録             400
  7     予約詳細を取得                     200
  8     存在しない予約IDを取得             404
  9     予約をキャンセル                   200、`cancelled`
  10    キャンセル後の枠を確認             `available`
  11    キャンセル済み予約を再キャンセル   409
  12    予約INSERT失敗を発生させる         枠更新がロールバックされる
  13    同じ枠へ並行して予約を送る         成功は1件のみ、他は409相当
  14    月別集計を取得                     200、件数が正しい

## 9. 実装順序

1.  PostgreSQL接続とテーブル作成
2.  予約枠一覧・詳細API
3.  予約一覧・詳細API
4.  予約登録とトランザクション
5.  予約キャンセルとトランザクション
6.  月別集計
7.  エラーミドルウェアの整理
8.  Postmanで正常系・異常系・ロールバック・競合を確認

## 10. 将来拡張時の注意

-   JWT認証を追加する際は `users`
    テーブル、パスワードハッシュ、認証ミドルウェアを追加する。
-   認可を追加する際は、本人の予約かどうかをService層などで必ず検証する。フロントエンドだけで制御しない。
-   決済は外部サービスの状態とDB状態の整合性を考慮し、Webhook・冪等性・失敗時の補償処理を設計する。
-   メール送信はDBトランザクションと同じ原子性を持たないため、送信失敗や再送を別途設計する。
