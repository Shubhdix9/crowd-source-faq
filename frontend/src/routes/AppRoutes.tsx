import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import { FeatureGate } from '../components/support/FeatureGate';
import MainLayout from '../components/layout/MainLayout';
import AskAIButton from '../components/askai/AskAIButton';
import AccountRoute from './guards/AccountRoute';
import AdminRoute from './guards/AdminRoute';

// User pages
const AccountPage = lazy(() => import('../pages/AccountPage'));
const HomePage = lazy(() => import('../pages/HomePage'));
const FAQPage = lazy(() => import('../pages/FAQPage'));
const CommunityPage = lazy(() => import('../pages/CommunityPage'));
const SavedKnowledgePage = lazy(() => import('../pages/SavedKnowledgePage'));
const BatchPortalPage = lazy(() => import('../pages/BatchPortalPage'));
const SupportIndexPage = lazy(() => import('../pages/SupportIndexPage'));
const NewSupportRequestPage = lazy(() => import('../pages/NewSupportRequestPage'));
const SupportTicketPage = lazy(() => import('../pages/SupportTicketPage'));
const GoldenTicketPage = lazy(() => import('../pages/GoldenTicketPage'));
const WelcomePackagePage = lazy(() => import('../pages/WelcomePackagePage'));
const Yaksha2026_27ProgramPage = lazy(() => import('../pages/Yaksha2026_27ProgramPage'));
const ProgramPortalPage = lazy(() => import('../pages/ProgramPortalPage'));
const ProgramPage = lazy(() => import('../pages/ProgramPage'));

// Admin pages
const AdminDashboard = lazy(() => import('../admin/pages/AdminDashboard'));
const AdminFAQs = lazy(() => import('../admin/pages/AdminFAQs'));
const AdminUsers = lazy(() => import('../admin/pages/AdminUsers'));
const AdminSettings = lazy(() => import('../admin/pages/AdminSettings'));
const AdminCommunity = lazy(() => import('../admin/pages/AdminCommunity'));
const AdminModeration = lazy(() => import('../admin/pages/AdminModeration'));
const AdminUnresolvedSearch = lazy(() => import('../admin/pages/AdminUnresolvedSearch'));
const AdminZoomMeetings = lazy(() => import('../admin/pages/AdminZoomMeetings'));
const AdminZoomInsights = lazy(() => import('../admin/pages/AdminZoomInsights'));
const AdminDocumentInsights = lazy(() => import('../admin/pages/AdminDocumentInsights'));
const AdminAISettings = lazy(() => import('../admin/pages/AdminAISettings'));
const FaqReview = lazy(() => import('../admin/pages/FaqReview'));
const AdminAutoAnswerQueue = lazy(() => import('../admin/pages/AdminAutoAnswerQueue'));
const AdminFAQAudit = lazy(() => import('../admin/pages/AdminFAQAudit'));
const AdminBatches = lazy(() => import('../admin/pages/AdminBatches'));
const AdminProgramSettingsPage = lazy(() => import('../admin/pages/AdminProgramSettingsPage'));
const AdminDynamicCategoriesPage = lazy(() => import('../admin/pages/AdminDynamicCategoriesPage'));
const AdminCoursesPage = lazy(() => import('../admin/pages/AdminCoursesPage'));
const AdminProgramDashboard = lazy(() => import('../admin/pages/AdminProgramDashboard'));
const AdminProgramDetail = lazy(() => import('../admin/pages/AdminProgramDetail'));
const AdminSupportInbox = lazy(() => import('../admin/pages/AdminSupportInbox'));
const AdminSupportTicket = lazy(() => import('../admin/pages/AdminSupportTicket'));
const AdminSupportGuidance = lazy(() => import('../admin/pages/AdminSupportGuidance'));
const AdminSupportAnalytics = lazy(() => import('../admin/pages/AdminSupportAnalytics'));
const AdminSupportCategories = lazy(() => import('../admin/pages/AdminSupportCategories'));
const AdminGoldenTickets = lazy(() => import('../admin/pages/AdminGoldenTickets'));
const AdminFeatures = lazy(() => import('../admin/pages/AdminFeatures'));
const AdminWelcomePage = lazy(() => import('../admin/pages/AdminWelcomePage'));
const AdminZoomAssessmentsPage = lazy(() => import('../admin/pages/AdminZoomAssessmentsPage'));
const AdminZoomQuestionsPage = lazy(() => import('../admin/pages/AdminZoomQuestionsPage'));
const AdminProjectsPage = lazy(() => import('../admin/pages/AdminProjectsPage'));
const AdminLayout = lazy(() => import('../admin/components/layout/AdminLayout'));
const AppSettingsAdminRouter = lazy(() => import('../admin/pages/AdminSettings').then(m => ({ default: m.default }))); // Wait, let's verify where appSettings router was imported. It was imported from app-settings.routes in App.tsx! Let's double check that below.

