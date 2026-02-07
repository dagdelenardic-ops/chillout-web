# Chillout

Müzik, odaklanma ve keşif.

## Başlangıç

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Firebase (sohbet için)

1. Firebase Console'da proje aç
2. Authentication > Google aktif et
3. Firestore Database oluştur
4. `.env.local` içine değerleri gir:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Müzik

MP3 dosyalarını `public/music/` klasörüne koy.
