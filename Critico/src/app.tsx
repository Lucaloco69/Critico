import { Router, Route } from '@solidjs/router';
import { Suspense } from 'solid-js';
import { Home } from './routes/home';
import Login from './routes/login';
import Signup from './routes/signup';
import Profile from './routes/profile';
import CreateProduct from './routes/createProduct';
import ProductDetails from './routes/productDetails';
import Requests from './routes/requests';
import Chat from './routes/chat';
import Messages from './routes/messages'

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Lädt...</div>}>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/home" component={Home} />
        <Route path="/profile" component={Profile} />
        <Route path="/createProduct" component={CreateProduct} /> 
        <Route path="/productDetails/:id" component={ProductDetails} />
        <Route path="/requests" component={Requests} />
        <Route path="/chat/:partnerId" component={Chat} />
        <Route path="/messages" component={Messages} />
      </Suspense>
    </Router>
  );
}

export default App;
