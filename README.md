# E-Commerce REST API

NestJS (TypeScript) ile geliştirilmiş, modüler ve katmanlı mimariye sahip bir e-ticaret backend API'sidir.
Wibesoft Backend Developer Teknik Değerlendirme Görevi kapsamında hazırlanmıştır.

---

## Kullanılan Teknolojiler

| Teknoloji | Açıklama |
|-----------|----------|
| **NestJS** | Ana backend framework |
| **TypeScript** | Tip güvenliği ve sürdürülebilir kod yapısı |
| **PostgreSQL** | İlişkisel veritabanı |
| **TypeORM** | ORM katmanı — entity yönetimi ve sorgular |
| **JWT + bcryptjs** | Kimlik doğrulama ve şifre hashing |
| **Swagger / OpenAPI** | Otomatik API dokümantasyonu |
| **class-validator** | DTO validasyon kuralları |
| **class-transformer** | Request/response dönüşümleri |

---

## Modüller

| Modül | Açıklama |
|-------|----------|
| **Auth** | Kullanıcı kaydı (register) ve girişi (login), JWT token üretimi |
| **Products** | Herkese açık ürün kataloğu — sayfalama ve arama destekli |
| **Cart** | JWT korumalı sepet yönetimi — ekleme, güncelleme, silme |
| **Orders** | JWT korumalı sipariş yönetimi — sepeti siparişe dönüştürme |

---

## Kurulum ve Çalıştırma

### 1. Repoyu klonla

```bash
git clone <repository-url>
cd ecommerce-api
```

### 2. Bağımlılıkları yükle

```bash
npm install
```

### 3. Ortam değişkenlerini yapılandır

Proje kök dizininde `.env` dosyası oluştur:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=ecommerce
DB_SSL=false
JWT_SECRET=supersecretkey
JWT_EXPIRES_IN=7d
PORT=3000
```

> **Not:** Aiven gibi bulut PostgreSQL kullanıyorsan `DB_SSL=true` olarak ayarla.

### 4. PostgreSQL veritabanını oluştur

```sql
CREATE DATABASE ecommerce;
```

> TypeORM `synchronize: true` ile çalıştığından tablolar otomatik oluşturulur.

### 5. Uygulamayı başlat

```bash
npm run start:dev
```

Uygulama `http://localhost:3000` adresinde çalışır.

---

## Veritabanını Seed Et

DummyJSON API'sinden 20 örnek ürün çeker ve veritabanına ekler:

```bash
npx ts-node src/seed.ts
```

---

## API Dokümantasyonu (Swagger)

Uygulama çalışırken aşağıdaki adresten interaktif API dokümantasyonuna erişebilirsin:

**http://localhost:3000/api/docs**

Korumalı endpointler için önce `/api/auth/login` ile token al, ardından **Authorize** butonuna yapıştır.

---

## API Endpointleri

### Auth (`/api/auth`) — Public
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/register` | Yeni kullanıcı kaydı |
| POST | `/api/auth/login` | Giriş yap, JWT al |

### Products (`/api/products`) — Public
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/products` | Ürün listesi (sayfalama + arama) |
| GET | `/api/products/:id` | Tekil ürün detayı |

### Cart (`/api/cart`) — JWT Zorunlu
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/cart` | Sepeti getir (yoksa oluştur) |
| POST | `/api/cart/items` | Sepete ürün ekle |
| PATCH | `/api/cart/items/:itemId` | Ürün adedini güncelle |
| DELETE | `/api/cart/items/:itemId` | Üründen kaldır |
| DELETE | `/api/cart` | Sepeti tamamen temizle |

### Orders (`/api/orders`) — JWT Zorunlu
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/orders` | Sepetten sipariş oluştur |
| GET | `/api/orders` | Kullanıcının tüm siparişleri |
| GET | `/api/orders/:id` | Tekil sipariş detayı |

---

## Proje Yapısı

```
src/
  modules/
    auth/           # Kayıt, giriş, JWT strategy ve guard
    products/       # Ürün kataloğu (public)
    cart/           # Sepet yönetimi (JWT korumalı)
    orders/         # Sipariş yönetimi (JWT korumalı)
  common/
    filters/        # Global HTTP exception filter
    decorators/     # @CurrentUser() decorator
  config/           # TypeORM async konfigürasyonu
  users/entities/   # User entity
  app.module.ts     # Root modül
  main.ts           # Bootstrap, Swagger, ValidationPipe
  seed.ts           # Veritabanı seed scripti
```

---

## Varsayımlar

- Sepet, kullanıcı bazlıdır (`userId` üzerinden bağlıdır). Her kullanıcının en fazla bir aktif sepeti olur.
- Sipariş oluşturulurken ürünün fiyatı anlık olarak kaydedilir (`unitPrice` snapshot). Sonraki fiyat değişiklikleri geçmiş siparişleri etkilemez.
- Ürün stoğu sipariş anında düşürülür.
- Şifreler bcryptjs ile 10 salt round kullanılarak hash'lenir.
- TypeORM `synchronize: true` olarak ayarlıdır (development ortamı için). Production'da migration kullanılmalıdır.
- SSL bağlantısı `.env` dosyasındaki `DB_SSL` değişkeniyle kontrol edilir. Aiven gibi bulut veritabanları için `true` olarak ayarlanmalıdır.

## Bonus Özellikler

- **JWT Authentication** — Register/Login endpoint'leri, tüm Cart ve Orders endpoint'leri JWT ile korunmaktadır.
- **Sipariş Yönetimi** — Sepeti siparişe dönüştürme, toplam tutar hesaplama, stok düşme ve sipariş geçmişi.
- **Logging** — NestJS built-in `Logger` ile tüm servis katmanlarında yapılandırılmış log kaydı.
- **Global Exception Filter** — Tüm HTTP hatalarını `{ statusCode, message, timestamp, path }` formatında döner.
- **Seed Script** — DummyJSON API'sinden 20 gerçekçi ürünle veritabanını tek komutla doldurur.
- **Swagger/OpenAPI** — Tüm endpoint'ler `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth` dekoratörleriyle tam dokümante edilmiştir.
