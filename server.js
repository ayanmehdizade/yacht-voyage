const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yachtvoyage.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Yacht2026!';
const SESSION_SECRET = process.env.SESSION_SECRET || 'yv-secret-key-2026';
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 saat

const app = express();
const PORT = process.env.PORT || 3000;

const IS_VERCEL = Boolean(process.env.VERCEL);
const IS_HTTPS_ENV = IS_VERCEL || process.env.NODE_ENV === 'production';
const BASE_WRITABLE_DIR = IS_VERCEL ? '/tmp' : __dirname;
const DB_PATH = path.join(BASE_WRITABLE_DIR, 'data.json');
const UPLOAD_DIR = IS_VERCEL ? '/tmp/uploads' : path.join(__dirname, 'public', 'uploads');
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));
if (IS_VERCEL) {
    app.use('/uploads', express.static('/tmp/uploads'));
}
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80';
const DEFAULT_CAPTAIN_IMG = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80';
const DEFAULT_MANUAL_WA_TEMPLATE =
    'Merhaba {customer}, {yacht} için rezervasyonunuz oluşturuldu.\n' +
    'PNR: {pnr}\n' +
    'Tarih: {checkIn} - {checkOut} ({timeSlot})\n' +
    'Misafir: {guests} kişi\n' +
    'Toplam: €{totalAmount} | Ödenen: €{paidAmount} | Kalan: €{remainingAmount}\n' +
    'Kaptan: {captain} | Transfer: {transfer}\n' +
    'Not: {notes}';

const initialData = {
    siteSettings: {
        brandName: 'YachtVoyage',
        brandSubtext: 'Yacht Charter',
        defaultDeparture: 'Marmaris',
        heroBadge: 'Marmaris • Göcek • Fethiye • Bodrum',
        heroBadgeEn: 'Marmaris • Göcek • Fethiye • Bodrum',
        heroTitle: 'Eşsiz Yat Deneyimini Keşfedin',
        heroTitleEn: 'Discover a Unique Yacht Experience',
        heroSubtitle: 'Marmaris, Göcek, Fethiye ve Bodrum koylarında özel yat kiralama, günlük tur paketleri ve şeffaf içerik bilgisi.',
        heroSubtitleEn: 'Private yacht charters, daily tour packages and transparent itinerary details across Marmaris, Göcek, Fethiye and Bodrum coves.',
        heroImage: DEFAULT_IMG,
        phone: '+90 252 123 45 67',
        whatsappNumber: '902521234567',
        email: 'hello@yachtvoyage.com',
        footerAbout: 'Marmaris, Göcek, Fethiye ve Bodrum koylarında lisanslı kaptanlar ve özel filo ile yat kiralama ve günlük tur platformu.',
        copyrightText: '© 2026 YachtVoyage. Tüm hakları saklıdır.',
        conciergeWelcome: 'Merhaba! Rota planlaması, özel menü veya tekne müsaitliği için hızlıca yazabilirsiniz.',
        manualBookingWaTemplate: DEFAULT_MANUAL_WA_TEMPLATE
    },
    adminUsers: [
        {
            id: 1,
            name: 'Main Admin',
            email: ADMIN_EMAIL.trim().toLowerCase(),
            password: ADMIN_PASSWORD.trim(),
            role: 'admin'
        }
    ],
    departurePoints: [
        { id: 1, name: 'Marmaris', desc: 'Netsel Marina & Hisarönü' },
        { id: 2, name: 'Göcek', desc: 'Koylar & D-Marin kalkış' },
        { id: 3, name: 'Fethiye', desc: 'Ece Marina & Ölüdeniz' },
        { id: 4, name: 'Bodrum', desc: 'Yalıkavak & Türkbükü' }
    ],
    promoCodes: [
        { id: 1, code: 'MAVI10', discountPercent: 10, expiresAt: '', isActive: true },
        { id: 2, code: 'VIP15', discountPercent: 15, expiresAt: '', isActive: true }
    ],
    timeSlots: [
        { id: 1, label: '10:00 - 18:00', labelEn: '10:00 - 18:00 (Full Day)', type: 'daily', hours: 8, priceMultiplier: 1, active: true },
        { id: 2, label: '09:00 - 13:00', labelEn: '09:00 - 13:00 (Morning 4h)', type: 'hourly', hours: 4, priceMultiplier: 0.6, active: true },
        { id: 3, label: '14:00 - 18:00', labelEn: '14:00 - 18:00 (Afternoon 4h)', type: 'hourly', hours: 4, priceMultiplier: 0.6, active: true },
        { id: 4, label: '18:30 - 21:30', labelEn: '18:30 - 21:30 (Sunset 3h)', type: 'hourly', hours: 3, priceMultiplier: 0.5, active: true }
    ],
    captains: [
        {
            id: 1,
            name: 'Kaptan Murat Yılmaz',
            roleTr: 'Baş Kaptan • Uzakyol Yat Kaptanı',
            roleEn: 'Head Captain • Master Yacht Skipper',
            experienceYears: 16,
            languages: 'Türkçe, English',
            region: 'Marmaris & Göcek',
            bioTr: '16 yıllık Ege ve Akdeniz tecrübesiyle Marmaris, Hisarönü ve Göcek koylarında güvenli ve konforlu seyir planlaması yapar.',
            bioEn: 'With 16 years of Aegean and Mediterranean experience, leading safe and tailored itineraries across Marmaris and Göcek coves.',
            photo: DEFAULT_CAPTAIN_IMG,
            active: true
        },
        {
            id: 2,
            name: 'Kaptan Deniz Kaya',
            roleTr: 'Kıdemli Kaptan • Yelken & Katamaran Uzmanı',
            roleEn: 'Senior Captain • Sailing & Catamaran Specialist',
            experienceYears: 12,
            languages: 'Türkçe, English, Русский',
            region: 'Fethiye & Bodrum',
            bioTr: 'Yelkenli ve katamaran filomuzda ailelere ve özel gruplara sakin koy rotaları ve su sporları eşliğinde rehberlik eder.',
            bioEn: 'Guides families and private groups aboard our sailing and catamaran fleet across Fethiye and Bodrum bays.',
            photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
            active: true
        },
        {
            id: 3,
            name: 'Kaptan Kerem Arslan',
            roleTr: 'Süperyat Kaptanı',
            roleEn: 'Superyacht Captain',
            experienceYears: 19,
            languages: 'Türkçe, English',
            region: 'Bodrum & Marmaris',
            bioTr: 'VIP misafir ağırlama protokolü, özel şef organizasyonu ve çok günlük mavi yolculuk rotalarında uzmandır.',
            bioEn: 'Specializes in VIP hospitality protocols, private chef coordination, and multi-day blue cruise itineraries.',
            photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
            active: true
        }
    ],
    faqs: [
        {
            id: 1,
            questionTr: 'Rezervasyon iptalinde iade koşulları nelerdir?',
            questionEn: 'What are the refund terms for booking cancellations?',
            answerTr: 'Seyir tarihine 7 gün ve daha fazla süre kala yapılan iptallerde ödenen tutarın %100’ü kesintisiz iade edilir. Olumsuz hava koşullarında ücretsiz tarih değişikliği veya tam iade sağlanır.',
            answerEn: 'Cancellations made 7 or more days prior to departure receive a 100% refund. In case of severe weather restrictions, free rescheduling or a full refund is provided.',
            active: true
        },
        {
            id: 2,
            questionTr: 'Fiyatlara yakıt, kaptan ve mürettebat dahil mi?',
            questionEn: 'Are fuel, captain, and crew included in the price?',
            answerTr: 'Evet, tüm özel yat kiralamalarında lisanslı kaptan, mürettebat, standart rota yakıtı ve marina bağlama hizmetleri fiyata dahildir.',
            answerEn: 'Yes, licensed captain, crew, standard route fuel, and marina mooring services are included in all private yacht charters.',
            active: true
        },
        {
            id: 3,
            questionTr: 'Saatlik veya yarım günlük tur kiralayabilir miyiz?',
            questionEn: 'Can we book an hourly or half-day charter?',
            answerTr: 'Evet, günlük tur seçiminde sabah (09:00-13:00), öğleden sonra (14:00-18:00), gün batımı (18:30-21:30) veya tam gün saat aralıklarından birini seçebilirsiniz.',
            answerEn: 'Yes, when selecting a daily charter you can choose morning (09:00-13:00), afternoon (14:00-18:00), sunset (18:30-21:30), or full-day time slots.',
            active: true
        },
        {
            id: 4,
            questionTr: 'Kalan bakiyeyi marinada ödeyebilir miyiz?',
            questionEn: 'Can we pay the remaining balance at the marina?',
            answerTr: 'Evet, Hisseli Ödeme planında kapora ödemenizi online tamamladıktan sonra kalan bakiyeyi tekneye biniş günü marinada nakit veya kartla ödeyebilirsiniz.',
            answerEn: 'Yes, with the Installment Plan you pay the deposit online and settle the remaining balance at the marina on boarding day via cash or card.',
            active: true
        }
    ],
    rentalContract: {
        title: 'YachtVoyage Tekne Kiralama ve İptal Sözleşmesi',
        body: `1. Taraflar ve Konu
İşbu sözleşme, YachtVoyage Turizm Yatçılık A.Ş. ile rezervasyon formunda bilgileri yer alan misafir arasında, seçilen yatın belirtilen tarihlerde mürettebatlı/kaptanlı kiralanması şartlarını düzenler.

2. Ödeme Planı ve Bakiye Tahsilatı
Hisseli Ödeme seçeneğinde belirlenen ön ödeme yüzdesi rezervasyon anında tahsil edilir; kalan bakiye tekneye biniş günü marinada nakit veya POS ile ödenir. Tam Ödeme (İndirimli) seçeneğinde indirimli toplam tutarın tamamı rezervasyon sırasında tahsil edilir.

3. İptal ve Tarih Değişikliği
Seyir başlangıç tarihine 7 gün kalaya kadar yapılan iptallerde ödenen tutarın %100'ü kesintisiz iade edilir. Olumsuz hava koşulları ve liman başkanlığı seyir yasaklarında ücretsiz tarih değişikliği veya tam iade sağlanır.

4. Güvenlik ve Kapasite Kuralları
Tekne kapasitesi yasal maksimum misafir sayısını aşamaz. Kaptan, hava ve deniz güvenliği gereği rotada değişiklik yapma yetkisine sahiptir.`
    },
    yachts: [
        {
            id: 1,
            name: 'Princess 72',
            category: 'Motor Yachts',
            categoryTr: 'Motor Yat',
            location: 'Göcek',
            length: '22 m',
            year: 2021,
            guests: 12,
            cabins: 4,
            crew: 3,
            speed: '28 Knots',
            price: 3500,
            rating: 5.0,
            reviews: 24,
            badge: 'En Çok Tercih Edilen',
            features: ['Jakuzi', 'Klima', 'Mürettebat Dahil', 'Su Oyuncakları'],
            inclusions: ['Profesyonel Kaptan ve 2 Mürettebat', 'Hoş Geldiniz Kokteyli & Meyve Tabağı', 'Liman Bağlama Ücretleri (Göcek)', 'Standart Su Oyuncakları', 'Wi-Fi ve Ses Sistemi'],
            itinerary: [
                { time: '10:00', title: 'Göcek Marina Hareket', desc: 'Hoş geldiniz ikramı ve rota bilgilendirmesi' },
                { time: '11:30', title: 'Yassıca Adaları', desc: 'Turkuaz sularda yüzme ve su oyuncakları molası' },
                { time: '14:00', title: 'Bedri Rahmi Koyu', desc: 'Öğle yemeği servisi ve koy keşfi' },
                { time: '17:30', title: 'Göcek Marina Dönüş', desc: 'Gün batımı eşliğinde marinaya varış' }
            ],
            reviewList: [
                { author: 'Emre K.', rating: 5, date: '2026-06-12', bookingId: '', tourDate: '', comment: 'Kaptan ve mürettebat inanılmaz ilgiliydi. Göcek koylarında rüya gibi 3 gün geçirdik.' },
                { author: 'Selin A.', rating: 5, date: '2026-05-28', bookingId: '', tourDate: '', comment: 'Tekne tertemizdi, jakuzi ve güneşlenme alanı fotoğraflardan bile güzel.' }
            ],
            description: 'Turkuaz kıyılarda benzersiz bir lüks deneyimi yaşayın. Geniş güneşlenme terası, şık salonu ve deneyimli mürettebatı ile kusursuz bir mavi yolculuk sunar.',
            descriptionEn: 'Experience unmatched luxury along turquoise coasts with a spacious sun deck, refined salon, and experienced crew.',
            images: [
                DEFAULT_IMG,
                'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80'
            ]
        },
        {
            id: 2,
            name: 'Aegean Pearl Gulet',
            category: 'Gulets',
            categoryTr: 'Gulet',
            location: 'Marmaris',
            length: '24 m',
            year: 2020,
            guests: 12,
            cabins: 6,
            crew: 4,
            speed: '14 Knots',
            price: 2500,
            rating: 4.9,
            reviews: 18,
            badge: 'Aile & Grup Favorisi',
            features: ['Klima', 'Mürettebat Dahil', 'Su Oyuncakları'],
            inclusions: ['Kaptan, Aşçı ve 2 Gemici', 'Kano ve Ringo', 'Tüm Kabinlerde 24 Saat Klima'],
            itinerary: [
                { time: '10:30', title: 'Marmaris Netsel Marina', desc: 'Tekneye biniş ve kahve ikramı' },
                { time: '12:00', title: 'Cennet Adası & Fosforlu Mağara', desc: 'Mağara ziyareti ve berrak sularda yüzme' },
                { time: '14:30', title: 'Kumlubük Koyu', desc: 'Öğle yemeği ve dinlenme' },
                { time: '18:00', title: 'Marmaris Dönüş', desc: 'Limana güvenli dönüş' }
            ],
            reviewList: [
                { author: 'Mert D.', rating: 5, date: '2026-06-04', bookingId: '', tourDate: '', comment: '10 kişilik arkadaş grubumuzla çok rahat ettik. Aşçının mezeleri harikaydı.' }
            ],
            description: 'Geleneksel ahşap tasarımı modern konforla birleştiren Aegean Pearl, kalabalık gruplar için Marmaris koylarında huzurlu bir rota sunar.',
            descriptionEn: 'Blending traditional timber craftsmanship with modern comfort, Aegean Pearl offers a peaceful Marmaris itinerary for larger groups.',
            images: [
                'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
                DEFAULT_IMG
            ]
        },
        {
            id: 3,
            name: 'Sun Odyssey 54',
            category: 'Sailing Yachts',
            categoryTr: 'Yelkenli Yat',
            location: 'Fethiye',
            length: '16 m',
            year: 2022,
            guests: 8,
            cabins: 4,
            crew: 2,
            speed: '11 Knots',
            price: 1800,
            rating: 4.8,
            reviews: 15,
            badge: 'Fiyat / Performans',
            features: ['Klima', 'Mürettebat Dahil'],
            inclusions: ['Lisanslı Yelken Kaptanı', 'Son Temizlik ve Nevresim Takımları', 'Bot ve Dıştan Takma Motor'],
            itinerary: [
                { time: '10:00', title: 'Fethiye Ece Marina', desc: 'Yelken açılışı ve körfez seyri' },
                { time: '12:30', title: 'Turunç Pınarı Koyu', desc: 'Yüzme ve şnorkel molası' },
                { time: '15:00', title: 'Şövalye Adası', desc: 'Gün batımı öncesi sakin koy molası' },
                { time: '18:00', title: 'Fethiye Dönüş', desc: 'Marinaya varış' }
            ],
            reviewList: [
                { author: 'Caner T.', rating: 5, date: '2026-05-19', bookingId: '', tourDate: '', comment: 'Yelken deneyimi ve Fethiye koyları muazzamdı, kesinlikle tekrar geleceğiz.' }
            ],
            description: 'Rüzgarla bütünleşmek isteyen deniz tutkunları için tasarlanan Sun Odyssey 54, ferah güvertesiyle Fethiye körfezini keşfetmek için idealdir.',
            descriptionEn: 'Designed for sailing enthusiasts who love the wind, Sun Odyssey 54 features an open deck ideal for exploring Fethiye bays.',
            images: [
                'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
                DEFAULT_IMG
            ]
        },
        {
            id: 4,
            name: 'Lagoon 52 Catamaran',
            category: 'Catamarans',
            categoryTr: 'Katamaran',
            location: 'Göcek',
            length: '16 m',
            year: 2023,
            guests: 10,
            cabins: 5,
            crew: 3,
            speed: '15 Knots',
            price: 3100,
            rating: 4.9,
            reviews: 21,
            badge: 'Yeni Model',
            features: ['Klima', 'Mürettebat Dahil', 'Su Oyuncakları'],
            inclusions: ['Kaptan, Hostes ve Aşçı', 'Flybridge Lounge Alanı', 'Seabob ve Paddleboard'],
            itinerary: [
                { time: '10:00', title: 'Göcek D-Marin Hareket', desc: 'Kaptan karşılama ve ikram' },
                { time: '12:00', title: 'Kleopatra Hamamı Koyu', desc: 'Tarihi kalıntılar ve yüzme' },
                { time: '15:00', title: 'Sarsala Koyu', desc: 'Su sporları ve dinlenme' },
                { time: '18:00', title: 'Göcek Dönüş', desc: 'Limana varış' }
            ],
            reviewList: [
                { author: 'Zeynep B.', rating: 5, date: '2026-06-15', bookingId: '', tourDate: '', comment: 'Katamaranın dengesi sayesinde hiç sallanmadık, çocuklu aileler için mükemmel.' }
            ],
            description: 'Çift gövdeli dengeli yapısı ve geniş kabinleriyle maksimum konfor arayan misafirlerimizin favorisidir.',
            descriptionEn: 'A guest favorite for maximum comfort with twin-hull stability and spacious cabins.',
            images: [
                'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
                DEFAULT_IMG,
                'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80'
            ]
        },
        {
            id: 5,
            name: 'Majesty 100 Superyacht',
            category: 'Superyachts',
            categoryTr: 'Süperyat',
            location: 'Bodrum',
            length: '32 m',
            year: 2023,
            guests: 12,
            cabins: 5,
            crew: 6,
            speed: '24 Knots',
            price: 8500,
            rating: 5.0,
            reviews: 11,
            badge: 'Ultra VIP',
            features: ['Jakuzi', 'Klima', 'Mürettebat Dahil', 'Su Oyuncakları'],
            inclusions: ['6 Kişilik VIP Mürettebat & Özel Şef', 'Güneşlenme Güvertesinde Jakuzi', 'Jet Ski, Seabob ve Wakeboard'],
            itinerary: [
                { time: '10:30', title: 'Yalıkavak Marina VIP Biniş', desc: 'Şampanya ve şef tadım tabağı ile karşılama' },
                { time: '12:30', title: 'Cennet Koyu Bodrum', desc: 'Jet Ski ve Seabob aktivitesi' },
                { time: '15:30', title: 'Türkbükü Açıkları', desc: 'Özel şef akşamüstü servisi' },
                { time: '19:00', title: 'Yalıkavak Dönüş', desc: 'Gün batımı kokteyli ile varış' }
            ],
            reviewList: [
                { author: 'Kerem V.', rating: 5, date: '2026-06-18', bookingId: '', tourDate: '', comment: 'Bodrum koylarında beş yıldızlı otel konforunda eşsiz bir deneyimdi.' }
            ],
            description: 'Ultra lüks segmentin zirvesi Majesty 100; panoramik cam duvarları ve özel şef servisiyle beş yıldızlı bir deneyim sunar.',
            descriptionEn: 'At the peak of ultra-luxury, Majesty 100 offers a five-star experience with panoramic glass walls and private chef service.',
            images: [
                DEFAULT_IMG,
                'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80'
            ]
        }
    ],
    categories: [
        { id: 1, key: 'Motor Yachts', nameTr: 'Motor Yat', nameEn: 'Motor Yachts', desc: 'Yüksek hız ve modern güverte konforu' },
        { id: 2, key: 'Gulets', nameTr: 'Gulet', nameEn: 'Gulets', desc: 'Geleneksel ahşap zarafet ve geniş aile kabinleri' },
        { id: 3, key: 'Sailing Yachts', nameTr: 'Yelkenli Yat', nameEn: 'Sailing Yachts', desc: 'Rüzgarla özgür ve dengeli körfez seyri' },
        { id: 4, key: 'Catamarans', nameTr: 'Katamaran', nameEn: 'Catamarans', desc: 'Çift gövdeli geniş yaşam alanı ve denge' },
        { id: 5, key: 'Superyachts', nameTr: 'Süperyat', nameEn: 'Superyachts', desc: 'Özel şef ve VIP mürettebatla üst düzey lüks' }
    ],
    tours: [
        {
            id: 1,
            badge: 'MARMARİS PAKETİ',
            badgeEn: 'MARMARIS PACKAGE',
            title: 'Marmaris Koyları & Netsel Marina Paketi',
            titleEn: 'Marmaris Coves & Netsel Marina Package',
            region: 'Marmaris',
            regionEn: 'Marmaris',
            meetingPoint: 'Netsel Marina',
            meetingPointEn: 'Netsel Marina',
            durationLabel: 'Tam Gün (10:30 - 18:00)',
            capacityLabel: 'En fazla 12 kişi',
            durationDays: 1,
            pricePerDay: 2200,
            yachtId: 2,
            img: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
            included: [
                'Lisanslı kaptan, mürettebat ve standart rota yakıtı',
                'Netsel Marina biniş ve koy bağlama hizmetleri',
                'Özel grup kiralaması (yalnızca sizin grubunuza özel)'
            ],
            includedEn: [
                'Licensed captain, crew, and standard route fuel',
                'Netsel Marina boarding and cove mooring services',
                'Private group charter (exclusive to your group)'
            ],
            excluded: ['Öğle yemeği / özel şef menüsü ve havalimanı transferi'],
            excludedEn: ['Lunch / private chef menu and airport transfer'],
            summary: 'Marmaris Netsel Marina kalkışlı özel tekne paketi.'
        },
        {
            id: 2,
            badge: 'GÖCEK PAKETİ',
            badgeEn: 'GÖCEK PACKAGE',
            title: 'Göcek Koyları Özel Paketi',
            titleEn: 'Göcek Coves Private Package',
            region: 'Göcek',
            regionEn: 'Göcek',
            meetingPoint: 'D-Marin Göcek',
            meetingPointEn: 'D-Marin Göcek',
            durationLabel: '1 Günlük Paket',
            capacityLabel: 'En fazla 12 kişi',
            durationDays: 1,
            pricePerDay: 2800,
            yachtId: 1,
            img: DEFAULT_IMG,
            included: [
                'Kaptan, mürettebat ve standart Göcek koy yakıtı',
                'Hoş geldiniz ikramı ve standart su oyuncakları',
                'Özel grup kiralaması'
            ],
            includedEn: [
                'Captain, crew, and standard Göcek cove fuel',
                'Welcome refreshments and standard water toys',
                'Private group charter'
            ],
            excluded: ['Öğle yemeği ve özel transferler'],
            excludedEn: ['Lunch and private transfers'],
            summary: 'Göcek koylarında sabit paket fiyatlı özel tekne deneyimi.'
        },
        {
            id: 3,
            badge: 'BODRUM PAKETİ',
            badgeEn: 'BODRUM PACKAGE',
            title: 'Bodrum & Yalıkavak VIP Paketi',
            titleEn: 'Bodrum & Yalıkavak VIP Package',
            region: 'Bodrum',
            regionEn: 'Bodrum',
            meetingPoint: 'Yalıkavak Marina',
            meetingPointEn: 'Yalıkavak Marina',
            durationLabel: '2 Günlük Paket',
            capacityLabel: 'En fazla 12 kişi',
            durationDays: 2,
            pricePerDay: 6500,
            yachtId: 5,
            img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
            included: [
                'VIP mürettebat, kaptan ve standart rota yakıtı',
                'Yalıkavak çıkış ve koy molaları',
                'Özel grup kiralaması'
            ],
            includedEn: [
                'VIP crew, captain, and standard route fuel',
                'Yalıkavak departure and cove stops',
                'Private group charter'
            ],
            excluded: ['Özel akşam yemeği ve transferler'],
            excludedEn: ['Private dinner and transfers'],
            summary: 'Bodrum koylarında sabit paket fiyatlı VIP tekne paketi.'
        }
    ],
    paymentOptions: [
        { id: 1, name: 'Kredi / Banka Kartı', desc: 'Anında onay ve kapora/tam ödeme seçeneği', active: true },
        { id: 2, name: 'Havale / EFT', desc: 'IBAN üzerinden banka transferi ile ödeme', active: true },
        { id: 3, name: 'Nakit / Marina Ödemesi', desc: 'Tekne binişinde veya ofisimizde nakit ödeme', active: true }
    ],
    paymentPlanSettings: {
        installmentPercent: 50,
        installmentInterestPercent: 0,
        fullPaymentDiscountPercent: 10
    },
    extras: [
        { id: 1, name: 'VIP Havalimanı Transferi', nameEn: 'VIP Airport Transfer', desc: 'Dalaman / Milas havalimanından marinaya özel VIP araç', descEn: 'Private VIP transfer from Dalaman / Milas airport to marina', pricePerGuest: 45, active: true },
        { id: 2, name: 'Özel Şef & Gurme Menü', nameEn: 'Private Chef & Gourmet Menu', desc: 'Taze deniz ürünleri ve Akdeniz mezeleri eşliğinde özel servis', descEn: 'Fresh seafood and Mediterranean meze service by private chef', pricePerGuest: 120, active: true },
        { id: 3, name: 'Seabob & Su Sporları Paketi', nameEn: 'Seabob & Water Sports Package', desc: 'Seabob, paddleboard ve şnorkel ekipmanları', descEn: 'Seabob, paddleboard, and snorkeling gear', pricePerGuest: 85, active: true }
    ],
    bookings: [
        {
            id: 'YV2026-2841',
            customer: 'Aydın Mammedov',
            email: 'aydin@example.com',
            phone: '+994 50 211 22 33',
            yachtId: 1,
            yacht: 'Princess 72',
            checkIn: '2026-12-05',
            checkOut: '2026-12-08',
            days: 3,
            guests: 8,
            charterType: 'Özel Yat Kiralama (Konaklamalı)',
            extras: ['VIP Havalimanı Transferi'],
            notes: 'Akşam yemeği için deniz ürünleri tercih ediyoruz.',
            discount: 0,
            totalAmount: 10860,
            paidAmount: 5430,
            refundedAmount: 0,
            refundStatus: 'none',
            refundRuleReason: '',
            paymentType: 'Hisseli Ödeme',
            paymentMethod: 'Kredi / Banka Kartı',
            status: 'Onaylandı'
        }
    ]
};

