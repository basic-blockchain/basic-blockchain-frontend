# Solución: Modal de Minado No Consumía Endpoint

## Problema Identificado

El nuevo sistema de diseño consolidó el modal de minado (`MineBlockFlow.vue`), pero **no llamaba a ningún endpoint** real. Solo simulaba la interfaz visual sin realmente minar bloques:

- ❌ Las transacciones no se validaban
- ❌ Los bloques no se minaban
- ❌ La cadena se detenía

## Causa Raíz

`MineBlockFlow.vue` solo:

1. Anima la UI con nonce/hash aleatorios
2. Emite `@complete` sin interacción real con el backend
3. El dashboard solo refrescaba datos sin nuevos bloques

## Solución Implementada

### Cambios en `src/components/flows/MineBlockFlow.vue`

#### 1. Importaciones Agregadas

```typescript
import { mineBlock } from '@/api/mining'
import { useToast } from '@/composables/useToast'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
```

#### 2. Estado Expandido

```typescript
const isLoading = ref(false) // Control de botones durante minado
const error = ref<string | null>(null) // Manejo de errores
```

#### 3. Función `startMining()` Reescrita

**Antes:** Solo iniciaba animación visual

**Ahora:**

1. Inicia animación visual (mismo RAF loop)
2. **Llama a `mineBlock()` endpoint en paralelo**
3. Almacena el bloque minado: `chainStore.appendBlock(block)`
4. Actualiza transacciones confirmadas: `confirmedStore.addFromBlock()`
5. Refresca mempool: `mempoolStore.fetchPending()`
6. Refresca métricas: `metricsStore.fetchAll()`
7. Emite toast de éxito con detalles

#### 4. Manejo de Errores

```typescript
.catch((err: unknown) => {
  error.value = msg
  isLoading.value = false
  toast.error('Mining failed', msg)
  // Cierra automáticamente después de 2s
  finishTimer = setTimeout(() => {
    emit('close')
  }, 2000)
})
```

#### 5. UI Actualizada

- **Paso 0:** Botones deshabilitados mientras `isLoading`
- **Paso 1:** Muestra error si falla el endpoint
- **Paso 2:** Completado con detalles reales del bloque

## Flujo de Minado Corregido

```
┌─────────────────────────┐
│ Usuario: Click "Minar"  │
└────────────┬────────────┘
             │
    ┌────────▼────────┐
    │ startMining()   │
    └────────┬────────┘
             │
    ┌────────▼──────────────────┐
    │ Paralelo:                 │
    │ • Animación visual        │
    │ • Llamada a /mine_block   │
    └────────┬──────────────────┘
             │
    ┌────────▼──────────────────┐
    │ Respuesta del endpoint    │
    │ • block + transactions    │
    └────────┬──────────────────┘
             │
    ┌────────▼──────────────────┐
    │ Almacenar:                │
    │ • chainStore.appendBlock  │
    │ • confirmedStore.addFrom  │
    │ • mempoolStore.fetch      │
    └────────┬──────────────────┘
             │
    ┌────────▼──────────────────┐
    │ Paso 2: Completado        │
    │ emit('complete')          │
    └────────────────────────────┘
```

## Validación

✅ **TypeScript:** Sin errores  
✅ **Compatibilidad:** Mismo patrón que `MineButton.vue`  
✅ **Vistas:** Compatible con DashboardView, MempoolView, ChainView  
✅ **Endpoint:** Usa `POST /mine_block` correctamente  
✅ **Transacciones:** Se validan y confirman

## Resultado

Ahora los bloques se **minan realmente**, las transacciones se **validan**, y la **cadena continúa funcionando** normalmente.
