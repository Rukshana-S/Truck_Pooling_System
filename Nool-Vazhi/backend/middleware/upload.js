const multer = require('multer');

// Store files in memory as buffer, convert to base64 and save in MongoDB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and PDF files are allowed'), false);
    }
    cb(null, true);
  },
});

// Middleware wrapper that converts multer errors into clean JSON 400 responses
const handleUploadErrors = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB per file.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: `Unexpected file field: ${err.field}` });
    }
    return res.status(400).json({ message: err.message || 'File upload error' });
  });
};

module.exports = { upload, handleUploadErrors };
