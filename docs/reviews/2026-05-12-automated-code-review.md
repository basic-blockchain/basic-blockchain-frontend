# Informe de code review automatizado

Fecha: 2026-05-12

Alcance:

- [basic-blockchain-simulator](../../../basic-blockchain-simulator)
- [basic-blockchain-frontend](../../)

## Hallazgos

### 1. El modal de frase semilla no resetea la confirmación al reabrirse

Archivo: [src/components/molecules/SeedPhraseModal.vue](../../src/components/molecules/SeedPhraseModal.vue)

Riesgo:

- Si el usuario marca la casilla, cierra el modal y lo abre otra vez, el botón de continuar queda habilitado.
- Eso debilita la fricción de seguridad que el flujo pretende imponer antes de confirmar la creación de la wallet.

Soluciones potenciales:

- Resetear el estado local `confirmed` al cerrar el modal y también cuando `visible` pase a `false`.
- Añadir una prueba de regresión que simule cerrar y reabrir el componente.

Estado implementado:

- Se añadió el reset automático del estado y una prueba de regresión del modal.

### 2. El flujo preview/confirm de wallet usa estado efímero en memoria

Archivo: [api/wallet_routes.py](../../../basic-blockchain-simulator/api/wallet_routes.py)

Riesgo:

- Los drafts viven en `_wallet_drafts` en memoria del proceso.
- Un reinicio, múltiples workers o un balanceador sin afinidad pueden romper la confirmación.
- El mnemonic queda retenido en memoria del proceso hasta el TTL.

Soluciones potenciales:

- Persistir drafts en una tabla o store dedicado con expiración explícita.
- Mover los drafts a un backend compartido si se mantiene el modelo multi-worker.
- Si se quiere mantener memoria local, documentar la limitación como no apta para despliegues distribuidos.

Estado implementado:

- Se agregó una prueba de regresión del flujo preview/confirm para cubrir el caso feliz.
- La limitación operativa sigue siendo una decisión de arquitectura pendiente de un store persistente.

## Resultado implementado

- El modal de frase semilla ahora limpia su estado de confirmación al cerrarse y al reabrirse.
- Hay cobertura de prueba para el comportamiento de reapertura del modal.
- Hay cobertura de prueba para el flujo preview/confirm de wallet en backend.

## Observaciones adicionales

- La revisión estática no mostró problemas graves adicionales en el material revisado.
- El mayor riesgo remanente es arquitectónico: el almacenamiento de drafts en memoria no escala bien fuera de un único proceso.
