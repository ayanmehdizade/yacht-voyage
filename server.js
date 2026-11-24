const express = require('express');
const fs = require('fs');
const path = require('path');

const crypto = require('crypto');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yachtvoyage.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Yacht2026!';
const SESSION_SECRET = process.env.SESSION_SECRET || 'yv-secret-key-2026';

function getAdminToken() {
    return crypto.createHmac('sha256', SESSION_SECRET).update(`${ADMIN_EMAIL}:${ADMIN_PASSWORD}`).digest('hex');
}

function isAdminAuthenticated(req) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('yv_admin='));
    if (!match) return false;
    return match.split('=')[1] === getAdminToken();
}

function requireAdmin(req, res, next) {
    if (isAdminAuthenticated(req)) return next();
    return res.redirect('/admin/login');
}

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.json');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80';

const initialData = {
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
            totalAmount: 10700,
            paidAmount: 3210,
            paymentType: '%30 Kapora',
            paymentMethod: 'Kredi / Banka Kartı',
            status: 'Onaylandı'
        }
    ]
};

function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
        return structuredClone(initialData);
    }
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!parsed.yachts || !parsed.yachts[0] || !parsed.yachts[0].reviewList) {
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
        return structuredClone(initialData);
    }
    return parsed;
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function isDateOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

function calcDays(cIn, cOut) {
    if (!cIn || !cOut) return 3;
    const d1 = new Date(cIn);
    const d2 = new Date(cOut);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return (!isNaN(diff) && diff >= 1) ? diff : 1;
}

app.get('/', (req, res) => {
    const db = loadDB();
    res.render('client/home', { yachts: db.yachts });
});

app.get('/tur-paketleri', (req, res) => {
    const db = loadDB();
    res.render('client/packages', { yachts: db.yachts });
});

app.get('/rotalar', (req, res) => {
    const db = loadDB();
    res.render('client/routes', { yachts: db.yachts });
});

app.get('/kategoriler', (req, res) => {
    const db = loadDB();
    res.render('client/categories', { yachts: db.yachts });
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

    const activeCheckIn = checkIn || '2026-07-05';
    const activeCheckOut = checkOut || '2026-07-08';
    const selectedDays = calcDays(activeCheckIn, activeCheckOut);

    res.render('client/listing', {
        yachts: results,
        selectedDays,
        filters: {
            location: location || 'all',
            category: category || 'all',
            guests: guests || '',
            maxPrice: maxPrice || 10000,
            features: feature ? (Array.isArray(feature) ? feature : [feature]) : [],
            sort: sort || 'recommended',
            checkIn: activeCheckIn,
            checkOut: activeCheckOut
        }
    });
});

