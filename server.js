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
const BASE_WRITABLE_DIR = IS_VERCEL ? '/tmp' : __dirname;
const DB_PATH = path.join(BASE_WRITABLE_DIR, 'data.json');
const UPLOAD_DIR = IS_VERCEL ? '/tmp/uploads' : path.join(__dirname, 'public', 'uploads');

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
            images: [
                DEFAULT_IMG,
                'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80'
            ]
        }
    ],
    categories: [
        { id: 1, key: 'Motor Yachts', nameTr: 'Motor Yat', desc: 'Yüksek hız ve modern güverte konforu' },
        { id: 2, key: 'Gulets', nameTr: 'Gulet', desc: 'Geleneksel ahşap zarafet ve geniş aile kabinleri' },
        { id: 3, key: 'Sailing Yachts', nameTr: 'Yelkenli Yat', desc: 'Rüzgarla özgür ve dengeli körfez seyri' },
        { id: 4, key: 'Catamarans', nameTr: 'Katamaran', desc: 'Çift gövdeli geniş yaşam alanı ve denge' },
        { id: 5, key: 'Superyachts', nameTr: 'Süperyat', desc: 'Özel şef ve VIP mürettebatla üst düzey lüks' }
    ],
    tours: [
        {
            id: 1,
            badge: 'GÜNLÜK PAKET',
            title: 'Gün Batımı Turu',
            region: 'Marmaris & Kızkumu Civarı',
            durationLabel: '3 Saat (18:00 - 21:00)',
            capacityLabel: 'En fazla 12 kişi',
            durationDays: 1,
            pricePerDay: 50,
            yachtId: 1,
            img: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
            included: [
                'Lisanslı kaptan ve yakıt',
                'Hoş geldiniz içeceği & meyve tabağı',
                'Yüzme molası ve ses sistemi',
                'Yolcu sigortası'
            ],
            excluded: ['Özel akşam yemeği & alkollü içecekler'],
            summary: 'Marmaris koylarında gün batımı eşliğinde keyifli tekne turu.'
        },
        {
            id: 2,
            badge: 'KEŞİF PAKETİ',
            title: 'Cennet Adası & Fosforlu Mağara',
            region: 'Marmaris Koyları Rotası',
            durationLabel: '6 Saat (10:30 - 16:30)',
            capacityLabel: 'En fazla 16 kişi',
            durationDays: 1,
            pricePerDay: 80,
            yachtId: 2,
            img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
            included: [
                'Kaptan & mürettebat hizmeti',
                '3 farklı koyda yüzme molası',
                'Şnorkel ve paddleboard ekipmanı',
                'Öğle atıştırmalık & su/çay servisi'
            ],
            excluded: ['VIP transfer ve özel şef menüsü'],
            summary: 'Cennet Adası ve Fosforlu Mağara rotasında koy keşfi ve yüzme molaları.'
        },
        {
            id: 3,
            badge: 'ÖZEL KİRALAMA',
            title: 'Özel Tekne Turu (Tam Gün)',
            region: 'Göcek / Fethiye Özel Koylar',
            durationLabel: 'Tam Gün (8 Saat)',
            capacityLabel: 'En fazla 8 kişi',
            durationDays: 1,
            pricePerDay: 250,
            yachtId: 3,
            img: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=800&q=80',
            included: [
                'Size özel tekne, kaptan ve mürettebat',
                'Rota boyunca yakıt ve koy bağlama',
                'Klima, güneşlenme terası ve Wi-Fi',
                'Soft içecekler, buz ve meyve ikramı'
            ],
            excluded: ['Özel şef menüsü & havalimanı transferi'],
            summary: 'Göcek ve Fethiye koylarında tam gün özel tekne deneyimi.'
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
            checkIn: '2026-06-25',
            checkOut: '2026-06-28',
            days: 3,
            guests: 8,
            charterType: 'Özel Yat Kiralama (Konaklamalı)',
            extras: ['VIP Havalimanı Transferi'],
            notes: 'Akşam yemeği için deniz ürünleri tercih ediyoruz.',
            discount: 0,
            totalAmount: 10860,
            paidAmount: 5430,
            paymentType: 'Hisseli Ödeme',
            paymentMethod: 'Kredi / Banka Kartı',
            status: 'Onaylandı'
        }
    ]
};

