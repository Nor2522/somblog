const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../../../lib/mongodb');

// Accepts either the post's _id or its slug, same convention as
// api/posts/[id].js.
function buildLookup(id) {
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
    return { _id: new ObjectId(id) };
  }
  return { slug: id };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const ratingNum = Number((req.body || {}).rating);

  if (!id) {
    return res.status(400).json({ error: 'Missing post identifier' });
  }

  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5' });
  }

  try {
    const { db } = await connectToDatabase();
    const posts = db.collection('posts');
    const lookup = buildLookup(id);

    // Only published posts can be rated by the public.
    const existing = await posts.findOne({ ...lookup, published: true });
    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await posts.updateOne(
      { _id: existing._id },
      { $inc: { ratingSum: ratingNum, ratingCount: 1 } }
    );

    const updated = await posts.findOne({ _id: existing._id });
    const count = updated.ratingCount || 0;
    const average = count > 0 ? updated.ratingSum / count : 0;

    return res.status(200).json({ average, count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
