const express = require('express');
const router = express.Router();
const { registerOrg, registerDriver, loginOrg, loginDriver, getProfile, updateProfile, forgotPassword, resetPassword, deleteVehicle, replaceDocument } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { upload, handleUploadErrors } = require('../middleware/upload');

router.post('/register/organization',
  handleUploadErrors(upload.fields([
    { name: 'orgProof', maxCount: 1 },
    { name: 'gstCertificate', maxCount: 1 },
    { name: 'aadharDoc', maxCount: 1 },
  ])),
  registerOrg
);

router.post('/register/driver',
  handleUploadErrors(upload.fields([
    { name: 'licenseDoc', maxCount: 1 },
    { name: 'insuranceDoc', maxCount: 1 },
    { name: 'aadharDoc', maxCount: 1 },
  ])),
  registerDriver
);

router.post('/login/organization', loginOrg);
router.post('/login/driver', loginDriver);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:userId/:token', resetPassword);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.delete('/profile/vehicle', protect, deleteVehicle);
router.put('/profile/document', protect, handleUploadErrors(upload.fields([
  { name: 'licenseDoc', maxCount: 1 },
  { name: 'insuranceDoc', maxCount: 1 },
  { name: 'aadharDoc', maxCount: 1 },
  { name: 'orgProof', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
])), replaceDocument);

module.exports = router;
