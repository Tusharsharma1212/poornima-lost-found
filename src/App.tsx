import { Routes, Route } from "react-router-dom";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import RequireAuth from "@/components/auth/RequireAuth";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import BrowseItems from "@/pages/BrowseItems";
import ReportItem from "@/pages/ReportItem";
import ItemDetail from "@/pages/ItemDetail";
import StudentDashboard from "@/pages/StudentDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import Notifications from "@/pages/Notifications";
import ProfilePage from "@/pages/Profile";
import SignInPage from "@/pages/SignIn";
import SignUpPage from "@/pages/SignUp";
import NotFound from "@/pages/NotFound";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <ClerkAuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<BrowseItems />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route
            path="/report/:type?"
            element={
              <RequireAuth>
                <ReportItem />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <StudentDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <Notifications />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/dsw"
            element={
              <RequireAuth>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
      </Routes>
    </ClerkAuthProvider>
  );
}
