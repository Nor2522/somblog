const { connectToDatabase } = require('../../lib/mongodb');
const { getAdminFromRequest } = require('../../lib/auth');
const { slugify } = require('../../lib/slug');

module.exports = async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const posts = db.collection('posts');

    if (req.method === 'GET') {
      const admin = getAdminFromRequest(req);
      const { q, category } = req.query;

      const filter = {};

      // Visitors only ever see published posts. The admin dashboard sees
      // everything, including drafts, when a valid session cookie is sent.
      if (!admin) {
        filter.published = true;
      }

      if (category) {
        filter.category = category;
      }

      if (q) {
        filter.$text = { $search: q };
      }

      const results = await posts
        .find(filter)
        .sort({ createdAt: -1 })
        .project({ content: 0 }) // list view doesn't need the full body
        .toArray();

      return res.status(200).json({ posts: results });
    }

    if (req.method === 'POST') {
      const admin = getAdminFromRequest(req);
      if (!admin) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { title, excerpt, content, category, tags, coverImage, published } = req.body || {};

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      let slug = slugify(title);
      if (!slug) slug = `post-${Date.now()}`;

      const existing = await posts.findOne({ slug });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      const now = new Date();

      const doc = {
        title: String(title).trim(),
        slug,
        excerpt: excerpt ? String(excerpt).trim() : '',
        content: String(content),
        category: category ? String(category).trim() : '',
        tags: Array.isArray(tags)
          ? tags
          : tags
          ? String(tags).split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        coverImage: coverImage ? String(coverImage).trim() : '',
        published: published !== undefined ? Boolean(published) : true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await posts.insertOne(doc);

      return res.status(201).json({ post: { ...doc, _id: result.insertedId } });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
