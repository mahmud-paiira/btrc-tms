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
import RegisterAndApply from './pages/applications/RegisterAndApply';
import ApplicationReview from './pages/applications/ApplicationReview';
import ApplicationDetailPage from './pages/applications/ApplicationDetailPage';
import AttendanceCalendar from './pages/attendance/AttendanceCalendar';
import QRCheckin from './pages/attendance/QRCheckin';
import AssessorAssessment from './pages/assessments/AssessorAssessment';
import CertificateIssue from './pages/certificates/CertificateIssue';
import BatchList from './pages/batches/BatchList';
import BatchCreate from './pages/batches/BatchCreate';
import BatchDetail from './pages/batches/BatchDetail';
import CourseList from './pages/courses/CourseList';
import TrainerList from './pages/trainers/TrainerList';
import TrainerDetailPage from './pages/trainers/TrainerDetailPage';
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
import TraineeApplications from './pages/trainee/TraineeApplications';
import HoLayout from './components/layout/HoLayout';
import HoDashboard from './pages/ho/HoDashboard';
import HoCenterManagement from './pages/ho/HoCenterManagement';
import HoCenterDetail from './pages/ho/HoCenterDetail';
import HoCourseManagement from './pages/ho/HoCourseManagement';
import HoCourseDetail from './pages/ho/HoCourseDetail';
import HoApprovalManagement from './pages/ho/HoApprovalManagement';
import HoReportCenter from './pages/ho/HoReportCenter';
import HOTrainerList from './pages/ho/TrainerList';
import HOTraineeList from './pages/ho/TraineeList';
import HOTraineeDetail from './pages/ho/TraineeDetail';
import TrainerDetail from './pages/ho/TrainerDetail';
import AssessorList from './pages/ho/AssessorList';
import CenterAssessorList from './pages/assessors/AssessorList';
import AssessorDetailPage from './pages/assessors/AssessorDetailPage';
import AssessorDetail from './pages/ho/AssessorDetail';
import ApplicationDetail from './pages/ho/ApplicationDetail';
import CircularList from './pages/ho/circulars/CircularList';
import CircularDetail from './pages/ho/circulars/CircularDetail';
import FinancialDashboard from './pages/ho/finance/FinancialDashboard';
import BudgetManagement from './pages/ho/finance/BudgetManagement';
import VoucherWorkflow from './pages/ho/finance/VoucherWorkflow';
import SoEReport from './pages/ho/finance/SoEReport';
import TrialBalance from './pages/ho/finance/TrialBalance';
import UserList from './pages/ho/users/UserList';
import UserDetail from './pages/ho/users/UserDetail';
import SystemSettings from './pages/ho/system/SystemSettings';
import EmailTemplateEditor from './pages/ho/system/EmailTemplateEditor';
import SmsTemplateEditor from './pages/ho/system/SmsTemplateEditor';
import IntegrationManager from './pages/ho/system/IntegrationManager';
import SystemHealth from './pages/ho/system/SystemHealth';
import CertificateTemplateDesigner from './pages/ho/system/CertificateTemplateDesigner';
import MasterData from './pages/ho/MasterData';
import HoSelectedTrainees from './pages/ho/HoSelectedTrainees';
import PublicVerify from './pages/public/PublicVerify';
import TrainerDashboard from './pages/trainer/TrainerDashboard';
import TrainerSchedule from './pages/trainer/TrainerSchedule';
import TrainerBatches from './pages/trainer/TrainerBatches';
import AssessorDashboard from './pages/assessor/AssessorDashboard';
import AssessorBatches from './pages/assessor/AssessorBatches';
import ShiftList from './pages/shifts/ShiftList';
import HolidayList from './pages/holidays/HolidayList';
import AllowanceList from './pages/allowance/AllowanceList';
import AllowanceCategoryList from './pages/allowance/AllowanceCategoryList';
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
  if (role === 'center_admin') return <Dashboard />;
  if (role === 'accountant') return <Dashboard />;
  return <Dashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
        <ToastContainer position="top-right" />
        <Routes>
          <Route path="/circulars" element={<PublicCircularList />} />
          <Route path="/circular/:center_code" element={<PublicCircularList />} />
          <Route path="/apply/:public_url" element={<RegistrationForm />} />
          <Route path="/register-and-apply" element={<RegisterAndApply />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<RootRedirect />} />
            <Route path="center-admin/applications" element={<ApplicationReview />} />
            <Route path="center-admin/applications/:id" element={<ApplicationDetailPage />} />
            <Route path="center-admin/batches" element={<BatchList />} />
            <Route path="center-admin/batches/create" element={<BatchCreate />} />
            <Route path="center-admin/batches/:id" element={<BatchDetail />} />
            <Route path="center-admin/batches/:id/edit" element={<BatchCreate />} />
            <Route path="center-admin/attendance/batch/:id" element={<AttendanceCalendar />} />
            <Route path="assessor/assessment/batch/:id" element={<AssessorAssessment />} />
            <Route path="center-admin/certificates/issue" element={<CertificateIssue />} />
            <Route path="center-admin/jobs/add" element={<JobPlacementForm />} />
            <Route path="center-admin/jobs/tracking" element={<JobTrackingForm />} />
            <Route path="center-admin/jobs/summary" element={<PlacementSummary />} />
            <Route path="center-admin/trainees" element={<TraineeList />} />
            <Route path="center-admin/trainers" element={<TrainerList />} />
            <Route path="center-admin/trainers/:id" element={<TrainerDetailPage />} />
            <Route path="center-admin/assessors" element={<CenterAssessorList />} />
            <Route path="center-admin/assessors/:id" element={<AssessorDetailPage />} />
            <Route path="center-admin/courses" element={<CourseList />} />
            <Route path="center-admin/shifts" element={<ShiftList />} />
            <Route path="center-admin/holidays" element={<HolidayList />} />
            <Route path="center-admin/allowances" element={<AllowanceList />} />
            <Route path="center-admin/reports" element={<ReportList />} />
            <Route path="trainer/dashboard" element={<TrainerDashboard />} />
            <Route path="trainer/schedule" element={<TrainerSchedule />} />
            <Route path="trainer/batches" element={<TrainerBatches />} />
            <Route path="assessor/dashboard" element={<AssessorDashboard />} />
            <Route path="assessor/batches" element={<AssessorBatches />} />
          </Route>
          {/* Head Office portal */}
          <Route path="/ho/login" element={<Login />} />
          <Route path="/ho" element={<HoLayout />}>
            <Route index element={<HoDashboard />} />
            <Route path="dashboard" element={<HoDashboard />} />
            <Route path="centers" element={<HoCenterManagement />} />
            <Route path="centers/:id" element={<HoCenterDetail />} />
            <Route path="courses" element={<HoCourseManagement />} />
            <Route path="courses/:id" element={<HoCourseDetail />} />
            <Route path="users" element={<UserList />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="trainers" element={<HOTrainerList />} />
            <Route path="trainers/:id" element={<TrainerDetail />} />
            <Route path="trainees" element={<HOTraineeList />} />
            <Route path="trainees/:id" element={<HOTraineeDetail />} />
            <Route path="assessors" element={<AssessorList />} />
            <Route path="assessors/:id" element={<AssessorDetail />} />
            <Route path="circulars" element={<CircularList />} />
            <Route path="circulars/:id" element={<CircularDetail />} />
            <Route path="approvals" element={<HoApprovalManagement />} />
            <Route path="applications/:id" element={<ApplicationDetail />} />
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
            <Route path="master-data" element={<MasterData />} />
            <Route path="allowance-categories" element={<AllowanceCategoryList />} />
            <Route path="trainees" element={<HoSelectedTrainees />} />
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
            <Route path="application" element={<TraineeApplications />} />
            <Route path="applications" element={<TraineeApplications />} />
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
