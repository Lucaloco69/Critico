import { Router, Route } from '@solidjs/router';
import { Suspense } from 'solid-js';
import { Home } from './routes/home';  // ✅ Named import statt default
import Login from './routes/login';
import Signup from './routes/signup';
import Profile from './routes/profile';
import CreateProduct from './routes/createProduct';
import ProductDetails from './routes/productDetails';

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Lädt...</div>}>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/home" component={Home} />
        <Route path= "/profile" component={Profile} />
        <Route path= "/createProduct" component={CreateProduct} /> 
        <Route path="/productDetails/:id" component={ProductDetails} />

      </Suspense>
    </Router>
  );
}

export default App;
