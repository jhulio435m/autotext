import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const Layout = lazy(() => import('../layouts/Layout'));
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
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

        <Route element={<Layout />}>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/proyecto/:id/datos' element={<Project />} />
          <Route path='/proyecto/:id/documentos' element={<Project />} />
          <Route path='/proyecto/:id/documento/:docId/:mode' element={<Document />} />
          <Route path='/proyecto/:id/documento/:docId/preview' element={<Navigate to='../constructor' replace />} />
        </Route>

        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
