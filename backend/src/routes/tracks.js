const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/tracks
 * List all tracks with optional filtering and sorting
 * Query params:
 *   - status: filter by status (pending|downloading|downloaded|failed|ignored)
 *   - source: filter by source (loved|album|playlist)
 *   - sort: sort field (created_at|artist|title)
 *   - order: sort order (asc|desc)
 *   - page: page number (default: 1)
 *   - limit: max results per page (default: 50)
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      source,
      sort = 'created_at',
      order = 'desc',
      page = 1,
      limit = 50,
    } = req.query;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (source) whereClause.source = source;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(parseInt(limit) || 50, 500);
    const skip = (pageNum - 1) * limitNum;

    const tracks = await prisma.track.findMany({
      where: whereClause,
      orderBy: {
        [sort]: order.toLowerCase() === 'asc' ? 'asc' : 'desc',
      },
      take: limitNum,
      skip,
    });

    const total = await prisma.track.count({ where: whereClause });

    res.json({
      data: tracks,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

/**
 * PATCH /api/tracks/:id/ignore
 * Mark a track as ignored
 */
router.patch('/:id/ignore', async (req, res) => {
  try {
    const { id } = req.params;

    const track = await prisma.track.update({
      where: { id: parseInt(id) },
      data: { status: 'ignored' },
    });

    res.json(track);
  } catch (error) {
    console.error('Error ignoring track:', error);
    res.status(500).json({ error: 'Failed to ignore track' });
  }
});

/**
 * PATCH /api/tracks/:id/unignore
 * Revert an ignored track to pending
 */
router.patch('/:id/unignore', async (req, res) => {
  try {
    const { id } = req.params;

    const track = await prisma.track.update({
      where: { id: parseInt(id) },
      data: { status: 'pending' },
    });

    res.json(track);
  } catch (error) {
    console.error('Error un-ignoring track:', error);
    res.status(500).json({ error: 'Failed to un-ignore track' });
  }
});

module.exports = router;
