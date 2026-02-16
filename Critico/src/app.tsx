import { Router, Route } from '@solidjs/router';
import { Suspense, onMount, onCleanup } from 'solid-js';
import { Home } from './routes/home';
import Login from './routes/login';
import Signup from './routes/signup';
import Profile from './routes/profile';
import CreateProduct from './routes/createProduct';
import ProductDetails from './routes/ProductDetail';
import Requests from './routes/requests';
import Chat from './routes/chat';
import Messages from './routes/messages';
import PublicProfile from './routes/PublicProfile';
import Activate from './routes/Activate';
import { ProtectedRoute } from './components/ProtectedRoute';
import { initAuthListener, startSessionHealthCheck } from './lib/sessionStore';

function App() {
  onMount(async () => {

    try {
      await initAuthListener();
      const cleanup = startSessionHealthCheck();
      onCleanup(cleanup);
    } catch (err) {
      console.error("❌ Failed to initialize auth:", err);
    }
  });

  return (
    <Router>
      <Suspense fallback={
        <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p class="mt-4 text-gray-600 dark:text-gray-400">Lädt...</p>
          </div>
        </div>
      }>
        {/* ✅ Öffentliche Routes (kein Login nötig) */}
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/activate/:token" component={Activate} />

        {/* ✅ Protected Routes (Login erforderlich) */}
        <Route path="/home" component={() => <ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/profile" component={() => <ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:userId" component={() => <ProtectedRoute><PublicProfile /></ProtectedRoute>} />
        <Route path="/createProduct" component={() => <ProtectedRoute><CreateProduct /></ProtectedRoute>} />
        <Route path="/product/:id" component={() => <ProtectedRoute><ProductDetails /></ProtectedRoute>} />
        <Route path="/requests" component={() => <ProtectedRoute><Requests /></ProtectedRoute>} />
        <Route path="/chat/:partnerId" component={() => <ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/messages" component={() => <ProtectedRoute><Messages /></ProtectedRoute>} />

        {/* ✅ 404 Route */}
        <Route path="*" component={() => (
          <div class="flex items-center justify-center min-h-screen">
            <div class="text-center">
              <h1 class="text-4xl font-bold text-gray-900 dark:text-white">404</h1>
              <p class="text-gray-600 dark:text-gray-400">Seite nicht gefunden</p>
            </div>
          </div>
        )} />
      </Suspense>
    </Router>
  );
}

export default App;
