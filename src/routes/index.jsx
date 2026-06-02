import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const Layout = lazy(() => import('../layouts/Layout'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Account = lazy(() => import('../pages/Account'));
const Project = lazy(() => import('../pages/Project'));
const Document = lazy(() => import('../pages/Document'));

function RouteFallback() {
  return (
    <div className='min-h-screen bg-[#f6f4ef] text-[#272220] flex items-center justify-center text-sm'>
      Cargando...
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/registro' element={<Register />} />
        <Route path='/recuperar-contrasena' element={<ForgotPassword />} />
        <Route path='/restablecer-contrasena' element={<ResetPassword />} />

        <Route element={<Layout />}>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/cuenta' element={<Account />} />
          <Route path='/proyecto/:id/datos' element={<Project />} />
          <Route path='/proyecto/:id/documentos' element={<Project />} />
          <Route path='/proyecto/:id/documento/:docId/:mode' element={<Document />} />
          <Route path='/proyecto/:id/documento/:docId/preview' element={<Document />} />
          <Route path='/proyecto/:id/documento/:docId' element={<Document />} />
        </Route>

        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
