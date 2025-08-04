const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const {
    startVerification,
    verifyPlatform,
    getConnectedPlatforms,
    disconnectPlatform,
    refreshPlatformData
} = require('../controllers/platformController');

router.use(verifyToken);

router.get('/', getConnectedPlatforms);
router.post('/verify/start', startVerification);
router.post('/verify/complete', verifyPlatform);
router.put('/:platform/refresh', refreshPlatformData);
router.delete('/:platform', disconnectPlatform)

module.exports = router;
