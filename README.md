# ReserveHub-api

## 概要

ReserveHub-api は、予約枠の管理と予約登録・キャンセルを提供する REST API です。

Express 5 と TypeScript で構築し、PostgreSQL に予約枠・予約・ユーザー情報を保存します。
JWT によるユーザー認証、管理者権限、予約処理のトランザクション管理を備えています。

ベースURLは `/api` です。APIサーバーのルート `/` にアクセスすると稼働確認ができます。

## 主な機能

- ユーザー登録・ログイン（JWT発行）
- ログインユーザーのプロフィール照会・更新
- メールアドレス・パスワード・アカウントの管理
- 指定日の予約枠一覧と予約枠詳細の取得
- 認証ユーザーの予約登録・予約一覧・予約詳細・キャンセル
- 管理者による予約枠の作成・更新・削除・一覧管理
- 管理者による予約一覧・予約詳細・月別予約集計の取得
- 二重予約防止と予約キャンセル時の予約枠再開放

## 技術スタック

| 分類 | 技術 |
|---|---|
| Runtime | Node.js |
| 言語 | TypeScript |
| Webフレームワーク | Express 5 |
| データベース | PostgreSQL |
| DBドライバー | node-postgres (`pg`) |
| 認証 | JWT (`jsonwebtoken`) / bcrypt (`bcryptjs`) |
| 設定管理 | dotenv |
| CORS | cors |
| 開発実行 | tsx watch |

