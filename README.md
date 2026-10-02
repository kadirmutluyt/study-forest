# 🌳 StudyForest

Çalıştıkça ağaç büyüten mobil uygulama. Ders çalış, görev tamamla, ormanını oluştur!

## ✨ Özellikler

- 🍅 **Pomodoro, Serbest ve Hedef** zamanlayıcı modları
- 🌲 5 farklı ağaç türü, 5 büyüme seviyesi
- 🏆 10 başarım rozeti
- 🔥 Günlük çalışma serisi (streak)
- 🎊 Konfeti animasyonu
- 📊 Haftalık çalışma istatistikleri
- ☁️ Supabase ile bulut senkronu

## 🚀 Kurulum

### 1. Repoyu klonla
```bash
git clone https://github.com/KULLANICI_ADIN/study-forest.git
cd study-forest
npm install
```

### 2. Supabase kur
- [supabase.com](https://supabase.com)'da yeni proje oluştur
- `supabase/schema.sql` dosyasını **SQL Editor**'da çalıştır

### 3. Ortam değişkenlerini ayarla
```bash
cp .env.example .env
```
`.env` dosyasına Supabase URL ve Anon Key'ini yaz.

### 4. Uygulamayı başlat
```bash
npx expo start
```

## 🛠️ Tech Stack

| Teknoloji | Kullanım |
|-----------|---------|
| React Native + Expo | Mobil uygulama |
| Expo Router | File-based navigation |
| Supabase | Auth + Veritabanı |
| Zustand | State yönetimi |
| react-native-svg | Ağaç animasyonları |

## 📁 Proje Yapısı

```
study-forest/
├── app/               # Expo Router ekranları
│   ├── (auth)/        # Giriş / Kayıt
│   └── (tabs)/        # Ana uygulama sekmeleri
├── src/
│   ├── components/    # UI bileşenleri
│   ├── features/      # İş mantığı (timer, tree, xp...)
│   ├── constants/     # Tema, ağaç türleri
│   └── types/         # TypeScript tipleri
└── supabase/
    └── schema.sql     # Veritabanı şeması
```

## 📄 Lisans

MIT
