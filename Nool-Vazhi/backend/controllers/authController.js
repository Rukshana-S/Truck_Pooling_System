const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { createNotification } = require('../services/notificationService');

const notifyAdmins = async (req, title, message, category, link) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    if (admins.length > 0) {
      const adminIds = admins.map(a => a._id);
      await createNotification(req, adminIds, {
        title,
        message,
        type: 'INFO',
        category,
        priority: 'Medium',
        link,
        recipientRole: 'admin'
      });
    }
  } catch (e) {
    console.error('Failed to notify admins', e);
  }
};

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const respond = (user, res, status = 200) => {
  res.status(status).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
  });
};

const registerOrg = async (req, res) => {
  const { name, phone, email, location, businessName, gst, industry, password } = req.body;
  try {
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already registered' });
    if (await User.findOne({ phone })) return res.status(400).json({ message: 'Phone number already registered' });
    const kyc = {};
    if (req.files?.orgProof?.[0]) { const f = req.files.orgProof[0]; kyc.orgProof = { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}`, publicId: f.originalname }; }
    if (req.files?.gstCertificate?.[0]) { const f = req.files.gstCertificate[0]; kyc.gstCertificate = { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}`, publicId: f.originalname }; }
    if (req.files?.aadharDoc?.[0]) { const f = req.files.aadharDoc[0]; kyc.aadharDoc = { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}`, publicId: f.originalname }; }
    const user = await User.create({ name, phone, email, location, businessName, gst, industry, password, role: 'organization', kyc });
    
    // Notify admin
    await notifyAdmins(req, 'New Organization Registration', `Organization ${businessName || name} has registered and is pending approval.`, 'System', '/admin/users');
    
    respond(user, res, 201);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const registerDriver = async (req, res) => {
  const { name, phone, email, location, licenseNumber, vehicleType, vehicleNumber, capacityValue, capacityUnit, fuelType, availability, currentLocation, password } = req.body;
  try {
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already registered' });
    if (await User.findOne({ phone })) return res.status(400).json({ message: 'Phone number already registered' });
    const kyc = {};
    if (req.files?.licenseDoc?.[0]) { const f = req.files.licenseDoc[0]; kyc.licenseDoc = { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}`, publicId: f.originalname }; }
    if (req.files?.insuranceDoc?.[0]) { const f = req.files.insuranceDoc[0]; kyc.insuranceDoc = { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}`, publicId: f.originalname }; }
    if (req.files?.aadharDoc?.[0]) { const f = req.files.aadharDoc[0]; kyc.aadharDoc = { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}`, publicId: f.originalname }; }
    
    let parsedCapacity = Number(capacityValue) || 0;
    let unit = capacityUnit || 'kg';
    let vehicleCapacityKg = unit === 'tons' ? parsedCapacity * 1000 : parsedCapacity;

    let parsedLocation = {};
    if (currentLocation) {
      try {
        parsedLocation = typeof currentLocation === 'string' ? JSON.parse(currentLocation) : currentLocation;
      } catch (e) {
        parsedLocation = { raw: currentLocation };
      }
    } else {
      parsedLocation = { raw: location };
    }

    const user = await User.create({ 
      name, phone, email, location, licenseNumber, vehicleType, vehicleNumber, 
      capacity: parsedCapacity, // Legacy
      vehicleCapacity: parsedCapacity,
      vehicleCapacityKg,
      capacityUnit: unit, 
      fuelType: fuelType || '',
      availability: availability || 'Available',
      currentLocation: parsedLocation,
      password, role: 'driver', kyc 
    });
    
    // Notify admin
    await notifyAdmins(req, 'New Driver Registration', `Driver ${name} has registered and is pending KYC verification.`, 'System', '/admin/users');
    
    respond(user, res, 201);
  } catch (err) {
    console.error('registerDriver error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const loginOrg = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, role: 'organization' }).select('-kyc');
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
    respond(user, res);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const loginDriver = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, role: 'driver' }).select('-kyc');
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
    respond(user, res);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -kyc');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const fields = ['name', 'phone', 'location', 'businessName', 'gst', 'industry', 'licenseNumber', 'vehicleType', 'vehicleNumber', 'fuelType', 'availability'];
    fields.forEach(f => { if (req.body[f] !== undefined) user[f] = req.body[f]; });
    
    if (req.body.capacityUnit !== undefined) user.capacityUnit = req.body.capacityUnit;
    if (req.body.capacityValue !== undefined) {
      let parsedCapacity = Number(req.body.capacityValue) || 0;
      let unit = user.capacityUnit || 'kg';
      let vehicleCapacityKg = unit === 'tons' ? parsedCapacity * 1000 : parsedCapacity;
      
      user.capacity = parsedCapacity; // Legacy fallback
      user.vehicleCapacity = parsedCapacity;
      user.vehicleCapacityKg = vehicleCapacityKg;
    }

    if (req.body.currentLocation) {
      try {
        user.currentLocation = typeof req.body.currentLocation === 'string' ? JSON.parse(req.body.currentLocation) : req.body.currentLocation;
      } catch (e) {
        user.currentLocation = { raw: req.body.currentLocation };
      }
    }

    await user.save();
    res.json({
      _id: user._id, name: user.name, phone: user.phone, email: user.email,
      location: user.location, role: user.role, businessName: user.businessName,
      gst: user.gst, industry: user.industry, licenseNumber: user.licenseNumber,
      vehicleType: user.vehicleType, vehicleNumber: user.vehicleNumber,
      capacity: user.capacity, capacityUnit: user.capacityUnit, kycStatus: user.kycStatus,
      vehicleCapacity: user.vehicleCapacity, vehicleCapacityKg: user.vehicleCapacityKg,
      fuelType: user.fuelType, availability: user.availability, currentLocation: user.currentLocation
    });

    // Notify self
    await createNotification(req, user._id, {
      title: 'Profile Updated',
      message: 'Your profile has been successfully updated.',
      type: 'SUCCESS',
      category: 'System',
      priority: 'Low',
      link: '/profile',
      recipientRole: user.role
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET + user.password, { expiresIn: '15m' });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${user._id}/${resetToken}`;
    let transporter;
    if (process.env.EMAIL_PASS && process.env.EMAIL_PASS !== 'your_gmail_app_password') {
      transporter = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }, tls: { rejectUnauthorized: true } });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, auth: { user: testAccount.user, pass: testAccount.pass } });
    }
    const info = await transporter.sendMail({
      from: `"Nool-Vazhi" <${process.env.EMAIL_USER || 'noreply@nool-vazhi.in'}>`,
      to: user.email,
      subject: 'Reset Your Password — Nool-Vazhi',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px"><h2 style="color:#1E3A8A">Nool-Vazhi Password Reset</h2><p>Hi <strong>${user.name}</strong>,</p><p>Click below to reset your password. Expires in <strong>15 minutes</strong>.</p><a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#F97316;color:white;border-radius:8px;text-decoration:none;font-weight:700">Reset Password</a><p style="color:#64748b;font-size:13px">Or copy: ${resetUrl}</p></div>`,
    });
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      return res.json({ message: 'Reset link generated.', previewUrl: nodemailer.getTestMessageUrl(info), resetUrl });
    }
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ message: 'Failed to send email. Try again.' });
  }
};