function formatLocalYMD(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDaysYMD(ymd, deltaDays) {
    const base = new Date(`${ymd}T12:00:00`);
    if (isNaN(base.getTime())) return ymd;
    base.setDate(base.getDate() + Number(deltaDays || 0));
    return formatLocalYMD(base);
}

function getTodayYMD() {
    return formatLocalYMD(new Date());
}

function daysUntilYMD(targetYmd) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(targetYmd || ''))) return null;
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = String(targetYmd).split('-').map(Number);
    const targetUtc = Date.UTC(y, (m || 1) - 1, d || 1);
    return Math.round((targetUtc - todayUtc) / 86400000);
}

function saveBase64Image(dataUri, prefix = 'yacht') {
    if (!dataUri || typeof dataUri !== 'string') return '';
    if (dataUri.startsWith('/uploads/') || dataUri.startsWith('http://') || dataUri.startsWith('https://')) {
        return dataUri;
    }
    const m = dataUri.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i);
    if (!m) return '';
    const ext = m[1].toLowerCase() === 'jpeg' ? '.jpg' : '.' + m[1].toLowerCase();
    const safePrefix = String(prefix || 'yacht').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = path.basename(`${safePrefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}${ext}`);
    fs.writeFileSync(path.join(UPLOAD_DIR, fileName), Buffer.from(m[2], 'base64'));
    return `/uploads/${fileName}`;
}

function cookieFlags() {
    return IS_HTTPS_ENV ? '; Secure' : '';
}

function getCookieValue(req, name) {
    const cookieHeader = req.headers.cookie || '';
    const part = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
    if (!part) return '';
    const rawVal = part.slice(name.length + 1);
    try {
        return decodeURIComponent(rawVal);
    } catch {
        return rawVal;
    }
}

function writeJsonAtomic(filePath, dataObj) {
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(dataObj, null, 2));
    fs.renameSync(tmpPath, filePath);
}

function isDailyCharter(charterType) {
    const val = String(charterType || '').toLowerCase();
    return val.includes('günlük') || val.includes('daily') || val.includes('saatlik') || val.includes('hourly');
}

function normalizeDateRange(cIn, cOut, charterType) {
    const today = getTodayYMD();
    const fallbackStart = today;
    const isDaily = isDailyCharter(charterType);
    const fallbackEnd = isDaily ? fallbackStart : addDaysYMD(fallbackStart, 1);

    let start = (cIn || fallbackStart).trim();
    let end = (cOut || fallbackEnd).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) start = fallbackStart;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) end = fallbackEnd;

    if (isDaily) {
        if (end < start) end = start;
    } else if (end <= start) {
        end = addDaysYMD(start, 1);
    }
    return { checkIn: start, checkOut: end };
}

function calcDays(cIn, cOut, charterType) {
    if (isDailyCharter(charterType)) return 1;
    const { checkIn, checkOut } = normalizeDateRange(cIn, cOut, charterType);
    const d1 = new Date(`${checkIn}T12:00:00`);
    const d2 = new Date(`${checkOut}T12:00:00`);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return (!isNaN(diff) && diff >= 1) ? diff : 1;
}

