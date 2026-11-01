# Training Tracker

PWA para hacer el seguimiento del entrenamiento con tus perros: planes de ejercicios, sesiones y puntuaciones.

## Stack

- React 19 + TypeScript + Vite, con **Ionic React** para la interfaz móvil
- `vite-plugin-pwa`: la app se puede instalar y funciona sin conexión
- **Dexie** (IndexedDB) para los datos y **OPFS** para las imágenes y los vídeos, todo en el dispositivo
- i18next (de momento, solo español)

## Desarrollo

Requiere Node 22 (instalado con nvm: `nvm use 22`).

```bash
npm install
npm run dev            # servidor de desarrollo
npm run test           # tests (Vitest + fake-indexeddb)
npm run lint           # ESLint
npm run format         # Prettier
npm run build          # build de producción en dist/
npm run preview        # sirve el build (para probar el service worker)
```

Los iconos de la PWA se generan a partir de `public/favicon.svg` con `npm run generate-pwa-assets`.

## Estructura

```
src/
  db/          tipos, esquema Dexie y repositorios (dogs, exercises, plans, sessions)
  media/       almacén de archivos (OPFS) y estado del almacenamiento
  features/    pantallas por funcionalidad
  components/  componentes compartidos
  i18n/        configuración y textos (locales/es.json)
```
