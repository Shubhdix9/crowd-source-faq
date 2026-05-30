import { Request, Response } from 'express';
import { Types } from 'mongoose';
import FAQ, { type IFAQ } from '../models/FAQ.js';
import { generateEmbedding } from '../utils/embeddings.js';
import { logger } from '../utils/logger.js';
import { invalidateCache } from '../utils/cache.js';
import { createTeaDropsForFAQ } from './teaNotificationController.js';
import FreshReviewVote from '../models/FreshReviewVote.js';
import FreshReviewLog, { type FreshReviewEventType } from '../models/FreshReviewLog.js';

async function logFreshEvent(
  event: FreshReviewEventType,
  faqId: Types.ObjectId | string,
  metadata: Record<string, unknown>
) {
  try {
    await FreshReviewLog.create({ event, faqId, metadata });
  } catch (e) {
    logger.warn(`FreshReviewLog failed: ${(e as Error).message}`);
  }
}

// Query params interface for getAllFAQs
interface GetAllFAQsQuery {
  page?: string;
  limit?: string;
  category?: string;
}

// Query params interface for getPaginatedFAQs
interface GetPaginatedFAQsQuery {
  page?: string;
  limit?: string;
  category?: string;
}

// Body interface for checkFAQMatch
interface CheckFAQMatchBody {
  query?: string;
}

// Response type for grouped FAQs
interface GroupedFAQs {
  [category: string]: Array<{
    _id: IFAQ['_id'];
    question: string;
    answer: string;
    createdAt: Date;
  }>;
}

