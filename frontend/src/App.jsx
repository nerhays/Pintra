import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Home from "./pages/Home";
import RoomBooking from "./pages/room/RoomBooking";
import RoomBookingForm from "./pages/room/RoomBookingForm";
import RoomDetail from "./pages/room/RoomDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Profile from "./pages/profile/profile";
import AuthRoute from "./routes/AuthRoute";
import AdminRoute from "./routes/AdminRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/home"
          element={
            <AuthRoute>
              <Home />
            </AuthRoute>
          }
        />

        <Route
          path="/room/book"
          element={
            <AuthRoute>
              <RoomBooking />
            </AuthRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/room/book/:roomId"
          element={
            <AuthRoute>
              <RoomDetail />
            </AuthRoute>
          }
        />
        <Route
          path="/room/book/:roomId/form"
          element={
            <AuthRoute>
              <RoomBookingForm />
            </AuthRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthRoute>
              <Profile />
            </AuthRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
