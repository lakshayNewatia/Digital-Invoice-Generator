const Item = require('../models/Item');

// @desc    Get items
// @route   GET /api/items
// @access  Private
const getItems = async (req, res) => {
  const items = await Item.find({ user: req.user.id });
  res.status(200).json(items);
};

// @desc    Set item
// @route   POST /api/items
// @access  Private
const setItem = async (req, res) => {
  const { description, quantity, price } = req.body;

  if (!description || !quantity || !price) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  const item = await Item.create({
    user: req.user.id,
    description,
    quantity,
    price,
  });

  res.status(201).json(item);
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private
const updateItem = async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    res.status(400);
    throw new Error('Item not found');
  }

  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  if (String(item.user) !== String(req.user.id)) {
    res.status(401);
    throw new Error('User not authorized');
  }

  const updatedItem = await Item.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, req.body, {
    new: true,
  });

  if (!updatedItem) {
    res.status(404);
    throw new Error('Item not found');
  }

  res.status(200).json(updatedItem);
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
const deleteItem = async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    res.status(400);
    throw new Error('Item not found');
  }

  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  if (String(item.user) !== String(req.user.id)) {
    res.status(401);
    throw new Error('User not authorized');
  }

  const deleted = await Item.findOneAndDelete({ _id: req.params.id, user: req.user.id });

  if (!deleted) {
    res.status(404);
    throw new Error('Item not found');
  }

  res.status(200).json({ id: req.params.id });
};

module.exports = {
  getItems,
  setItem,
  updateItem,
  deleteItem,
};
