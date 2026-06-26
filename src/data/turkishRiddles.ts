export interface TurkishRiddle {
  riddle: string;
  answer: string;
}

// Klasik Türk bilmeceleri + modern eklemeler.
// Tamamı Türkçe ve kültürümüze ait.
export const turkishRiddles: TurkishRiddle[] = [
  { riddle: "Sarı sarı sandığım, içinde dolu mendilim. Bilemezsen yandın hanım, çekildi gitti tendilim. Nedir bu?", answer: "Limon" },
  { riddle: "Dağdan gelir taştan gelir, bir kükremiş aslan gelir. Nedir bu?", answer: "Sel" },
  { riddle: "Mavi atlas, iğne batmaz, makas kesmez, terzi dikmez. Nedir bu?", answer: "Gökyüzü" },
  { riddle: "Suya düşer ıslanmaz, yere düşer kırılmaz. Nedir bu?", answer: "Gölge" },
  { riddle: "Hep gider hep gider, yerinden gitmez. Nedir bu?", answer: "Saat" },
  { riddle: "İnce ince eğrilir, mor menekşe sürülür. Nedir bu?", answer: "İğne ve iplik" },
  { riddle: "Karşıdan baktım hiç yok, yanına vardım pek çok. Nedir bu?", answer: "Karınca" },
  { riddle: "Bir küçücük mil taşı, içinde beyler aşı. Nedir bu?", answer: "Yumurta" },
  { riddle: "Ben giderim o gider, ardımda tin tin eder. Nedir bu?", answer: "Gölge" },
  { riddle: "Allah yapar yapısını, demir açar kapısını. Nedir bu?", answer: "Karpuz" },
  { riddle: "Yer altında kırmızı minare. Nedir bu?", answer: "Havuç" },
  { riddle: "Çarşıdan aldım bir tane, eve geldim bin tane. Nedir bu?", answer: "Nar" },
  { riddle: "Ufacık bir taş, dünyayı dolaş. Nedir bu?", answer: "Para" },
  { riddle: "Daldan dala atlar, kuyruğunu sallar. Nedir bu?", answer: "Sincap" },
  { riddle: "Yer altında sakallı dede. Nedir bu?", answer: "Pırasa" },
  { riddle: "İçi kırmızı, dışı yeşil; yarsalar ipek gibi. Nedir bu?", answer: "Karpuz" },
  { riddle: "Uzun uzun urganlar, ucu yerde durmazlar. Nedir bu?", answer: "Yağmur" },
  { riddle: "Tarlada biter, ekmekte yatar. Nedir bu?", answer: "Buğday" },
  { riddle: "Annem aldı çıkmadı, babam aldı çıkmadı, ben aldım çıktı. Nedir bu?", answer: "Diş" },
  { riddle: "Eli yok ayağı yok, kapıyı açar. Nedir bu?", answer: "Rüzgar" },
  { riddle: "Sabah dört ayak, öğle iki ayak, akşam üç ayak. Nedir bu?", answer: "İnsan (bebek, yetişkin, ihtiyar)" },
  { riddle: "Ufacık tefecik bir kız, koltuğunda ekmecik. Nedir bu?", answer: "Kaşık" },
  { riddle: "Yazın giyer kürkünü, kışın atar derisini. Nedir bu?", answer: "Ağaç" },
  { riddle: "Ay gibi parlar, yıldız gibi yanar. Nedir bu?", answer: "Ayna" },
  { riddle: "İçi dolu sigara, dışı kıvır kıvır. Nedir bu?", answer: "Mısır koçanı" },
  { riddle: "Beyaz tarla, siyah tohum. Eken bilir, biçen bilir. Nedir bu?", answer: "Kitap / yazı" },
  { riddle: "Bir kuyum var iki türlü suyu var. Nedir bu?", answer: "Yumurta" },
  { riddle: "Karadeniz'in ortasında kar yağar. Nedir bu?", answer: "Kazan kaynaması (köpük)" },
  { riddle: "Çıngırağı çın çın, içi dolu altın. Nedir bu?", answer: "Arı kovanı" },
  { riddle: "Anasının üstünde tepinir, babasını görmeden büyür. Nedir bu?", answer: "Süt (anne) / yavru" },

  // Mantık bulmacaları
  { riddle: "İki babası ve iki oğlu olan üç kişi balığa gitmiş. Her biri bir balık tutmuş, toplam üç balık. Nasıl olur?", answer: "Çünkü onlar dede, baba ve oğul; üç kişi" },
  { riddle: "Bir adam asansörle her gün 20. kata çıkıyor ama yağmurlu havalarda doğrudan 25. kata çıkabiliyor. Neden?", answer: "Adam kısa boylu, sadece 20'ye basabiliyor; yağmurlu günde şemsiyesiyle 25'e basabiliyor" },
  { riddle: "Bir babanın 7 oğlu var. Her oğlunun bir kız kardeşi var. Kaç çocuğu vardır?", answer: "8 (7 oğul + 1 kız)" },
  { riddle: "Hangi soruya 'Evet' cevabı verirsen yalan, 'Hayır' verirsen doğru söylemiş olursun?", answer: "'Uyuyor musun?' sorusu" },
  { riddle: "Düşünmeden cevap ver: Bir uçak yarı yarıya Türkiye-Yunanistan sınırına düşse, hayatta kalanlar nereye gömülür?", answer: "Hayatta kalanlar gömülmez" },
  { riddle: "Konuşur ama sesi yoktur, hareket eder ama bacağı yoktur. Nedir?", answer: "Düşünce" },
  { riddle: "Sahibi olduğun ama başkalarının senden çok kullandığı şey nedir?", answer: "Adın" },
  { riddle: "Bir koca ve karısı 7 çocuk doğurdular ve yarısı kızdı. Nasıl?", answer: "Tüm çocuklar kız ve erkek olmak üzere - yanıltıcı: hepsi de kız değil; aslında 7 erkek tüm kız kardeşlerini paylaşıyor olabilir" },
  { riddle: "Bir saat 3 vurursa 3 saniye, 6 vurursa kaç saniye sürer?", answer: "6 saniye değil, 6.6 saniye (vuruşlar arası boşluklar)" },
  { riddle: "Hangi ay 28 gündür?", answer: "Hepsi (her ayda 28 gün vardır)" },
  { riddle: "Önce rengi yoktur, kullandıkça renklenir. Nedir?", answer: "Boya kalemi / kalemtraş" },
  { riddle: "Vurdukça büyür, dokunsan kaybolur. Nedir?", answer: "Kıvılcım / alev" },
  { riddle: "Ne kadar alırsan al, hep büyür. Nedir?", answer: "Çukur / boşluk" },
  { riddle: "İçinde her şey var ama hiçbir şey görünmüyor. Nedir?", answer: "Hayal / zihin" },
  { riddle: "Kapısı yok, penceresi yok ama içinde altın var. Nedir?", answer: "Yumurta" },

  // Modern bulmacalar
  { riddle: "Dünyada kullanılan en yaygın şifre nedir?", answer: "123456" },
  { riddle: "İçinden binlerce insan geçer ama yine de boş kalır. Nedir?", answer: "Sosyal medya akışı" },
  { riddle: "Şarjı yokken sessiz, varken bağırır. Nedir?", answer: "Akıllı telefon" },
  { riddle: "Hiç bilmediği yerleri bilen, sormadan cevap veren. Nedir?", answer: "Google / arama motoru" },
  { riddle: "İnternette bedavadır ama satın aldığında pahalıdır. Nedir?", answer: "Yazılım / uygulama" },
  { riddle: "Sen ona bakmadığında o sana bakar. Nedir?", answer: "Kamera" },
  { riddle: "Açar açmaz dünya gözünün önündedir. Nedir?", answer: "Web tarayıcı" },
  { riddle: "Ne ses çıkarır ne nefes alır ama her gün milyarlarca insanı uyandırır. Nedir?", answer: "Alarm / bildirim" },

  // Daha klasikler
  { riddle: "Hep gelir hep gelir, yerini bulamaz. Nedir?", answer: "Dalga (deniz)" },
  { riddle: "Yer altından kara su gelir. Nedir?", answer: "Petrol" },
  { riddle: "Geceleri açılır gündüzleri kapanır. Nedir?", answer: "Yıldız (gözler)" },
  { riddle: "Eğri büğrü gider, yine yolunu bulur. Nedir?", answer: "Yılan" },
  { riddle: "Ben bilirim sen bilirsin, dağda ne var? Bin bir tane çiçek var. Nedir?", answer: "Çiçekler / dağ florası" },
  { riddle: "Suya bakar görür, kendine bakmaz görmez. Nedir?", answer: "Balık" },
  { riddle: "Bir küçük kuş, ufacık taş yer. Nedir?", answer: "Saat" },
  { riddle: "Kapı kapı dolaşır, eve girmez. Nedir?", answer: "Anahtar" },
];
