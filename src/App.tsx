import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MPWrappedForm } from './components/MPWrappedForm';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#060606]">
        <Navbar />
        <div className="pt-24"> {/* Add padding-top to account for fixed navbar */}
          <Routes>
            <Route path="/" element={<MPWrappedForm />} />
            <Route path="/about-kloud" element={<div className="text-white p-8">About Kloud Page</div>} />
            <Route path="/our-team" element={<div className="text-white p-8">Our Team Page</div>} />
            <Route path="/kloud" element={<div className="text-white p-8">Kloud Tools Page</div>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;