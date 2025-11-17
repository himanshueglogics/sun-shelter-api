import prisma from '../utils/prisma.js';
import dashboardService from './dashboardService.js';

class IntegrationService {
    // --------------------------------------------------------
    // BASIC CRUD - Fetch / Add / Update / Delete Integrations
    // --------------------------------------------------------

    async getIntegrations() {
        return prisma.integration.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async createIntegration(data) {
        const { name, type, apiKey, provider, enabled, settings } = data;

        // Basic validation (provider optional)
        if (!name || !type || !apiKey) {
            throw new Error('name, type and apiKey are required');
        }

        return prisma.integration.create({
            data: {
                name,
                type,
                apiKey,
                provider: provider || null,
                enabled: Boolean(enabled),
                settings: settings || {}
            }
        });
    }

    async updateIntegration(id, data) {
        const numericId = Number(id);
        if (!Number.isInteger(numericId))
            throw new Error('Invalid integration id');

        try {
            return await prisma.integration.update({
                where: { id: numericId },
                data
            });
        } catch (e) {
            if (e.code === 'P2025') {
                const err = new Error('Integration not found');
                err.code = 'NOT_FOUND';
                throw err;
            }
            throw e;
        }
    }

    async deleteIntegration(id) {
        const numericId = Number(id);
        if (!Number.isInteger(numericId))
            throw new Error('Invalid integration id');

        try {
            await prisma.integration.delete({ where: { id: numericId } });
            return { message: 'Integration removed' };
        } catch (e) {
            if (e.code === 'P2025') {
                const err = new Error('Integration not found');
                err.code = 'NOT_FOUND';
                throw err;
            }
            throw e;
        }
    }


    // --------------------------------------------------------
    // TOGGLE SYSTEM – CLEANED FOR YOUR USE CASE
    // (You do NOT want auto-create predefined integrations)
    // --------------------------------------------------------

    async getToggleState() {
        const integrations = await prisma.integration.findMany({});

        const findEnabled = (predicate) =>
            !!integrations.find(predicate)?.enabled;

        return {
            weatherEnabled: findEnabled(i => i.type === 'weather'),
            mapsEnabled: findEnabled(i => i.type === 'maps'),
            stripeEnabled: findEnabled(i => i.type === 'payment' && i.name === 'Stripe'),
            paypalEnabled: findEnabled(i => i.type === 'payment' && i.name === 'PayPal')
        };
    }

    async setToggle({ key, enabled }) {
        // ❗ You said: "I don’t want predefined integrations"
        // So we do NOT auto-create them here anymore.

        // The frontend uses only the enabled flags for UI.
        return { ok: true, enabled };
    }


    // --------------------------------------------------------
    // ERROR LOGS
    // --------------------------------------------------------

    async getErrorLogs() {
        const alerts = await prisma.alert.findMany({
            where: { type: { in: ['warning', 'error'] } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return alerts.map(a => ({
            timestamp: a.createdAt.toISOString(),
            source: a.beachId ? `Beach #${a.beachId}` : 'System',
            message: a.message,
            severity: a.type.charAt(0).toUpperCase() + a.type.slice(1)
        }));
    }

    async clearErrorLogs() {
        await prisma.alert.deleteMany({
            where: { type: { in: ['warning', 'error'] } }
        });

        return { ok: true, message: 'Integration logs cleared' };
    }


    // --------------------------------------------------------
    // ANALYTICS / REPORTS
    // --------------------------------------------------------

    async getRecentTransactions() {
        const rows = await prisma.finance.findMany({
            orderBy: { date: 'desc' },
            take: 20
        });

        return rows.map(r => ({
            id: `FIN-${r.id}`,
            date: r.date.toISOString().slice(0, 10),
            amount: r.amount,
            status: r.type === 'expense' ? 'Expense' : 'Completed'
        }));
    }


    async getPayoutReports() {
        const rows = await prisma.payout.findMany({
            orderBy: { requestedDate: 'desc' },
            take: 50,
            include: { beach: true }
        });

        return rows.map(p => ({
            id: `PAY-${p.id}`,
            date: p.requestedDate.toISOString().slice(0, 10),
            amount: p.amount,
            status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
            method: p.notes || (p.beach ? p.beach.name : 'Unknown')
        }));
    }


    async getOccupancyData() {
        const stats = await dashboardService.getStats();
        const averageOccupancy = stats.averageOccupancy || 0;

        const occupancyChartData = [
            { name: 'Occupied', value: averageOccupancy },
            { name: 'Available', value: Math.max(0, 100 - averageOccupancy) }
        ];

        const occupancyData = (stats.beachOccupancy || []).map(b => ({
            property: b.name,
            unitType: 'Units',
            occupancy: `${b.occupancyRate || 0}%`,
            available: Math.max(0, (b.capacity || 0) - (b.currentBookings || 0))
        }));

        return { averageOccupancy, occupancyChartData, occupancyData };
    }


    async getRevenueOverview() {
        const overview = await prisma.finance.aggregate({
            _sum: { amount: true }
        });

        return { totalRevenue: overview._sum.amount || 0 };
    }


    // --------------------------------------------------------
    // OVERVIEW (Used by frontend dashboard)
    // --------------------------------------------------------

    async getOverview() {
        const [
            toggles,
            errorLogs,
            recentTransactions,
            payoutReports,
            occupancy,
            revenue
        ] = await Promise.all([
            this.getToggleState(),
            this.getErrorLogs(),
            this.getRecentTransactions(),
            this.getPayoutReports(),
            this.getOccupancyData(),
            this.getRevenueOverview()
        ]);

        return {
            ...toggles,
            errorLogs,
            recentTransactions,
            payoutReports,
            occupancyChartData: occupancy.occupancyChartData,
            occupancyData: occupancy.occupancyData,
            totalRevenue: revenue.totalRevenue,
            averageOccupancy: occupancy.averageOccupancy,
            legalDocuments: [
                { type: 'Terms of Service', lastUpdated: '2024-10-15' },
                { type: 'Privacy Policy', lastUpdated: '2024-09-28' }
            ],
            languages: [
                { key: 'english', name: 'English (US)', statusLabel: 'Primary Translation', enabled: true }
            ]
        };
    }


    // --------------------------------------------------------
    // PAYMENT GATEWAYS (Stripe / PayPal)
    // --------------------------------------------------------

    async getPaymentGateways() {
        const gateways = await prisma.paymentGateway.findMany({
            orderBy: { id: 'asc' }
        });

        const map = (name) => {
            const g = gateways.find(x => x.name.toLowerCase() === name.toLowerCase());
            return {
                id: g?.id || null,
                name,
                apiKey: g?.apiKey || "",
                secretKey: g?.secretKey || "",
                merchantId: g?.merchantId || "",
                enabled: !!g?.enabled,
                settings: g?.settings || {}
            };
        };

        return {
            stripe: map("Stripe"),
            paypal: map("PayPal")
        };
    }


    async updatePaymentGateway(provider, payload) {
        const name = provider.toLowerCase() === "stripe" ? "Stripe" : "PayPal";

        const data = {
            apiKey: payload.apiKey || "",
            secretKey: payload.secretKey || "",
            merchantId: payload.merchantId || "",
            enabled: payload.enabled ?? false,
            settings: payload.settings || {}
        };

        const existing = await prisma.paymentGateway.findUnique({
            where: { name }
        });

        if (!existing) {
            return prisma.paymentGateway.create({
                data: { name, ...data }
            });
        }

        return prisma.paymentGateway.update({
            where: { name },
            data
        });
    }
}

export default new IntegrationService();
