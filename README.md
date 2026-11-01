# Training Tracker

PWA para hacer el seguimiento del entrenamiento con tus perros: planes de ejercicios, sesiones y puntuaciones.

## Qué hace

- **Perros**: varios perros, cada uno con foto, raza y fecha de nacimiento.
- **Biblioteca de ejercicios**: título, descripción, enlaces, y fotos y vídeos guardados en el dispositivo.
- **Planes**: cada perro tiene sus planes, que toman ejercicios de la biblioteca. Se pueden ordenar, duplicar (para el mismo perro o para otro) y finalizar. Los ejercicios que se quitan de un plan después de haberlos puntuado se archivan, para no perder el historial.
- **Sesiones**: fecha, comentario y, por cada ejercicio practicado, de 1 a 5 estrellas y una nota.
- **Progreso**: resumen de cada plan (sesiones, medias y ejercicios menos practicados) y una gráfica de la evolución de cada ejercicio.
- **Copia de seguridad**: exportar e importar un ZIP con todos los datos y archivos, con un aviso si la última copia tiene más de 30 días.
- **Recordatorios**: avisos dentro de la app los días de entrenamiento y exportación a `.ics` para el calendario del móvil (una PWA sin servidor no puede enviar notificaciones con la app cerrada).

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
  db/          tipos, esquema Dexie y repositorios (dogs, exercises, plans, sessions, stats, reminders)
  media/       almacén de archivos (OPFS) y estado del almacenamiento
  backup/      exportación e importación de copias (ZIP + validación con zod)
  features/    pantallas por funcionalidad
  components/  componentes compartidos
  i18n/        configuración y textos (locales/es.json)
```

## Depuración

En desarrollo, cada archivo que la app borra del OPFS queda registrado en `localStorage['debug.mediaDeletions']`, con la ruta, la hora y la pila de llamadas. Sirve para distinguir los borrados de la app de los archivos que pierde el navegador por su cuenta.
