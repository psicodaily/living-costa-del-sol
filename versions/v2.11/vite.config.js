import { defineConfig } from "vite";

// Configuración del servidor de desarrollo.
// `npm run dev` abre el juego automáticamente en el navegador.
export default defineConfig({
  server: {
    open: true, // abre el navegador automáticamente
    host: true,
    port: 5173, // dirección fija: http://localhost:5173
  },
});
