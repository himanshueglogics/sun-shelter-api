import express from 'express';
import { protect } from '../middleware/auth.js';
import integrationController from '../controllers/integrationController.js';

const router = express.Router();

// BASE ROUTES
router.get('/', protect, (req, res) =>
    integrationController.getIntegrations(req, res)
);

router.post('/', protect, (req, res) =>
    integrationController.createIntegration(req, res)
);

router.get('/overview', protect, (req, res) =>
    integrationController.getOverview(req, res)
);

// LOGS
router.post('/logs/clear', protect, (req, res) =>
    integrationController.clearErrorLogs(req, res)
);

// WEATHER
router.post('/weather/test', protect, (req, res) =>
    integrationController.testWeather(req, res)
);
router.post('/weather/toggle', protect, (req, res) =>
    integrationController.toggleWeather(req, res)
);

// MAPS
router.post('/maps/test', protect, (req, res) =>
    integrationController.testMaps(req, res)
);
router.post('/maps/toggle', protect, (req, res) =>
    integrationController.toggleMaps(req, res)
);

// STRIPE
router.post('/stripe/webhook-toggle', protect, (req, res) =>
    integrationController.toggleStripeWebhook(req, res)
);
router.post('/stripe/reconnect', protect, (req, res) =>
    integrationController.stripeReconnect(req, res)
);

// PAYPAL
router.post('/paypal/webhook-toggle', protect, (req, res) =>
    integrationController.togglePaypalWebhook(req, res)
);
router.post('/paypal/reconnect', protect, (req, res) =>
    integrationController.paypalReconnect(req, res)
);

// ----- PAYMENT GATEWAY SETTINGS -----
router.get('/payment-gateways', protect, (req, res) =>
    integrationController.getPaymentGateways(req, res)
);

router.put('/payment-gateways/:provider', protect, (req, res) =>
    integrationController.updatePaymentGateway(req, res)
);

// DYNAMIC INTEGRATION ID ROUTES (KEEP LAST)
router.put('/:id', protect, (req, res) =>
    integrationController.updateIntegration(req, res)
);

router.delete('/:id', protect, (req, res) =>
    integrationController.deleteIntegration(req, res)
);

export default router;
