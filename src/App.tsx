import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import AboutUs from "./pages/AboutUs";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import Flashcards from "./pages/Flashcards";
import Notes from "./pages/Notes";
import StudyChat from "./pages/StudyChat";
import Analytics from "./pages/Analytics";
import StudyPlan from "./pages/StudyPlan";
import ExamSimulation from "./pages/ExamSimulation";
import StudyGuides from "./pages/StudyGuides";
import PastPaperVault from "./pages/PastPaperVault";
import Admin from "./pages/Admin";
import TeacherCommandCentre from "./pages/TeacherCommandCentre";
import OviVoicePage from "./pages/OviVoicePage";
import MistakeJournalPage from "./pages/MistakeJournal";
import AssignmentsPage from "./pages/Assignments";
import ParentDashboard from "./pages/ParentDashboard";
import StudyGroups from "./pages/StudyGroups";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import OfflineBanner from "./components/OfflineBanner";
import { CurriculumProvider } from "./lib/curriculum";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CurriculumProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineBanner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
            <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
            <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><StudyChat /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/study-plan" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
            <Route path="/exam-simulation" element={<ProtectedRoute><ExamSimulation /></ProtectedRoute>} />
            <Route path="/study-guides" element={<ProtectedRoute><StudyGuides /></ProtectedRoute>} />
            <Route path="/past-papers" element={<ProtectedRoute><PastPaperVault /></ProtectedRoute>} />
            <Route path="/voice" element={<ProtectedRoute><OviVoicePage /></ProtectedRoute>} />
            <Route path="/mistake-journal" element={<ProtectedRoute><MistakeJournalPage /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute><AssignmentsPage /></ProtectedRoute>} />
            <Route path="/parent" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />
            <Route path="/study-groups" element={<ProtectedRoute><StudyGroups /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/teacher" element={<ProtectedRoute><TeacherCommandCentre /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CurriculumProvider>
  </QueryClientProvider>
);

export default App;