function buildManualBookingWhatsapp(templateStr, booking) {
    const tpl = String(templateStr || DEFAULT_MANUAL_WA_TEMPLATE).trim() || DEFAULT_MANUAL_WA_TEMPLATE;
    const total = Number(booking.totalAmount || 0);
    const paid = Number(booking.paidAmount || 0);
    const remaining = Math.max(0, total - paid);
    const cleanPhone = String(booking.phone || '').replace(/\D/g, '');

    const replacements = {
        '{pnr}': booking.id || '',
        '{customer}': booking.customer || 'Misafir',
        '{yacht}': booking.yacht || '',
        '{checkIn}': booking.checkIn || '',
        '{checkOut}': booking.checkOut || booking.checkIn || '',
        '{timeSlot}': booking.tourTimeSlot || 'Tam Gün',
        '{guests}': String(booking.guests || 1),
        '{totalAmount}': total.toLocaleString(),
        '{paidAmount}': paid.toLocaleString(),
        '{remainingAmount}': remaining.toLocaleString(),
        '{captain}': booking.assignedCaptain || '-',
        '{transfer}': booking.assignedTransfer || '-',
        '{notes}': booking.notes || '-'
    };

    let message = tpl;
    Object.keys(replacements).forEach((key) => {
        message = message.split(key).join(replacements[key]);
    });

    const whatsappUrl = cleanPhone
        ? `https://wa.me/${encodeURIComponent(cleanPhone)}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;

    return { cleanPhone, message, whatsappUrl };
}

function normalizeBookingRecord(b) {
    if (!b || typeof b !== 'object') return b;

    const hasValidDates = /^\d{4}-\d{2}-\d{2}$/.test(String(b.checkIn || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(b.checkOut || ''));
    let rawDiffDays = Number(b.days) || 1;
    if (hasValidDates) {
        const d1 = new Date(`${b.checkIn}T12:00:00`);
        const d2 = new Date(`${b.checkOut}T12:00:00`);
        const diff = Math.round((d2 - d1) / 86400000);
        if (diff >= 1) rawDiffDays = diff;
        else if (b.checkIn === b.checkOut) rawDiffDays = 1;
    }

    if (isDailyCharter(b.charterType) && rawDiffDays > 1) {
        b.charterType = 'Özel Yat Kiralama (Konaklamalı)';
        b.days = rawDiffDays;
    } else if (isDailyCharter(b.charterType)) {
        b.days = 1;
        if (b.checkIn) b.checkOut = b.checkIn;
    } else {
        b.days = Math.max(1, rawDiffDays);
    }

    const statusStr = String(b.status || '');
    const isCancelledOrRejected = ['İptal Edildi', 'İptal', 'Cancelled', 'Reddedildi', 'Reddedildi (Hava Muhalefeti)', 'Rejected'].includes(statusStr);
    const refundedAmt = Number(b.refundedAmount || 0);

    if (isCancelledOrRejected) {
        b.remainingBalance = 0;
        if (refundedAmt > 0) {
            b.refundStatus = (b.refundStatus && b.refundStatus !== 'none' && !b.refundStatus.includes('no_refund'))
                ? b.refundStatus
                : 'refunded';
            const currentReason = String(b.refundRuleReason || '').trim();
            if (!currentReason || /uygulanmadı|no refund/i.test(currentReason)) {
                b.refundRuleReason = `€${refundedAmt.toLocaleString()} tutarında iade işlemi onaylandı${b.refundedAt ? ` (${b.refundedAt})` : ''}.`;
            }
        } else {
            b.refundedAmount = 0;
            if (!b.refundStatus || b.refundStatus === 'none') {
                b.refundStatus = 'no_refund';
            }
            if (!String(b.refundRuleReason || '').trim()) {
                b.refundRuleReason = Number(b.paidAmount || 0) > 0
                    ? 'İptal/red koşulları gereği iade uygulanmadı (€0).'
                    : 'Tahsil edilmiş ödeme bulunmadığı için iade tutarı €0.';
            }
        }
    } else {
        b.refundedAmount = 0;
        b.refundStatus = 'none';
        b.refundRuleReason = '';
    }

    return b;
}

function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        const bundledDbPath = path.join(__dirname, 'data.json');
        const seedSource = fs.existsSync(bundledDbPath)
            ? JSON.parse(fs.readFileSync(bundledDbPath, 'utf8'))
            : structuredClone(initialData);
        if (Array.isArray(seedSource.bookings)) {
            seedSource.bookings = seedSource.bookings.map(normalizeBookingRecord);
        }
        writeJsonAtomic(DB_PATH, seedSource);
        return seedSource;
    }
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!parsed.yachts || !parsed.yachts[0] || !parsed.yachts[0].reviewList) {
        writeJsonAtomic(DB_PATH, initialData);
        return structuredClone(initialData);
    }
    parsed.siteSettings = Object.assign(
        structuredClone(initialData.siteSettings),
        parsed.siteSettings || {}
    );
    parsed.adminUsers = (parsed.adminUsers && parsed.adminUsers.length)
        ? parsed.adminUsers
        : structuredClone(initialData.adminUsers);
    parsed.rentalContract = Object.assign(
        structuredClone(initialData.rentalContract),
        parsed.rentalContract || {}
    );
    parsed.categories = parsed.categories || structuredClone(initialData.categories);
    parsed.departurePoints = (parsed.departurePoints && parsed.departurePoints.length)
        ? parsed.departurePoints
        : structuredClone(initialData.departurePoints);
    parsed.promoCodes = Array.isArray(parsed.promoCodes)
        ? parsed.promoCodes
        : structuredClone(initialData.promoCodes);
    parsed.timeSlots = (Array.isArray(parsed.timeSlots) && parsed.timeSlots.length)
        ? parsed.timeSlots
        : structuredClone(initialData.timeSlots);
    parsed.captains = (Array.isArray(parsed.captains) && parsed.captains.length)
        ? parsed.captains
        : structuredClone(initialData.captains);
    parsed.faqs = (Array.isArray(parsed.faqs) && parsed.faqs.length)
        ? parsed.faqs
        : structuredClone(initialData.faqs);
    parsed.tours = (parsed.tours && parsed.tours.length)
        ? parsed.tours
        : structuredClone(initialData.tours);
    parsed.paymentOptions = parsed.paymentOptions || structuredClone(initialData.paymentOptions);
    parsed.paymentPlanSettings = Object.assign(
        structuredClone(initialData.paymentPlanSettings),
        parsed.paymentPlanSettings || {}
    );
    parsed.extras = parsed.extras || structuredClone(initialData.extras);
    parsed.bookings = (parsed.bookings || []).map(normalizeBookingRecord);
    return parsed;
}

function saveDB(data) {
    if (data && Array.isArray(data.bookings)) {
        data.bookings = data.bookings.map(normalizeBookingRecord);
    }
    writeJsonAtomic(DB_PATH, data);
}

function getAllAdminUsers(db) {
    const users = [];
    if (process.env.ADMIN_USERS_JSON) {
        try {
            const parsed = JSON.parse(process.env.ADMIN_USERS_JSON);
            if (Array.isArray(parsed)) {
                parsed.forEach((u, idx) => {
                    if (u && u.email && u.password) {
                        users.push({
                            id: u.id || `env-${idx + 1}`,
                            email: String(u.email).trim().toLowerCase(),
                            password: String(u.password).trim(),
                            role: u.role || 'admin',
                            name: u.name || `Staff ${idx + 1}`
                        });
                    }
                });
            }
        } catch (err) {
            console.error('ADMIN_USERS_JSON ayrıştırma hatası:', err.message);
        }
    }

    const dbUsers = (db && Array.isArray(db.adminUsers)) ? db.adminUsers : [];
    dbUsers.forEach((u, idx) => {
        if (u && u.email && u.password) {
            const normEmail = String(u.email).trim().toLowerCase();
            if (!users.some(existing => existing.email === normEmail)) {
                users.push({
                    id: u.id || idx + 1,
                    email: normEmail,
                    password: String(u.password).trim(),
                    role: u.role || 'staff',
                    name: u.name || `User ${idx + 1}`
                });
            }
        }
    });

    if (users.length === 0) {
        users.push({
            id: 1,
            email: ADMIN_EMAIL.trim().toLowerCase(),
            password: ADMIN_PASSWORD.trim(),
            role: 'admin',
            name: 'Main Admin'
        });
    }

    return users;
}

function signAdminSession(user) {
    const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    const payload = Buffer.from(JSON.stringify({
        email: user.email,
        role: user.role,
        exp
    })).toString('base64url');
    const sig = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(`${user.email}:${user.password}:${user.role}:${exp}`)
        .digest('hex');
    return `${payload}.${sig}`;
}

function getAuthenticatedAdmin(req, db) {
    const token = getCookieValue(req, 'yv_admin');
    if (!token) return null;

    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;

    let payload;
    try {
        payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
        return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload || !payload.exp || Number(payload.exp) < nowSec) {
        return null;
    }

    const users = getAllAdminUsers(db || loadDB());
    const matchedUser = users.find(u => u.email === String(payload.email || '').toLowerCase());
    if (!matchedUser) return null;

    const expectedSig = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(`${matchedUser.email}:${matchedUser.password}:${matchedUser.role}:${payload.exp}`)
        .digest('hex');

    const sigBuf = Buffer.from(sig, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    return matchedUser;
}

function requireAdmin(req, res, next) {
    const db = loadDB();
    const adminUser = getAuthenticatedAdmin(req, db);
    if (adminUser) {
        req.adminUser = adminUser;
        res.locals.adminUser = adminUser;
        return next();
    }
    return res.redirect('/admin/login');
}

function getVerifiedPnrFromCookie(req) {
    const token = getCookieValue(req, 'yv_pnr_auth');
    if (!token) return null;
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    try {
        const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('hex');
        if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
            return null;
        }
        return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
}

function setVerifiedPnrCookie(res, pnr, email) {
    const payloadB64 = Buffer.from(JSON.stringify({
        pnr: String(pnr || '').toUpperCase(),
        email: String(email || '').toLowerCase()
    })).toString('base64url');
    const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('hex');
    res.setHeader('Set-Cookie', `yv_pnr_auth=${payloadB64}.${sig}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${cookieFlags()}`);
}

app.get('/lang/:code', (req, res) => {
    const lang = req.params.code === 'en' ? 'en' : 'tr';
    res.setHeader('Set-Cookie', `yv_lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${cookieFlags()}`);
    const ref = req.get('Referer') || '/';
    let safeBack = '/';
    try {
        const parsedRef = new URL(ref, `http://${req.get('host') || 'localhost:3000'}`);
        if (parsedRef.host === req.get('host')) {
            safeBack = parsedRef.pathname + parsedRef.search;
        }
    } catch {
        safeBack = '/';
    }
    res.redirect(safeBack);
});

const translationMemoryCache = new Map();

async function translateSingleFallback(src) {
    if (typeof fetch !== 'function') return src;

    try {
        const gUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=tr&tl=en&dt=t&q=' + encodeURIComponent(src);
        const r = await fetch(gUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (r.ok) {
            const data = await r.json();
            if (Array.isArray(data) && Array.isArray(data[0])) {
                const joined = data[0].map(part => (part && part[0]) ? part[0] : '').join('').trim();
                if (joined && joined.toLowerCase() !== src.toLowerCase()) {
                    return joined;
                }
            }
        }
    } catch {
        // ikinci kaynağa geç
    }

    try {
        const mUrl = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(src) + '&langpair=tr|en';
        const mr = await fetch(mUrl);
        if (mr.ok) {
            const mj = await mr.json();
            const mOut = mj && mj.responseData && mj.responseData.translatedText;
            if (mOut && typeof mOut === 'string' && mOut.trim()) {
                return mOut.trim();
            }
        }
    } catch {
        // orijinal metni döndür
    }

    return src;
}

async function translateBatchFreeFirst(texts) {
    const uniqueTexts = [...new Set(texts.map(t => String(t || '').trim()).filter(Boolean))];
    const outputMap = {};
    const pending = [];

    for (const src of uniqueTexts) {
        if (translationMemoryCache.has(src)) {
            outputMap[src] = translationMemoryCache.get(src);
        } else {
            pending.push(src);
        }
    }

    if (pending.length === 0) {
        return outputMap;
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (geminiKey && typeof fetch === 'function') {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{
                            text: 'You translate Turkish texts for a yacht charter and tour booking platform into natural, concise English. Keep yacht names ("Princess 72", "Aegean Pearl Gulet", "Sun Odyssey 54", "Lagoon 52 Catamaran", "Majesty 100 Superyacht"), brand name ("YachtVoyage"), PNR codes, currency/numbers, and place names ("Göcek", "Marmaris", "Fethiye", "Bodrum", "Yalıkavak", "Türkbükü", "Netsel Marina", "Ece Marina", "Ölüdeniz", "Cennet Adası", "Fosforlu Mağara") intact unless descriptive English is needed. Return ONLY valid JSON in this exact structure: {"translations":["..."]}.'
                        }]
                    },
                    contents: [{
                        role: 'user',
                        parts: [{ text: JSON.stringify({ texts: pending }) }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const rawJson = data &&
                    data.candidates &&
                    data.candidates[0] &&
                    data.candidates[0].content &&
                    data.candidates[0].content.parts &&
                    data.candidates[0].content.parts[0] &&
                    data.candidates[0].content.parts[0].text;

                const parsed = rawJson ? JSON.parse(rawJson) : null;
                const arr = parsed && Array.isArray(parsed.translations) ? parsed.translations : [];

                if (arr.length === pending.length) {
                    pending.forEach((src, idx) => {
                        const val = (typeof arr[idx] === 'string' && arr[idx].trim()) ? arr[idx].trim() : src;
                        translationMemoryCache.set(src, val);
                        outputMap[src] = val;
                    });
                    return outputMap;
                }
            }
        } catch (err) {
            console.error('Gemini çeviri hatası, ücretsiz yedeğe geçiliyor:', err.message);
        }
    }

    const concurrency = 6;
    for (let i = 0; i < pending.length; i += concurrency) {
        const chunk = pending.slice(i, i + concurrency);
        const translatedChunk = await Promise.all(chunk.map(src => translateSingleFallback(src)));
        chunk.forEach((src, idx) => {
            const val = translatedChunk[idx] || src;
            translationMemoryCache.set(src, val);
            outputMap[src] = val;
        });
    }

    return outputMap;
}

app.post('/api/translate', async (req, res) => {
    try {
        const texts = Array.isArray(req.body && req.body.texts) ? req.body.texts : [];
        if (!texts.length) {
            return res.json({ translations: {} });
        }
        const translations = await translateBatchFreeFirst(texts.slice(0, 200));
        return res.json({ translations });
    } catch (err) {
        console.error('/api/translate hatası:', err.message);
        return res.status(500).json({ translations: {}, error: 'Translation failed' });
    }
});

app.use((req, res, next) => {
    const db = loadDB();
    const cookieLang = getCookieValue(req, 'yv_lang');
    const lang = (req.query.lang === 'en' || req.query.lang === 'tr')
        ? req.query.lang
        : (cookieLang === 'en' || cookieLang === 'tr' ? cookieLang : 'tr');

    res.locals.lang = lang;
    res.locals.isEn = lang === 'en';
    res.locals.siteSettings = db.siteSettings;
    res.locals.rentalContract = db.rentalContract;
    res.locals.categories = db.categories;
    res.locals.departurePoints = db.departurePoints;
    res.locals.promoCodes = db.promoCodes || [];
    res.locals.timeSlots = (db.timeSlots || []).filter(t => t.active !== false);
    res.locals.captains = (db.captains || []).filter(c => c.active !== false);
    res.locals.faqs = (db.faqs || []).filter(f => f.active !== false);
    res.locals.showAdminNav = Boolean(getAuthenticatedAdmin(req, db));
    next();
});

function parseMultipartUpload(req) {
    return new Promise((resolve) => {
        const contentType = req.headers['content-type'] || '';
        const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (!match) {
            return resolve({ fields: req.body || {}, files: [], file: null, tooLarge: false });
        }
        const boundary = Buffer.from('--' + (match[1] || match[2]));
        const chunks = [];
        let totalBytes = 0;
        let tooLarge = false;

        req.on('data', (chunk) => {
            if (tooLarge) return;
            totalBytes += chunk.length;
            if (totalBytes > MAX_UPLOAD_BYTES) {
                tooLarge = true;
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            if (tooLarge) {
                return resolve({ fields: {}, files: [], file: null, tooLarge: true });
            }

            const buffer = Buffer.concat(chunks);
            const fields = Object.assign({}, req.body || {});
            const uploadedFiles = [];

            let pos = buffer.indexOf(boundary);
            while (pos !== -1) {
                const start = pos + boundary.length;
                const next = buffer.indexOf(boundary, start);
                if (next === -1) break;
                const part = buffer.subarray(start, next);
                pos = next;

                const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
                if (headerEnd === -1) continue;

                const headerStr = part.subarray(0, headerEnd).toString('utf8');
                let bodyBuf = part.subarray(headerEnd + 4);
                if (bodyBuf.length >= 2 && bodyBuf.subarray(bodyBuf.length - 2).toString('utf8') === '\r\n') {
                    bodyBuf = bodyBuf.subarray(0, bodyBuf.length - 2);
                }

                const nameMatch = headerStr.match(/name="([^"]+)"/i);
                if (!nameMatch) continue;
                const fieldName = nameMatch[1];

                const filenameMatch = headerStr.match(/filename="([^"]*)"/i);
                if (filenameMatch && filenameMatch[1] && bodyBuf.length > 0) {
                    const ext = path.extname(path.basename(filenameMatch[1])).toLowerCase() || '.jpg';
                    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
                    const fileName = path.basename(`yacht-${Date.now()}-${Math.floor(Math.random() * 100000)}${safeExt}`);
                    const fullPath = path.join(UPLOAD_DIR, fileName);
                    fs.writeFileSync(fullPath, bodyBuf);
                    uploadedFiles.push({
                        fieldName,
                        url: `/uploads/${fileName}`
                    });
                } else {
                    fields[fieldName] = bodyBuf.toString('utf8');
                }
            }

            resolve({
                fields,
                files: uploadedFiles,
                file: uploadedFiles[0] || null,
                tooLarge: false
            });
        });
    });
}

function isDateOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

function isValidBookingRange(cIn, cOut, charterType) {
    const today = getTodayYMD();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cIn || '') || cIn < today) {
        return false;
    }
    if (isDailyCharter(charterType)) {
        if (!cOut || !/^\d{4}-\d{2}-\d{2}$/.test(cOut)) {
            return true;
        }
        return cOut >= cIn;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cOut || '')) {
        return false;
    }
    return cOut > cIn;
}

function findMatchedTour(db, queryOrBody) {
    const src = queryOrBody || {};
    const pkgId = Number(src.packageId || src.tourId || 0);
    const pkgName = String(src.packageName || src.tourName || '').trim().toLowerCase();
    const tours = Array.isArray(db.tours) ? db.tours : [];
    if (pkgId > 0) {
        const byId = tours.find(t => Number(t.id) === pkgId);
        if (byId) return byId;
    }
    if (pkgName) {
        return tours.find(t => String(t.title || '').trim().toLowerCase() === pkgName) || null;
    }
    return null;
}

function resolveBookingYacht(db, booking) {
    if (!booking) return null;
    const found = db.yachts.find(y => Number(y.id) === Number(booking.yachtId));
    if (found) return found;
    return {
        id: booking.yachtId || null,
        name: booking.yacht || 'Seçilen Yat',
        location: booking.location || '',
        images: [DEFAULT_IMG]
    };
}

app.get('/', (req, res) => {
    const db = loadDB();
    const homeBookings = (db.bookings || [])
        .filter(b => b.status !== 'İptal Edildi' && b.status !== 'İptal' && b.status !== 'Reddedildi')
        .map(b => ({ checkIn: b.checkIn, checkOut: b.checkOut }));

    const sortedDepartures = [...(db.departurePoints || [])].sort((a, b) => {
        if (String(a.name).toLowerCase() === 'marmaris') return -1;
        if (String(b.name).toLowerCase() === 'marmaris') return 1;
        return 0;
    });

    res.render('client/home', {
        yachts: db.yachts,
        categories: db.categories,
        departurePoints: sortedDepartures,
        defaultDeparture: (db.siteSettings && db.siteSettings.defaultDeparture) || 'Marmaris',
        tours: db.tours,
        captains: (db.captains || []).filter(c => c.active !== false),
        faqs: (db.faqs || []).filter(f => f.active !== false),
        homeBookings
    });
});

app.get('/tur-paketleri', (req, res) => {
    const db = loadDB();
    res.render('client/packages', { yachts: db.yachts, tours: db.tours });
});

app.get('/rotalar', (req, res) => {
    const db = loadDB();
    res.render('client/routes', { yachts: db.yachts, tours: db.tours });
});

app.get('/kategoriler', (req, res) => {
    const db = loadDB();
    res.render('client/categories', { yachts: db.yachts, categories: db.categories });
});

app.get('/yachts', (req, res) => {
    const db = loadDB();
    const { location, category, guests, maxPrice, feature, sort, checkIn, checkOut } = req.query;
    let results = [...db.yachts];

    if (location && location !== 'all') results = results.filter(y => y.location.toLowerCase() === location.toLowerCase());
    if (category && category !== 'all') results = results.filter(y => y.category === category || y.categoryTr === category);
    if (guests) {
        if (guests === '1-6') results = results.filter(y => y.guests <= 6);
        else if (guests === '7-12') results = results.filter(y => y.guests >= 7 && y.guests <= 12);
        else if (guests === '13+') results = results.filter(y => y.guests >= 13);
        else if (!isNaN(Number(guests))) results = results.filter(y => y.guests >= Number(guests));
    }
    if (maxPrice && Number(maxPrice) > 0) results = results.filter(y => y.price <= Number(maxPrice));
    if (feature) {
        const selectedFeatures = Array.isArray(feature) ? feature : [feature];
        results = results.filter(y => selectedFeatures.every(f => y.features.includes(f)));
    }

    if (sort === 'price_asc') results.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') results.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') results.sort((a, b) => b.rating - a.rating);

    const today = getTodayYMD();
    const rawIn = String(checkIn || '').trim();
    const rawOut = String(checkOut || '').trim();
    const validIn = /^\d{4}-\d{2}-\d{2}$/.test(rawIn) ? (rawIn < today ? today : rawIn) : today;
    const validOut = (/^\d{4}-\d{2}-\d{2}$/.test(rawOut) && rawOut >= validIn)
        ? rawOut
        : addDaysYMD(validIn, 1);
    const selectedDays = validOut > validIn
        ? Math.max(1, Math.round((new Date(`${validOut}T12:00:00`) - new Date(`${validIn}T12:00:00`)) / (1000 * 60 * 60 * 24)))
        : 1;

    res.render('client/listing', {
        yachts: results,
        categories: db.categories,
        selectedDays,
        filters: {
            location: location || 'all',
            category: category || 'all',
            guests: guests || '',
            maxPrice: maxPrice || 10000,
            features: feature ? (Array.isArray(feature) ? feature : [feature]) : [],
            sort: sort || 'recommended',
            checkIn: validIn,
            checkOut: validOut
        }
    });
});

app.get('/yachts/:id', (req, res) => {
    const db = loadDB();
    const yacht = db.yachts.find(y => Number(y.id) === Number(req.params.id));
    if (!yacht) return res.redirect('/yachts');
    const yachtBookings = db.bookings.filter(b => Number(b.yachtId) === Number(yacht.id) && b.status !== 'İptal Edildi' && b.status !== 'İptal' && b.status !== 'Reddedildi');
    const range = normalizeDateRange(req.query.checkIn, req.query.checkOut, 'Özel Yat Kiralama (Konaklamalı)');
    const activeExtras = (db.extras || []).filter(e => e.active !== false);
    const activeTimeSlots = (db.timeSlots || []).filter(t => t.active !== false);
    res.render('client/detail', {
        yacht,
        yachtBookings,
        extrasList: activeExtras,
        timeSlots: activeTimeSlots,
        reviewSaved: req.query.reviewSaved === '1',
        checkIn: range.checkIn,
        checkOut: range.checkOut
    });
});

app.post('/yachts/:id/reviews', (req, res) => {
    const db = loadDB();
    const yacht = db.yachts.find(y => Number(y.id) === Number(req.params.id));
    if (yacht) {
        const author = (req.body.author || 'Misafir').trim();
        const reviewerEmail = String(req.body.email || '').trim().toLowerCase();
        const inputPnr = String(req.body.pnr || '').trim().toUpperCase();
        const rating = Math.min(5, Math.max(1, Number(req.body.rating) || 5));
        const comment = (req.body.comment || '').trim();

        const verifiedCookie = getVerifiedPnrFromCookie(req);
        const matchedBooking = (db.bookings || []).find(b => {
            if (inputPnr && String(b.id || '').toUpperCase() === inputPnr) return true;
            if (verifiedCookie && String(b.id || '').toUpperCase() === verifiedCookie.pnr && Number(b.yachtId) === Number(yacht.id)) return true;
            if (reviewerEmail && String(b.email || '').toLowerCase() === reviewerEmail && Number(b.yachtId) === Number(yacht.id)) return true;
            return false;
        });

        if (comment) {
            yacht.reviewList = yacht.reviewList || [];
            yacht.reviewList.unshift({
                id: `REV-${Date.now()}`,
                author,
                email: reviewerEmail || (matchedBooking ? matchedBooking.email : ''),
                bookingId: matchedBooking ? matchedBooking.id : (inputPnr || ''),
                tourDate: matchedBooking ? `${matchedBooking.checkIn}${matchedBooking.checkOut && matchedBooking.checkOut !== matchedBooking.checkIn ? ' → ' + matchedBooking.checkOut : ''}` : '',
                rating,
                date: getTodayYMD(),
                comment
            });
            const oldCount = Number(yacht.reviews) || 0;
            const oldRating = Number(yacht.rating) || 5;
            yacht.reviews = oldCount + 1;
            yacht.rating = Number((((oldRating * oldCount) + rating) / yacht.reviews).toFixed(1));
            saveDB(db);
        }
    }
    res.redirect(`/yachts/${req.params.id}?reviewSaved=1#reviewsSection`);
});

app.get('/checkout', (req, res) => {
    const db = loadDB();
    const matchedTour = findMatchedTour(db, req.query);
    const targetYachtId = Number(req.query.yachtId || (matchedTour && matchedTour.yachtId) || 0);
    const yacht = db.yachts.find(y => Number(y.id) === targetYachtId) || db.yachts[0];
    const yachtBookings = db.bookings.filter(b => Number(b.yachtId) === Number(yacht.id) && b.status !== 'İptal Edildi' && b.status !== 'İptal' && b.status !== 'Reddedildi');

    const rawIn = (req.query.checkIn || '').trim();
    const rawOut = (req.query.checkOut || '').trim();
    const today = getTodayYMD();
    const checkInVal = (/^\d{4}-\d{2}-\d{2}$/.test(rawIn) && rawIn >= today) ? rawIn : '';
    const checkOutVal = (checkInVal && /^\d{4}-\d{2}-\d{2}$/.test(rawOut) && rawOut >= checkInVal) ? rawOut : '';

    const activeExtras = (db.extras || []).filter(e => e.active !== false);
    const activePayments = (db.paymentOptions || []).filter(p => p.active !== false);
    const activeTimeSlots = (db.timeSlots || []).filter(t => t.active !== false);
    const activePromoCodes = (db.promoCodes || []).filter(p => {
        if (p.isActive === false) return false;
        if (p.expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(p.expiresAt) && p.expiresAt < today) return false;
        return true;
    });

    const selectedPackage = matchedTour ? {
        id: matchedTour.id,
        name: matchedTour.title,
        price: Number(matchedTour.pricePerDay || 0),
        days: Number(matchedTour.durationDays || 1),
        duration: matchedTour.durationLabel || '',
        included: matchedTour.included || []
    } : (Number(req.query.packagePrice) > 0 || req.query.packageName ? {
        id: req.query.packageId || '',
        name: String(req.query.packageName || '').trim(),
        price: Math.max(0, Number(req.query.packagePrice) || 0),
        days: Math.max(1, Number(req.query.packageDays || req.query.days) || 1),
        duration: String(req.query.duration || '').trim(),
        included: []
    } : null);

    res.render('client/checkout', {
        yacht,
        yachtBookings,
        extrasList: activeExtras,
        timeSlots: activeTimeSlots,
        paymentOptions: activePayments,
        paymentPlanSettings: db.paymentPlanSettings,
        rentalContract: db.rentalContract,
        promoCodes: activePromoCodes,
        selectedPackage,
        errorMsg: req.query.error || '',
        checkIn: checkInVal,
        checkOut: checkOutVal,
        guests: Math.min(Number(yacht.guests) || 12, Math.max(1, Number(req.query.guests) || 1))
    });
});

