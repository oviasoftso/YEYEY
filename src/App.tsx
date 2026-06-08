import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
// import ProtectedRoute from "./components/ProtectedRoute";
// import OfflineBanner from "./components/OfflineBanner";
// import { CurriculumProvider } from "./lib/curriculum";

// const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      {/* Temporarily removed other routes and providers to isolate rendering issue */}
      {/* If the app renders with just Landing and Auth, we can reintroduce others one by one */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;