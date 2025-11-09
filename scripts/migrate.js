import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensurePlaceholderBeach() {
    const name = 'Unknown Beach';
    const location = 'Unknown';
    const existing = await prisma.beach.findFirst({ where: { name, location } });
    if (existing) return existing.id;
    const created = await prisma.beach.create({
        data: {
            name,
            location,
            occupancyRate: 0,
            totalCapacity: 0,
            currentBookings: 0,
            status: 'active',
            amenities: [],
            services: [],
            pricePerDay: 0,
            images: [],
            mongoId: null
        }
    });
    return created.id;
}

async function migrateUsers(db) {
    const users = await db.collection('users').find({}).toArray();
    console.log('users fetched:', users.length);
    if (!users.length) return;
    const data = users.map(u => ({
        email: u.email,
        password: u.password,
        role: (u.role || 'admin').toLowerCase(),
        name: u.name || 'Admin User',
        resetPasswordToken: u.resetPasswordToken || null,
        resetPasswordExpire: u.resetPasswordExpire ? new Date(u.resetPasswordExpire) : null,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        mongoId: String(u._id)
    }));
    const res = await prisma.user.createMany({ data, skipDuplicates: true });
    console.log('users inserted:', res.count);
}

async function getIdMap(model) {
    const rows = await model.findMany({ select: { id: true, mongoId: true } });
    const map = new Map();
    for (const r of rows) if (r.mongoId) map.set(r.mongoId, r.id);
    return map;
}

async function migrateBeachesZonesSunbeds(db) {
    const beaches = await db.collection('beaches').find({}).toArray();
    console.log('beaches fetched:', beaches.length);
    if (!beaches.length) return;
    const beachRes = await prisma.beach.createMany({
        data: beaches.map(b => ({
            name: b.name,
            location: b.location,
            occupancyRate: b.occupancyRate ?? 0,
            totalCapacity: b.totalCapacity ?? 100,
            currentBookings: b.currentBookings ?? 0,
            status: b.status || 'active',
            amenities: b.amenities ?? [],
            services: b.services ?? [],
            pricePerDay: b.pricePerDay ?? 0,
            images: b.images ?? [],
            createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
            mongoId: String(b._id)
        })),
        skipDuplicates: true
    });
    console.log('beaches inserted:', beachRes.count);

    const beachMap = await getIdMap(prisma.beach);

    const zoneRows = [];
    for (const b of beaches) {
        const beachId = beachMap.get(String(b._id));
        for (const z of (b.zones || [])) {
            zoneRows.push({
                name: z.name,
                rows: z.rows ?? 0,
                cols: z.cols ?? 0,
                beachId,
                mongoId: z._id ? String(z._id) : null
            });
        }
    }
    console.log('zones to insert:', zoneRows.length);
    if (zoneRows.length) {
        const zoneRes = await prisma.zone.createMany({ data: zoneRows, skipDuplicates: true });
        console.log('zones inserted:', zoneRes.count);
    }

    const zoneMap = await getIdMap(prisma.zone);

    const sunbedRows = [];
    for (const b of beaches) {
        const beachId = beachMap.get(String(b._id));
        for (const z of (b.zones || [])) {
            const zoneId = z._id ? zoneMap.get(String(z._id)) : null;
            for (const s of (z.sunbeds || [])) {
                if (zoneId == null) continue;
                sunbedRows.push({
                    code: s.code,
                    row: s.row,
                    col: s.col,
                    status: s.status || 'available',
                    priceModifier: s.priceModifier ?? 0,
                    beachId,
                    zoneId,
                    mongoId: s._id ? String(s._id) : null
                });
            }
        }
    }
    console.log('sunbeds to insert:', sunbedRows.length);
    if (sunbedRows.length) {
        const sbRes = await prisma.sunbed.createMany({ data: sunbedRows, skipDuplicates: true });
        console.log('sunbeds inserted:', sbRes.count);
    }
}

async function migrateBookings(db) {
    const bookings = await db.collection('bookings').find({}).toArray();
    console.log('bookings fetched:', bookings.length);
    if (!bookings.length) return;
    const beachMap = await getIdMap(prisma.beach);
    const zoneMap = await getIdMap(prisma.zone);
    const prepared = bookings.map(b => ({
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        customerPhone: b.customerPhone,
        checkInDate: new Date(b.checkInDate),
        checkOutDate: new Date(b.checkOutDate),
        numberOfGuests: b.numberOfGuests,
        totalAmount: b.totalAmount,
        status: b.status || 'pending',
        paymentStatus: b.paymentStatus || 'pending',
        createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
        beachId: beachMap.get(String(b.beach)),
        zoneId: b.zone ? zoneMap.get(String(b.zone)) : null,
        mongoId: String(b._id)
    }));
    const missing = prepared.filter(x => x.beachId === undefined || x.beachId === null);
    let placeholderId = null;
    if (missing.length) {
        placeholderId = await ensurePlaceholderBeach();
        for (const m of missing) m.beachId = placeholderId;
        console.warn('bookings using placeholder beach:', missing.length, missing.slice(0, 3).map(x => x.mongoId));
    }
    const bRes = prepared.length ? await prisma.booking.createMany({ data: prepared, skipDuplicates: true }) : { count: 0 };
    console.log('bookings inserted:', bRes.count);

    const bookingMap = await getIdMap(prisma.booking);
    const sunbedMap = await getIdMap(prisma.sunbed);
    const joinRows = [];
    for (const b of bookings) {
        const bookingId = bookingMap.get(String(b._id));
        for (const sb of (b.sunbeds || [])) {
            const sunbedId = sunbedMap.get(String(sb));
            if (bookingId && sunbedId) joinRows.push({ bookingId, sunbedId });
        }
    }
    console.log('booking-sunbed rows to insert:', joinRows.length);
    if (joinRows.length) {
        const bsRes = await prisma.bookingSunbed.createMany({ data: joinRows, skipDuplicates: true });
        console.log('booking-sunbed inserted:', bsRes.count);
    }
}

