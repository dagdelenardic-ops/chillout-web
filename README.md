# Chillout Hub

Next.js + Firebase ile yapilan chillout sitesi.

## Ozellikler
- Arka planda loop muzik (ac/kapat + ses ayari)
- Klasik pomodoro: 25 dk odak + 5 dk dinlen
- Dinlen modunda Google login ile tek odali chat
- "Ilginc Sitelerde Yuvarlan" sekmesi
  - Ekşi Sozluk kaynagindan secilen siteler
  - Global kafa dagitici siteler
  - Rastgele secip yeni sekmede acma

## Kurulum
```bash
cd /Users/gurursonmez/Downloads/chillout-web
npm install
cp .env.example .env.local
npm run dev
```

## Firebase Ayarlari
1. Firebase Console'da proje ac.
2. Authentication > Sign-in method > Google aktif et.
3. Firestore Database olustur.
4. Web app ekleyip `.env.local` icine asagidaki degerleri gir:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Firestore guvenlik kurali (baslangic icin)
Asagidaki kural sadece giris yapan kullanicilarin mesaja yazmasina izin verir.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /singleRoomMessages/{messageId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

## Muzik Dosyalari
MP3 dosyalarini bu klasore koy:
- `/Users/gurursonmez/Downloads/chillout-web/public/music`

Varsayilan beklenen dosya adlari:
- `trip.mp3`
- `bass-drum-remix.mp3`
- `recording-a.mp3`
- `recording-b.mp3`

Dosya adlarini degistirmek istersen:
- `/Users/gurursonmez/Downloads/chillout-web/src/data/audioTracks.ts`

## Kaynaklar
- Ekşi Sozluk basligi: https://eksisozluk.com/az-kisinin-bildigi-muhtesem-web-siteleri--2764697?a=dailynice
- Global secim: neal.fun, window-swap, a soft murmur, thisissand, vb.
