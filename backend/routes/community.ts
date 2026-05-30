import { Router } from 'express';
import {
  getAllPosts,
  getPostById,
  createPost,
  toggleUpvote,
  addComment,
  resolvePost,
  deletePost,
  toggleCommentUpvote,
  toggleCommentDownvote,
  verifyComment,
  getSolvedPosts,
  getAnswersList,
  requestExpertHelp,
  reportPost,
  checkDuplicateController,
} from '../controllers/communityController.js';
import { searchCommunityPosts } from '../controllers/communitySearchController.js';
import { getReviewQueue } from '../controllers/freshnessController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/search', protect, searchCommunityPosts);
router.get('/review-queue', getReviewQueue); // public — any visitor can see pending FAQs
router.get('/solved', getSolvedPosts); // public endpoint for "Top Solved Today" widget
router.get('/answers/list', protect, getAnswersList); // paginated expert answers feed

router.get('/', protect, getAllPosts);
router.post('/check-duplicate', protect, checkDuplicateController);
router.get('/:id', protect, getPostById);
router.post('/', protect, createPost);
router.post('/:id/upvote', protect, toggleUpvote);
router.post('/:id/comments', protect, addComment);
router.post('/:id/comments/:commentId/upvote', protect, toggleCommentUpvote);
router.post('/:id/comments/:commentId/downvote', protect, toggleCommentDownvote);
router.patch('/:id/comments/:commentId/verify', protect, authorize('admin', 'moderator'), verifyComment);
router.patch('/:id/resolve', protect, resolvePost);
router.post('/:id/request-expert', protect, requestExpertHelp);
router.post('/:id/report', protect, reportPost);
router.delete('/:id', protect, authorize('admin', 'moderator'), deletePost);

export default router;