app.post('/checkout/confirm', (req, res) => {
    const db = loadDB();
    const isEnReq = res.locals.isEn;
    const {
        yachtId, customerName, email, phone, checkIn, checkOut,
        guests, charterType, tourTimeSlot, extras, notes,
        paymentType, paymentMethod
    } = req.body;

    const matchedTour = findMatchedTour(db, req.body);
    const targetYachtId = Number(yachtId || (matchedTour && matchedTour.yachtId) || 0);
    const yacht = db.yachts.find(y => Number(y.id) === targetYachtId) || db.yachts[0];
    if (!yacht) return res.redirect('/yachts');

    const guestCount = Math.min(Number(yacht.guests) || 12, Math.max(1, Number(guests) || 1));

    const pkgDaysFromReq = Number(matchedTour && matchedTour.durationDays) || Number(req.body.packageDays) || 0;
    const rawDaily = isDailyCharter(charterType || (matchedTour && matchedTour.durationDays === 1 ? 'Günlük VIP Koy Turu' : ''));
    const hasMultiDayPkg = !rawDaily && pkgDaysFromReq >= 2;

    const startYmd = String(checkIn || '').trim();
    const effectiveCheckOutForValidation = (hasMultiDayPkg && /^\d{4}-\d{2}-\d{2}$/.test(startYmd))
        ? addDaysYMD(startYmd, pkgDaysFromReq - 1)
        : String(checkOut || '').trim();

    if (!isValidBookingRange(startYmd, effectiveCheckOutForValidation, rawDaily ? 'Günlük VIP Koy Turu' : 'Özel Yat Kiralama (Konaklamalı)')) {
        const errText = isEnReq
            ? 'Please select today or a future date and a valid end date.'
            : 'Lütfen bugün veya ileri bir tarih ve uygun bitiş tarihi seçin.';
        return res.redirect(`/checkout?yachtId=${yacht.id}&guests=${guestCount}&error=${encodeURIComponent(errText)}`);
    }

    const endYmd = rawDaily
        ? startYmd
        : (hasMultiDayPkg ? addDaysYMD(startYmd, pkgDaysFromReq - 1) : effectiveCheckOutForValidation);

    const days = rawDaily
        ? 1
        : (hasMultiDayPkg ? pkgDaysFromReq : calcDays(startYmd, endYmd, 'Özel Yat Kiralama (Konaklamalı)'));

    const isDaily = days === 1 && (rawDaily || startYmd === endYmd);
    const normalizedCharter = isDaily
        ? (charterType && isDailyCharter(charterType) ? charterType : 'Günlük VIP Koy Turu')
        : 'Özel Yat Kiralama (Konaklamalı)';

    const overlapEndYmd = isDaily ? addDaysYMD(startYmd, 1) : endYmd;

    const conflict = db.bookings.find(b =>
        Number(b.yachtId) === Number(yacht.id) &&
        b.status !== 'İptal Edildi' &&
        b.status !== 'İptal' &&
        b.status !== 'Reddedildi' &&
        isDateOverlap(startYmd, overlapEndYmd, b.checkIn, b.checkOut)
    );

    if (conflict) {
        const errText = isEnReq
            ? `Selected dates (${conflict.checkIn} - ${conflict.checkOut}) are already booked. Please choose available dates.`
            : `Seçilen tarihler (${conflict.checkIn} - ${conflict.checkOut}) dolu. Lütfen boş bir tarih seçin.`;
        return res.redirect(`/checkout?yachtId=${yacht.id}&checkIn=${startYmd}&checkOut=${endYmd}&guests=${guestCount}&error=${encodeURIComponent(errText)}`);
    }

    const selectedMethod = String(paymentMethod || 'Kredi / Banka Kartı').trim();
    const methodLower = selectedMethod.toLowerCase();
    const isCard = methodLower.includes('kart') || methodLower.includes('card');
    const isDeferredPayment = methodLower.includes('havale') || methodLower.includes('eft') || methodLower.includes('marina') || methodLower.includes('nakit') || methodLower.includes('cash');

    if (isCard) {
        const cardHolder = String(req.body.cardHolder || '').trim();
        const cardNumber = String(req.body.cardNumber || '').replace(/\D/g, '');
        const cardExpiry = String(req.body.cardExpiry || '').trim();
        const cardCvv = String(req.body.cardCvv || '').replace(/\D/g, '');

        const expMatch = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(cardExpiry);
        const nowRef = new Date();
        const curYear = nowRef.getFullYear();
        const curMonth = nowRef.getMonth() + 1;
        const expYear = expMatch ? 2000 + Number(expMatch[2]) : 0;
        const expMonth = expMatch ? Number(expMatch[1]) : 0;
        const expValid = Boolean(expMatch) && (expYear > curYear || (expYear === curYear && expMonth >= curMonth));

        const validCard =
            cardHolder.length >= 2 &&
            cardNumber.length >= 13 && cardNumber.length <= 19 &&
            expValid &&
            (cardCvv.length === 3 || cardCvv.length === 4);

        if (!validCard) {
            const errText = isEnReq
                ? 'Please enter valid card details to pay by Credit / Debit Card.'
                : 'Kredi / Banka Kartı ile ödeme için kart bilgilerini eksiksiz ve doğru girmeniz gerekir.';
            return res.redirect(`/checkout?yachtId=${yacht.id}&checkIn=${startYmd}&checkOut=${endYmd}&guests=${guestCount}&error=${encodeURIComponent(errText)}`);
        }
    }

    const selectedExtraNames = extras ? (Array.isArray(extras) ? extras : [extras]) : [];
    const activeExtras = (db.extras || []).filter(e => e.active !== false);
    const validExtraNames = selectedExtraNames.filter(name => activeExtras.some(e => e.name === name));
    const extrasPerGuestTotal = activeExtras
        .filter(e => validExtraNames.includes(e.name))
        .reduce((sum, e) => sum + Number(e.pricePerGuest || 0), 0);

    const extrasTotal = extrasPerGuestTotal * guestCount;

    const fixedPkgPrice = matchedTour
        ? Math.max(0, Number(matchedTour.pricePerDay || 0))
        : Math.max(0, Number(req.body.packagePrice) || 0);
    const hasFixedPkg = fixedPkgPrice > 0;

    const matchedSlot = isDaily
        ? (db.timeSlots || []).find(s => s.active !== false && (s.label === String(tourTimeSlot || '').trim() || s.labelEn === String(tourTimeSlot || '').trim()))
        : null;
    const slotMultiplier = (!hasFixedPkg && matchedSlot && Number(matchedSlot.priceMultiplier) > 0)
        ? Number(matchedSlot.priceMultiplier)
        : 1;

    const baseTotal = hasFixedPkg ? fixedPkgPrice : Math.round(Number(yacht.price || 0) * days * slotMultiplier);
    const autoDisc = (!hasFixedPkg && days >= 5) ? Math.round(baseTotal * 0.05) : 0;

    const rawPromoCode = req.body.promoCodeApplied || req.body.promoCode || '';
    const normPromoInput = String(rawPromoCode).trim().toUpperCase();
    const today = getTodayYMD();
    const matchedPromo = normPromoInput
        ? (db.promoCodes || []).find(p =>
            p.isActive !== false &&
            String(p.code || '').trim().toUpperCase() === normPromoInput &&
            (!p.expiresAt || !/^\d{4}-\d{2}-\d{2}$/.test(p.expiresAt) || p.expiresAt >= today)
        )
        : null;

    const subBeforePromo = Math.max(0, baseTotal - autoDisc + extrasTotal);
    const promoDiscAmt = matchedPromo
        ? Math.round(subBeforePromo * (Number(matchedPromo.discountPercent || 0) / 100))
        : 0;

    const totalDiscountAmt = autoDisc + promoDiscAmt;
    const subTotal = Math.max(0, subBeforePromo - promoDiscAmt);

    const planCfg = db.paymentPlanSettings || {
        installmentPercent: 50,
        installmentInterestPercent: 0,
        fullPaymentDiscountPercent: 10
    };

    const isFullPayment = paymentType === 'Tam Ödeme (İndirimli)';
    const finalAmount = isFullPayment
        ? Math.max(0, Math.round(subTotal * (1 - Number(planCfg.fullPaymentDiscountPercent || 0) / 100)))
        : Math.max(0, Math.round(subTotal * (1 + Number(planCfg.installmentInterestPercent || 0) / 100)));

    const plannedPaidAmt = isFullPayment
        ? finalAmount
        : Math.round(finalAmount * (Number(planCfg.installmentPercent || 50) / 100));

    const paidAmt = (isCard && !isDeferredPayment) ? plannedPaidAmt : 0;
    const bookingStatus = 'Beklemede';
    const paymentStatus = isDeferredPayment
        ? 'pending_payment'
        : (isCard ? (paidAmt >= finalAmount ? 'paid_full' : 'deposit_paid') : 'pending_payment');

    let pnr = '';
    const existingIds = new Set((db.bookings || []).map(b => String(b.id || '').toUpperCase()));
    do {
        pnr = `YV2026-${Math.floor(1000 + Math.random() * 9000)}`;
    } while (existingIds.has(pnr));

    const normEmail = (email || '').trim().toLowerCase();

    db.bookings.unshift(normalizeBookingRecord({
        id: pnr,
        customer: (customerName || '').trim(),
        email: normEmail,
        phone: (phone || '').trim(),
        yachtId: yacht.id,
        yacht: yacht.name,
        location: yacht.location || '',
        packageId: matchedTour ? matchedTour.id : (req.body.packageId || null),
        packageName: matchedTour ? matchedTour.title : (String(req.body.packageName || '').trim() || null),
        checkIn: startYmd,
        checkOut: endYmd,
        tourTimeSlot: isDaily ? (String(tourTimeSlot || '10:30 - 18:00').trim()) : null,
        days,
        guests: guestCount,
        charterType: normalizedCharter,
        extras: validExtraNames,
        extrasTotal,
        notes: (notes || '').trim(),
        promoCode: matchedPromo ? matchedPromo.code : '',
        discount: totalDiscountAmt,
        totalAmount: finalAmount,
        paidAmount: paidAmt,
        refundedAmount: 0,
        refundStatus: 'none',
        refundRuleReason: '',
        paymentStatus,
        paymentType: isFullPayment ? 'Tam Ödeme (İndirimli)' : 'Hisseli Ödeme',
        paymentMethod: selectedMethod,
        assignedCaptain: '',
        assignedTransfer: '',
        adminNote: '',
        status: bookingStatus
    }));

    saveDB(db);
    setVerifiedPnrCookie(res, pnr, normEmail);
    return res.redirect(`/confirmation/${pnr}`);
});

app.get('/confirmation/:pnr', (req, res) => {
    const db = loadDB();
    const booking = db.bookings.find(b => b.id === req.params.pnr);
    if (!booking) return res.redirect('/');
    const verified = getVerifiedPnrFromCookie(req);
    const isAuthorized = Boolean(verified && verified.pnr === String(booking.id).toUpperCase() && verified.email === String(booking.email || '').toLowerCase());
    if (!isAuthorized) {
        return res.redirect(`/my-booking?pnr=${encodeURIComponent(booking.id)}`);
    }
    const yacht = resolveBookingYacht(db, booking);
    res.render('client/confirmation', { booking, yacht });
});

app.get('/my-booking', (req, res) => {
    const db = loadDB();
    const verified = getVerifiedPnrFromCookie(req);
    const pnr = (req.query.pnr || (verified && verified.pnr) || '').trim().toUpperCase();
    let booking = null;
    let yacht = null;

    if (pnr && verified && verified.pnr === pnr) {
        const candidate = db.bookings.find(b =>
            b.id.toUpperCase() === pnr &&
            String(b.email || '').toLowerCase() === verified.email
        );
        if (candidate) {
            booking = candidate;
            yacht = resolveBookingYacht(db, booking);
        }
    }

    res.render('client/my-booking', {
        booking,
        yacht,
        pnr,
        email: (verified && verified.email) || '',
        searched: Boolean(pnr),
        msg: req.query.msg || '',
        errMsg: req.query.err || ''
    });
});

app.post('/my-booking', (req, res) => {
    const db = loadDB();
    const isEnReq = res.locals.isEn;
    const pnr = String(req.body.pnr || '').trim().toUpperCase();
    const emailQuery = String(req.body.email || '').trim().toLowerCase();

    if (!pnr || !emailQuery) {
        const msg = isEnReq
            ? 'Please enter both your PNR code and email address.'
            : 'PNR kodu ve e-posta adresini girin.';
        return res.redirect('/my-booking?err=' + encodeURIComponent(msg));
    }

    const candidate = db.bookings.find(b =>
        b.id.toUpperCase() === pnr &&
        String(b.email || '').toLowerCase() === emailQuery
    );

    if (!candidate) {
        const msg = isEnReq
            ? 'No matching booking was found for the entered PNR code and email address.'
            : 'Girilen PNR ve e-posta ile eşleşen rezervasyon bulunamadı.';
        return res.redirect('/my-booking?err=' + encodeURIComponent(msg));
    }

    setVerifiedPnrCookie(res, candidate.id, emailQuery);
    return res.redirect(`/my-booking?pnr=${encodeURIComponent(candidate.id)}`);
});

app.post('/my-booking/cancel', (req, res) => {
    const db = loadDB();
    const isEnReq = res.locals.isEn;
    const verified = getVerifiedPnrFromCookie(req);
    const pnr = String(req.body.pnr || (verified && verified.pnr) || '').trim().toUpperCase();
    const emailQuery = String(req.body.email || (verified && verified.email) || '').trim().toLowerCase();

    const booking = db.bookings.find(b =>
        b.id.toUpperCase() === pnr &&
        (!emailQuery || String(b.email || '').toLowerCase() === emailQuery)
    );

    if (booking && verified && verified.pnr === booking.id.toUpperCase() && verified.email === String(booking.email || '').toLowerCase()) {
        booking.status = 'İptal Edildi';
        const todayStr = getTodayYMD();

        const rawCancelReason = String(req.body.cancelReason || '').trim();
        const customCancelReason = String(req.body.cancelReasonCustom || '').trim();
        const resolvedCancelReason = rawCancelReason === 'other' ? customCancelReason : rawCancelReason;
        if (resolvedCancelReason) {
            booking.cancelReason = resolvedCancelReason;
        }

        const daysLeft = daysUntilYMD(booking.checkIn);
        const currentPaid = Number(booking.paidAmount || 0);

        if (currentPaid > 0) {
            if (daysLeft !== null && daysLeft >= 7) {
                booking.refundedAmount = currentPaid;
                booking.refundStatus = 'full_refund_7plus_days';
                booking.refundedAt = todayStr;
                booking.refundRuleReason = `Check-in tarihine ${daysLeft} gün kaldığı için (7+ gün kuralı) ödenen tutarın tamamı (€${currentPaid.toLocaleString()}) iade edildi (${todayStr}).`;
            } else if (daysLeft !== null && daysLeft >= 0) {
                booking.refundedAmount = 0;
                booking.refundStatus = 'non_refundable_under_7_days';
                booking.refundedAt = '';
                booking.refundRuleReason = `Check-in tarihine ${daysLeft} gün kaldığı için (7 günden az) iade uygulanmadı.`;
            } else {
                booking.refundedAmount = 0;
                booking.refundStatus = 'past_date_no_refund';
                booking.refundedAt = '';
                booking.refundRuleReason = 'Check-in tarihi geçtiği için iade uygulanmadı.';
            }
        } else {
            booking.refundedAmount = 0;
            booking.refundStatus = 'no_payment';
            booking.refundedAt = '';
            booking.refundRuleReason = 'Tahsil edilmiş ödeme bulunmadığı için iade tutarı €0.';
        }

        booking.remainingBalance = 0;

        saveDB(db);
        const msg = Number(booking.refundedAmount || 0) > 0
            ? (isEnReq
                ? `Your booking has been cancelled; a €${Number(booking.refundedAmount).toLocaleString()} refund has been issued under the 7+ day policy.`
                : `Rezervasyonunuz iptal edildi; 7+ gün kuralı kapsamında €${Number(booking.refundedAmount).toLocaleString()} iade talebi oluşturuldu.`)
            : (isEnReq
                ? 'Your booking has been cancelled (no refund due under the 7-day policy).'
                : 'Rezervasyonunuz iptal edildi (7 günden az süre kaldığı için iade uygulanmadı).');
        return res.redirect(`/my-booking?pnr=${encodeURIComponent(pnr)}&msg=${encodeURIComponent(msg)}`);
    }

    const errText = isEnReq
        ? 'Please verify your PNR code and email address before cancelling.'
        : 'İptal işlemi için önce PNR ve e-posta ile doğrulama yapın.';
    return res.redirect('/my-booking?err=' + encodeURIComponent(errText));
});

app.get('/admin/login', (req, res) => {
    const db = loadDB();
    if (getAuthenticatedAdmin(req, db)) return res.redirect('/admin');
    res.render('admin/login', { error: req.query.error || '' });
});

app.post('/admin/login', (req, res) => {
    const db = loadDB();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    const users = getAllAdminUsers(db);
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        const cookieToken = signAdminSession(user);
        res.setHeader('Set-Cookie', `yv_admin=${cookieToken}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_SECONDS}; SameSite=Lax${cookieFlags()}`);
        return res.redirect('/admin');
    }
    return res.redirect('/admin/login?error=' + encodeURIComponent('E-posta veya şifre hatalı.'));
});

app.post('/admin/logout', (req, res) => {
    res.setHeader('Set-Cookie', `yv_admin=; HttpOnly; Path=/; Max-Age=0${cookieFlags()}`);
    res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
    const db = loadDB();
    const totalRevenue = db.bookings
        .filter(b => b.status !== 'İptal Edildi' && b.status !== 'İptal' && b.status !== 'Reddedildi')
        .reduce((sum, b) => sum + Number(b.paidAmount || 0), 0);

    const allReviews = [];
    (db.yachts || []).forEach(y => {
        (y.reviewList || []).forEach((rev, idx) => {
            const matchedBk = (db.bookings || []).find(b =>
                (rev.bookingId && String(b.id || '').toUpperCase() === String(rev.bookingId).toUpperCase()) ||
                (rev.email && String(b.email || '').toLowerCase() === String(rev.email).toLowerCase() && Number(b.yachtId) === Number(y.id))
            );
            allReviews.push({
                yachtId: y.id,
                yachtName: y.name,
                reviewIndex: idx,
                author: rev.author || 'Misafir',
                email: rev.email || (matchedBk ? matchedBk.email : ''),
                rating: Number(rev.rating || 5),
                date: rev.date || '',
                comment: rev.comment || '',
                bookingId: rev.bookingId || (matchedBk ? matchedBk.id : ''),
                tourDate: rev.tourDate || (matchedBk ? `${matchedBk.checkIn}${matchedBk.checkOut && matchedBk.checkOut !== matchedBk.checkIn ? ' → ' + matchedBk.checkOut : ''}` : '')
            });
        });
    });

    const waTemplate = (db.siteSettings && db.siteSettings.manualBookingWaTemplate) || DEFAULT_MANUAL_WA_TEMPLATE;
    const bookingsWithWa = (db.bookings || []).map(b => {
        const waInfo = buildManualBookingWhatsapp(waTemplate, b);
        return Object.assign({}, b, {
            whatsappMessage: waInfo.message,
            whatsappUrl: waInfo.whatsappUrl
        });
    });

    res.render('admin/dashboard', {
        yachts: db.yachts,
        bookings: bookingsWithWa,
        categories: db.categories,
        departurePoints: db.departurePoints,
        promoCodes: db.promoCodes || [],
        timeSlots: db.timeSlots || [],
        captains: db.captains || [],
        faqs: db.faqs || [],
        allReviews,
        tours: db.tours,
        paymentOptions: db.paymentOptions,
        paymentPlanSettings: db.paymentPlanSettings,
        rentalContract: db.rentalContract,
        siteSettings: db.siteSettings,
        manualBookingWaTemplate: waTemplate,
        extras: db.extras,
        adminUsers: db.adminUsers || [],
        totalRevenue,
        notice: req.query.notice || '',
        waShareUrl: req.query.waUrl || ''
    });
});

