const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @desc    Register new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid credentials');
  }
};

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  res.status(200).json(req.user);
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    user.companyName = req.body.companyName || user.companyName;
    if (req.body.companyAddress != null) {
      user.companyAddress = String(req.body.companyAddress || '');
    }
    if (req.body.companyEmail != null) {
      user.companyEmail = String(req.body.companyEmail || '');
    }
    if (req.body.companyPhone != null) {
      user.companyPhone = String(req.body.companyPhone || '');
    }
    if (req.body.companyTaxId != null) {
      user.companyTaxId = String(req.body.companyTaxId || '');
    }
    if (req.file) {
      user.companyLogo = req.file.path;
    }

    if (user.invoiceDefaults == null) {
      user.invoiceDefaults = {};
    }

    if (req.body.defaultTaxName != null) {
      user.invoiceDefaults.defaultTaxName = String(req.body.defaultTaxName || '').trim() || user.invoiceDefaults.defaultTaxName;
    }

    if (req.body.defaultTaxRate != null) {
      const n = Number(req.body.defaultTaxRate);
      if (!Number.isNaN(n) && n >= 0 && n <= 100) {
        user.invoiceDefaults.defaultTaxRate = n;
      }
    }

    if (req.body.taxMode != null) {
      const mode = String(req.body.taxMode || '').toLowerCase();
      if (mode === 'invoice' || mode === 'line') {
        user.invoiceDefaults.taxMode = mode;
      }
    }

    if (req.body.paymentTermsDays != null) {
      const n = Number(req.body.paymentTermsDays);
      if (!Number.isNaN(n) && n >= 0 && n <= 365) {
        user.invoiceDefaults.paymentTermsDays = n;
      }
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      companyName: updatedUser.companyName,
      companyAddress: updatedUser.companyAddress,
      companyEmail: updatedUser.companyEmail,
      companyPhone: updatedUser.companyPhone,
      companyTaxId: updatedUser.companyTaxId,
      companyLogo: updatedUser.companyLogo,
      invoiceDefaults: updatedUser.invoiceDefaults,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

// Generate JWT
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateUserProfile,
};
