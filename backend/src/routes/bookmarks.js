const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/bookmarks
 * Return all bookmarked albums
 */
router.get('/', async (req, res) => {
  try {
    const bookmarks = await prisma.albumBookmark.findMany();
    res.json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

/**
 * POST /api/bookmarks
 * Add a new album bookmark { artist, album }
 */
router.post('/', async (req, res) => {
  try {
    const { artist, album } = req.body;
    if (!artist || !album) {
      return res.status(400).json({ error: 'Artist and album are required' });
    }

    const bookmark = await prisma.albumBookmark.create({
      data: { artist, album },
    });

    res.status(201).json(bookmark);
  } catch (error) {
    console.error('Error creating bookmark:', error);
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

/**
 * DELETE /api/bookmarks/:id
 * Remove a bookmark
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.albumBookmark.delete({ where: { id: parseInt(id, 10) } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

module.exports = router;
