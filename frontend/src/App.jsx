import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import MemberGivingPage from './pages/MemberGivingPage';

// Layout / Placeholder fallbacks if needed
function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-3xl font-bold text-slate-800">404 - Page Not Found</h1>
      <p className="text-sm text-slate-500 mt-2">The requested link does not exist.</p>
      <a href="/give" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
        Go to Giving Page
      </a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Giving Portal Routes */}
        <Route path="/give" element={<MemberGivingPage />} />
        <Route path="/member/giving" element={<MemberGivingPage />} />
        
        {/* Default Landing / Fallback */}
        <Route path="/" element={<Navigate to="/give" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}