# ReserveHub フロントエンド向けAPIガイド

この資料は、ReserveHub のフロントエンドを実装するためのAPI仕様をまとめたものです。
基本設計やデータベース定義ではなく、画面・API通信・エラー処理に必要な情報を中心に記載します。

## 1. 共通仕様

### ベースURL

開発環境では、APIサーバーのベースURLを次のように設定します。

```text
http://localhost:3000
```

各エンドポイントのパスには `/api` を含めます。

稼働確認:

```text
GET http://localhost:3000/
```

レスポンス:

```json
{
  "message": "ReserveHun API is Running!!!"
}
```

### HTTPヘッダー

```http
Content-Type: application/json
```

認証が必要なAPIでは、ログイン時に取得したJWTを指定します。

```http
Authorization: Bearer <accessToken>
```

`accessToken` の有効期限は1時間です。有効期限切れや不正なトークンを受け取った場合は再ログインを促してください。

### レスポンス形式

成功時:

- 通常はJSONオブジェクトまたはJSON配列を返します。
- `204 No Content` のAPIはレスポンスボディを返しません。

エラー時の代表的な形式:

```json
{
  "message": "エラー内容を示す日本語メッセージ"
}
```

フロントエンドではHTTPステータスと `message` を組み合わせて表示してください。

### 主なステータスコード

| コード | 意味 |
|---|---|
| 200 | 正常に取得・更新できた |
| 201 | 登録できた |
| 204 | 正常に処理できたがレスポンスボディがない |
| 400 | リクエスト形式・必須項目・入力値が不正 |
| 401 | 未認証、または認証に失敗 |
| 403 | ログイン済みだが権限が不足 |
| 404 | 対象データが存在しない |
| 409 | 予約枠が確保できない、重複、または編集不可など競合 |
| 500 | サーバー内部エラー |

### 日時の扱い

- 予約枠の日時はISO 8601形式で送受信します。
- 入力例: `2026-11-01T10:00:00+09:00`
- DBから返却される日時は `timestamptz` の表現になり、環境によってはUTC形式やタイムゾーン付き文字列として表現されます。
- フロント側では `new Date(value)` などでDateオブジェクトに変換し、表示タイムゾーンへ変換してください。
- 日付検索は `YYYY-MM-DD`、月別集計は `YYYY-MM` を使用します。

### データ形式

