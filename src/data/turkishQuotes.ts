export interface TurkishQuote {
  quote: string;
  author: string;
}

// Klasik ve modern Türk düşünür/yazarlardan derlenmiş söz havuzu.
// Atatürk API'si ile birlikte rotasyona girer.
export const turkishQuotes: TurkishQuote[] = [
  { quote: "Sevgide güneş gibi ol, dostluk ve kardeşlikte akarsu gibi ol.", author: "Mevlana Celaleddin Rumi" },
  { quote: "Ne olursan ol, yine gel.", author: "Mevlana Celaleddin Rumi" },
  { quote: "Dünle beraber gitti, ne kadar söz varsa düne ait. Şimdi yeni şeyler söylemek lazım.", author: "Mevlana Celaleddin Rumi" },
  { quote: "Her şey sevgi için ve sevgiyle yapılmalıdır.", author: "Mevlana Celaleddin Rumi" },
  { quote: "Ya göründüğün gibi ol ya da olduğun gibi görün.", author: "Mevlana Celaleddin Rumi" },
  { quote: "Cömertlikte ve yardım etmede akarsu gibi ol.", author: "Mevlana Celaleddin Rumi" },
  { quote: "Hamdım, piştim, yandım.", author: "Mevlana Celaleddin Rumi" },

  { quote: "Gelin tanış olalım, işi kolay kılalım, sevelim sevilelim, dünya kimseye kalmaz.", author: "Yunus Emre" },
  { quote: "Bir kez gönül yıktın ise bu kıldığın namaz değil.", author: "Yunus Emre" },
  { quote: "Yaratılanı severiz, Yaratan'dan ötürü.", author: "Yunus Emre" },
  { quote: "İlim ilim bilmektir, ilim kendin bilmektir.", author: "Yunus Emre" },
  { quote: "Sen sana ne sanırsan, ayruğa da onu san.", author: "Yunus Emre" },

  { quote: "Az sözle çok mana ifade etmek hünerdir.", author: "Hacı Bektaş Veli" },
  { quote: "Eline, diline, beline sahip ol.", author: "Hacı Bektaş Veli" },
  { quote: "İncinsen de incitme.", author: "Hacı Bektaş Veli" },
  { quote: "Bilimden gidilmeyen yolun sonu karanlıktır.", author: "Hacı Bektaş Veli" },

  { quote: "Akıl yaşta değil baştadır.", author: "Türk Atasözü" },
  { quote: "Damlaya damlaya göl olur.", author: "Türk Atasözü" },
  { quote: "Her işte bir hayır vardır.", author: "Türk Atasözü" },
  { quote: "Sabreden derviş muradına ermiş.", author: "Türk Atasözü" },
  { quote: "Ağaç yaşken eğilir.", author: "Türk Atasözü" },
  { quote: "Bir elin nesi var, iki elin sesi var.", author: "Türk Atasözü" },

  { quote: "Yaşamak bir ağaç gibi tek ve hür ve bir orman gibi kardeşçesine, bu hasret bizim.", author: "Nazım Hikmet" },
  { quote: "En güzel deniz: henüz gidilmemiş olanıdır. En güzel çocuk: henüz büyümedi. En güzel günlerimiz: henüz yaşamadıklarımız.", author: "Nazım Hikmet" },
  { quote: "Sen yanmasan, ben yanmasam, biz yanmasak, nasıl çıkar karanlıklar aydınlığa?", author: "Nazım Hikmet" },
  { quote: "Memleketim memleketim memleketim, ne kasketim kaldı senin ora işi, ne yollarını taşımış ayakkabım.", author: "Nazım Hikmet" },

  { quote: "Hayat dediğimiz şey, anlamı kendisi olan şeydir.", author: "Cemil Meriç" },
  { quote: "Kitap, en sadık dosttur.", author: "Cemil Meriç" },
  { quote: "Düşünmek bir nevi yalnızlıktır.", author: "Cemil Meriç" },

  { quote: "İnsan kendini bildiği kadar özgürdür.", author: "Sezai Karakoç" },
  { quote: "Sen rüzgârsın ben yelken; ne kadar hissedersem kendimi o kadar uzağa giderim.", author: "Sezai Karakoç" },

  { quote: "Hayat, geriye doğru anlaşılır; ileriye doğru yaşanır.", author: "Søren Kierkegaard" },
  { quote: "Mutluluk hazır bir şey değildir; kendi hareketlerinizden gelir.", author: "Dalai Lama" },
  { quote: "Hiç durma, çünkü her durduğun yerde yeniden başlamak zorundasın.", author: "Friedrich Nietzsche" },

  { quote: "Bir gün herkes yanılır, fakat aptal yanlışında ısrar eder.", author: "Cicero" },
  { quote: "Hayat çok kısa, küçük şeylere üzülmeye değmez.", author: "Disraeli" },

  { quote: "Bir kelebek kanat çırpar dünyanın bir ucunda, fırtına olur diğer ucunda.", author: "Türk Halk Sözü" },
  { quote: "Yolun sonu görünmüyorsa, yola çıkmamışsın demektir.", author: "Anonim" },
  { quote: "İyimser, yel değirmeninde un öğütür; kötümser, rüzgardan şikayet eder.", author: "Anonim" },

  { quote: "Bir şeyi gerçekten istiyorsan, tüm evren onu elde etmen için işbirliği yapar.", author: "Paulo Coelho" },
  { quote: "Hayat, sana verilen kartlardan değil; o kartlarla nasıl oynadığından ibarettir.", author: "Türkçe Öğüt" },

  { quote: "Bir bardak suya bir tutam tuz atarsan, su acılaşır. Aynı tuzu göle atarsan, hiçbir şey olmaz. Acıların büyüklüğü, kalbinin genişliğine bağlıdır.", author: "Anonim Hikaye" },
  { quote: "Susmak, bazen en güzel cevaptır.", author: "Aforizma" },
  { quote: "Affetmek, geçmişi değiştirmez ama geleceği genişletir.", author: "Anonim" },

  { quote: "Çalışmak, yaşamaktır; tembelse ölmenin başka bir yoludur.", author: "Türk Düşüncesi" },
  { quote: "Sevdalanmadan çiçek yetişmez, mücadele etmeden zafer kazanılmaz.", author: "Anonim" },
  { quote: "Bir insan ne kadar az isterse, o kadar zengindir.", author: "Sokrates" },
  { quote: "Yaşadığın hayatın sahibi sensin; karar veren de sensin.", author: "Anonim" },
];
