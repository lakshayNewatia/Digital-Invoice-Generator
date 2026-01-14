const Client = require('../models/Client');

// @desc    Get clients
// @route   GET /api/clients
// @access  Private
const getClients = async (req, res) => {
  const clients = await Client.find({ user: req.user.id });
  res.status(200).json(clients);
};

// @desc    Set client
// @route   POST /api/clients
// @access  Private
const setClient = async (req, res) => {
  const { name, email, address, phone, taxId, isTaxExempt } = req.body;

  if (!name || !email) {
    res.status(400);
    throw new Error('Please add name and email');
  }

  const client = await Client.create({
    user: req.user.id,
    name,
    email,
    address,
    phone,
    taxId: taxId || '',
    isTaxExempt: Boolean(isTaxExempt),
  });

  res.status(201).json(client);
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
const updateClient = async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    res.status(400);
    throw new Error('Client not found');
  }

  // Check for user
  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  // Make sure the logged in user matches the client user
  if (client.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized');
  }

  const patch = { ...req.body };
  if (patch.taxId != null) patch.taxId = String(patch.taxId || '');
  if (patch.isTaxExempt != null) patch.isTaxExempt = Boolean(patch.isTaxExempt);

  const updatedClient = await Client.findByIdAndUpdate(req.params.id, patch, {
    new: true,
  });

  res.status(200).json(updatedClient);
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private
const deleteClient = async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    res.status(400);
    throw new Error('Client not found');
  }

  // Check for user
  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  // Make sure the logged in user matches the client user
  if (client.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized');
  }

  await Client.findByIdAndDelete(req.params.id);

  res.status(200).json({ id: req.params.id });
};

module.exports = {
  getClients,
  setClient,
  updateClient,
  deleteClient,
};
