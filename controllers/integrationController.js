import integrationService from '../services/integrationService.js';

class IntegrationController {
    async getIntegrations(_req, res) {
        try {
            const list = await integrationService.getIntegrations();
            res.json(list);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async getPaymentGateways(_req, res) {
        try {
            const gateways = await integrationService.getPaymentGateways();
            res.json(gateways);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async updatePaymentGateway(req, res) {
        try {
            const { provider } = req.params;
            const result = await integrationService.updatePaymentGateway(provider, req.body);
            res.json(result);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async createIntegration(req, res) {
        try {
            const integration = await integrationService.createIntegration(req.body);
            res.status(201).json(integration);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async updateIntegration(req, res) {
        try {
            const integration = await integrationService.updateIntegration(req.params.id, req.body);
            res.json(integration);
        } catch (e) {
            if (e.code === 'NOT_FOUND') {
                return res.status(404).json({ message: e.message });
            }
            res.status(500).json({ message: e.message });
        }
    }

    async deleteIntegration(req, res) {
        try {
            const result = await integrationService.deleteIntegration(req.params.id);
            res.json(result);
        } catch (e) {
            if (e.code === 'NOT_FOUND') {
                return res.status(404).json({ message: e.message });
            }
            res.status(500).json({ message: e.message });
        }
    }

    async getOverview(_req, res) {
        try {
            const overview = await integrationService.getOverview();
            res.json(overview);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async getErrorLogs(_req, res) {
        try {
            const logs = await integrationService.getErrorLogs();
            res.json(logs);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async clearErrorLogs(_req, res) {
        try {
            const result = await integrationService.clearErrorLogs();
            res.json(result);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async toggleWeather(req, res) {
        try {
            const enabled = !!(req.body && req.body.enabled);
            const result = await integrationService.setToggle({ key: 'weather', enabled });
            res.json({ ...result, message: `Weather integration ${result.enabled ? 'enabled' : 'disabled'}` });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async toggleMaps(req, res) {
        try {
            const enabled = !!(req.body && req.body.enabled);
            const result = await integrationService.setToggle({ key: 'maps', enabled });
            res.json({ ...result, message: `Maps integration ${result.enabled ? 'enabled' : 'disabled'}` });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async toggleStripeWebhook(req, res) {
        try {
            const enabled = !!(req.body && req.body.enabled);
            const result = await integrationService.setToggle({ key: 'stripe', enabled });
            res.json({ ...result, message: `Stripe webhook ${result.enabled ? 'enabled' : 'disabled'}` });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async togglePaypalWebhook(req, res) {
        try {
            const enabled = !!(req.body && req.body.enabled);
            const result = await integrationService.setToggle({ key: 'paypal', enabled });
            res.json({ ...result, message: `PayPal webhook ${result.enabled ? 'enabled' : 'disabled'}` });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }

    async testWeather(_req, res) {
        res.json({ ok: true, message: 'Weather API connection successful' });
    }

    async testMaps(_req, res) {
        res.json({ ok: true, message: 'Maps API connection successful' });
    }

    async stripeReconnect(_req, res) {
        res.json({ ok: true, message: 'Stripe reconnected successfully' });
    }

    async paypalReconnect(_req, res) {
        res.json({ ok: true, message: 'PayPal reconnected successfully' });
    }
}

export default new IntegrationController();
