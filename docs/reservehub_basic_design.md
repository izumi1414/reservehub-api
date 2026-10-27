# ReserveHub 基本設計書

-   文書種別：基本設計書
-   対象システム：ReserveHub 予約管理API
-   バージョン：1.0
-   対象範囲：予約枠管理、予約登録・照会・キャンセル、月別予約集計
-   対象外：JWT認証、管理者・ユーザー権限、決済、メール通知

## 1. システム概要

ReserveHubは、あらかじめ登録された予約枠に対して予約を行い、予約情報を管理するWeb
APIである。バックエンドはExpressとTypeScript、データベースはPostgreSQLを使用する。

本システムでは、予約登録時に予約枠の確保と予約データの登録を同一トランザクションで実行し、途中で失敗した場合に更新内容をロールバックする。また、条件付きUPDATEとデータベース制約を利用して二重予約を防止する。

## 2. システム構成

-   アプリケーション：Node.js / Express / TypeScript
-   データベース：PostgreSQL
-   DBアクセス：`pg` の `Pool` / `PoolClient`
-   API確認：Postmanなど
-   フロントエンド：本設計の必須範囲外
-   データベース名：`reservation_db`
-   アプリ名：`ReserveHub`

## 3. 機能一覧

  ID     機能             概要
  ------ ---------------- ------------------------------------------
  F-01   予約枠一覧取得   開始日を指定し、その日を含む7日間の予約枠と空き状況を取得する
  F-02   予約枠詳細取得   予約枠IDで詳細を取得する
  F-03   予約登録         空き予約枠を確保し、予約情報を登録する
  F-04   予約一覧取得     予約情報を一覧で取得する
  F-05   予約詳細取得     予約IDで予約情報を取得する
  F-06   予約キャンセル   予約をキャンセルし、予約枠を再開放する
  F-07   月別予約集計     指定月の予約件数を集計する
  F-08   予約枠管理       管理用APIで予約枠の一覧・詳細取得、作成・編集・削除を行う

## 4. API基本設計

  Method   Endpoint                               概要                 主な成功ステータス
  -------- -------------------------------------- -------------------- --------------------
  GET      `/api/slots?date=YYYY-MM-DD`           指定日から7日間の予約枠一覧   200
  GET      `/api/slots/:id`                       予約枠詳細           200
  GET      `/api/admin/slots`                     管理用予約枠一覧     200
  GET      `/api/admin/slots/:id`                 管理用予約枠詳細     200
  POST     `/api/admin/slots`                     予約枠作成           201
  PATCH    `/api/admin/slots/:id`                 予約枠編集           200
  DELETE   `/api/admin/slots/:id`                 予約枠削除           204
  POST     `/api/reservations`                    予約登録             201
  GET      `/api/reservations`                    予約一覧             200
  GET      `/api/reservations/:id`                予約詳細             200
  PATCH    `/api/reservations/:id/cancel`         予約キャンセル       200
  GET      `/api/reports/monthly?month=YYYY-MM`   月別予約集計         200

認証機能は本スコープでは実装しない。したがって、予約一覧・詳細APIは認証済みユーザーに限定されず、学習用データを対象とする。

## 5. データベース基本設計

### 5.1 reservation_slots（予約枠）

  カラム     型            制約・用途
  ---------- ------------- ---------------------------------------
  id         UUID          PK、予約枠ID
  start_at   TIMESTAMPTZ   NOT NULL、開始日時
  end_at     TIMESTAMPTZ   NOT NULL、終了日時
  status     VARCHAR(20)   NOT NULL、`available` / `reserved`
                           `end_at > start_at` をCHECK制約で保証

### 5.2 reservations（予約）

  カラム           型             制約・用途
  ---------------- -------------- -------------------------------------
  id               UUID           PK、予約ID
  slot_id          UUID           FK → `reservation_slots.id`
  customer_name    VARCHAR(100)   NOT NULL、予約者名
  customer_email   VARCHAR(255)   NOT NULL、予約者メール
  status           VARCHAR(20)    NOT NULL、`confirmed` / `cancelled`
  created_at       TIMESTAMPTZ    NOT NULL、作成日時

`reservations.slot_id` に対して、`status = 'confirmed'`
の行のみ一意とする部分UNIQUEインデックスを設定する。これによりキャンセル履歴を残しつつ、同一枠に有効な予約が複数存在することを防ぐ。

## 6. 予約処理の基本方針

### 6.1 予約登録

1.  トランザクションを開始する。
2.  対象の予約枠を `status = 'available'` の条件付きUPDATEで確保する。
3.  更新件数が0件なら、予約枠が存在しないか既に埋まっているため処理を中止する。
4.  予約データを `confirmed` でINSERTする。
5.  COMMITする。
6.  途中でエラーが発生した場合はROLLBACKする。

予約枠の確保と予約データの登録は、必ず同じ `PoolClient` を使用する。

### 6.2 予約キャンセル

1.  トランザクションを開始する。
2.  対象予約を確認し、未キャンセルであることを確認する。
3.  予約ステータスを `cancelled` に変更する。
4.  対応する予約枠を `available` に変更する。
5.  COMMITする。
6.  途中でエラーが発生した場合はROLLBACKする。

予約更新と枠の再開放を同一トランザクションに含める。

## 7. エラー・HTTPステータス方針

  ケース                         ステータス
  ---------------------------- ------------
  正常な取得・更新                      200
  予約登録成功                          201
  入力値不正                            400
  対象データが存在しない                404
  予約枠が埋まっている                  409
  既にキャンセル済み                    409
  想定外のサーバー・DBエラー            500

エラー応答は、クライアント向けメッセージと必要に応じたエラーコードを返す。SQLやスタックトレースなどの内部情報はレスポンスに含めない。

## 8. 非機能・実装方針

-   SQLはプレースホルダーを利用し、文字列連結によるSQL組み立てを避ける。
-   DB接続は `try / catch / finally` で管理し、`PoolClient.release()`
    を必ず実行する。
-   日時は `TIMESTAMPTZ` で管理し、APIで受け取る日付形式を明確にする。
-   予約キャンセルはレコード削除ではなく状態更新とする。
-   トランザクション境界はService層で管理する。
-   Repository層はSQL実行と結果の返却を担当する。

## 9. 対象外・将来拡張

以下は本バージョンでは実装しない。

-   ユーザー登録・ログイン・JWT認証
-   管理者・ユーザーの権限管理、ロールによる認可
-   決済・返金
-   メール通知
-   自動テストの本格導入
-   管理画面やフロントエンド

将来、認証を追加する際は `users` テーブルと `reservations.user_id`
を追加する。決済やメール通知は外部サービスとの整合性が必要になるため、DBトランザクションだけで完結すると考えない。
