import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { Mint } from './pages/Mint';
import { Faucet } from './pages/Faucet';
import { Profile } from './pages/Profile';
import { CarpetDetail } from './pages/CarpetDetail';

function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mint" element={<Mint />} />
            <Route path="/faucet" element={<Faucet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/carpet/:tokenId" element={<CarpetDetail />} />
          </Routes>
        </div>
      </BrowserRouter>
    </Web3Provider>
  );
}

export default App;