export default function AppRoutes() {
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  const showAskAI = !location.pathname.startsWith('/admin');

  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><Spinner size="md" /></div>}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/programs" element={<ProgramPortalPage />} />
            <Route path="/explore/select" element={<Navigate to="/programs" replace />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/faq/:id" element={<FAQPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/saved" element={<SavedKnowledgePage />} />
            <Route path="/support" element={<SupportIndexPage />} />
            <Route path="/support/new" element={<NewSupportRequestPage />} />
            <Route path="/support/:id" element={<SupportTicketPage />} />
            <Route
              path="/golden"
              element={
                <FeatureGate featureKey="goldenTicket" featureLabel="Golden Ticket">
                  <GoldenTicketPage />
                </FeatureGate>
              }
            />
            <Route path="/program/:slug" element={<ProgramPage />} />
            <Route
              path="/account"
              element={
                <AccountRoute>
                  <AccountPage />
                </AccountRoute>
              }
            />
            <Route
              path="/welcome"
              element={
                <AccountRoute>
                  <WelcomePackagePage />
                </AccountRoute>
              }
            />
          </Route>

          <Route
            path="/admin/login"
            element={<Navigate to="/?next=/admin" replace />}
          />
          <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
          <Route path="/admin/faqs" element={<AdminRoute><AdminLayout><AdminFAQs /></AdminLayout></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminLayout><AdminSettings /></AdminLayout></AdminRoute>} />
          <Route path="/admin/community" element={<AdminRoute><AdminLayout><AdminCommunity /></AdminLayout></AdminRoute>} />
          <Route path="/admin/moderation" element={<AdminRoute><AdminLayout><AdminModeration /></AdminLayout></AdminRoute>} />
          <Route path="/admin/unresolved-search" element={<AdminRoute><AdminLayout><AdminUnresolvedSearch /></AdminLayout></AdminRoute>} />
          <Route path="/admin/zoom-meetings" element={<AdminRoute><AdminLayout><AdminZoomMeetings /></AdminLayout></AdminRoute>} />
          <Route path="/admin/zoom-insights" element={<AdminRoute><AdminLayout><AdminZoomInsights /></AdminLayout></AdminRoute>} />
          <Route path="/admin/document-insights" element={<AdminRoute><AdminLayout><AdminDocumentInsights /></AdminLayout></AdminRoute>} />
          <Route path="/admin/settings/ai" element={<AdminRoute><AdminLayout><AdminAISettings /></AdminLayout></AdminRoute>} />
          <Route path="/admin/faqs/review" element={<AdminRoute><AdminLayout><FaqReview /></AdminLayout></AdminRoute>} />
          <Route path="/admin/welcome" element={<AdminRoute><AdminLayout><AdminWelcomePage /></AdminLayout></AdminRoute>} />
          <Route path="/admin/zoom" element={<AdminRoute><AdminLayout><AdminZoomAssessmentsPage /></AdminLayout></AdminRoute>} />
          <Route path="/admin/zoom/questions" element={<AdminRoute><AdminLayout><AdminZoomQuestionsPage /></AdminLayout></AdminRoute>} />
          <Route path="/admin/projects" element={<AdminRoute><AdminLayout><AdminProjectsPage /></AdminLayout></AdminRoute>} />
          <Route path="/admin/auto-answer" element={<AdminRoute><AdminLayout><AdminAutoAnswerQueue /></AdminLayout></AdminRoute>} />
          <Route path="/admin/faq-audit" element={<AdminRoute><AdminLayout><AdminFAQAudit /></AdminLayout></AdminRoute>} />
          <Route path="/admin/batches" element={<AdminRoute><AdminLayout><AdminBatches /></AdminLayout></AdminRoute>} />
          <Route path="/admin/courses" element={<AdminRoute><AdminLayout><AdminCoursesPage /></AdminLayout></AdminRoute>} />
          <Route path="/admin/programs/:id/settings" element={<AdminRoute><AdminLayout><AdminProgramSettingsPage /></AdminLayout></AdminRoute>} />
          <Route path="/admin/programs/:id/categories" element={<AdminRoute><AdminLayout><AdminDynamicCategoriesPage /></AdminLayout></AdminRoute>} />
          <Route path="/admin/programs" element={<AdminRoute><AdminLayout><AdminProgramDashboard /></AdminLayout></AdminRoute>} />
          <Route path="/admin/programs/:id" element={<AdminRoute><AdminLayout><AdminProgramDetail /></AdminLayout></AdminRoute>} />

          <Route path="/admin/support" element={<AdminRoute><AdminLayout><AdminSupportInbox /></AdminLayout></AdminRoute>} />
          <Route path="/admin/support/analytics" element={<AdminRoute><AdminLayout><AdminSupportAnalytics /></AdminLayout></AdminRoute>} />
          <Route path="/admin/support/guidance" element={<AdminRoute><AdminLayout><AdminSupportGuidance /></AdminLayout></AdminRoute>} />
          <Route path="/admin/support/categories" element={<AdminRoute><AdminLayout><AdminSupportCategories /></AdminLayout></AdminRoute>} />
          <Route path="/admin/golden-tickets" element={<AdminRoute><AdminLayout><AdminGoldenTickets /></AdminLayout></AdminRoute>} />
          <Route path="/admin/support/:id" element={<AdminRoute><AdminLayout><AdminSupportTicket /></AdminLayout></AdminRoute>} />

          <Route path="/admin/features" element={<AdminRoute><AdminLayout><AdminFeatures /></AdminLayout></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {showAskAI && <AskAIButton />}
    </>
  );
}