function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        const seedSource = (!IS_VERCEL && fs.existsSync(path.join(__dirname, 'data.json')))
            ? JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'))
            : structuredClone(initialData);
        fs.writeFileSync(DB_PATH, JSON.stringify(seedSource, null, 2));
        return seedSource;
    }
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!parsed.yachts || !parsed.yachts[0] || !parsed.yachts[0].reviewList) {
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
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
    parsed.tours = parsed.tours || structuredClone(initialData.tours);
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
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
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
            console.error('ADMIN_USERS_JSON parse xətası:', err.message);
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
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('yv_admin='));
    if (!match) return null;

    const token = match.split('=')[1] || '';
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

app.use((req, res, next) => {
    const db = loadDB();
    res.locals.siteSettings = db.siteSettings;
    res.locals.rentalContract = db.rentalContract;
    next();
});

function parseMultipartUpload(req) {
    return new Promise((resolve) => {
        const contentType = req.headers['content-type'] || '';
        const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (!match) {
            return resolve({ fields: req.body || {}, file: null });
        }
        const boundary = Buffer.from('--' + (match[1] || match[2]));
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
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

            resolve({ fields, file: uploadedFile });
        });
    });
}

function isDateOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

function normalizeDateRange(cIn, cOut) {
    let start = (cIn || '2026-07-05').trim();
    let end = (cOut || '2026-07-08').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) start = '2026-07-05';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) end = '2026-07-08';

    const d1 = new Date(start + 'T00:00:00');
    const d2 = new Date(end + 'T00:00:00');
    if (d2 <= d1) {
        const nextDay = new Date(d1.getTime() + 86400000);
        end = nextDay.toISOString().slice(0, 10);
    }
    return { checkIn: start, checkOut: end };
}

function calcDays(cIn, cOut) {
    const { checkIn, checkOut } = normalizeDateRange(cIn, cOut);
    const d1 = new Date(checkIn + 'T00:00:00');
    const d2 = new Date(checkOut + 'T00:00:00');
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return (!isNaN(diff) && diff >= 1) ? diff : 1;
}

app.get('/', (req, res) => {
    const db = loadDB();
    const homeBookings = (db.bookings || [])
        .filter(b => b.status !== 'İptal Edildi' && b.status !== 'İptal')
        .map(b => ({ checkIn: b.checkIn, checkOut: b.checkOut }));

    res.render('client/home', {
        yachts: db.yachts,
        categories: db.categories,
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

    const range = normalizeDateRange(checkIn, checkOut);
    const selectedDays = calcDays(range.checkIn, range.checkOut);

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
            checkIn: range.checkIn,
            checkOut: range.checkOut
        }
    });
});

app.get('/yachts/:id', (req, res) => {
    const db = loadDB();
    const yacht = db.yachts.find(y => Number(y.id) === Number(req.params.id));
    if (!yacht) return res.redirect('/yachts');
    const yachtBookings = db.bookings.filter(b => Number(b.yachtId) === Number(yacht.id) && b.status !== 'İptal Edildi' && b.status !== 'İptal');
    const range = normalizeDateRange(req.query.checkIn, req.query.checkOut);
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
                date: new Date().toISOString().slice(0, 10),
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
    const yacht = db.yachts.find(y => Number(y.id) === Number(req.query.yachtId)) || db.yachts[0];
    const yachtBookings = db.bookings.filter(b => Number(b.yachtId) === Number(yacht.id) && b.status !== 'İptal Edildi' && b.status !== 'İptal');

    const rawIn = (req.query.checkIn || '').trim();
    const rawOut = (req.query.checkOut || '').trim();
    const checkInVal = /^\d{4}-\d{2}-\d{2}$/.test(rawIn) ? rawIn : '';
    const checkOutVal = (checkInVal && /^\d{4}-\d{2}-\d{2}$/.test(rawOut) && rawOut > checkInVal) ? rawOut : '';

    const activeExtras = (db.extras || []).filter(e => e.active !== false);
    const activePayments = (db.paymentOptions || []).filter(p => p.active !== false);

    res.render('client/checkout', {
        yacht,
        yachtBookings,
        extrasList: activeExtras,
        paymentOptions: activePayments,
        paymentPlanSettings: db.paymentPlanSettings,
        rentalContract: db.rentalContract,
        errorMsg: req.query.error || '',
        checkIn: checkInVal,
        checkOut: checkOutVal,
        guests: Math.min(Number(yacht.guests) || 12, Math.max(1, Number(req.query.guests) || 6))
    });
});

