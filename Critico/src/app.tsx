import { Router, Route } from '@solidjs/router';
import { Suspense } from 'solid-js';
import { Home } from './routes/home';
import Login from './routes/login';
import Signup from './routes/signup';
import Profile from './routes/profile';
import CreateProduct from './routes/createProduct';
import ProductDetails from './routes/ProductDetail';
import Requests from './routes/requests';
import Chat from './routes/chat';
import Messages from './routes/messages'
import PublicProfile from './routes/PublicProfile';
import Activate from './routes/activate'

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Lädt...</div>}>
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
        <Route path="/activate" component={Activate} />


      </Suspense>
    </Router>
  );
}

export default App;