/* --- MANUEL REZERVASYON WHATSAPP ŞABLONU --- */
app.post('/admin/whatsapp-template/update', requireAdmin, (req, res) => {
    const db = loadDB();
    db.siteSettings = db.siteSettings || {};
    const tpl = String(req.body.manualBookingWaTemplate || '').trim();
    if (tpl) {
        db.siteSettings.manualBookingWaTemplate = tpl;
        saveDB(db);
    }
    res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('Manuel rezervasyon WhatsApp mesaj şablonu güncellendi.'));
});

/* --- SAAT ARALIKLARI CMS --- */
app.post('/admin/time-slots/add', requireAdmin, (req, res) => {
    const db = loadDB();
    const label = String(req.body.label || '').trim();
    const labelEn = String(req.body.labelEn || label).trim();
    const type = req.body.type === 'hourly' ? 'hourly' : 'daily';
    const hours = Math.max(1, Math.min(24, Number(req.body.hours) || 8));
    const priceMultiplier = Math.max(0.1, Math.min(2, Number(req.body.priceMultiplier) || 1));

    if (label) {
        db.timeSlots = db.timeSlots || [];
        const nextId = db.timeSlots.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0) + 1;
        db.timeSlots.push({
            id: nextId,
            label,
            labelEn,
            type,
            hours,
            priceMultiplier,
            active: true
        });
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Yeni saat aralığı eklendi.'));
});

app.post('/admin/time-slots/:id/toggle', requireAdmin, (req, res) => {
    const db = loadDB();
    const slot = (db.timeSlots || []).find(s => Number(s.id) === Number(req.params.id));
    if (slot) {
        slot.active = slot.active === false ? true : false;
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Saat aralığı durumu güncellendi.'));
});

app.post('/admin/time-slots/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.timeSlots = (db.timeSlots || []).filter(s => Number(s.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Saat aralığı silindi.'));
});

/* --- KAPTANLAR CMS --- */
app.post('/admin/captains/add', requireAdmin, async (req, res) => {
    const db = loadDB();
    const { fields, file, tooLarge } = await parseMultipartUpload(req);
    if (tooLarge) {
        return res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Yüklenen fotoğraf 10 MB sınırını aştı.'));
    }

    const name = String(fields.name || '').trim();
    if (name) {
        db.captains = db.captains || [];
        const nextId = db.captains.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1;
        let photoUrl = DEFAULT_CAPTAIN_IMG;
        if (file && file.url) photoUrl = file.url;
        else if (fields.imageData) photoUrl = saveBase64Image(fields.imageData, 'captain') || DEFAULT_CAPTAIN_IMG;
        else if (fields.photo && fields.photo.trim()) photoUrl = fields.photo.trim();

        db.captains.push({
            id: nextId,
            name,
            roleTr: String(fields.roleTr || 'Lisanslı Yat Kaptanı').trim(),
            roleEn: String(fields.roleEn || 'Licensed Yacht Captain').trim(),
            experienceYears: Math.max(1, Number(fields.experienceYears) || 10),
            languages: String(fields.languages || 'Türkçe, English').trim(),
            region: String(fields.region || 'Marmaris & Göcek').trim(),
            bioTr: String(fields.bioTr || '').trim(),
            bioEn: String(fields.bioEn || fields.bioTr || '').trim(),
            photo: photoUrl,
            active: true
        });
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Yeni kaptan bilgisi eklendi.'));
});

app.post('/admin/captains/:id/update', requireAdmin, async (req, res) => {
    const db = loadDB();
    const { fields, file, tooLarge } = await parseMultipartUpload(req);
    if (tooLarge) {
        return res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Yüklenen fotoğraf 10 MB sınırını aştı.'));
    }

    const cap = (db.captains || []).find(c => Number(c.id) === Number(req.params.id));
    if (cap) {
        if (fields.name && fields.name.trim()) cap.name = fields.name.trim();
        if (typeof fields.roleTr === 'string') cap.roleTr = fields.roleTr.trim();
        if (typeof fields.roleEn === 'string') cap.roleEn = fields.roleEn.trim();
        if (typeof fields.languages === 'string') cap.languages = fields.languages.trim();
        if (typeof fields.region === 'string') cap.region = fields.region.trim();
        if (typeof fields.bioTr === 'string') cap.bioTr = fields.bioTr.trim();
        if (typeof fields.bioEn === 'string') cap.bioEn = fields.bioEn.trim();
        const exp = Number(fields.experienceYears);
        if (!isNaN(exp) && exp >= 1) cap.experienceYears = exp;

        if (file && file.url) cap.photo = file.url;
        else if (fields.imageData) {
            const saved = saveBase64Image(fields.imageData, 'captain');
            if (saved) cap.photo = saved;
        } else if (fields.photo && fields.photo.trim()) {
            cap.photo = fields.photo.trim();
        }
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Kaptan bilgileri güncellendi.'));
});

app.post('/admin/captains/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.captains = (db.captains || []).filter(c => Number(c.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Kaptan kaydı silindi.'));
});

/* --- SIKÇA SORULAN SORULAR (FAQ) CMS --- */
app.post('/admin/faqs/add', requireAdmin, (req, res) => {
    const db = loadDB();
    const questionTr = String(req.body.questionTr || '').trim();
    const answerTr = String(req.body.answerTr || '').trim();
    if (questionTr && answerTr) {
        db.faqs = db.faqs || [];
        const nextId = db.faqs.reduce((max, f) => Math.max(max, Number(f.id) || 0), 0) + 1;
        db.faqs.push({
            id: nextId,
            questionTr,
            questionEn: String(req.body.questionEn || questionTr).trim(),
            answerTr,
            answerEn: String(req.body.answerEn || answerTr).trim(),
            active: true
        });
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Yeni SSS maddesi eklendi.'));
});

app.post('/admin/faqs/:id/update', requireAdmin, (req, res) => {
    const db = loadDB();
    const faq = (db.faqs || []).find(f => Number(f.id) === Number(req.params.id));
    if (faq) {
        if (req.body.questionTr && req.body.questionTr.trim()) faq.questionTr = req.body.questionTr.trim();
        if (typeof req.body.questionEn === 'string') faq.questionEn = req.body.questionEn.trim();
        if (req.body.answerTr && req.body.answerTr.trim()) faq.answerTr = req.body.answerTr.trim();
        if (typeof req.body.answerEn === 'string') faq.answerEn = req.body.answerEn.trim();
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('SSS maddesi güncellendi.'));
});

app.post('/admin/faqs/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.faqs = (db.faqs || []).filter(f => Number(f.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('SSS maddesi silindi.'));
});

/* --- YORUM SİLME --- */
app.post('/admin/reviews/:yachtId/:reviewIndex/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    const yacht = (db.yachts || []).find(y => Number(y.id) === Number(req.params.yachtId));
    const idx = Number(req.params.reviewIndex);
    if (yacht && Array.isArray(yacht.reviewList) && idx >= 0 && idx < yacht.reviewList.length) {
        yacht.reviewList.splice(idx, 1);
        yacht.reviews = Math.max(0, yacht.reviewList.length);
        if (yacht.reviewList.length > 0) {
            const avg = yacht.reviewList.reduce((s, r) => s + Number(r.rating || 5), 0) / yacht.reviewList.length;
            yacht.rating = Number(avg.toFixed(1));
        }
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Müşteri yorumu silindi.'));
});

app.post('/admin/promocodes/add', requireAdmin, (req, res) => {
    const db = loadDB();
    const code = String(req.body.code || '').trim().toUpperCase();
    const discountPercent = Math.min(90, Math.max(1, Number(req.body.discountPercent) || 0));
    const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.expiresAt || '').trim())
        ? String(req.body.expiresAt).trim()
        : '';

    if (code && discountPercent >= 1) {
        db.promoCodes = db.promoCodes || [];
        const existing = db.promoCodes.find(p => String(p.code || '').toUpperCase() === code);
        if (existing) {
            existing.discountPercent = discountPercent;
            existing.expiresAt = expiresAt;
            existing.isActive = true;
        } else {
            const nextId = db.promoCodes.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
            db.promoCodes.push({
                id: nextId,
                code,
                discountPercent,
                expiresAt,
                isActive: true
            });
        }
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Promokod kaydedildi.'));
});

app.post('/admin/promocodes/:id/toggle', requireAdmin, (req, res) => {
    const db = loadDB();
    const target = decodeURIComponent(req.params.id);
    const item = (db.promoCodes || []).find(p => String(p.id) === target || String(p.code).toUpperCase() === target.toUpperCase());
    if (item) {
        item.isActive = item.isActive === false ? true : false;
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Promokod durumu güncellendi.'));
});

app.post('/admin/promocodes/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    const target = decodeURIComponent(req.params.id);
    db.promoCodes = (db.promoCodes || []).filter(p => String(p.id) !== target && String(p.code).toUpperCase() !== target.toUpperCase());
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Promokod silindi.'));
});

app.post('/admin/departures/add', requireAdmin, (req, res) => {
    const db = loadDB();
    const name = (req.body.name || '').trim();
    const desc = (req.body.desc || '').trim();
    if (name) {
        db.departurePoints = db.departurePoints || [];
        const nextId = db.departurePoints.reduce((max, d) => Math.max(max, Number(d.id) || 0), 0) + 1;
        db.departurePoints.push({
            id: nextId,
            name,
            desc: desc || 'Özel marina kalkış noktası'
        });
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Yeni kalkış noktası eklendi.'));
});

app.post('/admin/departures/:id/update', requireAdmin, (req, res) => {
    const db = loadDB();
    const item = (db.departurePoints || []).find(d => Number(d.id) === Number(req.params.id));
    if (item) {
        if (req.body.name && req.body.name.trim()) item.name = req.body.name.trim();
        if (typeof req.body.desc === 'string') item.desc = req.body.desc.trim();
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Kalkış noktası güncellendi.'));
});

app.post('/admin/departures/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.departurePoints = (db.departurePoints || []).filter(d => Number(d.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Kalkış noktası silindi.'));
});

