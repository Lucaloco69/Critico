import { Router, Route } from '@solidjs/router';
import { Suspense } from 'solid-js';
import { Home } from './routes/home';  // ✅ Named import statt default
import Login from './routes/login';
import Signup from './routes/signup';


function App() {
  return (
    <Router>
      <Suspense fallback={<div>Lädt...</div>}>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/home" component={Home} />

      </Suspense>
    </Router>
  );
}

export default App;
