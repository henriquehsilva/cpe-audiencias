import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RouteGuard } from './components/RouteGuard';
import { Header } from './components/Header';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ToastContainer } from './components/Toast';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Cadastro } from './pages/Cadastro';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Login Route */}
          <Route
            path="/login"
            element={
              <RouteGuard requireAuth={false}>
                <Login />
              </RouteGuard>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <RouteGuard requireAuth={true}>
                <div>
                  <Header />
                  <OfflineIndicator />
                  <main>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route
                        path="/cadastro"
                        element={
                          <RouteGuard requireRole="sad">
                            <Cadastro />
                          </RouteGuard>
                        }
                      />
                    </Routes>
                  </main>
                </div>
              </RouteGuard>
            }
          />
        </Routes>

        {/* Global Components */}
        <ToastContainer />
      </div>
    </Router>
  );
}

export default App;