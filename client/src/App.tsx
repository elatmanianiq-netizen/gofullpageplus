import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Demo from "./pages/Demo";
import Faq from "./pages/Faq";
import Home from "./pages/Home";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import Terms from "./pages/Terms";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />

      {/*
        Pages the Chrome Web Store listing links to. The privacy policy URL in
        particular must stay at a stable path: changing it means editing the
        listing and waiting for another review.
      */}
      <Route path={"/demo"} component={Demo} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/support"} component={Support} />
      <Route path={"/faq"} component={Faq} />

      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

interface AppProps {
  /**
   * When set, the router renders this path instead of reading the URL. Used by
   * the prerender step (tools/prerender-entry.tsx) to render each route to
   * static HTML at build time. In the browser this is undefined and wouter
   * uses the real location.
   */
  ssrPath?: string;
}

function App({ ssrPath }: AppProps = {}) {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          {/* Toaster is an interactive browser portal with no SEO value, and it
              reads document at render time, so it is skipped during prerender.
              __PRERENDER__ is set only by tools/prerender.mjs. */}
          {!(globalThis as { __PRERENDER__?: boolean }).__PRERENDER__ && <Toaster />}
          <WouterRouter ssrPath={ssrPath}>
            <Router />
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
