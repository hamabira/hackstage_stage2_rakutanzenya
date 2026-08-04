# 成績・出席管理Webアプリ

出席・課題・テストの評価方法は科目ごとにバラバラで、「あと何回休めるか」「あと何点取れば目標に届くか」を都度自分で計算するのは面倒。このアプリは科目ごとに評価方法(出席条件・課題・テストの重み付け)を登録しておくと、それをもとに「あと何が必要か」を逆算して表示する学生向けのWebアプリです。

## 主な機能(MVP)

- ユーザー認証(メール/パスワード)
- 科目ごとの評価方法の登録(出席条件、評価項目とその重み、目標成績)
- 出席・テスト・課題の実績記録(手動入力)
- 出席の残り許容回数、目標達成に必要な点数の逆算表示
- 科目一覧・ダッシュボードでの状況確認

現時点でこのリポジトリは **基盤(認証・DB・画面のルーティング雛形)** が動く状態で、計算ロジックや一部フォームの中身は後続の実装待ちです。詳しくは [現在の実装状況](#現在の実装状況) を参照してください。

## 技術スタック

- [Next.js](https://nextjs.org/) 16 (App Router, TypeScript, Tailwind CSS)
- [Supabase](https://supabase.com/) (Auth + Postgres)

> **注意**: Next.js 16は破壊的変更が多い新しいメジャーバージョンです。特に旧`middleware.ts`は`proxy.ts`という名前・規約に変わっています([src/proxy.ts](src/proxy.ts))。Next.jsのドキュメントや過去の知識と食い違う場合は、ローカルの`node_modules/next/dist/docs/`か[公式ドキュメント](https://nextjs.org/docs)を優先してください。

## 必要環境

- Node.js 20以上(手元では v26 で動作確認済み)
- npm
- Supabaseアカウント(無料枠でOK)

## セットアップ

### 1. リポジトリの取得と依存パッケージのインストール

```bash
git clone https://github.com/hamabira/hackstage_stage2_rakutanzenya.git
cd hackstage_stage2_rakutanzenya
npm install
```

### 2. Supabaseプロジェクトの準備

1. [Supabase](https://supabase.com/dashboard) で新規プロジェクトを作成(チームで1つ共有する運用を想定)
2. `supabase/migrations/0001_init.sql` の内容をSupabaseダッシュボードのSQL Editorで実行し、テーブル・RLSポリシーを作成
3. プロジェクトの Settings > API から `Project URL` と `anon public key` を取得

### 3. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` に取得したSupabaseの値を設定する。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

このアプリで必要なのは上記の2つだけです。`SUPABASE_SERVICE_ROLE_KEY` はRLSを迂回できるため、アプリの環境変数へ設定・コミットしてはいけません。`.env.local` はgitignore対象で、コミットするのは値を含まない `.env.local.example` のみです。

Supabaseダッシュボードの Authentication > Sign In / Providers > Email で **Confirm email をオフ**にしておく(`mailer_autoconfirm`)。無料枠はメール送信数が1時間あたり数通に制限されており、確認メールを使う構成だとハッカソン中の動作確認だけですぐ制限に達してしまうため、このアプリはサインアップ即ログインになる構成にしています。`src/app/auth/callback/route.ts` は将来OAuthログインなどを追加する際に使う想定で残してあります。

### 4. 開発サーバー起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。未ログインの場合は自動的に `/login` にリダイレクトされます。`/signup` から新規登録すればそのままログイン状態で `/dashboard` に入れます。

## npm scripts

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー起動 |
| `npm run dev:log` | 開発サーバーを起動しつつ、ターミナルの出力を`log/`フォルダにファイルとしても保存する(トラブル時の共有用。`log/`はgitignore対象) |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番ビルドしたものを起動 |
| `npm run lint` | ESLint実行 |

型チェックは `npx tsc --noEmit` で行う(専用scriptは未定義)。

## ディレクトリ構成

```text
src/
  app/
    login/, signup/, auth/callback/, logout/   # 認証
    dashboard/                                  # ログイン後トップ(要認証)
    subjects/                                   # 科目一覧・詳細・登録・編集・記録(要認証)
  components/
    ui/            # 汎用UIパーツ
    layout/        # 共通ヘッダーなどのレイアウト部品
    subjects/      # 科目関連コンポーネント
    dashboard/     # ダッシュボード関連コンポーネント
  lib/
    auth/          # Server Action用の認証情報検証
    supabase/      # Supabaseクライアント(client/server/proxy用)、クエリ関数(queries/)
    calc/          # 計算ロジック(出席逆算・目標逆算)。関数シグネチャのみ定義済み、中身は未実装
    types/         # ドメイン型定義
  proxy.ts          # 認証セッション保護(Next.js 16のProxy機能。旧middleware)
supabase/
  migrations/       # DBスキーマ(SQL)
```

## 現在の実装状況

**動くもの**

- Next.js + Supabase Authによるユーザー登録・ログイン・ログアウト(メール確認なし、即ログイン)
- 未認証時に `/dashboard`, `/subjects` 配下へアクセスすると `/login` にリダイレクト
- Supabase Postgresのテーブル設計・RLSポリシー(`supabase/migrations/0001_init.sql`)
- `/dashboard`, `/subjects` での登録済み科目一覧の実データ表示([src/lib/supabase/queries/subjects.ts](src/lib/supabase/queries/subjects.ts))
- 共通ナビゲーション(ダッシュボード/科目一覧/ログアウト、[src/components/layout/AppHeader.tsx](src/components/layout/AppHeader.tsx))と各画面の戻るリンク

**未実装(雛形のみ)**

- 科目の新規登録・評価方法編集フォームの送信処理([src/components/subjects/SubjectForm.tsx](src/components/subjects/SubjectForm.tsx))
- 出席・テスト/課題の記録入力フォーム
- 出席の残り許容回数の計算(`calcRemainingAbsences`、[src/lib/calc/attendance.ts](src/lib/calc/attendance.ts))
- 目標点数の逆算計算(`calcRequiredScore`、[src/lib/calc/gradeGoal.ts](src/lib/calc/gradeGoal.ts))

いずれも関数シグネチャ・画面ルーティングは用意済みで、中身の実装だけが残っている状態です。

## 開発の進め方

基盤構築が終わった段階なので、ここから先はGitHub issueを立ててチケットを切り、機能ごとに分担して実装していく想定です。粒度の目安は「1issue = 1画面のCRUD、または1計算ロジック関数」。フォーム(UI)と計算ロジック(`lib/calc/`)を分離しているため、フロント担当とロジック担当を分けて並行作業できます。

### 今後のissue分割案

#### 科目管理

- 科目登録フォーム実装(`/subjects/new`)
- 評価方法(grade_items)編集UI実装(`/subjects/[id]/edit`、重み合計チェック等)

#### 実績記録

- 出席記録入力UI実装(`/subjects/[id]/attendance`)
- テスト/課題点数記録UI実装(`/subjects/[id]/tests`)

#### 計算ロジック

- 出席計算ロジック実装(`calcRemainingAbsences` の中身+テスト)
- 目標逆算計算ロジック実装(`calcRequiredScore` の中身+テスト)

#### ダッシュボード/表示

- 科目詳細ダッシュボードUI実装(`/subjects/[id]`、逆算結果の表示)
- ダッシュボードトップの全体サマリ実装(危険度ハイライト等)

#### 認証

- Supabase Auth E2E動作確認とエラーハンドリング強化

#### 将来issue(MVP範囲外、backlog)

- シラバスAI解析による評価方法自動入力(テキスト貼り付け→AI構造化)
- PDF/画像OCRでのシラバス取り込み
- 優/良/可などのグレード⇔点数マッピング機能
- プロフィール/ユーザー設定画面
- 外部学務システム連携

## トラブルシューティング

- **サインアップ/ログインでエラーが出る**: Supabaseの環境変数(`.env.local`)が正しく設定されているか確認してください。`npm run dev:log` を使うとターミナル出力が`log/`フォルダに残るので、エラー内容を共有しやすくなります。
- **メール送信のレート制限に引っかかる**: 前述の通り`mailer_autoconfirm`をオンにしていればメール送信自体が発生しないはずです。オフになっていないか確認してください。
