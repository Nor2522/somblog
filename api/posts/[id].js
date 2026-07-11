const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../../lib/mongodb');
const { getAdminFromRequest } = require('../../lib/auth');
const { slugify } = require('../../lib/slug');
const { estimateReadingMinutes } = require('../../lib/readingTime');

// The dashboard references posts by their MongoDB _id, while public post
// pages use the friendlier slug. This lets a single endpoint answer to both.
function buildLookup(id) {
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
    return { _id: new ObjectId(id) };
  }
  return { slug: id };
}

module.exports = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing post identifier' });
  }

  try {
    const { db } = await connectToDatabase();
    const posts = db.collection('posts');
    const lookup = buildLookup(id);

    if (req.method === 'GET') {
      const admin = getAdminFromRequest(req);
      const filter = admin ? lookup : { ...lookup, published: true };
      const post = await posts.findOne(filter);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      return res.status(200).json({ post });
    }

    // Every operation below this point requires an admin session.
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'PUT') {
      const existing = await posts.findOne(lookup);
      if (!existing) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const { title, excerpt, content, category, tags, coverImage, published } = req.body || {};
      const update = { updatedAt: new Date() };

      if (title !== undefined) {
        update.title = String(title).trim();
        const newSlugBase = slugify(title);
        if (newSlugBase && newSlugBase !== existing.slug) {
          const clash = await posts.findOne({ slug: newSlugBase, _id: { $ne: existing._id } });
          update.slug = clash ? `${newSlugBase}-${Date.now()}` : newSlugBase;
        }
      }
      if (excerpt !== undefined) update.excerpt = String(excerpt).trim();
      if (content !== undefined) {
        update.content = String(content);
        update.readingMinutes = estimateReadingMinutes(content);
      }
      if (category !== undefined) update.category = String(category).trim();
      if (tags !== undefined) {
        update.tags = Array.isArray(tags)
          ? tags
          : String(tags).split(',').map((t) => t.trim()).filter(Boolean);
      }
      if (coverImage !== undefined) update.coverImage = String(coverImage).trim();
      if (published !== undefined) update.published = Boolean(published);

      await posts.updateOne({ _id: existing._id }, { $set: update });
      const updated = await posts.findOne({ _id: existing._id });

      return res.status(200).json({ post: updated });
    }

    if (req.method === 'DELETE') {
      const result = await posts.deleteOne(lookup);
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
