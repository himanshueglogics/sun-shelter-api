import express from 'express';
import { protect } from '../middleware/auth.js';
import beachController from '../controllers/beachController.js';

const router = express.Router();

// Define specific routes BEFORE parameterized routes to avoid conflicts
// @route   GET /api/beaches/occupancy-overview
// @desc    Get occupancy overview for all beaches
// @access  Private
router.get('/occupancy-overview', protect, beachController.getOccupancyOverview.bind(beachController));

// @route   GET /api/beaches/stats/summary
// @desc    Get beach stats summary
// @access  Private
router.get('/stats/summary', protect, beachController.getStatsSummary.bind(beachController));

// @route   GET /api/beaches
// @desc    Get all beaches (paginated)
// @access  Private
router.get('/', protect, beachController.getAllBeaches.bind(beachController));

// @route   GET /api/beaches/:id
// @desc    Get single beach
// @access  Private
router.get('/:id', protect, beachController.getBeachById.bind(beachController));

// @route   POST /api/beaches
// @desc    Create new beach
// @access  Private
router.post('/', protect, beachController.createBeach.bind(beachController));

// @route   PUT /api/beaches/:id
// @desc    Update beach
// @access  Private
router.put('/:id', protect, beachController.updateBeach.bind(beachController));

// @route   DELETE /api/beaches/:id
// @desc    Delete beach
// @access  Private
router.delete('/:id', protect, beachController.deleteBeach.bind(beachController));

// ---------- Zones & Sunbeds Management ----------

// @route   POST /api/beaches/:id/zones
// @desc    Add a zone
// @access  Private
router.post('/:id/zones', protect, beachController.addZone.bind(beachController));

// @route   PUT /api/beaches/:id/zones/:zoneId
// @desc    Update zone (rows/cols -> regenerate sunbeds)
// @access  Private
router.put('/:id/zones/:zoneId', protect, beachController.updateZone.bind(beachController));

// @route   DELETE /api/beaches/:id/zones/:zoneId
// @desc    Remove zone
// @access  Private
router.delete('/:id/zones/:zoneId', protect, beachController.deleteZone.bind(beachController));

// @route   POST /api/beaches/:id/admins
// @desc    Assign an admin to a beach
// @access  Private
router.post('/:id/admins', protect, beachController.assignAdmin.bind(beachController));

// @route   DELETE /api/beaches/:id/admins/:userId
// @desc    Remove an admin from a beach
// @access  Private
router.delete('/:id/admins/:userId', protect, beachController.removeAdmin.bind(beachController));

// @route   PUT /api/beaches/:id/zones/:zoneId/sunbeds/:sunbedId
// @desc    Update a sunbed status
// @access  Private
router.put('/:id/zones/:zoneId/sunbeds/:sunbedId', protect, beachController.updateSunbedStatus.bind(beachController));

export default router;