予約枠:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "start_at": "2026-11-01T01:00:00.000Z",
  "end_at": "2026-11-01T02:00:00.000Z",
  "is_accepting": true,
  "status": "available"
}
```

- `status`
  - `available`: 予約可能
  - `reserved`: 予約済み
- `is_accepting`
  - `true`: 予約受付中
  - `false`: 予約受付停止中
- 予約済みでも予約枠自体の詳細は取得できます。

予約:

```json
{
  "id": "661e8400-e29b-41d4-a716-446655440000",
  "slot_id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_name": "予約 太郎",
  "customer_email": "taro@example.com",
  "status": "confirmed",
  "created_at": "2026-10-29T05:00:00.000Z",
  "user_id": "771e8400-e29b-41d4-a716-446655440000"
}
```

- `status`
  - `confirmed`: 予約確定
  - `cancelled`: キャンセル済み
- 一覧APIはページネーションを提供しません。レスポンス配列を画面側で加工してください。

## 2. 認証

### ユーザー登録

```text
POST /api/auth/register
```

認証不要

リクエストボディ:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

バリデーション:

- `email` は文字列かつメールアドレス形式
- `password` は文字列
- パスワードは8文字以上
- bcryptで扱える長さ上限（72バイト）以内

成功レスポンス（201）:

```json
{
  "id": "771e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | body、email、passwordの形式が不正、またはメールアドレス形式・パスワード長が不正 |
| 409 | 登録済みメールアドレス |
| 500 | サーバー内部エラー |

登録後は自動ログインされません。別途ログインAPIを呼び出してください。

### ログイン

```text
POST /api/auth/login
```

認証不要

リクエストボディ:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

成功レスポンス（200）:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "771e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "user"
  }
}
```

フロント側で保持する推奨情報:

- `accessToken`
- `user.id`
- `user.email`
- `user.role`

JWTのペイロードにはユーザーID（`sub`）と役割（`role`）が含まれます。画面制御にはレスポンスの `role` を使用し、実権限は必ずサーバー側で判定されます。

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | body、email、passwordが不足または形式不正 |
| 401 | メールアドレスまたはパスワードが一致しない |
| 500 | サーバー内部エラー |

## 3. ログインユーザー

### プロフィール取得

```text
GET /api/users/me
```

認証必須

レスポンス（200）:

```json
{
  "id": "771e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "user",
  "createdAt": "2026-10-29T05:00:00.000Z"
}
```

`created_at` は `createdAt` として返されます。

### メールアドレス変更

```text
PATCH /api/users/me
```

認証必須

リクエストボディ:

```json
{
  "email": "new-user@example.com"
}
```

成功レスポンス（200）:

```json
{
  "id": "771e8400-e29b-41d4-a716-446655440000",
  "email": "new-user@example.com",
  "role": "user",
  "created_at": "2026-10-29T05:00:00.000Z"
}
```

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | bodyまたはemailが不正、メールアドレス形式が不正 |
| 404 | ユーザーが存在しない |
| 409 | 別ユーザーが使用中のメールアドレス |
| 500 | サーバー内部エラー |

### パスワード変更

```text
PATCH /api/users/me/password
```

認証必須

リクエストボディ:

```json
{
  "currentPassword": "password123",
  "newPassword": "new-password123"
}
```

バリデーション:

- 新しいパスワードは8文字以上
- 新しいパスワードは72バイト以内

成功レスポンス（204）:

レスポンスボディなし

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | bodyまたは必須項目が不正、新しいパスワードが短すぎる |
| 401 | 現在のパスワードが一致しない |
| 404 | ユーザーが存在しない |
| 500 | サーバー内部エラー |

### アカウント削除

```text
DELETE /api/users/me
```

認証必須

成功レスポンス（204）:

レスポンスボディなし

成功後はログイン状態をフロント側で削除し、ログイン画面へ遷移してください。
削除処理は論理削除（`deleted_at` の設定）です。

主なエラー:

| ステータス | ケース |
|---|---|
| 404 | ユーザーが存在しない |
| 500 | サーバー内部エラー |

## 4. 予約枠

### 指定日を起点とする予約枠一覧

```text
GET /api/slots?date=YYYY-MM-DD
```

認証不要

リクエスト例:

```text
GET /api/slots?date=2026-11-01
```

指定した日を含む7日間を取得します。

成功レスポンス（200）:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "start_at": "2026-11-01T01:00:00.000Z",
    "end_at": "2026-11-01T02:00:00.000Z",
    "is_accepting": true,
    "status": "available"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "start_at": "2026-11-01T04:00:00.000Z",
    "end_at": "2026-11-01T05:00:00.000Z",
    "is_accepting": true,
    "status": "reserved"
  }
]
```

レスポンスは開始日時順です。
予約画面では次の判定を組み合わせると表示しやすいです。

```text
予約可能 = is_accepting === true && status === "available"
```

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | dateがない、形式が `YYYY-MM-DD` でない、存在しない日付 |
| 500 | サーバー内部エラー |

### 予約枠詳細

```text
GET /api/slots/:id
```

認証不要

