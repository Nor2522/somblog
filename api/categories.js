const { connectToDatabase } = require('../lib/mongodb');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const categories = await db
      .collection('posts')
      .distinct('category', { published: true, category: { $ne: '' } });

    return res.status(200).json({ categories: categories.sort() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
