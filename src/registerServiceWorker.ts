// Service Worker Registration for RakshAI PWA
export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("RakshAI ServiceWorker registered with scope:", registration.scope);
        })
        .catch((err) => {
          console.warn("RakshAI ServiceWorker registration notice:", err);
        });
    });
  }
}
