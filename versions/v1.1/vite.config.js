import { defineConfig } from "vite";

// Configuración del servidor de desarrollo.
// `npm run dev` abre el juego automáticamente en el navegador.
export default defineConfig({
  server: {
    open: true,
    host: true,
  },
});
