# Oqsil - O'zbekistonning Premium Sog'lom Turmush Tarzi Ilovasi 🍏💪

**Oqsil** — bu sun'iy intellektga asoslangan zamonaviy, tezkor va professional darajadagi sog'liqni saqlash hamda ovqatlanishni nazorat qiluvchi ilova (React Native & Expo). 

## 🚀 Asosiy Imkoniyatlar (Features)

*   **🍏 AI Ovqat Skaneri (Food Scanner):** Kamera orqali ovqatning rasmini olish orqali kaloriyasini va tarkibini (oqsil, yog', uglevod) avtomatik aniqlash.
*   **🤖 AI Maslahatchi (Chat):** Shaxsiy dietolog kabi maslahat beruvchi sun'iy intellekt. O'zbek tilida muloqot qiladi, ovqat rejalarini jadvallar (Markdown tables) orqali chiroyli formatda yetkazadi.
*   **📱 iMessage Uslubidagi Chat UI:** Mukammal va tezkor (Inverted FlatList) ishlashiga ega bo'lgan premium ko'rinishdagi chat tizimi. Gradient pufakchalar va dumlar (tails), shuningdek javob kutishdagi (Typing) animatsiyalar.
*   **⌚ Health Connect / Apple HealthKit Integratsiyasi:** Telefon, aqlli soatlardagi yurgan qadamlar, masofa va faol kaloriyalarni to'g'ridan-to'g'ri ilovaga ulash tizimi. (Xatosiz ulanish, crash'lardan saqlovchi barqaror mantiq yozilgan).
*   **📊 Premium Statistika:** Haftalik va oylik vazn hamda kaloriya jadvallari, kaloriya xalqasi (Ring chart), va kunlik oqsil maqsadlari datchiklari.
*   **💾 Xotira xavfsizligi (AsyncStorage):** Chat va foydalanuvchi ma'lumotlari mahalliy xotirada xavfsiz tarzda saqlanadi.
*   **🎨 Glassmorphism & Dark Mode:** Shishasimon pastki menyu (Bottom Navigation), ajoyib mikro-animatsiyalar (Haptics Feedback), to'liq qorong'u/yorug' (Dark/Light) rejim qo'llab-quvvatlovi.

## 🛠 Texnologiyalar (Tech Stack)

- **Freymvork:** React Native (Expo)
- **UI & Stil:** Custom UI, Expo Blur, React Native Reanimated
- **Mahalliy (Native) Integratsiyalar:** `react-native-health` (iOS), `react-native-health-connect` (Android)
- **Tillar:** TypeScript
- **AI Integratsiya:** Rork AI Toolkit SDK

## 🏃‍♀️ Ishga tushirish (Getting Started)

1. **Paketlarni o'rnatish:**
   Qaramliklarni (dependencies) o'rnatish uchun albatta `--legacy-peer-deps` yorlig'idan foydalaning (3D kutubxonalar uchun kerak).
   ```bash
   cd expo
   npm install --legacy-peer-deps
   ```

2. **Ilovani ishga tushirish (Development Build):**
   Ilova muhim mahalliy modullardan (Health Connect/HealthKit) foydalanganligi sababli oddiy *Expo Go* dasturida ishlamaydi. Uni qurilmaga build qilib o'rnatish kerak.

   **Android uchun:**
   ```bash
   npx expo run:android
   ```

   **iOS uchun (Faqat Mac kompyuterida ishlaydi):**
   ```bash
   npx expo run:ios
   ```

## 📈 Rejadagi yangilanishlar (Roadmap / To Do)
- [ ] Backend orqali Cloud xotiraga ulanish (Firebase / Supabase).
- [ ] Suv ichish nazorati va eslatmalari (Push Notifications & Water Tracker).
- [ ] Zaldagi mashg'ulotlarni (Manual Workout) qo'lda kiritish ekrani.
- [ ] Do'konga (App Store/Play Store) chiqarish uchun `eas.json` konfiguratsiyasi va shartnomalar (Privacy Policy) URL lari.
