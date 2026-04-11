const { getRepository } = require('../database');

async function getAllPosts() {
  const repository = getRepository();
  return repository.getAllPosts();
}

async function createPost({ authorId, type, content, media }) {
  const repository = getRepository();
  return repository.createPost({
    id: require('crypto').randomUUID(),
    authorId,
    type,
    content: content.trim(),
    media: media || '',
    likes: 0,
    likedBy: [],
    createdAt: new Date().toISOString()
  });
}

async function togglePostLike(postId, userId) {
  const repository = getRepository();
  return repository.togglePostLike(postId, userId);
}

module.exports = {
  getAllPosts,
  createPost,
  togglePostLike
};
