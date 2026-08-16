import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
// import VapiButton from "@/components/VapiButton"; // Ideiglenesen kikapcsolva
import Index from "./pages/Index";
import BookingPage from "./pages/BookingPage";
import AdminPage from "./pages/admin";
import AdminRoomTypesRoute from "./pages/admin/RoomTypesRoute";
import AdminRoomsRoute from "./pages/admin/RoomsRoute";
import AdminPricingRoute from "./pages/admin/PricingRoute";
import AdminDiscountsRoute from "./pages/admin/DiscountsRoute";
import AdminBookingsRoute from "./pages/admin/BookingsRoute";
import AdminSettingsRoute from "./pages/admin/SettingsRoute";
import AdminSeasonsRoute from "./pages/admin/SeasonsRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/foglalas">
          {/* <VapiButton /> */}{/* Ideiglenesen kikapcsolva */}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/book/:roomTypeId" element={<BookingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/room-types" element={<AdminRoomTypesRoute />} />
            <Route path="/admin/rooms" element={<AdminRoomsRoute />} />
            <Route path="/admin/seasons" element={<AdminSeasonsRoute />} />
            <Route path="/admin/pricing" element={<AdminPricingRoute />} />
            <Route path="/admin/discounts" element={<AdminDiscountsRoute />} />
            <Route path="/admin/bookings" element={<AdminBookingsRoute />} />
            <Route path="/admin/settings" element={<AdminSettingsRoute />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
