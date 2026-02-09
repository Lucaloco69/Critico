import { Router, Route } from "@solidjs/router";
import { Suspense } from "solid-js";

import { Home } from "./routes/home";
import Login from "./routes/Login";
import Signup from "./routes/Signup";
import Profile from "./routes/profile";
import PublicProfile from "./routes/PublicProfile";
import CreateProduct from "./routes/createProduct";
import ProductDetails from "./routes/ProductDetail";
import Requests from "./routes/requests";
import Chat from "./routes/chat";
import Messages from "./routes/messages";
import Activate from "./routes/activate";

function App() {
  return (
    <Router>
      <Suspense
        fallback={
          <div class="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
              <div class="flex items-center justify-center py-24">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <span class="text-white/80 text-sm sm:text-base">Lädt…</span>
                </div>
              </div>
            </div>
          </div>
        }
      >
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