async function migrateFinance(db) {
    const items = await db.collection('finances').find({}).toArray();
    console.log('finances fetched:', items.length);
    if (!items.length) return;
    const beachMap = await getIdMap(prisma.beach);
    const bookingMap = await getIdMap(prisma.booking);
    const res = await prisma.finance.createMany({
        data: items.map(f => ({
            type: f.type,
            amount: f.amount,
            description: f.description,
            date: f.date ? new Date(f.date) : new Date(),
            createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
            bookingId: f.booking ? bookingMap.get(String(f.booking)) : null,
            beachId: f.beach ? beachMap.get(String(f.beach)) : null,
            mongoId: String(f._id)
        })),
        skipDuplicates: true
    });
    console.log('finances inserted:', res.count);
}

async function migratePayouts(db) {
    const items = await db.collection('payouts').find({}).toArray();
    console.log('payouts fetched:', items.length);
    if (!items.length) return;
    const beachMap = await getIdMap(prisma.beach);
    const userMap = await getIdMap(prisma.user);
    const prepared = items.map(p => ({
        amount: p.amount,
        status: p.status || 'pending',
        requestedDate: p.requestedDate ? new Date(p.requestedDate) : new Date(),
        processedDate: p.processedDate ? new Date(p.processedDate) : null,
        notes: p.notes || null,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        beachId: beachMap.get(String(p.beach)),
        processedById: p.processedBy ? userMap.get(String(p.processedBy)) : null,
        mongoId: String(p._id)
    }));
    const missing = prepared.filter(x => x.beachId === undefined || x.beachId === null);
    let placeholderId = null;
    if (missing.length) {
        placeholderId = await ensurePlaceholderBeach();
        for (const m of missing) m.beachId = placeholderId;
        console.warn('payouts using placeholder beach:', missing.length, missing.slice(0, 3).map(x => x.mongoId));
    }
    const res = prepared.length ? await prisma.payout.createMany({ data: prepared, skipDuplicates: true }) : { count: 0 };
    console.log('payouts inserted:', res.count);
}

async function migrateAlerts(db) {
    const items = await db.collection('alerts').find({}).toArray();
    console.log('alerts fetched:', items.length);
    if (!items.length) return;
    const beachMap = await getIdMap(prisma.beach);
    const res = await prisma.alert.createMany({
        data: items.map(a => ({
            type: a.type,
            message: a.message,
            isRead: !!a.isRead,
            createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
            beachId: a.beach ? beachMap.get(String(a.beach)) : null,
            mongoId: String(a._id)
        })),
        skipDuplicates: true
    });
    console.log('alerts inserted:', res.count);
}

async function migrateIntegrations(db) {
    const items = await db.collection('integrations').find({}).toArray();
    console.log('integrations fetched:', items.length);
    if (!items.length) return;
    const res = await prisma.integration.createMany({
        data: items.map(i => ({
            name: i.name,
            type: i.type,
            provider: i.provider || null,
            enabled: !!i.enabled,
            settings: i.settings || {},
            createdAt: i.createdAt ? new Date(i.createdAt) : new Date(),
            mongoId: String(i._id)
        })),
        skipDuplicates: true
    });
    console.log('integrations inserted:', res.count);
}

async function main() {
    const started = Date.now();
    console.log('ETL start');
    const mongo = await MongoClient.connect(process.env.MONGODB_URI);
    const dbName = process.env.MONGODB_DBNAME || (new URL(process.env.MONGODB_URI)).pathname.replace(/^\//, '') || 'sunshelter';
    console.log('Mongo DB:', dbName);
    const db = mongo.db(dbName);

    try { await migrateUsers(db); } catch (e) { console.error('Users error:', e); }
    try { await migrateBeachesZonesSunbeds(db); } catch (e) { console.error('Beaches error:', e); }
    try { await migrateBookings(db); } catch (e) { console.error('Bookings error:', e); }
    try { await migrateFinance(db); } catch (e) { console.error('Finance error:', e); }
    try { await migratePayouts(db); } catch (e) { console.error('Payouts error:', e); }
    try { await migrateAlerts(db); } catch (e) { console.error('Alerts error:', e); }
    try { await migrateIntegrations(db); } catch (e) { console.error('Integrations error:', e); }

    await mongo.close();
    console.log('ETL finished in', (Date.now() - started) + 'ms');
}

main()
    .then(async () => { await prisma.$disconnect(); })
    .catch(async (e) => { console.error('ETL failed:', e); await prisma.$disconnect(); process.exit(1); });