app.post('/admin/staff/add', requireAdmin, (req, res) => {
    const db = loadDB();
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    if (name && email && password) {
        db.adminUsers = db.adminUsers || [];
        const exists = db.adminUsers.some(u => String(u.email || '').toLowerCase() === email);
        if (!exists) {
            const nextId = db.adminUsers.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1;
            db.adminUsers.push({
                id: nextId,
                name,
                email,
                password,
                role: 'staff'
            });
            saveDB(db);
        }
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Yeni personel hesabı eklendi.'));
});

app.post('/admin/staff/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.adminUsers = db.adminUsers || [];
    if (db.adminUsers.length > 1) {
        db.adminUsers = db.adminUsers.filter(u => Number(u.id) !== Number(req.params.id));
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Personel hesabı silindi.'));
});

app.post('/admin/site-settings/update', requireAdmin, (req, res) => {
    const db = loadDB();
    const current = db.siteSettings || initialData.siteSettings;
    const rawWa = (req.body.whatsappNumber || '').replace(/\D/g, '');

    db.siteSettings = Object.assign({}, current, {
        brandName: (req.body.brandName || current.brandName || 'YachtVoyage').trim(),
        brandSubtext: (req.body.brandSubtext || current.brandSubtext || 'Yacht Charter').trim(),
        defaultDeparture: (req.body.defaultDeparture || current.defaultDeparture || 'Marmaris').trim(),
        heroBadge: typeof req.body.heroBadge === 'string' && req.body.heroBadge.trim() ? req.body.heroBadge.trim() : current.heroBadge,
        heroBadgeEn: typeof req.body.heroBadgeEn === 'string' && req.body.heroBadgeEn.trim() ? req.body.heroBadgeEn.trim() : current.heroBadgeEn,
        heroTitle: typeof req.body.heroTitle === 'string' && req.body.heroTitle.trim() ? req.body.heroTitle.trim() : current.heroTitle,
        heroTitleEn: typeof req.body.heroTitleEn === 'string' && req.body.heroTitleEn.trim() ? req.body.heroTitleEn.trim() : current.heroTitleEn,
        heroSubtitle: typeof req.body.heroSubtitle === 'string' && req.body.heroSubtitle.trim() ? req.body.heroSubtitle.trim() : current.heroSubtitle,
        heroSubtitleEn: typeof req.body.heroSubtitleEn === 'string' && req.body.heroSubtitleEn.trim() ? req.body.heroSubtitleEn.trim() : current.heroSubtitleEn,
        heroImage: typeof req.body.heroImage === 'string' && req.body.heroImage.trim() ? req.body.heroImage.trim() : current.heroImage,
        phone: (req.body.phone || current.phone || '+90 252 123 45 67').trim(),
        whatsappNumber: rawWa || current.whatsappNumber || '902521234567',
        email: (req.body.email || current.email || 'hello@yachtvoyage.com').trim(),
        footerAbout: (req.body.footerAbout || current.footerAbout || '').trim(),
        copyrightText: (req.body.copyrightText || current.copyrightText || '').trim(),
        conciergeWelcome: (req.body.conciergeWelcome || current.conciergeWelcome || '').trim()
    });
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Site, iletişim ve footer bilgileri güncellendi.'));
});

app.post('/admin/contract/update', requireAdmin, (req, res) => {
    const db = loadDB();
    const title = (req.body.contractTitle || '').trim() || 'YachtVoyage Tekne Kiralama ve İptal Sözleşmesi';
    const body = (req.body.contractBody || '').trim();

    db.rentalContract = {
        title,
        body: body || (db.rentalContract && db.rentalContract.body) || initialData.rentalContract.body
    };
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Kiralama sözleşmesi metni güncellendi.'));
});

app.post('/admin/payment-plan/update', requireAdmin, (req, res) => {
    const db = loadDB();
    const installmentPercent = Math.min(99, Math.max(1, Number(req.body.installmentPercent) || 50));
    const installmentInterestPercent = Math.min(100, Math.max(0, Number(req.body.installmentInterestPercent) || 0));
    const fullPaymentDiscountPercent = Math.min(90, Math.max(0, Number(req.body.fullPaymentDiscountPercent) || 0));

    db.paymentPlanSettings = {
        installmentPercent,
        installmentInterestPercent,
        fullPaymentDiscountPercent
    };
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Hisseli ve indirimli tam ödeme oranları güncellendi.'));
});

app.post('/admin/add-yacht', requireAdmin, async (req, res) => {
    const db = loadDB();
    const { fields, files, tooLarge } = await parseMultipartUpload(req);

    if (tooLarge) {
        return res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yüklenen dosya boyutu 10 MB sınırını aştı.'));
    }

    const nextId = db.yachts.reduce((max, y) => Math.max(max, Number(y.id) || 0), 0) + 1;
    const categoryKey = (fields.category || 'Motor Yachts').trim();
    const matchedCat = (db.categories || []).find(c => c.key === categoryKey || c.nameTr === categoryKey);
    const categoryTr = (fields.categoryTr || (matchedCat && matchedCat.nameTr) || categoryKey).trim();

    const collectedImages = [];
    (files || []).forEach(f => {
        if (f && f.url) collectedImages.push(f.url);
    });
    if (fields.imagesData) {
        try {
            const parsedArr = JSON.parse(fields.imagesData);
            if (Array.isArray(parsedArr)) {
                parsedArr.forEach(item => {
                    const saved = saveBase64Image(item, 'yacht');
                    if (saved && !collectedImages.includes(saved)) collectedImages.push(saved);
                });
            }
        } catch {
            // JSON olmayan değerler atlanır
        }
    }
    if (fields.imageData) {
        const savedSingle = saveBase64Image(fields.imageData, 'yacht');
        if (savedSingle && !collectedImages.includes(savedSingle)) collectedImages.unshift(savedSingle);
    }

    const finalImages = collectedImages.length ? collectedImages : [DEFAULT_IMG];
    const descTr = (fields.description || 'Özel mavi yolculuk ve günlük tur için özenle hazırlanan tekne.').trim();
    const descEn = (fields.descriptionEn || descTr).trim();

    db.yachts.unshift({
        id: nextId,
        name: (fields.name || 'Yeni Yat').trim(),
        category: categoryKey,
        categoryTr,
        location: (fields.location || 'Marmaris').trim(),
        length: (fields.length || '20 m').trim(),
        year: Number(fields.year) || 2024,
        guests: Math.max(1, Number(fields.guests) || 8),
        cabins: Math.max(1, Number(fields.cabins) || 4),
        crew: Math.max(1, Number(fields.crew) || 3),
        speed: (fields.speed || '22 Knots').trim(),
        price: Math.max(1, Number(fields.price) || 2000),
        rating: 5.0,
        reviews: 1,
        badge: 'Yeni Eklendi',
        features: ['Klima', 'Mürettebat Dahil'],
        inclusions: ['Lisanslı Kaptan ve Mürettebat', 'Hoş Geldiniz İkramı', 'Standart Liman Hizmetleri'],
        itinerary: [
            { time: '10:00', title: 'Limandan Hareket', desc: 'Kaptan karşılama ve rota bilgilendirmesi' },
            { time: '14:00', title: 'Koy Molası', desc: 'Yüzme ve ikram servisi' },
            { time: '18:00', title: 'Limana Dönüş', desc: 'Gün batımı seyri ile dönüş' }
        ],
        reviewList: [],
        description: descTr,
        descriptionEn: descEn,
        images: finalImages
    });

    saveDB(db);
    res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yeni yat ve fotoğrafları sisteme kaydedildi.'));
});

app.post('/admin/yachts/:id/update', requireAdmin, async (req, res) => {
    const db = loadDB();
    const { fields, files, tooLarge } = await parseMultipartUpload(req);

    if (tooLarge) {
        return res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yüklenen dosya boyutu 10 MB sınırını aştı.'));
    }

    const yacht = db.yachts.find(y => Number(y.id) === Number(req.params.id));

    if (yacht) {
        if (fields.name && fields.name.trim()) yacht.name = fields.name.trim();
        if (fields.location && fields.location.trim()) yacht.location = fields.location.trim();
        if (fields.length && fields.length.trim()) yacht.length = fields.length.trim();
        if (fields.speed && fields.speed.trim()) yacht.speed = fields.speed.trim();
        if (typeof fields.description === 'string' && fields.description.trim()) {
            yacht.description = fields.description.trim();
        }
        if (typeof fields.descriptionEn === 'string' && fields.descriptionEn.trim()) {
            yacht.descriptionEn = fields.descriptionEn.trim();
        }
        if (fields.category && fields.category.trim()) {
            yacht.category = fields.category.trim();
            const matchedCat = (db.categories || []).find(c => c.key === yacht.category);
            if (matchedCat) yacht.categoryTr = matchedCat.nameTr;
        }
        if (fields.categoryTr && fields.categoryTr.trim()) {
            yacht.categoryTr = fields.categoryTr.trim();
        }

        const newPrice = Number(fields.price);
        const newGuests = Number(fields.guests);
        const newCabins = Number(fields.cabins);
        const newCrew = Number(fields.crew);

        if (!isNaN(newPrice) && newPrice > 0) yacht.price = newPrice;
        if (!isNaN(newGuests) && newGuests >= 1) yacht.guests = newGuests;
        if (!isNaN(newCabins) && newCabins >= 1) yacht.cabins = newCabins;
        if (!isNaN(newCrew) && newCrew >= 1) yacht.crew = newCrew;

        let updatedGallery = Array.isArray(yacht.images) && yacht.images.length ? [...yacht.images] : [DEFAULT_IMG];
        if (fields.imagesData) {
            try {
                const parsedGallery = JSON.parse(fields.imagesData);
                if (Array.isArray(parsedGallery) && parsedGallery.length) {
                    const normalizedItems = parsedGallery
                        .map(src => {
                            if (typeof src !== 'string') return '';
                            const trimmed = src.trim();
                            if (trimmed.startsWith('data:image/')) {
                                return saveBase64Image(trimmed, 'yacht');
                            }
                            if (trimmed.startsWith('/uploads/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                                return trimmed;
                            }
                            return '';
                        })
                        .filter(Boolean);
                    if (normalizedItems.length) {
                        updatedGallery = normalizedItems;
                    }
                }
            } catch {
                // mevcut galeri korunur
            }
        }

        const uploadedUrls = (files || []).map(f => f && f.url).filter(Boolean);
        if (uploadedUrls.length) {
            updatedGallery = [...updatedGallery, ...uploadedUrls];
        } else if (fields.imageData) {
            const savedSingle = saveBase64Image(fields.imageData, 'yacht');
            if (savedSingle) {
                updatedGallery = [savedSingle, ...updatedGallery];
            }
        }

        yacht.images = updatedGallery.length ? updatedGallery : [DEFAULT_IMG];
        saveDB(db);
    }
    res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yat bilgileri ve galeri fotoğrafları güncellendi.'));
});

app.post('/admin/yachts/:id/price', requireAdmin, (req, res) => {
    const db = loadDB();
    const yacht = db.yachts.find(y => Number(y.id) === Number(req.params.id));
    const newPrice = Number(req.body.price);
    if (yacht && !isNaN(newPrice) && newPrice > 0) {
        yacht.price = newPrice;
        saveDB(db);
    }
    res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yat günlük fiyatı güncellendi.'));
});

app.post('/admin/yachts/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    const targetId = Number(req.params.id);
    db.yachts = db.yachts.filter(y => Number(y.id) !== targetId);
    db.tours = (db.tours || []).map(t => (Number(t.yachtId) === targetId ? Object.assign({}, t, { yachtId: null }) : t));
    saveDB(db);
    res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yat kaydı silindi.'));
});

app.post('/admin/tours/add', requireAdmin, async (req, res) => {
    const db = loadDB();
    const { fields, file, tooLarge } = await parseMultipartUpload(req);

    if (tooLarge) {
        return res.redirect('/admin?tab=turlar-kategoriler&notice=' + encodeURIComponent('Yüklenen dosya boyutu 10 MB sınırını aştı.'));
    }

    const nextId = (db.tours || []).reduce((max, t) => Math.max(max, Number(t.id) || 0), 0) + 1;
    const durationDays = Math.max(1, Number(fields.durationDays) || 1);
    const includedRaw = (fields.includedText || '').trim();
    const excludedRaw = (fields.excludedText || '').trim();
    const includedEnRaw = (fields.includedTextEn || '').trim();
    const excludedEnRaw = (fields.excludedTextEn || '').trim();

    let tourImg = DEFAULT_IMG;
    if (file && file.url) {
        tourImg = file.url;
    } else if (fields.imageData) {
        tourImg = saveBase64Image(fields.imageData, 'tour') || DEFAULT_IMG;
    } else if (fields.img && fields.img.trim()) {
        tourImg = fields.img.trim();
    }

    db.tours.unshift({
        id: nextId,
        badge: (fields.badge || 'TUR PAKETİ').trim(),
        badgeEn: (fields.badgeEn || '').trim(),
        title: (fields.title || 'Yeni Mavi Tur').trim(),
        titleEn: (fields.titleEn || '').trim(),
        region: (fields.region || 'Marmaris').trim(),
        regionEn: (fields.regionEn || '').trim(),
        meetingPoint: (fields.meetingPoint || '').trim(),
        meetingPointEn: (fields.meetingPointEn || '').trim(),
        durationLabel: (fields.durationLabel || `${durationDays} Günlük Rota`).trim(),
        durationLabelEn: (fields.durationLabelEn || '').trim(),
        capacityLabel: (fields.capacityLabel || 'En fazla 12 kişi').trim(),
        durationDays,
        pricePerDay: Math.max(1, Number(fields.pricePerDay) || 2500),
        yachtId: Number(fields.yachtId) || (db.yachts[0] && db.yachts[0].id) || 1,
        img: tourImg,
        included: includedRaw ? includedRaw.split('|').map(s => s.trim()).filter(Boolean) : ['Lisanslı kaptan ve yakıt', 'Yüzme molaları ve ikramlar'],
        includedEn: includedEnRaw ? includedEnRaw.split('|').map(s => s.trim()).filter(Boolean) : [],
        excluded: excludedRaw ? excludedRaw.split('|').map(s => s.trim()).filter(Boolean) : ['Özel menü ve transfer'],
        excludedEn: excludedEnRaw ? excludedEnRaw.split('|').map(s => s.trim()).filter(Boolean) : [],
        summary: (fields.summary || 'Özel koy rotası ve tam gün tekne turu.').trim(),
        summaryEn: (fields.summaryEn || '').trim()
    });
    saveDB(db);
    res.redirect('/admin?tab=turlar-kategoriler&notice=' + encodeURIComponent('Yeni tur paketi eklendi.'));
});

app.post('/admin/tours/:id/update', requireAdmin, async (req, res) => {
    const db = loadDB();
    const { fields, file, tooLarge } = await parseMultipartUpload(req);

    if (tooLarge) {
        return res.redirect('/admin?tab=turlar-kategoriler&notice=' + encodeURIComponent('Yüklenen dosya boyutu 10 MB sınırını aştı.'));
    }

    const tour = (db.tours || []).find(t => Number(t.id) === Number(req.params.id));
    if (tour) {
        if (fields.title && fields.title.trim()) tour.title = fields.title.trim();
        if (typeof fields.titleEn === 'string') tour.titleEn = fields.titleEn.trim();
        if (fields.region && fields.region.trim()) tour.region = fields.region.trim();
        if (typeof fields.regionEn === 'string') tour.regionEn = fields.regionEn.trim();
        if (fields.badge && fields.badge.trim()) tour.badge = fields.badge.trim();
        if (typeof fields.badgeEn === 'string') tour.badgeEn = fields.badgeEn.trim();
        if (typeof fields.meetingPoint === 'string') tour.meetingPoint = fields.meetingPoint.trim();
        if (typeof fields.meetingPointEn === 'string') tour.meetingPointEn = fields.meetingPointEn.trim();
        if (fields.durationLabel && fields.durationLabel.trim()) tour.durationLabel = fields.durationLabel.trim();
        if (typeof fields.durationLabelEn === 'string') tour.durationLabelEn = fields.durationLabelEn.trim();
        if (fields.capacityLabel && fields.capacityLabel.trim()) tour.capacityLabel = fields.capacityLabel.trim();
        if (typeof fields.summary === 'string' && fields.summary.trim()) tour.summary = fields.summary.trim();
        if (typeof fields.summaryEn === 'string') tour.summaryEn = fields.summaryEn.trim();

        if (file && file.url) {
            tour.img = file.url;
        } else if (fields.imageData) {
            const savedTourImg = saveBase64Image(fields.imageData, 'tour');
            if (savedTourImg) tour.img = savedTourImg;
        } else if (fields.img && fields.img.trim()) {
            tour.img = fields.img.trim();
        }

        const dDays = Number(fields.durationDays);
        const pDay = Number(fields.pricePerDay);
        const yId = Number(fields.yachtId);
        if (!isNaN(dDays) && dDays >= 1) tour.durationDays = dDays;
        if (!isNaN(pDay) && pDay >= 1) tour.pricePerDay = pDay;
        if (!isNaN(yId) && yId >= 1) tour.yachtId = yId;

        if (typeof fields.includedText === 'string' && fields.includedText.trim()) {
            tour.included = fields.includedText.split('|').map(s => s.trim()).filter(Boolean);
        }
        if (typeof fields.includedTextEn === 'string') {
            tour.includedEn = fields.includedTextEn.split('|').map(s => s.trim()).filter(Boolean);
        }
        if (typeof fields.excludedText === 'string' && fields.excludedText.trim()) {
            tour.excluded = fields.excludedText.split('|').map(s => s.trim()).filter(Boolean);
        }
        if (typeof fields.excludedTextEn === 'string') {
            tour.excludedEn = fields.excludedTextEn.split('|').map(s => s.trim()).filter(Boolean);
        }
        saveDB(db);
    }
    res.redirect('/admin?tab=turlar-kategoriler&notice=' + encodeURIComponent('Tur paketi güncellendi.'));
});

app.post('/admin/tours/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.tours = (db.tours || []).filter(t => Number(t.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=turlar-kategoriler&notice=' + encodeURIComponent('Tur paketi silindi.'));
});

app.post('/admin/categories/add', requireAdmin, (req, res) => {
    const db = loadDB();
    const nameTr = (req.body.nameTr || '').trim();
    if (nameTr) {
        const key = (req.body.key || nameTr).trim();
        const nextId = (db.categories || []).reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1;
        db.categories.push({
            id: nextId,
            key,
            nameTr,
            nameEn: (req.body.nameEn || key).trim(),
            desc: (req.body.desc || 'Özel yat kategorisi').trim(),
            img: (req.body.img || DEFAULT_IMG).trim()
        });
        saveDB(db);
    }
    res.redirect('/admin?tab=turlar-kategoriler&notice=' + encodeURIComponent('Yeni kategori eklendi.'));
});

app.post('/admin/categories/:id/update', requireAdmin, (req, res) => {
    const db = loadDB();
    const cat = (db.categories || []).find(c => Number(c.id) === Number(req.params.id));
    if (cat) {
        if (req.body.nameTr && req.body.nameTr.trim()) cat.nameTr = req.body.nameTr.trim();
        if (typeof req.body.nameEn === 'string' && req.body.nameEn.trim()) cat.nameEn = req.body.nameEn.trim();
        if (req.body.key && req.body.key.trim()) cat.key = req.body.key.trim();
        if (typeof req.body.desc === 'string') cat.desc = req.body.desc.trim();
        if (req.body.img && req.body.img.trim()) cat.img = req.body.img.trim();
        saveDB(db);
    }
    res.redirect('/admin?tab=turlar-kategoriler&notice=' + encodeURIComponent('Kategori güncellendi.'));
});

app.post('/admin/categories/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.categories = (db.categories || []).filter(c => Number(c.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=turlar-kategoriler&notice=' + encodeURIComponent('Kategori silindi.'));
});

app.post('/admin/payments/add', requireAdmin, (req, res) => {
    const db = loadDB();
    const name = (req.body.name || '').trim();
    if (name) {
        const nextId = (db.paymentOptions || []).reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
        db.paymentOptions.push({
            id: nextId,
            name,
            desc: (req.body.desc || 'Yönetici tarafından eklenen ödeme yöntemi').trim(),
            active: true
        });
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Yeni ödeme seçeneği eklendi.'));
});

app.post('/admin/payments/:id/toggle', requireAdmin, (req, res) => {
    const db = loadDB();
    const item = (db.paymentOptions || []).find(p => Number(p.id) === Number(req.params.id));
    if (item) {
        item.active = !item.active;
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Ödeme seçeneği durumu güncellendi.'));
});

app.post('/admin/payments/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.paymentOptions = (db.paymentOptions || []).filter(p => Number(p.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Ödeme seçeneği silindi.'));
});

