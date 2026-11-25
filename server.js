const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yachtvoyage.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Yacht2026!';
const SESSION_SECRET = process.env.SESSION_SECRET || 'yv-secret-key-2026';

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

const initialData = {
    siteSettings: {
        brandName: 'YachtVoyage',
        brandSubtext: 'Yacht Charter',
        heroBadge: 'Göcek • Marmaris • Fethiye • Bodrum',
        heroBadgeEn: 'Göcek • Marmaris • Fethiye • Bodrum',
        heroTitle: 'Eşsiz Yat Deneyimini Keşfedin',
        heroTitleEn: 'Discover a Unique Yacht Experience',
        heroSubtitle: 'Göcek, Marmaris, Fethiye ve Bodrum koylarında özel yat kiralama, günlük tur paketleri ve şeffaf içerik bilgisi.',
        heroSubtitleEn: 'Private yacht charters, daily tour packages and transparent itinerary details across Göcek, Marmaris, Fethiye and Bodrum coves.',
        heroImage: DEFAULT_IMG,
        phone: '+90 252 123 45 67',
        whatsappNumber: '902521234567',
        email: 'hello@yachtvoyage.com',
        footerAbout: 'Göcek, Marmaris, Fethiye ve Bodrum koylarında lisanslı kaptanlar ve özel filo ile yat kiralama ve günlük tur platformu.',
        copyrightText: '© 2026 YachtVoyage. Tüm hakları saklıdır.',
        conciergeWelcome: 'Merhaba! Rota planlaması, özel menü veya tekne müsaitliği için hızlıca yazabilirsiniz.'
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
                { author: 'Emre K.', rating: 5, date: '2026-06-12', comment: 'Kaptan ve mürettebat inanılmaz ilgiliydi. Göcek koylarında rüya gibi 3 gün geçirdik.' },
                { author: 'Selin A.', rating: 5, date: '2026-05-28', comment: 'Tekne tertemizdi, jakuzi ve güneşlenme alanı fotoğraflardan bile güzel.' }
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
                { author: 'Mert D.', rating: 5, date: '2026-06-04', comment: '10 kişilik arkadaş grubumuzla çok rahat ettik. Aşçının mezeleri harikaydı.' }
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
                { author: 'Caner T.', rating: 5, date: '2026-05-19', comment: 'Yelken deneyimi ve Fethiye koyları muazzamdı, kesinlikle tekrar geleceğiz.' }
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
                { author: 'Zeynep B.', rating: 5, date: '2026-06-15', comment: 'Katamaranın dengesi sayesinde hiç sallanmadık, çocuklu aileler için mükemmel.' }
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
                { author: 'Kerem V.', rating: 5, date: '2026-06-18', comment: 'Bodrum koylarında beş yıldızlı otel konforunda eşsiz bir deneyimdi.' }
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
            durationLabel: '1 Günlük Paket',
            capacityLabel: 'En fazla 12 kişi',
            durationDays: 1,
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
        { id: 1, name: 'VIP Havalimanı Transferi', pricePerGuest: 45, active: true },
        { id: 2, name: 'Özel Şef & Gurme Menü', pricePerGuest: 120, active: true },
        { id: 3, name: 'Seabob & Su Sporları Paketi', pricePerGuest: 85, active: true }
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

function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        const bundledDbPath = path.join(__dirname, 'data.json');
        const seedSource = fs.existsSync(bundledDbPath)
            ? JSON.parse(fs.readFileSync(bundledDbPath, 'utf8'))
            : structuredClone(initialData);
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
    parsed.tours = (parsed.tours && parsed.tours.length)
        ? parsed.tours
        : structuredClone(initialData.tours);
    parsed.paymentOptions = parsed.paymentOptions || structuredClone(initialData.paymentOptions);
    parsed.paymentPlanSettings = Object.assign(
        structuredClone(initialData.paymentPlanSettings),
        parsed.paymentPlanSettings || {}
    );
    parsed.extras = parsed.extras || structuredClone(initialData.extras);
    parsed.bookings = parsed.bookings || [];
    return parsed;
}

function saveDB(data) {
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
    const payload = Buffer.from(JSON.stringify({
        email: user.email,
        role: user.role
    })).toString('base64url');
    const sig = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(`${user.email}:${user.password}:${user.role}`)
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

    const users = getAllAdminUsers(db || loadDB());
    const matchedUser = users.find(u => u.email === String(payload.email || '').toLowerCase());
    if (!matchedUser) return null;

    const expectedSig = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(`${matchedUser.email}:${matchedUser.password}:${matchedUser.role}`)
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
    next();
});

