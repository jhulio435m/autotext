import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../layouts/Layout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Project from '../pages/Project';
import Document from '../pages/Document';

function AppRoutes() {
  return (
    <Routes>
      <Route path='/' element={<Login />} />

      <Route element={<Layout />}>
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/proyecto/:id/caratula' element={<Project />} />
        <Route path='/proyecto/:id/documentos' element={<Project />} />
        <Route path='/proyecto/:id/documento/:docId/editor' element={<Document />} />
        <Route path='/proyecto/:id/documento/:docId/formulario' element={<Document />} />
        <Route path='/proyecto/:id/documento/:docId/preview' element={<Document />} />
      </Route>

      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}

export default AppRoutes;