レスポンス（200）:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "start_at": "2026-11-01T01:00:00.000Z",
  "end_at": "2026-11-01T02:00:00.000Z",
  "is_accepting": true,
  "status": "available"
}
```

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | idが指定されていない |
| 404 | 対象の予約枠が存在しない |
| 500 | サーバー内部エラー |

## 5. 予約

予約一覧・詳細・キャンセルは、JWTに含まれるユーザー本人の予約だけを対象にします。

### 予約登録

```text
POST /api/reservations
```

認証必須

リクエストボディ:

```json
{
  "slotId": "550e8400-e29b-41d4-a716-446655440000",
  "customerName": "予約 太郎",
  "customerEmail": "taro@example.com"
}
```

リクエストの注意:

- `slotId`、`customerName`、`customerEmail` はすべて文字列かつ空文字不可
- `customerEmail` はこのAPIではメールアドレス形式のバリデーションを行っていません。フロント側でも入力チェックを推奨します。
- 予約枠の確保と予約レコード登録は同一トランザクションで実行されます。

成功レスポンス（201）:

```json
{
  "id": "661e8400-e29b-41d4-a716-446655440000",
  "slot_id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_name": "予約 太郎",
  "customer_email": "taro@example.com",
  "status": "confirmed",
  "created_at": "2026-10-29T05:00:00.000Z",
  "user_id": "771e8400-e29b-41d4-a716-446655440000"
}
```

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | 必須項目がない、または空文字 |
| 404 | 予約枠が存在しない |
| 409 | 予約枠がすでに予約済み、受付停止中、または確保できない |
| 500 | サーバー内部エラー |

### ログインユーザーの予約一覧

```text
GET /api/reservations
```

認証必須

成功レスポンス（200）:

```json
[
  {
    "id": "661e8400-e29b-41d4-a716-446655440000",
    "slot_id": "550e8400-e29b-41d4-a716-446655440000",
    "customer_name": "予約 太郎",
    "customer_email": "taro@example.com",
    "status": "confirmed",
    "created_at": "2026-10-29T05:00:00.000Z",
    "user_id": "771e8400-e29b-41d4-a716-446655440000"
  }
]
```

作成日時の降順です。

### ログインユーザーの予約詳細

```text
GET /api/reservations/:id
```

認証必須

成功レスポンス（200）:

```json
{
  "id": "661e8400-e29b-41d4-a716-446655440000",
  "slot_id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_name": "予約 太郎",
  "customer_email": "taro@example.com",
  "status": "confirmed",
  "created_at": "2026-10-29T05:00:00.000Z",
  "user_id": "771e8400-e29b-41d4-a716-446655440000"
}
```

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | idが指定されていない |
| 404 | 対象の予約が存在しない、または本人の予約ではない |
| 500 | サーバー内部エラー |

### 予約キャンセル

```text
PATCH /api/reservations/:id/cancel
```

認証必須

リクエストボディなし

成功レスポンス（200）:

```json
{
  "id": "661e8400-e29b-41d4-a716-446655440000",
  "slot_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

キャンセルAPIのレスポンスには `status: "cancelled"` を含みません。画面側ではキャンセル成功時に対象予約の状態を更新してください。

キャンセル処理では次を同時に行います。

1. 予約ステータスを `cancelled` に変更
2. 対応する予約枠のステータスを `available` に変更
3. キャンセル済み予約を履歴として保持

主なエラー:

| ステータス | ケース |
|---|---|
| 404 | 対象の予約が存在しない、または本人の予約ではない |
| 409 | 予約がすでにキャンセル済み |
| 500 | サーバー内部エラー |

## 6. 管理者API

管理者APIの利用には以下が必要です。

1. `/api/auth/login` で取得したJWT
2. JWT内の `role` が `admin`
3. リクエストヘッダーの `Authorization`

権限がない場合は `403` を返します。

### 管理者用予約枠一覧

```text
GET /api/admin/slots
```

認証・管理者権限必須

成功レスポンス（200）:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "start_at": "2026-11-01T01:00:00.000Z",
    "end_at": "2026-11-01T02:00:00.000Z",
    "is_accepting": true,
    "status": "available"
  }
]
```

開始日時の昇順です。

### 管理者用予約枠詳細

```text
GET /api/admin/slots/:id
```

認証・管理者権限必須

レスポンスは一般の予約枠詳細と同じ形式です。

### 予約枠作成

```text
POST /api/admin/slots
```

認証・管理者権限必須

リクエストボディ:

```json
{
  "startAt": "2026-11-01T10:00:00+09:00",
  "endAt": "2026-11-01T11:00:00+09:00"
}
```

バリデーション:

- `startAt` と `endAt` は文字列かつ解析可能な日時
- `endAt` は `startAt` より後

成功レスポンス（201）:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "start_at": "2026-11-01T01:00:00.000Z",
  "end_at": "2026-11-01T02:00:00.000Z",
  "is_accepting": true,
  "status": "available"
}
```

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | bodyまたは日時形式が不正、終了日時が開始日時以前 |
| 409 | 重複など競合 |
| 500 | サーバー内部エラー |

### 予約枠更新

```text
PATCH /api/admin/slots/:id
```

認証・管理者権限必須

リクエストボディ:

```json
{
  "startAt": "2026-11-01T10:00:00+09:00",
  "endAt": "2026-11-01T11:00:00+09:00",
  "isAccepting": true
}
```

`startAt`、`endAt`、`isAccepting` はすべて必須です。`isAccepting` は真偽値で指定してください。