app.post('/checkout/confirm', (req, res) => {
    const db = loadDB();
    const {
        yachtId, customerName, email, phone, checkIn, checkOut,
        guests, charterType, extras, notes, discount,
        paymentType, paymentMethod
    } = req.body;

    const yacht = db.yachts.find(y => Number(y.id) === Number(yachtId)) || db.yachts[0];
    const range = normalizeDateRange(checkIn, checkOut);
    const days = calcDays(range.checkIn, range.checkOut);
    const guestCount = Math.min(Number(yacht.guests) || 12, Math.max(1, Number(guests) || 2));

    const conflict = db.bookings.find(b =>
        Number(b.yachtId) === Number(yacht.id) &&
        b.status !== 'İptal Edildi' &&
        b.status !== 'İptal' &&
        isDateOverlap(range.checkIn, range.checkOut, b.checkIn, b.checkOut)
    );

    if (conflict) {
        return res.redirect(`/checkout?yachtId=${yacht.id}&checkIn=${range.checkIn}&checkOut=${range.checkOut}&guests=${guestCount}&error=${encodeURIComponent(`Seçilen tarihler (${conflict.checkIn} - ${conflict.checkOut}) dolu. Lütfen boş bir tarih seçin.`)}`);
    }

    const selectedExtraNames = extras ? (Array.isArray(extras) ? extras : [extras]) : [];
    const extrasPerGuestTotal = (db.extras || [])
        .filter(e => e.active !== false && selectedExtraNames.includes(e.name))
        .reduce((sum, e) => sum + Number(e.pricePerGuest || 0), 0);

    const extrasTotal = extrasPerGuestTotal * guestCount;
    const baseTotal = Number(yacht.price || 0) * days;
    const autoDisc = days >= 5 ? Math.round(baseTotal * 0.05) : 0;
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

    const paidAmt = isFullPayment
        ? finalAmount
        : Math.round(finalAmount * (Number(planCfg.installmentPercent || 50) / 100));

    const pnr = `YV2026-${Math.floor(1000 + Math.random() * 9000)}`;

    db.bookings.unshift({
        id: pnr,
        customer: customerName,
        email,
        phone,
        yachtId: yacht.id,
        yacht: yacht.name,
        checkIn: range.checkIn,
        checkOut: range.checkOut,
        days,
        guests: guestCount,
        charterType: charterType || 'Özel Yat Kiralama (Konaklamalı)',
        extras: selectedExtraNames,
        extrasTotal,
        notes: notes || '',
        discount: discountAmt + autoDisc,
        totalAmount: finalAmount,
        paidAmount: paidAmt,
        paymentType: isFullPayment ? 'Tam Ödeme (İndirimli)' : 'Hisseli Ödeme',
        paymentMethod: paymentMethod || 'Kredi / Banka Kartı',
        status: paymentMethod === 'Havale / EFT' ? 'Beklemede' : 'Onaylandı'
    });

    saveDB(db);
    res.redirect(`/confirmation/${pnr}`);
});

app.get('/confirmation/:pnr', (req, res) => {
    const db = loadDB();
    const booking = db.bookings.find(b => b.id === req.params.pnr);
    if (!booking) return res.redirect('/');
    const yacht = db.yachts.find(y => Number(y.id) === Number(booking.yachtId)) || db.yachts[0];
    res.render('client/confirmation', { booking, yacht });
});

