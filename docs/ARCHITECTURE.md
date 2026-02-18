# GSC Analytics Altyapısı — Mimari Tasarım

## Site: uygunbakim.com
## GSC Property: sc-domain:uygunbakim.com

---

## 1. Genel Mimari

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        CRON / SCHEDULER                                  │
│  (GitHub Actions veya Vercel Cron)                                       │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────────┐        │
│  │ fetch-daily  │  │ backfill (adhoc) │  │ build-weekly-summary │        │
│  │ (her gün)    │  │ (manuel/cron)    │  │ (her Pazartesi)      │        │
│  └──────┬───────┘  └──────┬───────────┘  └──────┬───────────────┘        │
└─────────┼─────────────────┼──────────────────────┼───────────────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER (Node.js/TS)                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐              │
│  │ lib/gsc/     │  │ lib/db/          │  │ lib/analysis/ │              │
│  │ client.ts    │  │ queries.ts       │  │ scoring.ts    │              │
│  │ auth.ts      │  │ upsert.ts        │  │ actions.ts    │              │
│  └──────┬───────┘  └──────┬───────────┘  └───────┬───────┘              │
└─────────┼─────────────────┼──────────────────────┼───────────────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌──────────────────┐  ┌────────────────────────────────────────────────────┐
│  Google Search   │  │           PostgreSQL (Supabase)                    │
│  Console API     │  │  ┌──────────────────┐  ┌────────────────────┐     │
│  (OAuth 2.0)     │  │  │ gsc_daily_metrics│  │ content_change_log │     │
│                  │  │  └──────────────────┘  └────────────────────┘     │
│                  │  │  ┌──────────────────────────────────────────┐     │
│                  │  │  │ weekly_page_summary                      │     │
│                  │  │  └──────────────────────────────────────────┘     │
└──────────────────┘  └────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTES (Admin Panel)                     │
│  GET /api/seo/gsc/daily?page=...                                        │
│  GET /api/seo/gsc/weekly?page=...                                       │
│  GET /api/seo/gsc/impact?page=...&changeId=...                          │
│  GET /api/seo/gsc/actions?page=...                                      │
│  POST /api/seo/gsc/changes                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

## 2. Neden Bu Mimari?

### 2.1 Supabase + PostgreSQL
- **Neden**: Managed PostgreSQL, Row Level Security (RLS), REST API built-in.
- **Alternatif reddedildi**: Google Sheets — ölçeklenmiyor, SQL sorguları yazılamıyor, rate limit sorunlu.

### 2.2 OAuth 2.0 (User OAuth, Service Account değil)
- **Neden**: GSC property erişimi doğrudan kullanıcının Google hesabıyla. Token yenileme (refresh_token) ile 7/24 çalışabilir.
- **Güvenlik**: Token'lar env variable olarak saklanır, asla koda gömülmez.

### 2.3 Idempotent Upsert
- **Neden**: Aynı gün/URL tekrar çekilirse duplicate oluşmamalı.
- **Strateji**: `ON CONFLICT (date, page) DO UPDATE SET ...`

### 2.4 Gecikme Penceresi (D-2)
- **Neden**: GSC verisi 2 gün gecikmeli. `fetch-daily` her gün çalışır ama `today - 2` tarihini hedefler.
- **Haftalık analiz**: Son 2 gün hariç tutulur.

### 2.5 Rate Limit / Quota Yönetimi
- **GSC API Limits**: 1200 request/dakika, 25000 row/request.
- **Strateji**: Exponential backoff + jitter, 429/5xx retry.

## 3. Veri Akışı

1. **Günlük (05:00 UTC)**: `fetch-daily.ts` → GSC API (D-2) → `gsc_daily_metrics` UPSERT
2. **Backfill (adhoc)**: `backfill.ts` → Belirli tarih aralığı → Aynı UPSERT
3. **Haftalık (Pazartesi 06:00 UTC)**: `build-weekly-summary.ts` → SQL aggregation → `weekly_page_summary` UPSERT
4. **API**: Next.js route handler → PostgreSQL sorgusu → JSON response

## 4. Güvenlik

- OAuth token'lar `.env.local` ve Supabase Vault/Secrets
- Admin API'ler `x-api-key` veya Supabase auth ile korunur
- RLS politikaları ile veri izolasyonu
- Least privilege: GSC API'de sadece `webmasters.readonly` scope

## 5. Dosya Yapısı

```
/
├── docs/
│   └── ARCHITECTURE.md
├── scripts/
│   └── gsc/
│       ├── fetch-daily.ts
│       ├── backfill.ts
│       └── build-weekly-summary.ts
├── lib/
│   ├── gsc/
│   │   ├── client.ts
│   │   └── auth.ts
│   ├── db/
│   │   ├── connection.ts
│   │   ├── upsert.ts
│   │   └── queries.ts
│   └── analysis/
│       ├── scoring.ts
│       └── actions.ts
├── app/
│   └── api/
│       └── seo/
│           └── gsc/
│               ├── daily/route.ts
│               ├── weekly/route.ts
│               ├── impact/route.ts
│               ├── actions/route.ts
│               └── changes/route.ts
├── sql/
│   ├── 001_create_tables.sql
│   ├── 002_create_indexes.sql
│   ├── 003_weekly_summary.sql
│   └── 004_analysis_queries.sql
├── .github/
│   └── workflows/
│       ├── gsc-daily.yml
│       └── gsc-weekly.yml
├── .env.example
├── package.json
└── tsconfig.json
```
