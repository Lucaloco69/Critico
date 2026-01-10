import { onMount } from "solid-js";
import { Router, Route } from '@solidjs/router';
import { Suspense } from 'solid-js';
import { supabase } from './lib/supabaseClient'; 
import { checkSession, clearSession } from './lib/sessionStore';

// Deine exakten Imports
import { Home } from './routes/home';
import Login from './routes/login';
import Signup from './routes/signup';
import Profile from './routes/profile';
import CreateProduct from './routes/createProduct';
import ProductDetails from './routes/productDetails';
import Requests from './routes/requests';

function App() {
  onMount(async () => {
    // ✅ JWT Auto-Check
    await checkSession();
    
    // ✅ Supabase Listener (Auto-Refresh)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await checkSession();
      } else {
        clearSession();
      }
    });
  });

  return (
    <Router>
      <Suspense fallback={<div>Lädt...</div>}>
        {/* Deine exakten Routes - nur Syntax gefixt */}
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/home" component={Home} />
        <Route path="/profile" component={Profile} />
        <Route path="/createProduct" component={CreateProduct} />
        <Route path="/productDetails/:id" component={ProductDetails} />
        <Route path="/requests" component={Requests} />
      </Suspense>
    </Router>
  );
}

export default App;
