# ユル単

科目ごとの出席条件・評価割合・実績をまとめて管理し、「あと何回欠席できるか」「目標点まであと何点必要か」を自動計算する学生向けWebアプリです。

Cloudflare Workersへデプロイ済みです。Worker名は `rakutan-zenya` です。公開URLはCloudflare側で管理しており、このリポジトリには固定値を保存していません。

## 主な機能

- メールアドレスとパスワードによるユーザー登録・ログイン・ログアウト
- 科目、出席条件、評価項目、評価割合、目標点数の登録・編集・削除
- 出席・欠席・遅刻・公欠の記録
- テスト・課題の得点記録
- 残り許容欠席回数と出席リスクの表示
- 目標達成に必要な残り評価の平均点を逆算
- 科目ごとの状況をまとめたダッシュボード
- Supabase RLSによるユーザー単位のデータ分離

## 使用技術

| 分類 | 技術 |
| --- | --- |
| アプリケーション | Next.js 16（App Router）、React 19、TypeScript |
| UI | Tailwind CSS 4 |
| 認証・DB | Supabase Auth、Supabase Postgres、Row Level Security |
| デプロイ | Cloudflare Workers、OpenNext for Cloudflare、Wrangler |
| テスト・品質管理 | Vitest、ESLint、TypeScript |

採用バージョン、役割分担、構成上の判断は [docs/技術スタック.md](docs/技術スタック.md) にまとめています。

## ローカルセットアップ

必要なNode.jsバージョンは `20.9.0` 以上です。

```bash
git clone https://github.com/hamabira/hackstage_stage2_rakutanzenya.git
cd hackstage_stage2_rakutanzenya
npm install
cp .env.local.example .env.local
```

`.env.local` にSupabaseの接続情報を設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` はRLSを迂回できるため、このアプリには設定しません。

続いて、Supabase CLIでマイグレーションを適用し、開発サーバーを起動します。

```bash
supabase login
supabase link --project-ref <プロジェクトのRef>
supabase db push
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。メール確認を有効にしていないSupabase環境では、`/signup` で登録後すぐに利用できます。

既存データがあるSupabase環境へマイグレーションを適用する場合は、先に [docs/データ整合性ルール.md](docs/データ整合性ルール.md) を確認してください。

## npm scripts

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | Next.js開発サーバーを起動 |
| `npm run dev:log` | 開発サーバーの出力を `log/` にも保存 |
| `npm run build` | Next.jsの本番ビルド |
| `npm run start` | Next.js本番サーバーを起動 |
| `npm run lint` | ESLintを実行 |
| `npm test` | Vitestの単体テストを実行 |
| `npm run preview` | Cloudflare Workers版をローカルプレビュー |
| `npm run deploy` | OpenNextでビルドしてCloudflare Workersへデプロイ |
| `npm run cf-typegen` | Wrangler設定からCloudflare環境型を生成 |

型チェックは `npx tsc --noEmit` で実行します。

## ディレクトリ構成

```text
src/
  app/          # App Routerのページ、Route Handler、Server Action
  components/   # UI、レイアウト、機能別コンポーネント
  lib/          # 認証、計算、入力変換、Supabaseアクセス、ドメイン型
  middleware.ts # Cloudflare互換の認証セッション更新と保護ルート判定
supabase/
  migrations/   # DBスキーマ、制約、書き込みRPC
docs/           # 要件、技術構成、運用資料
```

## ドキュメント

資料の用途と読み順は [docs/README.md](docs/README.md) にまとめています。

- [要件定義書](docs/要件定義書.md)
- [技術スタック](docs/技術スタック.md)
- [デプロイ手順](docs/デプロイ.md)
- [データ整合性ルール](docs/データ整合性ルール.md)
- [MVP外機能](docs/MVP外機能.md)