app.get('/my-booking', (req, res) => {
    const db = loadDB();
    const pnr = (req.query.pnr || '').trim().toUpperCase();
    let booking = null;
    let yacht = null;
    const searched = Boolean(pnr);

    if (pnr) {
        booking = db.bookings.find(b => b.id.toUpperCase() === pnr);
        if (booking) {
            yacht = db.yachts.find(y => Number(y.id) === Number(booking.yachtId)) || db.yachts[0];
        }
    }

    res.render('client/my-booking', { booking, yacht, pnr, searched, msg: req.query.msg || '' });
});

app.post('/my-booking/cancel', (req, res) => {
    const db = loadDB();
    const { pnr } = req.body;
    const booking = db.bookings.find(b => b.id === pnr);
    if (booking) {
        booking.status = 'İptal Edildi';
        saveDB(db);
    }
    res.redirect(`/my-booking?pnr=${encodeURIComponent(pnr)}&msg=${encodeURIComponent('Rezervasyonunuz başarıyla iptal edildi.')}`);
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
        res.setHeader('Set-Cookie', `yv_admin=${cookieToken}; HttpOnly; Path=/; SameSite=Lax`);
        return res.redirect('/admin');
    }
    return res.redirect('/admin/login?error=' + encodeURIComponent('E-posta veya şifre hatalı.'));
});

app.post('/admin/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'yv_admin=; HttpOnly; Path=/; Max-Age=0');
    res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
    const db = loadDB();
    const totalRevenue = db.bookings
        .filter(b => b.status !== 'İptal Edildi' && b.status !== 'İptal')
        .reduce((sum, b) => sum + Number(b.paidAmount || b.totalAmount || 0), 0);

    res.render('admin/dashboard', {
        yachts: db.yachts,
        bookings: db.bookings,
        categories: db.categories,
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
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('Yeni işçi hesabı eklendi.'));
});

app.post('/admin/staff/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.adminUsers = db.adminUsers || [];
    if (db.adminUsers.length > 1) {
        db.adminUsers = db.adminUsers.filter(u => Number(u.id) !== Number(req.params.id));
        saveDB(db);
    }
    res.redirect('/admin?tab=ayarlar&notice=' + encodeURIComponent('İşçi hesabı silindi.'));
});

app.post('/admin/site-settings/update', requireAdmin, (req, res) => {
    const db = loadDB();
    const current = db.siteSettings || initialData.siteSettings;
    const rawWa = (req.body.whatsappNumber || '').replace(/\D/g, '');

    db.siteSettings = {
        brandName: (req.body.brandName || current.brandName || 'YachtVoyage').trim(),
        brandSubtext: (req.body.brandSubtext || current.brandSubtext || 'Yacht Charter').trim(),
        phone: (req.body.phone || current.phone || '+90 252 123 45 67').trim(),
        whatsappNumber: rawWa || current.whatsappNumber || '902521234567',
        email: (req.body.email || current.email || 'hello@yachtvoyage.com').trim(),
        footerAbout: (req.body.footerAbout || current.footerAbout || '').trim(),
        copyrightText: (req.body.copyrightText || current.copyrightText || '').trim(),
        conciergeWelcome: (req.body.conciergeWelcome || current.conciergeWelcome || '').trim()
    };
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
    const { fields, file } = await parseMultipartUpload(req);

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

    db.yachts.unshift({
        id: nextId,
        name: (fields.name || 'Yeni Yat').trim(),
        category: categoryKey,
        categoryTr,
        location: (fields.location || 'Göcek').trim(),
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
        description: (fields.description || 'Özel mavi yolculuk ve günlük tur için özenle hazırlanan tekne.').trim(),
        images: [imgUrl, DEFAULT_IMG]
    });

    saveDB(db);
    res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yeni yat ve yüklenen fotoğraf sisteme kaydedildi.'));
});