// GET /api/faq — All FAQs grouped by category (with optional pagination)
// Query params: page (default 1), limit (default 0=all), category (filter by category)
export const getAllFAQs = async (req: Request<{}, {}, {}, GetAllFAQsQuery>, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1'));
    const limitVal = req.query.limit ?? '0';
    const limit = Math.max(0, parseInt(limitVal)); // 0 = no limit (full grouped response)
    const category = req.query.category || '';

    const query: Record<string, string> = {};
    if (category) query.category = category;

    const totalCount = await FAQ.countDocuments(query);

    // When limit=0 (default), return all FAQs grouped — backward-compatible behavior
    const faqs = await FAQ.find(query)
      .select('-embedding')
      .sort({ category: 1, createdAt: 1 })
      .limit(limit > 0 ? limit : undefined as unknown as number)
      .skip(limit > 0 ? (page - 1) * limit : 0);

    // If pagination requested, return flat paginated list
    if (limit > 0) {
      const faqItems = faqs.map((faq) => ({
        _id: faq._id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        createdAt: faq.createdAt,
        source: 'faq',
      }));
      res.json({
        faqs: faqItems,
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      });
      return;
    }

    // Default: return grouped object (backward compatible)
    const grouped = faqs.reduce<GroupedFAQs>((acc, faq) => {
      if (!acc[faq.category]) acc[faq.category] = [];
      acc[faq.category].push({
        _id: faq._id,
        question: faq.question,
        answer: faq.answer,
        createdAt: faq.createdAt,
      });
      return acc;
    }, {});

    res.json({ grouped, total: totalCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// GET /api/faq/:id — Single FAQ
export const getFAQById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    // 1. Fetch a specific FAQ by its ID, excluding embeddings
    const faq = await FAQ.findById(req.params.id).select('-embedding');
    
    // 2. Return a 404 error if no FAQ matches the ID
    if (!faq) {
      res.status(404).json({ message: 'FAQ not found.' });
      return;
    }
    
    res.json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// GET /api/faq/paginated — Flat paginated list of FAQs with optional category filter
// Query params: page (default 1), limit (default 20), category (optional)
export const getPaginatedFAQs = async (req: Request<{}, {}, {}, GetPaginatedFAQsQuery>, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20')));
    const category = req.query.category || '';
    const skip = (page - 1) * limit;

    const query: Record<string, string> = {};
    if (category) query.category = category;

    const [faqs, total] = await Promise.all([
      FAQ.find(query).select('-embedding').sort({ createdAt: 1 }).skip(skip).limit(limit),
      FAQ.countDocuments(query),
    ]);

    const faqItems = faqs.map((faq) => ({
      _id: faq._id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
      source: 'faq',
    }));

    res.json({
      faqs: faqItems,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasMore: skip + faqs.length < total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// POST /api/faq — Create a new FAQ (Admin/Moderator only)
export const createFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      question, answer, category,
      freshnessTier,
      reviewIntervalDays,
    } = req.body as {
      question?: string; answer?: string; category?: string;
      freshnessTier?: 'evergreen' | 'seasonal' | 'volatile';
      reviewIntervalDays?: number;
    };

    if (!question || !answer || !category) {
      res.status(400).json({ message: 'Question, answer, and category are required.' });
      return;
    }

    // Generate vector embedding for semantic search
    const embedding = await generateEmbedding(`Section: ${category}. Question: ${question}. Answer: ${answer}`);

    const now = new Date();
    const tier = freshnessTier ?? 'evergreen';
    const seasonalDefault = parseInt(process.env['FAQ_SEASONAL_DAYS'] ?? '15');
    const volatileDefault  = parseInt(process.env['FAQ_VOLATILE_DAYS']  ?? '4');

    const interval = reviewIntervalDays
      ?? (tier === 'seasonal' ? seasonalDefault : tier === 'volatile' ? volatileDefault : 0);

    const faq = await FAQ.create({
      question,
      answer,
      category,
      embedding,
      freshnessTier: tier,
      reviewIntervalDays: interval,
      reviewStatus: 'verified',
      lastVerifiedDate: now,
      flaggedAt: null,
      flagType: null,
      flagReason: null,
      flaggedBy: null,
      reviewCycle: 0,
    });

    // Invalidate search cache so new FAQ appears in results immediately
    await invalidateCache();

    // Fan out tea drops to all non-admin users
    createTeaDropsForFAQ(faq._id.toString(), question).catch(console.warn);

    res.status(201).json({ message: 'FAQ created successfully.', faq });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// PUT /api/faq/:id — Update an FAQ (Admin/Moderator only)
export const updateFAQ = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { question, answer, category } = req.body as { question?: string; answer?: string; category?: string };

    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      res.status(404).json({ message: 'FAQ not found.' });
      return;
    }

    if (question) faq.question = question;
    if (answer) faq.answer = answer;
    if (category) faq.category = category;

    // Recalculate embedding if any key field is updated
    if (question || answer || category) {
      faq.embedding = await generateEmbedding(
        `Section: ${faq.category}. Question: ${faq.question}. Answer: ${faq.answer}`
      );
    }

    // Admin edit while under review = re-verification
    if (faq.reviewStatus === 'pending_review' || faq.reviewStatus === 'update_requested') {
      const newCycle = faq.reviewCycle + 1;
      faq.reviewStatus = 'verified';
      faq.lastVerifiedDate = new Date();
      faq.flaggedAt = null;
      faq.flagType = null;
      faq.flagReason = null;
      faq.flaggedBy = null;
      faq.reviewCycle = newCycle;
      await FreshReviewVote.deleteMany({ faqId: faq._id });
      await logFreshEvent('mod_verified', faq._id, { moderatorId: req.user!._id.toString(), reviewCycle: newCycle });
    }

    await faq.save();

    // Invalidate search cache so updated FAQ reflects immediately
    await invalidateCache();

    res.json({ message: 'FAQ updated successfully.', faq });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// DELETE /api/faq/:id — Delete an FAQ (Admin/Moderator only)
export const deleteFAQ = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) {
      res.status(404).json({ message: 'FAQ not found.' });
      return;
    }

    // Invalidate search cache so deleted FAQ is removed from results
    await invalidateCache();

    res.json({ message: 'FAQ deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// POST /api/faq/check-match — Check if a user's question already exists in the FAQ
// Used by the community board to prevent duplicate questions
export const checkFAQMatch = async (req: Request<{}, {}, CheckFAQMatchBody>, res: Response): Promise<void> => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      res.status(400).json({ message: 'query string is required.' });
      return;
    }

    // Generate embedding for the user's question
    const embedding = await generateEmbedding(query.trim());

    // Run vector search against the FAQ collection
    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not ready');
    const collection = db.collection('yaksha_faq_faqs');

    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: embedding,
          numCandidates: 50,
          limit: 3,
        },
      },
      {
        $project: {
          _id: 1,
          question: 1,
          answer: 1,
          category: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    // Check if the top result has a high similarity score (threshold: 0.82)
    const topMatch = results[0] as {
      _id: IFAQ['_id'];
      question: string;
      answer: string;
      category: string;
      score: number;
    } | null;
    const matched = topMatch && topMatch.score >= 0.82;

    res.json({
      matched,
      faq: matched ? {
        _id: topMatch._id,
        question: topMatch.question,
        answer: topMatch.answer,
        category: topMatch.category,
        similarity: topMatch.score,
      } : null,
    });
  } catch (error) {
    logger.error('FAQ match check error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// PATCH /api/faq/:id/feedback — Helpful/unhelpful vote on an FAQ
export const submitFeedback = async (req: Request<{ id: string }, {}, { helpful: boolean }>, res: Response): Promise<void> => {
  try {
    const { helpful } = req.body;
    if (typeof helpful !== 'boolean') {
      res.status(400).json({ message: 'helpful boolean is required' });
      return;
    }
    const faq = await FAQ.findById(req.params.id).select('_id helpfulVotes unhelpfulVotes');
    if (!faq) {
      res.status(404).json({ message: 'FAQ not found' });
      return;
    }
    if (helpful) {
      faq.helpfulVotes = (faq.helpfulVotes ?? 0) + 1;
    } else {
      faq.unhelpfulVotes = (faq.unhelpfulVotes ?? 0) + 1;
    }
    await faq.save();
    res.json({ helpfulVotes: faq.helpfulVotes, unhelpfulVotes: faq.unhelpfulVotes });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/faq/:id/report — Report an FAQ as inaccurate/outdated
export const reportFAQ = async (req: Request<{ id: string }, {}, { reason: string }>, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      res.status(400).json({ message: 'Reason is required.' });
      return;
    }
    if (reason.trim().length < 10) {
      res.status(400).json({ message: 'Please provide a more descriptive reason (min 10 chars).' });
      return;
    }

    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      res.status(404).json({ message: 'FAQ not found.' });
      return;
    }

    // Prevent duplicate reports by the same user
    const alreadyReported = faq.reports.some(
      (r) => r.reportedBy.toString() === req.user!._id.toString()
    );
    if (alreadyReported) {
      res.status(409).json({ message: 'You have already reported this FAQ.' });
      return;
    }

    faq.reports.push({
      reportedBy: req.user!._id,
      reason: reason.trim(),
      createdAt: new Date(),
    });
    await faq.save();

    res.json({ message: 'Report submitted. Thank you for helping keep the FAQ accurate.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};