function parseMultipartUpload(req) {
    return new Promise((resolve) => {
        const contentType = req.headers['content-type'] || '';
        const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (!match) {
            return resolve({ fields: req.body || {}, file: null, tooLarge: false });
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
                return resolve({ fields: {}, file: null, tooLarge: true });
            }

            const buffer = Buffer.concat(chunks);
            const fields = {};
            let uploadedFile = null;

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
                    const ext = path.extname(filenameMatch[1]).toLowerCase() || '.jpg';
                    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
                    const fileName = `yacht-${Date.now()}-${Math.floor(Math.random() * 10000)}${safeExt}`;
                    const fullPath = path.join(UPLOAD_DIR, fileName);
                    fs.writeFileSync(fullPath, bodyBuf);
                    uploadedFile = {
                        fieldName,
                        url: `/uploads/${fileName}`
                    };
                } else {
                    fields[fieldName] = bodyBuf.toString('utf8');
                }
            }

            resolve({ fields, file: uploadedFile, tooLarge: false });
        });
    });
}

function isDateOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

function isDailyCharter(charterType) {
    const val = String(charterType || '').toLowerCase();
    return val.includes('günlük') || val.includes('daily');
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
        .filter(b => b.status !== 'İptal Edildi' && b.status !== 'İptal')
        .map(b => ({ checkIn: b.checkIn, checkOut: b.checkOut }));

    res.render('client/home', {
        yachts: db.yachts,
        categories: db.categories,
        departurePoints: db.departurePoints,
        tours: db.tours,
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
    const yachtBookings = db.bookings.filter(b => Number(b.yachtId) === Number(yacht.id) && b.status !== 'İptal Edildi' && b.status !== 'İptal');
    const range = normalizeDateRange(req.query.checkIn, req.query.checkOut, 'Özel Yat Kiralama (Konaklamalı)');
    const activeExtras = (db.extras || []).filter(e => e.active !== false);
    res.render('client/detail', {
        yacht,
        yachtBookings,
        extrasList: activeExtras,
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
        const rating = Math.min(5, Math.max(1, Number(req.body.rating) || 5));
        const comment = (req.body.comment || '').trim();
        if (comment) {
            yacht.reviewList = yacht.reviewList || [];
            yacht.reviewList.unshift({
                author,
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
    const yachtBookings = db.bookings.filter(b => Number(b.yachtId) === Number(yacht.id) && b.status !== 'İptal Edildi' && b.status !== 'İptal');

    const rawIn = (req.query.checkIn || '').trim();
    const rawOut = (req.query.checkOut || '').trim();
    const today = getTodayYMD();
    const checkInVal = (/^\d{4}-\d{2}-\d{2}$/.test(rawIn) && rawIn >= today) ? rawIn : '';
    const checkOutVal = (checkInVal && /^\d{4}-\d{2}-\d{2}$/.test(rawOut) && rawOut >= checkInVal) ? rawOut : '';

    const activeExtras = (db.extras || []).filter(e => e.active !== false);
    const activePayments = (db.paymentOptions || []).filter(p => p.active !== false);

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
        paymentOptions: activePayments,
        paymentPlanSettings: db.paymentPlanSettings,
        rentalContract: db.rentalContract,
        selectedPackage,
        errorMsg: req.query.error || '',
        checkIn: checkInVal,
        checkOut: checkOutVal,
        guests: Math.min(Number(yacht.guests) || 12, Math.max(1, Number(req.query.guests) || 1))
    });
});

app.post('/checkout/confirm', (req, res) => {
    const db = loadDB();
    const {
        yachtId, customerName, email, phone, checkIn, checkOut,
        guests, charterType, tourTimeSlot, extras, notes, discount,
        paymentType, paymentMethod
    } = req.body;

    const matchedTour = findMatchedTour(db, req.body);
    const targetYachtId = Number(yachtId || (matchedTour && matchedTour.yachtId) || 0);
    const yacht = db.yachts.find(y => Number(y.id) === targetYachtId) || db.yachts[0];
    const guestCount = Math.min(Number(yacht.guests) || 12, Math.max(1, Number(guests) || 1));
    const normalizedCharter = charterType || (matchedTour ? 'Günlük VIP Koy Turu' : 'Özel Yat Kiralama (Konaklamalı)');
    const isDaily = isDailyCharter(normalizedCharter);

    if (!isValidBookingRange(checkIn, checkOut, normalizedCharter)) {
        return res.redirect(`/checkout?yachtId=${yacht.id}&guests=${guestCount}&error=${encodeURIComponent('Lütfen bugün veya ileri bir tarih ve uygun bitiş tarihi seçin.')}`);
    }

    const startYmd = checkIn.trim();
    const endYmd = (isDaily && (!checkOut || checkOut.trim() < startYmd))
        ? startYmd
        : checkOut.trim();
    const overlapEndYmd = isDaily ? addDaysYMD(startYmd, 1) : endYmd;

    const days = isDaily
        ? Number(matchedTour && matchedTour.durationDays) || 1
        : calcDays(startYmd, endYmd, normalizedCharter);

    const conflict = db.bookings.find(b =>
        Number(b.yachtId) === Number(yacht.id) &&
        b.status !== 'İptal Edildi' &&
        b.status !== 'İptal' &&
        isDateOverlap(startYmd, overlapEndYmd, b.checkIn, b.checkOut)
    );

    if (conflict) {
        return res.redirect(`/checkout?yachtId=${yacht.id}&checkIn=${startYmd}&checkOut=${endYmd}&guests=${guestCount}&error=${encodeURIComponent(`Seçilen tarihler (${conflict.checkIn} - ${conflict.checkOut}) dolu. Lütfen boş bir tarih seçin.`)}`);
    }

    const selectedMethod = String(paymentMethod || 'Kredi / Banka Kartı').trim();
    const methodLower = selectedMethod.toLowerCase();
    const isCard = methodLower.includes('kart') || methodLower.includes('card');
    const isDeferredPayment = methodLower.includes('havale') || methodLower.includes('eft') || methodLower.includes('marina') || methodLower.includes('nakit');

    if (isCard) {
        const cardHolder = String(req.body.cardHolder || '').trim();
        const cardNumber = String(req.body.cardNumber || '').replace(/\s+/g, '');
        const cardExpiry = String(req.body.cardExpiry || '').trim();
        const cardCvv = String(req.body.cardCvv || '').trim();

        const validCard =
            cardHolder.length >= 3 &&
            /^\d{13,19}$/.test(cardNumber) &&
            /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry) &&
            /^\d{3,4}$/.test(cardCvv);

        if (!validCard) {
            return res.redirect(`/checkout?yachtId=${yacht.id}&checkIn=${startYmd}&checkOut=${endYmd}&guests=${guestCount}&error=${encodeURIComponent('Kredi / Banka Kartı ile ödeme için kart bilgilerini eksiksiz ve doğru girmeniz gerekir.')}`);
        }
    }

    const selectedExtraNames = extras ? (Array.isArray(extras) ? extras : [extras]) : [];
    const extrasPerGuestTotal = (db.extras || [])
        .filter(e => e.active !== false && selectedExtraNames.includes(e.name))
        .reduce((sum, e) => sum + Number(e.pricePerGuest || 0), 0);

    const extrasTotal = extrasPerGuestTotal * guestCount;

    const fixedPkgPrice = matchedTour
        ? Number(matchedTour.pricePerDay || 0)
        : Math.max(0, Number(req.body.packagePrice) || 0);
    const hasFixedPkg = fixedPkgPrice > 0;

    const baseTotal = hasFixedPkg ? fixedPkgPrice : (Number(yacht.price || 0) * days);
    const autoDisc = (!hasFixedPkg && days >= 5) ? Math.round(baseTotal * 0.05) : 0;
    const discountAmt = Math.max(0, Number(discount) || 0);
    const computedTotal = Math.max(0, baseTotal - autoDisc + extrasTotal - discountAmt);

    const planCfg = db.paymentPlanSettings || {
        installmentPercent: 50,
        installmentInterestPercent: 0,
        fullPaymentDiscountPercent: 10
    };

    const isFullPayment = paymentType === 'Tam Ödeme (İndirimli)';
    let finalAmount = computedTotal;

    if (isFullPayment) {
        finalAmount = Math.max(0, Math.round(computedTotal * (1 - Number(planCfg.fullPaymentDiscountPercent || 0) / 100)));
    } else {
        finalAmount = Math.max(0, Math.round(computedTotal * (1 + Number(planCfg.installmentInterestPercent || 0) / 100)));
    }

    const plannedPaidAmt = isFullPayment
        ? finalAmount
        : Math.round(finalAmount * (Number(planCfg.installmentPercent || 50) / 100));

    const paidAmt = isDeferredPayment ? 0 : plannedPaidAmt;
    const bookingStatus = isDeferredPayment ? 'Ödeme Bekleniyor' : 'Onaylandı';
    const pnr = `YV2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const normEmail = (email || '').trim().toLowerCase();

    db.bookings.unshift({
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
        tourTimeSlot: isDaily ? (String(tourTimeSlot || '10:00 - 18:00').trim()) : null,
        days,
        guests: guestCount,
        charterType: normalizedCharter,
        extras: selectedExtraNames,
        extrasTotal,
        notes: (notes || '').trim(),
        discount: discountAmt + autoDisc,
        totalAmount: finalAmount,
        paidAmount: paidAmt,
        refundedAmount: 0,
        refundStatus: 'none',
        paymentType: isFullPayment ? 'Tam Ödeme (İndirimli)' : 'Hisseli Ödeme',
        paymentMethod: selectedMethod,
        status: bookingStatus
    });

    saveDB(db);
    setVerifiedPnrCookie(res, pnr, normEmail);
    res.redirect(`/confirmation/${pnr}`);
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
        const candidate = db.bookings.find(b => b.id.toUpperCase() === pnr && String(b.email || '').toLowerCase() === verified.email);
        if (candidate) {
            booking = candidate;
            yacht = resolveBookingYacht(db, booking);
        }
    }

    res.render('client/my-booking', {
        booking,
        yacht,
        pnr,
        email: '',
        searched: Boolean(pnr),
        msg: req.query.msg || '',
        errMsg: req.query.err || ''
    });
});

app.post('/my-booking', (req, res) => {
    const db = loadDB();
    const pnr = String(req.body.pnr || '').trim().toUpperCase();
    const emailQuery = String(req.body.email || '').trim().toLowerCase();

    if (!pnr || !emailQuery) {
        return res.redirect('/my-booking?err=' + encodeURIComponent('PNR kodu ve e-posta adresini girin.'));
    }

    const candidate = db.bookings.find(b =>
        b.id.toUpperCase() === pnr &&
        String(b.email || '').toLowerCase() === emailQuery
    );

    if (!candidate) {
        return res.redirect('/my-booking?err=' + encodeURIComponent('Girilen PNR ve e-posta ile eşleşen rezervasyon bulunamadı.'));
    }

    setVerifiedPnrCookie(res, candidate.id, emailQuery);
    return res.redirect(`/my-booking?pnr=${encodeURIComponent(candidate.id)}`);
});

app.post('/my-booking/cancel', (req, res) => {
    const db = loadDB();
    const verified = getVerifiedPnrFromCookie(req);
    const pnr = String(req.body.pnr || (verified && verified.pnr) || '').trim().toUpperCase();
    const emailQuery = String(req.body.email || (verified && verified.email) || '').trim().toLowerCase();

    const booking = db.bookings.find(b =>
        b.id.toUpperCase() === pnr &&
        (!emailQuery || String(b.email || '').toLowerCase() === emailQuery)
    );

    if (booking && verified && verified.pnr === booking.id.toUpperCase() && verified.email === String(booking.email || '').toLowerCase()) {
        booking.status = 'İptal Edildi';
        if (Number(booking.paidAmount || 0) > 0) {
            booking.refundStatus = 'pending';
        }
        saveDB(db);
        return res.redirect(`/my-booking?pnr=${encodeURIComponent(pnr)}&msg=${encodeURIComponent('Rezervasyonunuz iptal edildi; iade talebi kayda alındı.')}`);
    }

    return res.redirect('/my-booking?err=' + encodeURIComponent('İptal işlemi için önce PNR ve e-posta ile doğrulama yapın.'));
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
        res.setHeader('Set-Cookie', `yv_admin=${cookieToken}; HttpOnly; Path=/; SameSite=Lax${cookieFlags()}`);
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
        .filter(b => b.status !== 'İptal Edildi' && b.status !== 'İptal')
        .reduce((sum, b) => sum + Number(b.paidAmount || 0), 0);

    res.render('admin/dashboard', {
        yachts: db.yachts,
        bookings: db.bookings,
        categories: db.categories,
        departurePoints: db.departurePoints,
        tours: db.tours,
        paymentOptions: db.paymentOptions,
        paymentPlanSettings: db.paymentPlanSettings,
        rentalContract: db.rentalContract,
        siteSettings: db.siteSettings,
        extras: db.extras,
        adminUsers: db.adminUsers || [],
        totalRevenue,
        notice: req.query.notice || ''
    });
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
    const { fields, file, tooLarge } = await parseMultipartUpload(req);

    if (tooLarge) {
        return res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yüklenen dosya boyutu 10 MB sınırını aştı.'));
    }

    const nextId = db.yachts.reduce((max, y) => Math.max(max, Number(y.id) || 0), 0) + 1;
    const categoryKey = (fields.category || 'Motor Yachts').trim();
    const matchedCat = (db.categories || []).find(c => c.key === categoryKey || c.nameTr === categoryKey);
    const categoryTr = (fields.categoryTr || (matchedCat && matchedCat.nameTr) || categoryKey).trim();

    let imgUrl = DEFAULT_IMG;
    if (file && file.url) {
        imgUrl = file.url;
    } else if (fields.imageData && fields.imageData.startsWith('data:image/')) {
        const m = fields.imageData.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i);
        if (m) {
            const ext = m[1].toLowerCase() === 'jpeg' ? '.jpg' : '.' + m[1].toLowerCase();
            const fileName = `yacht-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
            fs.writeFileSync(path.join(UPLOAD_DIR, fileName), Buffer.from(m[2], 'base64'));
            imgUrl = `/uploads/${fileName}`;
        }
    }

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
        images: [imgUrl, DEFAULT_IMG]
    });

    saveDB(db);
    res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yeni yat ve yüklenen fotoğraf sisteme kaydedildi.'));
});

