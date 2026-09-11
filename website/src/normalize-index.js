import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

// Legacy index.html URLs serve the real page, but the client router uses directory URLs.
if (ExecutionEnvironment.canUseDOM && window.location.pathname.endsWith('/index.html')) {
  const {pathname, search, hash} = window.location;
  window.history.replaceState(window.history.state, '', pathname.slice(0, -10) + search + hash);
}