const resetPassword = async (req, res) => {
  const { userId, token } = req.params;
  const { password } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Invalid link' });
    jwt.verify(token, process.env.JWT_SECRET + user.password);
    user.password = password;
    await user.save();
    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(400).json({ message: 'Reset link is invalid or expired' });
  }
};

const Trip = require('../models/Trip');
const Shipment = require('../models/Shipment');

const deleteVehicle = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'driver') return res.status(403).json({ message: 'Unauthorized' });

    // Business rule: Prevent deleting a vehicle if it is assigned to an active shipment/trip
    const activeTrips = await Trip.countDocuments({ driver: user._id, status: { $in: ['ACTIVE', 'FULL'] }, isDeleted: { $ne: true } });
    if (activeTrips > 0) return res.status(400).json({ message: 'Cannot delete vehicle while you have active trips.' });

    const activeShipments = await Shipment.countDocuments({ driver: user._id, status: { $in: ['Pickup Confirmed', 'In Transit', 'Out for Delivery'] }, isDeleted: { $ne: true } });
    if (activeShipments > 0) return res.status(400).json({ message: 'Cannot delete vehicle while you have active shipments.' });

    user.vehicleType = '';
    user.vehicleNumber = '';
    user.capacity = 0;
    user.vehicleCapacity = 0;
    user.vehicleCapacityKg = 0;
    user.capacityUnit = 'kg';
    user.fuelType = '';
    user.availability = 'Available';
    await user.save();

    res.json({ message: 'Vehicle deleted successfully', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const replaceDocument = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check which document is being replaced
    const docKeys = ['licenseDoc', 'insuranceDoc', 'aadharDoc', 'orgProof', 'gstCertificate'];
    let replaced = false;

    for (const key of docKeys) {
      if (req.files?.[key]?.[0]) {
        const f = req.files[key][0];
        const newUrl = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`;
        const newPublicId = f.originalname;

        // Save old to history if exists
        if (user.kyc[key] && user.kyc[key].url) {
          user.docHistory.push({
            docType: key,
            url: user.kyc[key].url,
            publicId: user.kyc[key].publicId,
          });
        }

        user.kyc[key] = { url: newUrl, publicId: newPublicId };
        replaced = true;
      }
    }

    if (!replaced) return res.status(400).json({ message: 'No valid document uploaded.' });

    await user.save();
    res.json({ message: 'Document replaced successfully', kyc: user.kyc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { registerOrg, registerDriver, loginOrg, loginDriver, getProfile, updateProfile, forgotPassword, resetPassword, deleteVehicle, replaceDocument };
