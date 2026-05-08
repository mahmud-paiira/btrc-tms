import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/layout/Layout';
import Login from './pages/accounts/Login';
import Dashboard from './pages/dashboard/Dashboard';
import PublicCircularList from './pages/circulars/PublicCircularList';
import RegistrationForm from './pages/applications/RegistrationForm';
import ApplicationReview from './pages/applications/ApplicationReview';
import AttendanceCalendar from './pages/attendance/AttendanceCalendar';
import QRCheckin from './pages/attendance/QRCheckin';
import AssessorAssessment from './pages/assessments/AssessorAssessment';
import CertificateIssue from './pages/certificates/CertificateIssue';
import BatchList from './pages/batches/BatchList';
import BatchCreate from './pages/batches/BatchCreate';
import CourseList from './pages/courses/CourseList';
import TrainerList from './pages/trainers/TrainerList';
import TraineeList from './pages/trainees/TraineeList';
import ReportList from './pages/reports/ReportList';
import JobPlacementForm from './pages/jobs/JobPlacementForm';
import JobTrackingForm from './pages/jobs/JobTrackingForm';
import PlacementSummary from './components/jobs/PlacementSummary';
import TraineeLayout from './components/layout/TraineeLayout';
import TraineeLogin from './pages/trainee/TraineeLogin';
import TraineeDashboard from './pages/trainee/TraineeDashboard';
import TraineeSchedule from './pages/trainee/TraineeSchedule';
import TraineeAttendance from './pages/trainee/TraineeAttendance';
import TraineeAssessment from './pages/trainee/TraineeAssessment';
import TraineeCertificate from './pages/trainee/TraineeCertificate';
import TraineeProfile from './pages/trainee/TraineeProfile';
import HoLayout from './components/layout/HoLayout';
import HoDashboard from './pages/ho/HoDashboard';
import HoCenterManagement from './pages/ho/HoCenterManagement';
import HoCourseManagement from './pages/ho/HoCourseManagement';
import HoApprovalManagement from './pages/ho/HoApprovalManagement';
import HoReportCenter from './pages/ho/HoReportCenter';
import HOTrainerList from './pages/ho/TrainerList';
import AssessorList from './pages/ho/AssessorList';
import CircularList from './pages/ho/circulars/CircularList';
import FinancialDashboard from './pages/ho/finance/FinancialDashboard';
import BudgetManagement from './pages/ho/finance/BudgetManagement';
import VoucherWorkflow from './pages/ho/finance/VoucherWorkflow';
import SoEReport from './pages/ho/finance/SoEReport';
import TrialBalance from './pages/ho/finance/TrialBalance';
import UserList from './pages/ho/users/UserList';
import SystemSettings from './pages/ho/system/SystemSettings';
import EmailTemplateEditor from './pages/ho/system/EmailTemplateEditor';
import SmsTemplateEditor from './pages/ho/system/SmsTemplateEditor';
import IntegrationManager from './pages/ho/system/IntegrationManager';
import SystemHealth from './pages/ho/system/SystemHealth';
import CertificateTemplateDesigner from './pages/ho/system/CertificateTemplateDesigner';
import PublicVerify from './pages/public/PublicVerify';
import TrainerDashboard from './pages/trainer/TrainerDashboard';
import TrainerSchedule from './pages/trainer/TrainerSchedule';
import AssessorDashboard from './pages/assessor/AssessorDashboard';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-toastify/dist/ReactToastify.css';
import './assets/scss/style.scss';
import './pages/circulars/PublicCircular.css';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  const role = user.user_type;
  if (role === 'head_office') return <Navigate to="/ho/dashboard" />;
  if (role === 'trainee') return <Navigate to="/trainee/dashboard" />;
  if (role === 'trainer') return <Navigate to="/trainer/dashboard" />;
  if (role === 'assessor') return <Navigate to="/assessor/dashboard" />;
  return <Dashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
        <ToastContainer position="top-right" rtl />
        <Routes>
          <Route path="/circular/:center_code" element={<PublicCircularList />} />
          <Route path="/apply/:public_url" element={<RegistrationForm />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<RootRedirect />} />
            <Route path="center-admin/applications" element={<ApplicationReview />} />
            <Route path="center-admin/batches" element={<BatchList />} />
            <Route path="center-admin/batches/create" element={<BatchCreate />} />
            <Route path="center-admin/batches/:id/edit" element={<BatchCreate />} />
            <Route path="center-admin/attendance/batch/:id" element={<AttendanceCalendar />} />
            <Route path="assessor/assessment/batch/:id" element={<AssessorAssessment />} />
            <Route path="center-admin/certificates/issue" element={<CertificateIssue />} />
            <Route path="center-admin/jobs/add" element={<JobPlacementForm />} />
            <Route path="center-admin/jobs/tracking" element={<JobTrackingForm />} />
            <Route path="center-admin/jobs/summary" element={<PlacementSummary />} />
            <Route path="center-admin/trainees" element={<TraineeList />} />
            <Route path="center-admin/trainers" element={<TrainerList />} />
            <Route path="center-admin/courses" element={<CourseList />} />
            <Route path="center-admin/reports" element={<ReportList />} />
            <Route path="trainer/dashboard" element={<TrainerDashboard />} />
            <Route path="trainer/schedule" element={<TrainerSchedule />} />
            <Route path="assessor/dashboard" element={<AssessorDashboard />} />
          </Route>
          {/* Head Office portal */}
          <Route path="/ho/login" element={<Login />} />
          <Route path="/ho" element={<HoLayout />}>
            <Route index element={<HoDashboard />} />
            <Route path="dashboard" element={<HoDashboard />} />
            <Route path="centers" element={<HoCenterManagement />} />
            <Route path="courses" element={<HoCourseManagement />} />
            <Route path="users" element={<UserList />} />
            <Route path="trainers" element={<HOTrainerList />} />
            <Route path="assessors" element={<AssessorList />} />
            <Route path="circulars" element={<CircularList />} />
            <Route path="approvals" element={<HoApprovalManagement />} />
            <Route path="reports" element={<HoReportCenter />} />
            <Route path="finance" element={<FinancialDashboard />} />
            <Route path="finance/budgets" element={<BudgetManagement />} />
            <Route path="finance/vouchers" element={<VoucherWorkflow />} />
            <Route path="finance/soe" element={<SoEReport />} />
            <Route path="finance/trial-balance" element={<TrialBalance />} />
            <Route path="system" element={<SystemSettings />} />
            <Route path="system/email-templates" element={<EmailTemplateEditor />} />
            <Route path="system/sms-templates" element={<SmsTemplateEditor />} />
            <Route path="system/integrations" element={<IntegrationManager />} />
            <Route path="system/health" element={<SystemHealth />} />
            <Route path="system/certificate-template" element={<CertificateTemplateDesigner />} />
          </Route>

          {/* Trainee portal */}
          <Route path="/trainee/login" element={<TraineeLogin />} />
          <Route path="/trainee" element={<TraineeLayout />}>
            <Route index element={<TraineeDashboard />} />
            <Route path="dashboard" element={<TraineeDashboard />} />
            <Route path="schedule" element={<TraineeSchedule />} />
            <Route path="attendance" element={<TraineeAttendance />} />
            <Route path="assessment" element={<TraineeAssessment />} />
            <Route path="certificate" element={<TraineeCertificate />} />
            <Route path="profile" element={<TraineeProfile />} />
          </Route>
          <Route path="/checkin/:batchId/:sessionNo/:dateStr" element={<QRCheckin />} />
          <Route path="/verify/certificate/:certNo" element={<PublicVerify />} />
        </Routes>
      </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