app.get('/yachts/:id', (req, res) => {
    const db = loadDB();
    const yacht = db.yachts.find(y => Number(y.id) === Number(req.params.id));
    if (!yacht) return res.redirect('/yachts');
    const yachtBookings = db.bookings.filter(b => Number(b.yachtId) === Number(yacht.id) && b.status !== 'İptal Edildi');
    res.render('client/detail', {
        yacht,
        yachtBookings,
        reviewSaved: req.query.reviewSaved === '1',
        checkIn: req.query.checkIn || '2026-07-05',
        checkOut: req.query.checkOut || '2026-07-08'
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
    const yachtBookings = db.bookings.filter(b => Number(b.yachtId) === Number(yacht.id) && b.status !== 'İptal Edildi');
    res.render('client/checkout', {
        yacht,
        yachtBookings,
        errorMsg: req.query.error || '',
        checkIn: req.query.checkIn || '2026-07-05',
        checkOut: req.query.checkOut || '2026-07-08',
        guests: Number(req.query.guests) || 6
    });
});

app.post('/checkout/confirm', (req, res) => {
    const db = loadDB();
    const {
        yachtId, customerName, email, phone, checkIn, checkOut,
        days, guests, charterType, extras, notes, discount,
        totalAmount, paidAmount, paymentType, paymentMethod
    } = req.body;

    const yacht = db.yachts.find(y => Number(y.id) === Number(yachtId)) || db.yachts[0];

    const conflict = db.bookings.find(b =>
        Number(b.yachtId) === Number(yacht.id) &&
        b.status !== 'İptal Edildi' &&
        isDateOverlap(checkIn, checkOut, b.checkIn, b.checkOut)
    );

    if (conflict) {
        return res.redirect(`/checkout?yachtId=${yacht.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&error=${encodeURIComponent(`Seçilen tarihler (${conflict.checkIn} -${conflict.checkOut}) dolu. Lütfen farklı bir tarih seçin.`)}`);
    }

    const pnr = `YV2026-${Math.floor(1000 + Math.random() * 9000)}`;

    db.bookings.unshift({
        id: pnr,
        customer: customerName,
        email,
        phone,
        yachtId: yacht.id,
        yacht: yacht.name,
        checkIn,
        checkOut,
        days: Number(days) || 1,
        guests: Number(guests) || 2,
        charterType: charterType || 'Özel Yat Kiralama (Konaklamalı)',
        extras: extras ? (Array.isArray(extras) ? extras : [extras]) : [],
        notes: notes || '',
        discount: Number(discount) || 0,
        totalAmount: Number(totalAmount),
        paidAmount: Number(paidAmount),
        paymentType: paymentType || '%30 Kapora',
        paymentMethod: paymentMethod || 'Kredi / Banka Kartı',
        status: paymentMethod === 'Havale / EFT' ? 'Ödeme Bekliyor' : 'Onaylandı'
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

// ADMIN AUTH & ROUTES
app.get('/admin/login', (req, res) => {
    if (isAdminAuthenticated(req)) return res.redirect('/admin');
    res.render('admin/login', { error: req.query.error || '' });
});

app.post('/admin/login', (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    if (email === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
        res.setHeader('Set-Cookie', `yv_admin=${getAdminToken()}; HttpOnly; Path=/; SameSite=Lax`);
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
        totalRevenue,
        notice: req.query.notice || ''
    });
});

app.post('/admin/add-yacht', requireAdmin, (req, res) => {
    const db = loadDB();
    const nextId = db.yachts.reduce((max, y) => Math.max(max, Number(y.id) || 0), 0) + 1;
    const categoryTr = (req.body.categoryTr || req.body.type || 'Motor Yat').trim();
    const imgUrl = (req.body.image || '').trim() || DEFAULT_IMG;

    db.yachts.unshift({
        id: nextId,
        name: (req.body.name || 'Yeni Yat').trim(),
        category: req.body.category || 'Motor Yachts',
        categoryTr,
        location: (req.body.location || 'Göcek').trim(),
        length: (req.body.length || '20 m').trim(),
        year: Number(req.body.year) || 2024,
        guests: Number(req.body.guests) || 8,
        cabins: Number(req.body.cabins) || 4,
        crew: Number(req.body.crew) || 3,
        speed: (req.body.speed || '22 Knots').trim(),
        price: Number(req.body.price) || 2000,
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
        description: (req.body.description || 'Özel mavi yolculuk ve günlük tur için özenle hazırlanan tekne.').trim(),
        images: [imgUrl, DEFAULT_IMG]
    });

    saveDB(db);
    res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yeni yat sisteme başarıyla eklendi.'));
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

app.post('/admin/bookings/:id/status', requireAdmin, (req, res) => {
    const db = loadDB();
    const booking = db.bookings.find(b => b.id === req.params.id);
    if (booking && req.body.status) {
        booking.status = req.body.status;
        if (booking.status === 'Onaylandı' && (!booking.paidAmount || booking.paidAmount === 0)) {
            booking.paidAmount = Math.round((booking.totalAmount || 0) * 0.3);
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

app.post('/admin/yachts/:id/delete', requireAdmin, (req, res) => {
    const db = loadDB();
    db.yachts = db.yachts.filter(y => Number(y.id) !== Number(req.params.id));
    saveDB(db);
    res.redirect('/admin?tab=filo-listesi&notice=' + encodeURIComponent('Yat kaydı silindi.'));
});

const server = app.listen(PORT, () => {
    console.log(`🚀 YachtVoyage çalışıyor: http://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error('❌ Sunucu hatası:', err.message);
});