app.post('/admin/yachts/:id/update', requireAdmin, async (req, res) => {
    const db = loadDB();
    const { fields, file } = await parseMultipartUpload(req);
    const yacht = db.yachts.find(y => Number(y.id) === Number(req.params.id));

    if (yacht) {
        if (fields.name && fields.name.trim()) yacht.name = fields.name.trim();
        if (fields.location && fields.location.trim()) yacht.location = fields.location.trim();
        if (fields.length && fields.length.trim()) yacht.length = fields.length.trim();
        if (fields.speed && fields.speed.trim()) yacht.speed = fields.speed.trim();
        if (typeof fields.description === 'string' && fields.description.trim()) {
            yacht.description = fields.description.trim();
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
    db.yachts = db.yachts.filter(y => Number(y.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yat kaydı silindi.'));
});

app.post('/admin/tours/add', requireAdmin, (req, res) => {
    const db = loadDB();
    const nextId = (db.tours || []).reduce((max, t) => Math.max(max, Number(t.id) || 0), 0) + 1;
    const durationDays = Math.max(1, Number(req.body.durationDays) || 1);
    const includedRaw = (req.body.includedText || '').trim();
    const excludedRaw = (req.body.excludedText || '').trim();

    db.tours.unshift({
        id: nextId,
        badge: (req.body.badge || 'TUR PAKETİ').trim(),
        title: (req.body.title || 'Yeni Mavi Tur').trim(),
        region: (req.body.region || 'Göcek').trim(),
        durationLabel: (req.body.durationLabel || `${durationDays} Günlük Rota`).trim(),
        capacityLabel: (req.body.capacityLabel || 'En fazla 12 kişi').trim(),
        durationDays,
        pricePerDay: Math.max(1, Number(req.body.pricePerDay) || 2500),
        yachtId: Number(req.body.yachtId) || (db.yachts[0] && db.yachts[0].id) || 1,
        img: (req.body.img || DEFAULT_IMG).trim(),
        included: includedRaw ? includedRaw.split('|').map(s => s.trim()).filter(Boolean) : ['Lisanslı kaptan ve yakıt', 'Yüzme molaları ve ikramlar'],
        excluded: excludedRaw ? excludedRaw.split('|').map(s => s.trim()).filter(Boolean) : ['Özel menü ve transfer'],
        summary: (req.body.summary || 'Özel koy rotası ve tam gün tekne turu.').trim()
    });
    saveDB(db);
    res.redirect('/admin?tab=turlar-kategoriler&notice=' + encodeURIComponent('Yeni tur paketi eklendi.'));
});

app.post('/admin/tours/:id/update', requireAdmin, (req, res) => {
    const db = loadDB();
    const tour = (db.tours || []).find(t => Number(t.id) === Number(req.params.id));
    if (tour) {
        if (req.body.title && req.body.title.trim()) tour.title = req.body.title.trim();
        if (req.body.region && req.body.region.trim()) tour.region = req.body.region.trim();
        if (req.body.badge && req.body.badge.trim()) tour.badge = req.body.badge.trim();
        if (req.body.durationLabel && req.body.durationLabel.trim()) tour.durationLabel = req.body.durationLabel.trim();
        if (req.body.capacityLabel && req.body.capacityLabel.trim()) tour.capacityLabel = req.body.capacityLabel.trim();
        if (req.body.img && req.body.img.trim()) tour.img = req.body.img.trim();
        if (typeof req.body.summary === 'string' && req.body.summary.trim()) tour.summary = req.body.summary.trim();

        const dDays = Number(req.body.durationDays);
        const pDay = Number(req.body.pricePerDay);
        const yId = Number(req.body.yachtId);
        if (!isNaN(dDays) && dDays >= 1) tour.durationDays = dDays;
        if (!isNaN(pDay) && pDay >= 1) tour.pricePerDay = pDay;
        if (!isNaN(yId) && yId >= 1) tour.yachtId = yId;

        if (typeof req.body.includedText === 'string' && req.body.includedText.trim()) {
            tour.included = req.body.includedText.split('|').map(s => s.trim()).filter(Boolean);
        }
        if (typeof req.body.excludedText === 'string' && req.body.excludedText.trim()) {
            tour.excluded = req.body.excludedText.split('|').map(s => s.trim()).filter(Boolean);
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