成功レスポンス（200）:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "start_at": "2026-11-01T01:00:00.000Z",
  "end_at": "2026-11-01T02:00:00.000Z",
  "is_accepting": true,
  "status": "available"
}
```

予約済みの予約枠では日時の変更ができません。`isAccepting` の変更は可能です。

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | body、日時、または `isAccepting` が不正 |
| 404 | 対象の予約枠が存在しない |
| 409 | 予約済み予約枠の日時変更、または更新できない競合 |
| 500 | サーバー内部エラー |

### 予約枠削除

```text
DELETE /api/admin/slots/:id
```

認証・管理者権限必須

リクエストボディなし

成功レスポンス（204）:

レスポンスボディなし

予約済みの予約枠、および予約履歴に紐づく予約枠は削除できません。

主なエラー:

| ステータス | ケース |
|---|---|
| 404 | 対象の予約枠が存在しない |
| 409 | 予約済みまたは予約履歴があり削除できない |
| 500 | サーバー内部エラー |

### 管理者用予約一覧

```text
GET /api/admin/reservations
```

認証・管理者権限必須

成功レスポンス（200）:

```json
[
  {
    "id": "661e8400-e29b-41d4-a716-446655440000",
    "slot_id": "550e8400-e29b-41d4-a716-446655440000",
    "customer_name": "予約 太郎",
    "customer_email": "taro@example.com",
    "status": "confirmed",
    "created_at": "2026-10-29T05:00:00.000Z",
    "user_id": "771e8400-e29b-41d4-a716-446655440000"
  }
]
```

作成日時の降順です。キャンセル済み予約も履歴として含まれます。

### 管理者用予約詳細

```text
GET /api/admin/reservations/:id
```

認証・管理者権限必須

成功レスポンスは一般の予約詳細と同じ形式です。

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | idが指定されていない |
| 404 | 対象の予約が存在しない |
| 500 | サーバー内部エラー |

## 7. 月別予約レポート

```text
GET /api/reports/monthly?month=YYYY-MM
```

認証・管理者権限必須

リクエスト例:

```text
GET /api/reports/monthly?month=2026-11
```

成功レスポンス（200）:

```json
{
  "month": "2026-11",
  "totalReservations": 12,
  "confirmedReservations": 8,
  "cancelledReservations": 4
}
```

集計基準:

- 対象期間は指定月の1日00:00から翌月1日00:00まで
- タイムゾーンはシステム実装上 `+09:00` を基準
- 件数は予約レコードの作成日時ではなくレポートAPIの実装に従って集計
- `created_at` が対象期間にある予約を集計します

主なエラー:

| ステータス | ケース |
|---|---|
| 400 | monthがない、形式が `YYYY-MM` でない、年月が不正 |
| 500 | サーバー内部エラー |

## 8. フロントエンド実装時の注意

### 認証情報の保存

JWTをブラウザストレージへ保存する場合は、XSS対策を含めたセキュリティ要件を検討してください。
ログアウト時は少なくとも `accessToken` とログインユーザー情報をフロント側から削除します。

### APIクライアント

共通クライアントを用意し、認証ヘッダーやエラー処理をまとめると実装しやすいです。

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function apiRequest(path: string, options: RequestInit = {}) {
  const accessToken = localStorage.getItem("accessToken");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: "リクエストに失敗しました" }));

    throw new Error(body.message ?? "リクエストに失敗しました");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
```

Vite環境ではフロント側の環境変数として次を設定できます。

```env
VITE_API_BASE_URL=http://localhost:3000
```

### CORS

バックエンドの `CORS_ORIGIN` にフロントエンドのオリジンを指定します。

```env
CORS_ORIGIN=http://localhost:5173
```

複数のオリジンを許可する場合はカンマ区切りで指定します。

```env
CORS_ORIGIN=http://localhost:5173,http://localhost:4173
```

ブラウザから直接APIへアクセスする場合、フロント側のオリジンとCORS設定が一致している必要があります。

### ログイン制御

- `401`: ログイン状態を解除し、ログイン画面へ遷移する候補
- `403`: 管理者画面へのアクセス制限を表示
- `409`: 二重予約や競合を通知し、予約枠一覧を再取得
- `404`: 対象が削除・キャンセル・移動された可能性を表示
- `500`: 再試行案内や汎常なサーバーエラーを表示

画面制御だけでなく、サーバー側の認証・認可も必ず有効です。フロントで管理者メニューを隠しても管理者APIへ直接アクセスできない安全性はサーバー側で担保されます。

### 推奨画面遷移

1. トップまたは予約枠一覧画面
2. 日付を選択
3. `/api/slots?date=...` を取得
4. 予約可能な枠を選択
5. 未ログインならログイン画面へ遷移
6. ログイン後に予約者情報を入力
7. `POST /api/reservations` を実行
8. マイ予約一覧へ遷移

管理者画面:

1. 管理者ログイン
2. `role === "admin"` の場合のみ管理メニューを表示
3. 予約枠一覧・予約枠作成・予約枠編集・削除
4. 全予約一覧・予約詳細
5. 月別レポート
