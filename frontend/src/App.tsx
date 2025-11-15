import { Routes, Route, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import HomePage from './pages/HomePage';
import GenerateItineraryPage from './pages/GenerateItineraryPage';
import ItineraryDetailPage from './pages/ItineraryDetailPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/Layout';

function App() {
  return (
    <Authenticator.Provider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="generate" element={<GenerateItineraryPage />} />
          <Route path="itinerary/:id" element={<ItineraryDetailPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Authenticator.Provider>
  );
}

// Login page component
function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Columbus Zero</h1>
          <p className="text-gray-600 mt-2">AI-Powered Travel Planning</p>
        </div>
        <Authenticator
          signUpAttributes={['email', 'given_name', 'family_name']}
          formFields={{
            signUp: {
              email: {
                order: 1,
              },
              given_name: {
                order: 2,
                label: 'First Name',
              },
              family_name: {
                order: 3,
                label: 'Last Name',
              },
              password: {
                order: 4,
              },
              confirm_password: {
                order: 5,
              },
            },
          }}
        />
      </div>
    </div>
  );
}

// Protected route wrapper
function RequireAuth({ children }: { children: JSX.Element }) {
  return (
    <Authenticator>
      {({ user }) => (user ? children : <Navigate to="/login" replace />)}
    </Authenticator>
  );
}

export default App;
