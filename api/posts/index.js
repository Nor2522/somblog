const { connectToDatabase } = require('../../lib/mongodb');
const { getAdminFromRequest } = require('../../lib/auth');
const { slugify } = require('../../lib/slug');
const { estimateReadingMinutes } = require('../../lib/readingTime');

module.exports = async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const posts = db.collection('posts');

    if (req.method === 'GET') {
      const admin = getAdminFromRequest(req);
      const { q, category, limit, skip } = req.query;

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

      const total = await posts.countDocuments(filter);

      // Sorting by createdAt alone isn't guaranteed stable when two posts
      // share the same timestamp (e.g. created within the same
      // millisecond); _id is unique and monotonically increasing, so it
      // makes pagination deterministic - no posts skipped or repeated
      // across "load more" pages.
      let cursor = posts
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .project({ content: 0 }); // list view doesn't need the full body

      const skipNum = parseInt(skip, 10);
      const limitNum = parseInt(limit, 10);

      // limit/skip are optional - the admin dashboard calls this endpoint
      // without them and still gets everything, as before.
      if (!Number.isNaN(skipNum) && skipNum > 0) cursor = cursor.skip(skipNum);
      if (!Number.isNaN(limitNum) && limitNum > 0) cursor = cursor.limit(limitNum);

      const results = await cursor.toArray();

      return res.status(200).json({ posts: results, total });
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
        readingMinutes: estimateReadingMinutes(content),
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
