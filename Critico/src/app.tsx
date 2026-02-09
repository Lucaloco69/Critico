import { Router, Route } from '@solidjs/router';
import { Suspense, onMount } from 'solid-js';
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
import Activate from './routes/activate';
import { initAuthListener } from './lib/sessionStore';

function App() {
  // ✅ Initialize auth listener on app mount
  onMount(async () => {
    console.log("🚀 App mounted, initializing auth...");
    await initAuthListener();
  });

  return (
    <Router>
      <Suspense fallback={
        <div class="flex items-center justify-center min-h-screen">
          <div class="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/home" component={Home} />
        <Route path="/profile" component={Profile} />
        <Route path="/profile/:userId" component={PublicProfile} />
        <Route path="/createProduct" component={CreateProduct} /> 
        <Route path="/product/:id" component={ProductDetails} />
        <Route path="/requests" component={Requests} />
        <Route path="/chat/:partnerId" component={Chat} />
        <Route path="/messages" component={Messages} />
        <Route path="/activate/:token" component={Activate} />
      </Suspense>
    </Router>
  );
}

export default App;