app.post('/admin/extras/add', requireAdmin, (req, res) => {
    const db = loadDB();
    const name = (req.body.name || '').trim();
    const nameEn = (req.body.nameEn || name).trim();
    const desc = (req.body.desc || '').trim();
    const descEn = (req.body.descEn || desc).trim();
    const pricePerGuest = Math.max(0, Number(req.body.pricePerGuest) || 0);
    if (name) {
        const nextId = (db.extras || []).reduce((max, e) => Math.max(max, Number(e.id) || 0), 0) + 1;
        db.extras.push({
            id: nextId,
            name,
            nameEn,
            desc,
            descEn,
            pricePerGuest,
            active: true
        });
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Kişi başı ekstra hizmet eklendi.'));
});

app.post('/admin/extras/:id/update', requireAdmin, (req, res) => {
    const db = loadDB();
    const item = (db.extras || []).find(e => Number(e.id) === Number(req.params.id));
    if (item) {
        if (req.body.name && req.body.name.trim()) item.name = req.body.name.trim();
        if (typeof req.body.nameEn === 'string' && req.body.nameEn.trim()) item.nameEn = req.body.nameEn.trim();
        if (typeof req.body.desc === 'string') item.desc = req.body.desc.trim();
        if (typeof req.body.descEn === 'string') item.descEn = req.body.descEn.trim();
        const p = Number(req.body.pricePerGuest);
        if (!isNaN(p) && p >= 0) item.pricePerGuest = p;
        if (typeof req.body.toggleActive !== 'undefined') {
            item.active = !item.active;
        }
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Ekstra hizmet güncellendi.'));
});

app.post('/admin/extras/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.extras = (db.extras || []).filter(e => Number(e.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Ekstra hizmet silindi.'));
});

app.post('/admin/bookings/create', requireAdmin, (req, res) => {
    const db = loadDB();
    const yacht = db.yachts.find(y => Number(y.id) === Number(req.body.yachtId)) || db.yachts[0];
    if (!yacht) return res.redirect('/admin?tab=rezervasyonlar');

    const startYmd = String(req.body.checkIn || '').trim();
    const rawEndYmd = String(req.body.checkOut || '').trim();
    const rawDaily = isDailyCharter(req.body.charterType);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startYmd)) {
        return res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('Geçerli bir giriş tarihi girin.'));
    }

    const endYmd = rawDaily ? startYmd : (/^\d{4}-\d{2}-\d{2}$/.test(rawEndYmd) && rawEndYmd > startYmd ? rawEndYmd : addDaysYMD(startYmd, 1));
    const days = rawDaily ? 1 : calcDays(startYmd, endYmd, 'Özel Yat Kiralama (Konaklamalı)');
    const isDaily = days === 1 && (rawDaily || startYmd === endYmd);
    const overlapEndYmd = isDaily ? addDaysYMD(startYmd, 1) : endYmd;

    const conflict = db.bookings.find(b =>
        Number(b.yachtId) === Number(yacht.id) &&
        b.status !== 'İptal Edildi' &&
        b.status !== 'İptal' &&
        b.status !== 'Reddedildi' &&
        isDateOverlap(startYmd, overlapEndYmd, b.checkIn, b.checkOut)
    );

    if (conflict) {
        return res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent(`Seçilen tarihler (${conflict.checkIn} - ${conflict.checkOut}) bu yat için dolu.`));
    }

    let pnr = '';
    const existingIds = new Set((db.bookings || []).map(b => String(b.id || '').toUpperCase()));
    do {
        pnr = `YV2026-${Math.floor(1000 + Math.random() * 9000)}`;
    } while (existingIds.has(pnr));

    const totalAmount = Math.max(0, Number(req.body.totalAmount) || (Number(yacht.price || 0) * days));
    const paidAmount = Math.min(totalAmount, Math.max(0, Number(req.body.paidAmount) || 0));
    const status = String(req.body.status || 'Onaylandı').trim();

    const newBooking = normalizeBookingRecord({
        id: pnr,
        customer: String(req.body.customerName || 'Manuel Misafir').trim(),
        email: String(req.body.email || '').trim().toLowerCase(),
        phone: String(req.body.phone || '').trim(),
        yachtId: yacht.id,
        yacht: yacht.name,
        location: yacht.location || '',
        checkIn: startYmd,
        checkOut: endYmd,
        tourTimeSlot: isDaily ? String(req.body.tourTimeSlot || '10:00 - 18:00').trim() : null,
        days,
        guests: Math.min(Number(yacht.guests) || 12, Math.max(1, Number(req.body.guests) || 2)),
        charterType: isDaily ? 'Günlük VIP Koy Turu' : 'Özel Yat Kiralama (Konaklamalı)',
        extras: [],
        extrasTotal: 0,
        notes: String(req.body.notes || '').trim(),
        discount: 0,
        totalAmount,
        paidAmount,
        refundedAmount: 0,
        refundStatus: 'none',
        refundRuleReason: '',
        paymentStatus: paidAmount >= totalAmount ? 'paid_full' : (paidAmount > 0 ? 'deposit_paid' : 'pending_payment'),
        paymentType: paidAmount >= totalAmount ? 'Tam Ödeme' : 'Hisseli Ödeme',
        paymentMethod: String(req.body.paymentMethod || 'Nakit / Marina Ödemesi').trim(),
        assignedCaptain: String(req.body.assignedCaptain || '').trim(),
        assignedTransfer: String(req.body.assignedTransfer || '').trim(),
        adminNote: String(req.body.adminNote || 'Admin panelinden manuel oluşturuldu.').trim(),
        status
    });

    db.bookings.unshift(newBooking);
    saveDB(db);

    const waTemplate = (db.siteSettings && db.siteSettings.manualBookingWaTemplate) || DEFAULT_MANUAL_WA_TEMPLATE;
    const waInfo = buildManualBookingWhatsapp(waTemplate, newBooking);

    return res.redirect(
        '/admin?tab=rezervasyonlar' +
        '&notice=' + encodeURIComponent(`Manuel rezervasyon (${pnr}) oluşturuldu. Müşteriye WhatsApp mesajı hazır.`) +
        '&waUrl=' + encodeURIComponent(waInfo.whatsappUrl)
    );
});

app.post('/admin/bookings/:id/edit', requireAdmin, (req, res) => {
    const db = loadDB();
    const bookingId = decodeURIComponent(req.params.id);
    const booking = db.bookings.find(b => b.id === bookingId);
    if (!booking) return res.redirect('/admin?tab=rezervasyonlar');

    const targetYacht = db.yachts.find(y => Number(y.id) === Number(req.body.yachtId || booking.yachtId)) || resolveBookingYacht(db, booking);
    const startYmd = String(req.body.checkIn || booking.checkIn).trim();
    const rawEndYmd = String(req.body.checkOut || booking.checkOut).trim();
    const rawDaily = isDailyCharter(req.body.charterType || booking.charterType);

    const endYmd = rawDaily ? startYmd : (/^\d{4}-\d{2}-\d{2}$/.test(rawEndYmd) && rawEndYmd > startYmd ? rawEndYmd : addDaysYMD(startYmd, 1));
    const days = rawDaily ? 1 : calcDays(startYmd, endYmd, 'Özel Yat Kiralama (Konaklamalı)');
    const isDaily = days === 1 && (rawDaily || startYmd === endYmd);
    const overlapEndYmd = isDaily ? addDaysYMD(startYmd, 1) : endYmd;

    const conflict = db.bookings.find(b =>
        b.id !== booking.id &&
        Number(b.yachtId) === Number(targetYacht.id) &&
        b.status !== 'İptal Edildi' &&
        b.status !== 'İptal' &&
        b.status !== 'Reddedildi' &&
        isDateOverlap(startYmd, overlapEndYmd, b.checkIn, b.checkOut)
    );

    if (conflict) {
        return res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent(`Tarih değişikliği yapılamadı: ${conflict.checkIn} - ${conflict.checkOut} dolu.`));
    }

    booking.yachtId = targetYacht.id;
    booking.yacht = targetYacht.name;
    booking.location = targetYacht.location || booking.location || '';
    booking.checkIn = startYmd;
    booking.checkOut = endYmd;
    booking.days = days;
    booking.charterType = isDaily ? 'Günlük VIP Koy Turu' : 'Özel Yat Kiralama (Konaklamalı)';
    booking.tourTimeSlot = isDaily ? String(req.body.tourTimeSlot || booking.tourTimeSlot || '10:00 - 18:00').trim() : null;
    booking.guests = Math.min(Number(targetYacht.guests) || 12, Math.max(1, Number(req.body.guests) || booking.guests || 1));

    if (req.body.totalAmount !== undefined && String(req.body.totalAmount).trim() !== '') {
        booking.totalAmount = Math.max(0, Number(req.body.totalAmount) || booking.totalAmount);
    }
    if (req.body.paidAmount !== undefined && String(req.body.paidAmount).trim() !== '') {
        booking.paidAmount = Math.max(0, Number(req.body.paidAmount) || 0);
    }

    normalizeBookingRecord(booking);
    saveDB(db);
    res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('Rezervasyon yat, tarih ve kapasite bilgileri güncellendi.'));
});

app.post('/admin/bookings/:id/mark-paid', requireAdmin, (req, res) => {
    const db = loadDB();
    const bookingId = decodeURIComponent(req.params.id);
    const booking = db.bookings.find(b => b.id === bookingId);
    if (booking) {
        booking.paidAmount = Number(booking.totalAmount || 0);
        booking.paymentStatus = 'paid_full';
        booking.remainingBalance = 0;
        booking.paidCompletedAt = getTodayYMD();
        const noteAppend = `Marina bakiyesi tahsil edildi (${booking.paidCompletedAt}).`;
        booking.adminNote = booking.adminNote ? `${booking.adminNote} | ${noteAppend}` : noteAppend;
        saveDB(db);
    }
    res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('Kalan bakiye ödendi olarak kapatıldı.'));
});

app.post('/admin/bookings/:id/refund', requireAdmin, (req, res) => {
    const db = loadDB();
    const bookingId = decodeURIComponent(req.params.id);
    const booking = db.bookings.find(b => b.id === bookingId);
    if (booking) {
        const paid = Number(booking.paidAmount || 0);
        const requestedRefund = Math.min(paid, Math.max(0, Number(req.body.refundAmount) || 0));
        const customNote = String(req.body.refundNote || '').trim();
        const todayStr = getTodayYMD();

        if (booking.status !== 'İptal Edildi' && booking.status !== 'Reddedildi') {
            booking.status = 'İptal Edildi';
        }
        booking.remainingBalance = 0;

        if (requestedRefund > 0) {
            booking.refundedAmount = requestedRefund;
            booking.refundStatus = requestedRefund >= paid ? 'full_refund_admin' : 'partial_refund_admin';
            booking.refundedAt = todayStr;
            booking.refundRuleReason = customNote
                ? `${customNote} — İade Edilen: €${requestedRefund.toLocaleString()} (${todayStr})`
                : `Admin onayı ile €${requestedRefund.toLocaleString()} tutarında iade yapıldı (${todayStr}).`;
        } else {
            booking.refundedAmount = 0;
            booking.refundStatus = 'no_refund_admin';
            booking.refundedAt = '';
            booking.refundRuleReason = customNote || 'Admin kararı / iptal koşulları gereği iade uygulanmadı (€0).';
        }

        saveDB(db);
    }
    res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('İade tutarı ve açıklaması güncellendi.'));
});

app.post('/admin/bookings/:id/assign', requireAdmin, (req, res) => {
    const db = loadDB();
    const bookingId = decodeURIComponent(req.params.id);
    const booking = db.bookings.find(b => b.id === bookingId);
    if (booking) {
        if (typeof req.body.assignedCaptain === 'string') {
            booking.assignedCaptain = req.body.assignedCaptain.trim();
        }
        if (typeof req.body.assignedTransfer === 'string') {
            booking.assignedTransfer = req.body.assignedTransfer.trim();
        }
        if (typeof req.body.adminNote === 'string') {
            booking.adminNote = req.body.adminNote.trim();
        }
        saveDB(db);
    }
    res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('Kaptan ve VIP transfer atamaları kaydedildi.'));
});

app.post('/admin/bookings/:id/status', requireAdmin, (req, res) => {
    const db = loadDB();
    const bookingId = decodeURIComponent(req.params.id);
    const booking = db.bookings.find(b => b.id === bookingId);
    if (booking && req.body.status) {
        const nextStatus = String(req.body.status).trim();
        const isAlreadyCancelled = booking.status === 'İptal Edildi' || booking.status === 'İptal';
        const todayStr = getTodayYMD();

        if (isAlreadyCancelled && nextStatus === 'Onaylandı') {
            return res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('İptal edilmiş rezervasyon onaylanamaz.'));
        }

        booking.status = nextStatus;
        if (booking.status === 'Onaylandı') {
            if (!booking.paidAmount || booking.paidAmount === 0) {
                const pct = Number((db.paymentPlanSettings && db.paymentPlanSettings.installmentPercent) || 50) / 100;
                booking.paidAmount = Math.round((booking.totalAmount || 0) * pct);
            }
            booking.refundedAmount = 0;
            booking.refundStatus = 'none';
            booking.refundedAt = '';
            booking.refundRuleReason = '';
        } else if (booking.status === 'İptal Edildi' || booking.status === 'Reddedildi') {
            const daysLeft = daysUntilYMD(booking.checkIn);
            const currentPaid = Number(booking.paidAmount || 0);
            const rejectReason = String(req.body.rejectionReason || '').trim();
            if (rejectReason) booking.rejectionReason = rejectReason;

            if (currentPaid > 0) {
                if (booking.status === 'Reddedildi' || (daysLeft !== null && daysLeft >= 7)) {
                    booking.refundedAmount = currentPaid;
                    booking.refundStatus = booking.status === 'Reddedildi' ? 'full_refund_rejected' : 'full_refund_7plus_days';
                    booking.refundedAt = todayStr;
                    booking.refundRuleReason = booking.status === 'Reddedildi'
                        ? `Rezervasyon reddedildiği için ödenen tutarın tamamı (€${currentPaid.toLocaleString()}) iade edildi (${todayStr}).`
                        : `Check-in tarihine ${daysLeft} gün kaldığı için (7+ gün kuralı) ödenen tutarın tamamı (€${currentPaid.toLocaleString()}) iade edildi (${todayStr}).`;
                } else if (daysLeft !== null && daysLeft >= 0) {
                    booking.refundedAmount = 0;
                    booking.refundStatus = 'non_refundable_under_7_days';
                    booking.refundedAt = '';
                    booking.refundRuleReason = `Check-in tarihine ${daysLeft} gün kaldığı için (7 günden az) iade uygulanmadı.`;
                } else {
                    booking.refundedAmount = 0;
                    booking.refundStatus = 'past_date_no_refund';
                    booking.refundedAt = '';
                    booking.refundRuleReason = 'Check-in tarihi geçtiği için iade uygulanmadı.';
                }
            } else {
                booking.refundedAmount = 0;
                booking.refundStatus = 'no_payment';
                booking.refundedAt = '';
                booking.refundRuleReason = 'Tahsil edilmiş ödeme bulunmadığı için iade tutarı €0.';
            }
            booking.remainingBalance = 0;
        }
        normalizeBookingRecord(booking);
        saveDB(db);
    }
    res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('Rezervasyon durumu güncellendi.'));
});

app.post('/admin/bookings/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    const bookingId = decodeURIComponent(req.params.id);
    db.bookings = db.bookings.filter(b => b.id !== bookingId);
    saveDB(db);
    res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('Rezervasyon kaydı silindi.'));
});

app.use((req, res) => {
    res.status(404).redirect('/');
});

app.use((err, req, res, next) => {
    console.error('❌ Beklenmeyen sunucu hatası:', err && err.stack ? err.stack : err);
    if (res.headersSent) return next(err);
    res.status(500).send(res.locals.isEn ? 'An unexpected server error occurred.' : 'Beklenmeyen bir sunucu hatası oluştu.');
});

if (!IS_VERCEL) {
    const server = app.listen(PORT, () => {
        console.log(`🚀 YachtVoyage çalışıyor: http://localhost:${PORT}`);
    });
    server.on('error', (err) => {
        console.error('❌ Sunucu hatası:', err.message);
    });
}

module.exports = app;