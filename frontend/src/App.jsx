import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Home from "./pages/Home";
import RoomBooking from "./pages/room/RoomBooking";
import RoomBookingForm from "./pages/room/RoomBookingForm";
import RoomDetail from "./pages/room/RoomDetail";
import Riwayat from "./pages/riwayat/Riwayat";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Profile from "./pages/profile/profile";
import Vehicle from "./pages/vehicle/VehicleBooking";
import VehicleDetail from "./pages/vehicle/VehicleDetail";
import VehicleForm from "./pages/vehicle/VehicleBookingForm";
import AuthRoute from "./routes/AuthRoute";
import AdminRoute from "./routes/AdminRoute";
import AdminUserPage from "./pages/admin/master/AdminUserPage";
import AdminRoomPage from "./pages/admin/master/AdminRoomPage";
import AdminKendaraan from "./pages/admin/master/AdminKendaraanPage";
import AdminApprovalRuangPage from "./pages/admin/approval/AdminApprovalRuangPage";
import ManagerApprovalRoomPage from "./pages/manager/ManagerApprovalRoomPage";
import AdminApprovalKendaraanPage from "./pages/admin/approval/AdminApprovalKendaraanPage";
import ManagerApprovalVehiclePage from "./pages/manager/ManagerApprovalVehiclePage";
import AdminBannerHome from "./pages/admin/AdminBannerHome";

import VehicleHistoryDetail from "./components/riwayat/VehicleHistoryDetail";
import VehicleCheckout from "./pages/vehicle/VehicleCheckout";
import VehicleCheckin from "./pages/vehicle/VehicleCheckin";

import RoomHistoryDetail from "./components/riwayat/RoomHistoryDetail";
import RoomDisplay from "./pages/room/RoomDisplay";

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
        <Route
          path="/riwayat"
          element={
            <AuthRoute>
              <Riwayat />
            </AuthRoute>
          }
        />
        <Route
          path="/riwayat/kendaraan/:bookingId"
          element={
            <AuthRoute>
              <VehicleHistoryDetail />
            </AuthRoute>
          }
        />
        <Route
          path="/riwayat/ruang/:bookingId"
          element={
            <AuthRoute>
              <RoomHistoryDetail />
            </AuthRoute>
          }
        />
        <Route
          path="/vehicle"
          element={
            <AuthRoute>
              <Vehicle />
            </AuthRoute>
          }
        />
        <Route
          path="/vehicle/:vehicleId"
          element={
            <AuthRoute>
              <VehicleDetail />
            </AuthRoute>
          }
        />
        <Route
          path="/vehicle/:vehicleId/form"
          element={
            <AuthRoute>
              <VehicleForm />
            </AuthRoute>
          }
        />
        <Route
          path="/admin/master/user"
          element={
            <AdminRoute>
              <AdminUserPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/master/room"
          element={
            <AdminRoute>
              <AdminRoomPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/master/kendaraan"
          element={
            <AdminRoute>
              <AdminKendaraan />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/approval/ruang"
          element={
            <AuthRoute>
              <AdminApprovalRuangPage />
            </AuthRoute>
          }
        />
        <Route
          path="/approval/manager/ruang"
          element={
            <AuthRoute>
              <ManagerApprovalRoomPage />
            </AuthRoute>
          }
        />
        <Route path="/admin/approval/kendaraan" element={<AdminApprovalKendaraanPage />} />
        <Route path="/manager/approval/kendaraan" element={<ManagerApprovalVehiclePage />} />

        {/* DISPLAY MONITOR / TV */}
        <Route path="/display/room" element={<RoomDisplay />} />
        <Route path="/vehicle/:bookingId/checkout" element={<VehicleCheckout />} />
        <Route path="/vehicle/:bookingId/checkin" element={<VehicleCheckin />} />
        <Route path="/admin/banner-home" element={<AdminBannerHome />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
