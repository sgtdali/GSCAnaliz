# GSC Analytics Altyapısı

**Site:** uygunbakim.com  
**Property:** sc-domain:uygunbakim.com  
**Stack:** Next.js + Node.js/TypeScript + PostgreSQL (Supabase)

---

## 📖 İçindekiler

1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Mimari Genel Bakış](#mimari-genel-bakış)
3. [OAuth Kurulumu](#oauth-kurulumu)
4. [Veritabanı Kurulumu](#veritabanı-kurulumu)
5. [Veri Toplama](#veri-toplama)
6. [API Endpoint'leri](#api-endpointleri)
7. [Cron / Scheduler](#cron--scheduler)
8. [Analiz ve Skor Mantığı](#analiz-ve-skor-mantığı)
9. [Değişiklik Günlüğü ve Etki Analizi](#değişiklik-günlüğü-ve-etki-analizi)
10. [Riskler ve Hata Yönetimi](#riskler-ve-hata-yönetimi)
11. [Güvenlik](#güvenlik)
12. [MVP → v2 Yol Haritası](#mvp--v2-yol-haritası)
13. [İlk 48 Saat Checklist](#ilk-48-saat-checklist)

---

## 🚀 Hızlı Başlangıç

```bash
# 1. Bağımlılıkları kur
npm install

# 2. .env dosyasını hazırla
cp .env.example .env.local
# .env.local'ı düzenle — tüm değerleri doldur

# 3. Veritabanı şemasını oluştur
# Supabase Dashboard > SQL Editor > sql/001_create_tables.sql içeriğini çalıştır

# 4. OAuth flow'u başlat
npm run dev
# Tarayıcıda: http://localhost:3000/api/auth/google/authorize
# Google'da giriş yap → token'ları .env.local'a kaydet

# 5. İlk backfill
npx tsx scripts/gsc/backfill.ts --days=90

# 6. Haftalık özeti oluştur
npx tsx scripts/gsc/build-weekly-summary.ts --weeks=12

# 7. Dev server
npm run dev
```

---

## 🏗️ Mimari Genel Bakış

```
CRON (GitHub Actions / Vercel Cron)
  ↓
Scripts (fetch-daily, backfill, build-weekly)
  ↓
lib/gsc/client.ts ──→ Google Search Console API (OAuth 2.0)
  ↓
lib/db/upsert.ts ──→ PostgreSQL (Supabase)
  ↓
API Routes ──→ Admin Panel / Dashboard
```

### Neden Bu Stack?

| Karar | Neden | Alternatif (Reddedildi) |
|-------|-------|------------------------|
| PostgreSQL (Supabase) | SQL sorgulama gücü, RLS, managed | Google Sheets — ölçeklenmiyor |
| User OAuth (Service Account değil) | GSC property erişimi doğrudan | Service Account — ekstra IAM |
| Idempotent Upsert | Duplicate veri oluşmaz | INSERT IGNORE — veri kaybı riski |
| D-2 gecikme penceresi | GSC veri gecikmesi | Gerçek zamanlı — hatalı veri |
| GitHub Actions + Vercel Cron | İki seçenek, biri yedek | Sadece Vercel — lock-in |

---

## 🔑 OAuth Kurulumu

### 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → Yeni proje oluştur veya mevcut seç.
2. **APIs & Services > Library** → "Google Search Console API" → Enable.
3. **APIs & Services > Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**.
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
   - (Production): `https://yourdomain.com/api/auth/google/callback`
4. Client ID ve Client Secret'ı kopyala → `.env.local` dosyasına yapıştır.

### 2. OAuth Consent Screen

- **APIs & Services > OAuth consent screen**
- User Type: **External** (veya Internal — G Suite ise)
- Scopes: `https://www.googleapis.com/auth/webmasters.readonly`
- Test users: Kendi Google hesabını ekle

### 3. Token Alma

```bash
npm run dev
# Tarayıcı: http://localhost:3000/api/auth/google/authorize
```

Yetkilendirmeden sonra callback sayfasında token'lar gösterilir. `.env.local`'a ekle:

```env
GOOGLE_ACCESS_TOKEN=ya29.xxx
GOOGLE_REFRESH_TOKEN=1//xxx
```

### 4. Token Yenileme

- **access_token** ~1 saat geçerli → otomatik yenilenir (`lib/gsc/auth.ts`)
- **refresh_token** süresiz (revoke edilmediği sürece)
- Token yenilenince yeni access_token loglanır

---

## 🗃️ Veritabanı Kurulumu

### Tabloları Oluşturma

Supabase Dashboard → SQL Editor → `sql/001_create_tables.sql` içeriğini yapıştır ve çalıştır.

### Veri Modeli

#### `gsc_daily_metrics`
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| date | DATE | GSC tarih |
| page | TEXT | URL |
| clicks | INTEGER | Tıklama |
| impressions | INTEGER | Gösterim |
| ctr | DOUBLE | Click-through rate (%) |
| position | DOUBLE | Ortalama sıralama |
| fetched_at | TIMESTAMPTZ | Ne zaman çekildi |
| source_window | TEXT | D-2, backfill, vb. |

**UNIQUE Constraint:** `(date, page)` → Idempotent upsert garantisi.

#### `content_change_log`
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| changed_at | TIMESTAMPTZ | Değişiklik tarihi |
| page | TEXT | URL |
| change_type | TEXT | title/meta/content/internal_link/schema/tech/other |
| description | TEXT | Açıklama |
| actor | TEXT | Kim yaptı |

#### `weekly_page_summary`
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| week_start/end | DATE | Hafta aralığı |
| page | TEXT | URL |
| total_clicks/impressions | INTEGER | Haftalık toplam |
| avg_ctr/position | DOUBLE | Haftalık ortalama |
| prev_* | — | Önceki hafta değerleri |
| *_change_pct/*_delta | DOUBLE | WoW değişimler |

**UNIQUE Constraint:** `(week_start, page)`

#### `gsc_fetch_log`
Debugging ve monitoring. Her fetch işlemi loglanır.

---

## 📡 Veri Toplama

### Günlük Fetch

```bash
# Otomatik: bugün - 2 gün
npx tsx scripts/gsc/fetch-daily.ts

# Manuel: belirli tarih
npx tsx scripts/gsc/fetch-daily.ts --date=2026-02-15
```

### Backfill

```bash
# Son 90 gün
npx tsx scripts/gsc/backfill.ts --days=90

# Belirli aralık
npx tsx scripts/gsc/backfill.ts --start=2026-01-01 --end=2026-02-15
```

### Haftalık Özet

```bash
# Son 2 hafta (varsayılan)
npx tsx scripts/gsc/build-weekly-summary.ts

# Son 12 hafta (backfill)
npx tsx scripts/gsc/build-weekly-summary.ts --weeks=12
```

### Upsert Stratejisi

```
INSERT INTO gsc_daily_metrics (date, page, clicks, ...)
ON CONFLICT (date, page) DO UPDATE SET
  clicks = EXCLUDED.clicks,
  impressions = EXCLUDED.impressions,
  ...
  fetched_at = NOW()
```

- Aynı (date, page) çifti tekrar gelirse → sadece UPDATE
- Batch processing: 500 row'luk chunk'lar
- Her batch bağımsız → bir batch hata verirse diğerleri etkilenmez

---

## 🌐 API Endpoint'leri

Tüm endpoint'lar `x-api-key` header'ı gerektirir.

### `GET /api/seo/gsc/daily`

URL bazlı günlük metrikler.

**Params:** `page` (required), `days` (optional, default: 30)

```bash
curl -H "x-api-key: YOUR_KEY" \
  "http://localhost:3000/api/seo/gsc/daily?page=https://uygunbakim.com/blog/my-post&days=30"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-02-15",
      "page": "https://uygunbakim.com/blog/my-post",
      "clicks": 42,
      "impressions": 1250,
      "ctr": 3.36,
      "position": 8.5,
      "fetched_at": "2026-02-17T05:00:00Z"
    }
  ],
  "meta": { "totalRows": 30, "page": "...", "days": 30 }
}
```

### `GET /api/seo/gsc/weekly`

WoW analiz.

**Params:** `page` (optional), `weeks` (optional, default: 8)

```bash
curl -H "x-api-key: YOUR_KEY" \
  "http://localhost:3000/api/seo/gsc/weekly?page=https://uygunbakim.com/blog/my-post&weeks=8"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "week_start": "2026-02-09",
      "week_end": "2026-02-15",
      "page": "...",
      "total_clicks": 294,
      "total_impressions": 8750,
      "avg_ctr": 3.36,
      "avg_position": 8.5,
      "data_days": 7,
      "click_change_pct": 12.5,
      "impression_change_pct": -3.2,
      "ctr_delta": 0.52,
      "position_delta": -0.8
    }
  ]
}
```

### `GET /api/seo/gsc/impact`

Değişiklik etki analizi.

**Params:** `changeId` (required)

```bash
curl -H "x-api-key: YOUR_KEY" \
  "http://localhost:3000/api/seo/gsc/impact?changeId=42"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "page": "https://uygunbakim.com/blog/my-post",
    "change_date": "2026-01-15",
    "change_type": "title",
    "description": "Title tag güncellendi",
    "baseline_clicks": 180,
    "post_clicks": 245,
    "click_uplift_pct": 36.11,
    "confidence_level": "high"
  }
}
```

### `GET /api/seo/gsc/actions`

Aksiyon önerileri.

**Params:** `page` (optional), `minImpressions` (optional, default: 50)

```bash
curl -H "x-api-key: YOUR_KEY" \
  "http://localhost:3000/api/seo/gsc/actions?minImpressions=100"
```

### `POST /api/seo/gsc/changes`

Değişiklik kaydı oluştur.

```bash
curl -X POST -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "page": "https://uygunbakim.com/blog/my-post",
    "changeType": "title",
    "description": "Title iyileştirildi: eski → yeni",
    "actor": "seo-team"
  }' \
  "http://localhost:3000/api/seo/gsc/changes"
```

### `GET /api/seo/gsc/changes`

Değişiklik loglarını listele.

**Params:** `page` (optional), `limit` (optional, default: 50)

---

## ⏰ Cron / Scheduler

### Seçenek 1: GitHub Actions (Önerilen)

`.github/workflows/gsc-daily.yml` ve `.github/workflows/gsc-weekly.yml` hazır.

**GitHub Secrets olarak ekleyin:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_REDIRECT_URI`
- `GSC_SITE_URL`

### Seçenek 2: Vercel Cron

`vercel.json` yapılandırması hazır. `CRON_SECRET` env variable ekleyin.

### Zamanlama

| Job | Saat (UTC) | Saat (TR) | Frekans |
|-----|-----------|-----------|---------|
| fetch-daily | 05:00 | 08:00 | Her gün |
| build-weekly | 06:00 | 09:00 | Her Pazartesi |

---

## 📊 Analiz ve Skor Mantığı

### WoW Aksiyon Kuralları

| Kural | Koşul | Aksiyon |
|-------|-------|---------|
| 1 | Impressions ↑>10% + CTR ↓>0.5% | `TITLE_META_TEST` |
| 2 | Position ↑>1 basamak + Click <5% | `SNIPPET_INTENT_REVIEW` |
| 3 | Click ↓>15% | `QUERY_LOSS_ANALYSIS` |
| 4 | Click ↓>10% + Impression ↓>10% | `URGENT_REVIEW` |
| 5 | Position ↓>2 basamak | `POSITION_DECLINE_CHECK` |
| 6 | Click ↑>20% + Impression ↑>20% | `GROWTH_OPPORTUNITY` |
| — | None of above | `MONITOR` |

### Öncelik Skoru (0-100)

```
+30: Impressions > 1000
+20: Impressions > 500
+10: Impressions > 100
+40: Click düşüşü > 30%
+25: Click düşüşü > 15%
+20: Position kötüleşme > 5 basamak
+10: CTR düşüşü > 1%
```

---

## 🔄 Değişiklik Günlüğü ve Etki Analizi

### Etki Ölçüm Modeli

1. **Baseline**: Değişiklikten önceki 14 gün
2. **Post-change**: Değişiklikten sonraki 14 gün
3. **Uplift**: `((post - baseline) / baseline) × 100`

### Güven Eşikleri

| Seviye | Minimum Impressions | Minimum Veri Günü |
|--------|--------------------|--------------------|
| High | ≥ 100 | ≥ 10 |
| Medium | ≥ 30 | ≥ 5 |
| Low | < 30 | < 5 |

### Karar Matrisi

| Uplift | Güven | Karar |
|--------|-------|-------|
| > +10% | High | ✅ Pozitif etki |
| < -10% | High | ❌ Negatif etki |
| Any | Low | ⚠️ Yetersiz veri |

---

## ⚠️ Riskler ve Hata Yönetimi

### Hata Senaryoları

| Hata | Kod | Strateji |
|------|-----|----------|
| Token expired | 401 | Otomatik refresh → başarısızsa OAuth flow tekrar |
| Permission denied | 403 | Log + admin alert — OAuth flow tekrar gerekebilir |
| Rate limit | 429 | `Retry-After` header'ına göre bekleme |
| Server error | 5xx | Exponential backoff (1s → 2s → 4s → 8s → 16s) + jitter |
| Network error | — | 3 retry → başarısızsa log + alert |
| Empty data | — | Normal — GSC henüz veri yayınlamamış |

### Retry/Backoff Stratejisi

```
delay = min(base × 2^attempt + random(0, base), 60000)
base = 1000ms
max_retries = 5
max_delay = 60s
```

### Rate Limiting

- Sliding window: 50 request/dakika (API limiti 1200'ün çok altında)
- Her request öncesi kontrol → gerekirse bekleme

### Risklər

1. **GSC Quota**: Günlük 25,000 row/request × blog sayfa sayısı genellikle yeterli
2. **Token Revocation**: Kullanıcı Google ayarlarından izni kaldırabilir → monitoring gerekli
3. **Data Freshness**: D-2 penceresi bile bazen yetersiz olabilir → D-3 fallback düşünülebilir
4. **Supabase Free Tier**: 500MB DB → ~2 yıllık veri kapasitesi (tahmini)

---

## 🔒 Güvenlik

1. **Token Saklama**: `.env.local` (local), GitHub Secrets / Vercel Env (prod)
2. **Least Privilege**: `webmasters.readonly` — sadece okuma
3. **API Koruması**: `x-api-key` header — production'da Supabase Auth'a geçiş önerilir
4. **RLS**: Tüm tablolarda aktif — service_role bypass
5. **HTTPS**: Tüm API çağrıları HTTPS üzerinden
6. **Token Rotation**: access_token otomatik yenilenir, refresh_token uzun ömürlü

---

## 🗺️ MVP → v2 Yol Haritası

### MVP (Hafta 1-2) ✅

- [x] Veritabanı şeması
- [x] OAuth flow
- [x] Günlük veri çekme
- [x] Backfill
- [x] Haftalık özet
- [x] 5 API endpoint
- [x] WoW aksiyon önerileri
- [x] Değişiklik günlüğü
- [x] GitHub Actions cron

### v1.1 (Hafta 3-4)

- [ ] Query bazlı kırılım tablosu (`gsc_query_metrics`)
- [ ] Device/Country kırılımı
- [ ] Dashboard UI (Next.js + Recharts)
- [ ] Email/Slack notification

### v2 (Ay 2-3)

- [ ] Otomatik anomali tespiti (z-score based)
- [ ] Topical cluster analizi
- [ ] Competitor tracking (GSC dışı)
- [ ] AI-powered action recommendations (LLM integration)
- [ ] Multi-site desteği
- [ ] Custom date range comparison
- [ ] Export (CSV, PDF rapor)
- [ ] Webhook integration (content change otomatik algılama)

### v3 (Ay 4+)

- [ ] Real-time dashboard (WebSocket)
- [ ] SEO experiment framework (A/B test title/meta)
- [ ] Predictive analytics (trend forecasting)
- [ ] Content decay detection
- [ ] Internal link optimization suggestions

---

## ✅ İlk 48 Saat Checklist

### Saat 0-4: Altyapı

- [ ] Supabase projesini oluştur
- [ ] Google Cloud projesini oluştur
- [ ] OAuth credentials al
- [ ] `.env.local` dosyasını doldur
- [ ] `npm install` çalıştır

### Saat 4-8: Veritabanı + Auth

- [ ] SQL şemasını Supabase'de çalıştır (`sql/001_create_tables.sql`)
- [ ] `npm run dev` → OAuth flow'u tamamla
- [ ] Token'ları `.env.local`'a kaydet
- [ ] Test: `npx tsx scripts/gsc/fetch-daily.ts --date=2026-02-14`

### Saat 8-16: Backfill

- [ ] 90 günlük backfill: `npx tsx scripts/gsc/backfill.ts --days=90`
- [ ] Supabase Dashboard'dan verileri kontrol et
- [ ] Haftalık özeti oluştur: `npx tsx scripts/gsc/build-weekly-summary.ts --weeks=12`

### Saat 16-24: API'leri Test Et

- [ ] `GET /api/seo/gsc/daily?page=...` test
- [ ] `GET /api/seo/gsc/weekly?page=...` test
- [ ] `POST /api/seo/gsc/changes` ile test değişiklik kaydet
- [ ] `GET /api/seo/gsc/actions` aksiyon önerilerini incele

### Saat 24-36: Cron Kurulumu

- [ ] GitHub Secrets'ı ekle
- [ ] GitHub Actions workflow'larını push et
- [ ] Manuel tetikleme ile test et
- [ ] (Opsiyonel) Vercel'e deploy et

### Saat 36-48: Review + Monitoring

- [ ] `gsc_fetch_log` tablosunu kontrol et
- [ ] İlk `impact` analizini dene
- [ ] Aksiyon önerilerini gözden geçir
- [ ] Slack/email notification planla

---

## 📦 Env Değişkenleri Listesi

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `SUPABASE_URL` | ✅ | Supabase proje URL'i |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (RLS bypass) |
| `SUPABASE_ANON_KEY` | ❌ | Anon key (client-side için) |
| `GOOGLE_CLIENT_ID` | ✅ | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | ✅ | OAuth callback URL |
| `GOOGLE_ACCESS_TOKEN` | ⚠️ | İlk çalıştırmada gerekli, sonra auto-refresh |
| `GOOGLE_REFRESH_TOKEN` | ✅ | Kalıcı refresh token |
| `GSC_SITE_URL` | ✅ | `sc-domain:uygunbakim.com` |
| `GSC_URL_PREFIX` | ❌ | Varsayılan: `/blog/` |
| `API_SECRET_KEY` | ✅ | API authentication key |
| `CRON_SECRET` | ❌ | Vercel cron authentication |
| `NODE_ENV` | ❌ | `development` veya `production` |

---

## Varsayımlar

1. **GSC property** `sc-domain:uygunbakim.com` olarak kullanılıyor (URL prefix değil).
2. **Blog URL'leri** `https://uygunbakim.com/blog/...` formatında.
3. **Hafta başlangıcı** Pazartesi olarak kabul edildi.
4. **CTR değerleri** yüzde (%) olarak saklanıyor (0-100 arası, 0.0-1.0 değil).
5. **Position değerleri** küçük = iyi. Position delta negatif = iyileşme.
6. **Supabase Free tier** yeterli kapasiteye sahip (tahminen 2 yıl).
7. **Tek site** analizi yapılıyor; multi-site v2'de planlanıyor.
