import { Router, Route } from '@solidjs/router';
import { Suspense } from 'solid-js';

import Login from './routes/login';
import Signup from './routes/signup';


function App() {
  return (
    <Router>
      <Suspense fallback={<div>Lädt...</div>}>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
      </Suspense>
    </Router>
  );
}

export default App;