## データベース設計（ER図）

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar role
        timestamptz created_at
        timestamptz deleted_at
    }

    RESERVATION_SLOTS {
        uuid id PK
        timestamptz start_at
        timestamptz end_at
        boolean is_accepting
        varchar status
    }

    RESERVATIONS {
        uuid id PK
        uuid slot_id FK
        uuid user_id FK
        varchar customer_name
        varchar customer_email
        varchar status
        timestamptz created_at
    }

    USERS ||--o{ RESERVATIONS : "予約する"
    RESERVATION_SLOTS ||--o{ RESERVATIONS : "予約枠に紐づく"
```

- `reservation_slots.status`
  - `available`: 予約可能
  - `reserved`: 予約済み
- `reservations.status`
  - `confirmed`: 確定
  - `cancelled`: キャンセル済み
- `users.role`
  - `user`: 一般ユーザー
  - `admin`: 管理者
- 確定済み予約が同じ予約枠に重複しないよう、`reservations(slot_id)` に部分UNIQUEインデックスを設定します。
- 予約枠の開始日時には検索用インデックスを設定します。
- 予約登録時は予約枠の確保と予約データの登録を1つのトランザクションで実行します。

## API一覧

認証が必要なAPIには `Authorization: Bearer <accessToken>` を指定します。

### 認証

| Method | Endpoint | 認証 | 概要 |
|---|---|---|---|
| POST | `/api/auth/register` | 不要 | ユーザー登録 |
| POST | `/api/auth/login` | 不要 | ログイン |

登録・ログインのリクエスト例:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

ログイン成功時は以下を返します。

```json
{
  "accessToken": "<JWT>",
  "user": {
    "id": "<UUID>",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### ユーザー

| Method | Endpoint | 認証 | 概要 |
|---|---|---|---|
| GET | `/api/users/me` | 必須 | プロフィール取得 |
| PATCH | `/api/users/me` | 必須 | メールアドレス更新 |
| PATCH | `/api/users/me/password` | 必須 | パスワード変更 |
| DELETE | `/api/users/me` | 必須 | アカウント削除 |

### 予約枠

| Method | Endpoint | 認証 | 概要 |
|---|---|---|---|
| GET | `/api/slots?date=YYYY-MM-DD` | 不要 | 指定日を起点とする予約枠一覧 |
| GET | `/api/slots/:id` | 不要 | 予約枠詳細 |

### 予約

| Method | Endpoint | 認証 | 概要 |
|---|---|---|---|
| POST | `/api/reservations` | 必須 | 予約登録 |
| GET | `/api/reservations` | 必須 | ログインユーザーの予約一覧 |
| GET | `/api/reservations/:id` | 必須 | ログインユーザーの予約詳細 |
| PATCH | `/api/reservations/:id/cancel` | 必須 | 予約キャンセル |

予約登録のリクエスト例:

```json
{
  "slotId": "<予約枠UUID>",
  "customerName": "予約 太郎",
  "customerEmail": "taro@example.com"
}
```

### 管理者

管理者APIはログイン後のJWTに加え、ユーザーのロールが `admin` である必要があります。

| Method | Endpoint | 概要 |
|---|---|---|
| GET | `/api/admin/slots` | 予約枠一覧 |
| GET | `/api/admin/slots/:id` | 予約枠詳細 |
| POST | `/api/admin/slots` | 予約枠作成 |
| PATCH | `/api/admin/slots/:id` | 予約枠更新 |
| DELETE | `/api/admin/slots/:id` | 予約枠削除 |
| GET | `/api/admin/reservations` | 全予約一覧 |
| GET | `/api/admin/reservations/:id` | 全予約の詳細 |

予約枠作成・更新のリクエスト例:

```json
{
  "startAt": "2026-11-01T10:00:00+09:00",
  "endAt": "2026-11-01T11:00:00+09:00",
  "isAccepting": true
}
```

`PATCH` では `startAt`、`endAt`、`isAccepting` のすべてが必要です。

### レポート

| Method | Endpoint | 認証 | 概要 |
|---|---|---|---|
| GET | `/api/reports/monthly?month=YYYY-MM` | 管理者 | 月別予約集計 |

### 稼働確認

| Method | Endpoint | 概要 |
|---|---|---|
| GET | `/` | API稼働確認 |

## ディレクトリ構成

```text
reservehub-api/
├── docs/
│   ├── reservehub_basic_design.md
│   └── reservehub_detailed_design.md
├── sql/
│   ├── schema.sql
│   └── seed.sql
├── src/
│   ├── app.ts                 # Express app・ミドルウェア・ルーティング
│   ├── server.ts              # サーバー起動・DB接続確認
│   ├── controllers/           # HTTPリクエスト・レスポンス処理
│   ├── services/              # ビジネスロジック
│   ├── repositories/          # PostgreSQLアクセス
│   ├── routes/                # エンドポイント定義
│   ├── middleware/            # JWT認証・管理者認可
│   ├── errors/                # アプリケーションエラー
│   ├── db/pool.ts             # pg接続プール
│   └── types/                 # Express型拡張など
├── package.json
├── package-lock.json
└── tsconfig.json
```

## セットアップ

### 前提条件

- Node.js（推奨: LTS）
- npm
- PostgreSQL

### 1. プロジェクトに移動

```bash
cd reservehub-api
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. PostgreSQLデータベースを作成

```sql
CREATE DATABASE reservation_db;
```

### 4. スキーマを適用

```bash
psql -d reservation_db -f sql/schema.sql
```

必要に応じて初期予約枠を投入します。

```bash
psql -d reservation_db -f sql/seed.sql
```

## 環境変数

プロジェクトルートに `.env` を作成し、以下を設定します。

```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/reservation_db
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

| 変数名 | 必須 | 説明 |
|---|---|---|
| `PORT` | 任意 | APIの待受ポート。未設定時は `3000` |
| `DATABASE_URL` | 必須 | PostgreSQL接続文字列 |
| `JWT_SECRET` | 必須 | JWT署名・検証に使用する秘密鍵。十分に長い値を設定 |
| `NODE_ENV` | 任意 | `production` の場合、CORS_ORIGIN未設定時は許可オリジンなし |
| `CORS_ORIGIN` | 任意 | 許可するオリジン。複数指定時はカンマ区切り |

`NODE_ENV` が `production` 以外で `CORS_ORIGIN` を未設定の場合、デフォルトで
`http://localhost:5173` を許可します。

## 起動方法

### 開発モード

ファイル変更を監視して起動します。

```bash
npm run dev
```

起動後は `http://localhost:3000/` にアクセスします。

### ビルド

```bash
npm run build
```

ビルド成果物は `dist/` に生成されます。

### 本番モード

```bash
npm run build
npm start
```