app.post('/admin/yachts/:id/update', requireAdmin, async (req, res) => {
    const db = loadDB();
    const { fields, file, tooLarge } = await parseMultipartUpload(req);

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

        let newImgUrl = '';
        if (file && file.url) {
            newImgUrl = file.url;
        } else if (fields.imageData && fields.imageData.startsWith('data:image/')) {
            const m = fields.imageData.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i);
            if (m) {
                const ext = m[1].toLowerCase() === 'jpeg' ? '.jpg' : '.' + m[1].toLowerCase();
                const fileName = `yacht-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
                fs.writeFileSync(path.join(UPLOAD_DIR, fileName), Buffer.from(m[2], 'base64'));
                newImgUrl = `/uploads/${fileName}`;
            }
        }

        if (newImgUrl) {
            yacht.images = Array.isArray(yacht.images) && yacht.images.length
                ? [newImgUrl, ...yacht.images.slice(1)]
                : [newImgUrl, DEFAULT_IMG];
        }

        saveDB(db);
    }
    res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yat bilgileri ve fotoğrafı güncellendi.'));
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

app.post('/admin/tours/add', requireAdmin, (req, res) => {
    const db = loadDB();
    const nextId = (db.tours || []).reduce((max, t) => Math.max(max, Number(t.id) || 0), 0) + 1;
    const durationDays = Math.max(1, Number(req.body.durationDays) || 1);
    const includedRaw = (req.body.includedText || '').trim();
    const excludedRaw = (req.body.excludedText || '').trim();
    const includedEnRaw = (req.body.includedTextEn || '').trim();
    const excludedEnRaw = (req.body.excludedTextEn || '').trim();

    db.tours.unshift({
        id: nextId,
        badge: (req.body.badge || 'TUR PAKETİ').trim(),
        badgeEn: (req.body.badgeEn || '').trim(),
        title: (req.body.title || 'Yeni Mavi Tur').trim(),
        titleEn: (req.body.titleEn || '').trim(),
        region: (req.body.region || 'Marmaris').trim(),
        regionEn: (req.body.regionEn || '').trim(),
        meetingPoint: (req.body.meetingPoint || '').trim(),
        meetingPointEn: (req.body.meetingPointEn || '').trim(),
        durationLabel: (req.body.durationLabel || `${durationDays} Günlük Rota`).trim(),
        durationLabelEn: (req.body.durationLabelEn || '').trim(),
        capacityLabel: (req.body.capacityLabel || 'En fazla 12 kişi').trim(),
        durationDays,
        pricePerDay: Math.max(1, Number(req.body.pricePerDay) || 2500),
        yachtId: Number(req.body.yachtId) || (db.yachts[0] && db.yachts[0].id) || 1,
        img: (req.body.img || DEFAULT_IMG).trim(),
        included: includedRaw ? includedRaw.split('|').map(s => s.trim()).filter(Boolean) : ['Lisanslı kaptan ve yakıt', 'Yüzme molaları ve ikramlar'],
        includedEn: includedEnRaw ? includedEnRaw.split('|').map(s => s.trim()).filter(Boolean) : [],
        excluded: excludedRaw ? excludedRaw.split('|').map(s => s.trim()).filter(Boolean) : ['Özel menü ve transfer'],
        excludedEn: excludedEnRaw ? excludedEnRaw.split('|').map(s => s.trim()).filter(Boolean) : [],
        summary: (req.body.summary || 'Özel koy rotası ve tam gün tekne turu.').trim(),
        summaryEn: (req.body.summaryEn || '').trim()
    });
    saveDB(db);
    res.redirect('/admin?tab=turlar-kategoriler&notice=' + encodeURIComponent('Yeni tur paketi eklendi.'));
});

app.post('/admin/tours/:id/update', requireAdmin, (req, res) => {
    const db = loadDB();
    const tour = (db.tours || []).find(t => Number(t.id) === Number(req.params.id));
    if (tour) {
        if (req.body.title && req.body.title.trim()) tour.title = req.body.title.trim();
        if (typeof req.body.titleEn === 'string') tour.titleEn = req.body.titleEn.trim();
        if (req.body.region && req.body.region.trim()) tour.region = req.body.region.trim();
        if (typeof req.body.regionEn === 'string') tour.regionEn = req.body.regionEn.trim();
        if (req.body.badge && req.body.badge.trim()) tour.badge = req.body.badge.trim();
        if (typeof req.body.badgeEn === 'string') tour.badgeEn = req.body.badgeEn.trim();
        if (typeof req.body.meetingPoint === 'string') tour.meetingPoint = req.body.meetingPoint.trim();
        if (typeof req.body.meetingPointEn === 'string') tour.meetingPointEn = req.body.meetingPointEn.trim();
        if (req.body.durationLabel && req.body.durationLabel.trim()) tour.durationLabel = req.body.durationLabel.trim();
        if (typeof req.body.durationLabelEn === 'string') tour.durationLabelEn = req.body.durationLabelEn.trim();
        if (req.body.capacityLabel && req.body.capacityLabel.trim()) tour.capacityLabel = req.body.capacityLabel.trim();
        if (req.body.img && req.body.img.trim()) tour.img = req.body.img.trim();
        if (typeof req.body.summary === 'string' && req.body.summary.trim()) tour.summary = req.body.summary.trim();
        if (typeof req.body.summaryEn === 'string') tour.summaryEn = req.body.summaryEn.trim();

        const dDays = Number(req.body.durationDays);
        const pDay = Number(req.body.pricePerDay);
        const yId = Number(req.body.yachtId);
        if (!isNaN(dDays) && dDays >= 1) tour.durationDays = dDays;
        if (!isNaN(pDay) && pDay >= 1) tour.pricePerDay = pDay;
        if (!isNaN(yId) && yId >= 1) tour.yachtId = yId;

        if (typeof req.body.includedText === 'string' && req.body.includedText.trim()) {
            tour.included = req.body.includedText.split('|').map(s => s.trim()).filter(Boolean);
        }
        if (typeof req.body.includedTextEn === 'string') {
            tour.includedEn = req.body.includedTextEn.split('|').map(s => s.trim()).filter(Boolean);
        }
        if (typeof req.body.excludedText === 'string' && req.body.excludedText.trim()) {
            tour.excluded = req.body.excludedText.split('|').map(s => s.trim()).filter(Boolean);
        }
        if (typeof req.body.excludedTextEn === 'string') {
            tour.excludedEn = req.body.excludedTextEn.split('|').map(s => s.trim()).filter(Boolean);
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
    const pricePerGuest = Math.max(0, Number(req.body.pricePerGuest) || 0);
    if (name) {
        const nextId = (db.extras || []).reduce((max, e) => Math.max(max, Number(e.id) || 0), 0) + 1;
        db.extras.push({
            id: nextId,
            name,
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
        const p = Number(req.body.pricePerGuest);
        if (!isNaN(p) && p >= 0) item.pricePerGuest = p;
        if (typeof req.body.toggleActive !== 'undefined') {
            item.active = !item.active;
        }
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Ekstra hizmet fiyatı/durumu güncellendi.'));
});

app.post('/admin/extras/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.extras = (db.extras || []).filter(e => Number(e.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Ekstra hizmet silindi.'));
});

app.post('/admin/bookings/:id/status', requireAdmin, (req, res) => {
    const db = loadDB();
    const booking = db.bookings.find(b => b.id === req.params.id);
    if (booking && req.body.status) {
        booking.status = req.body.status;
        if (booking.status === 'Onaylandı' && (!booking.paidAmount || booking.paidAmount === 0)) {
            const pct = Number((db.paymentPlanSettings && db.paymentPlanSettings.installmentPercent) || 50) / 100;
            booking.paidAmount = Math.round((booking.totalAmount || 0) * pct);
        }
        saveDB(db);
    }
    res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('Rezervasyon durumu güncellendi.'));
});

app.post('/admin/bookings/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.bookings = db.bookings.filter(b => b.id !== req.params.id);
    saveDB(db);
    res.redirect('/admin?tab=rezervasyonlar&notice=' + encodeURIComponent('Rezervasyon kaydı silindi.'));
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