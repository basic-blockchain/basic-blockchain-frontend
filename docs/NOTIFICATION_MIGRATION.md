# Plan de migración — Sistema de notificaciones (toasts)

Estado actual
- La aplicación usa `PrimeVue` Toast para notificaciones globales (montado en `src/App.vue`).
- Hemos introducido `BackgroundTaskIndicator` (pill) para tareas en segundo plano (Nodes/Mine flows).
- El toast por defecto se sobrepone con el pill en `bottom-right` y su estética no sigue completamente los tokens de diseño actuales.

Decisión tomada
- Realizaremos una migración gradual (iterativa): por ahora mantenemos el sistema actual (PrimeVue) y evitamos cambios visuales invasivos.
- En una siguiente iteración reemplazaremos el toaster por un componente propio alineado al sistema de diseño (`AppToast` / `ToastStack`), basado en la propuesta en `alert-system.jsx`.

Ruta propuesta (siguientes pasos)
1. Documentar el contrato visual y de API del nuevo toast (este archivo).
2. Implementar un `AppToast` + hook `useAlertSystem` inspirado en `alert-system.jsx`.
3. Migrar notificaciones críticas una a una (ej.: consenso, minado) a `AppToast` en lugar de `PrimeVue`.
4. Eliminar `PrimeVue` Toast o dejarlo como fallback tras validar comportamiento en staging.

Notas de implementación
- Posición por defecto: `top-right` para evitar solapes con `BackgroundTaskIndicator` (pill) en `bottom-right`.
- El stack debe exponer: `toast()`, `toastSuccess`, `toastError`, `toastLoading`, `toastPromise`, `dismiss()`.
- El componente debe respetar tokens: `--surface`, `--border`, `--radius-pill`, `--shadow-lg`, `--accent`, `--success`, `--danger`.
- El primer delivery incluirá solo `success/info/warning/danger/loading` y copia/undo/elements mínimos.

Referencia de diseño (propuesta)
- Archivo de referencia con API y markup de muestra: `c:/Users/User/Downloads/alert-system.jsx` (propuesta del equipo).

Responsable
- Equipo Frontend — implementar en `feature/notifications-migration`.

Fecha objetivo sugerida
- Iteración siguiente (sprint inmediato) — revisión en staging antes de merge a `develop`.

Rollback (estado actual)
- Se ha revertido temporalmente la integración de `AppToast` por problemas de compilación en entornos locales (plantillas SAX/HTML mal cerradas y errores HMR durante el desarrollo).
- Motivo: priorizar estabilidad y reproducibilidad del entorno de desarrollo; el comportamiento previo con `PrimeVue` Toast funciona y debe mantenerse mientras se planifica una migración segura.

Plan inmediato
- Restaurar `useToast` para que proxee a `PrimeVue` (`useToast` -> `primevue/usetoast`).
- Quitar el render de `AppToast` del `App.vue` para evitar que el HMR cargue plantillas no estables.
- Documentar el diseño y API propuesta en este archivo y reintentar la implementación en una rama feature/notifications-migration cuando haya pruebas en staging.

Acción requerida
- Validar en el equipo la API y la posición por defecto (`top-right`) antes de reintroducir `AppToast`.
- Añadir pruebas visuales y un pequeño e2e para asegurar que el nuevo toaster no rompe el layout ni el flujo de tareas en background.
