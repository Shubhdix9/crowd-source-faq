import { Router } from 'express';
import { adminOnly } from '../middleware/admin';
import {
  getStats,
  getFaqGrowth,
  getTopCategories,
  getSearchInsights,
  getUsers,
  getAdminFAQs,
  approveFAQ,
  rejectFAQ,
  updateFAQ,
  deleteFAQ,
  createFAQ,
  getReports,
  getActivityFeed,
  getUserActivityChart,
  getCommunityPosts,
  deleteCommunityPost,
} from '../controllers/adminController';
import {
  getUnresolvedSearches,
  resolveUnresolved,
  getUnresolvedStats,
} from '../controllers/unresolvedSearchController';
import {
  getEscalated,
  verifyEscalatedFAQ,
  dismissEscalatedFAQ,
} from '../controllers/freshnessController';

const router = Router();

router.use(adminOnly);

router.get('/stats', getStats);
router.get('/faq-growth', getFaqGrowth);
router.get('/top-categories', getTopCategories);
router.get('/search-insights', getSearchInsights);
router.get('/users', getUsers);
router.get('/faqs', getAdminFAQs);
router.get('/reports', getReports);
router.get('/activity-feed', getActivityFeed);
router.get('/user-activity-chart', getUserActivityChart);
router.get('/community/posts', getCommunityPosts);

// Unresolved search management
router.get('/search/unresolved-list',         getUnresolvedSearches);
router.get('/search/unresolved-stats',        getUnresolvedStats);
router.patch('/search/unresolved/:id/resolve', resolveUnresolved);

// Escalated FAQ management (freshness system)
router.get('/escalated',                       getEscalated);
router.post('/escalated/:id/verify',           verifyEscalatedFAQ);
router.post('/escalated/:id/dismiss',          dismissEscalatedFAQ);

router.post('/faq', createFAQ);
router.post('/faq/approve', approveFAQ);
router.post('/faq/reject', rejectFAQ);
router.put('/faq/:id', updateFAQ);
router.delete('/faq/:id', deleteFAQ);
router.delete('/community/:id', deleteCommunityPost);

export default router;