# Testing PlayGuard - Coordinate Mode (Sin SDK)

## Objetivo
Probar el flujo completo de grabación en modo coordinate (sin Unity SDK) para verificar funcionalidad básica.

## Pre-requisitos

✅ Dispositivo conectado: Xiaomi POCO X3 Pro (4b141bc2)
✅ ADB funcionando: `C:\Users\CLIENTE2022\AppData\Local\Android\Sdk\platform-tools\adb.exe`
✅ PlayGuard app compilada

## Paso 1: Verificar Conexión del Dispositivo

```bash
cd "C:\Users\CLIENTE2022\AppData\Local\Android\Sdk\platform-tools"
adb devices
```

**Resultado esperado:**
```
List of devices attached
4b141bc2        device
```

## Paso 2: Iniciar PlayGuard App

```bash
cd "e:\Claude Projects\PlayGuard\electron-app"

# Opción 1: Usando el launcher script (recomendado)
start-playguard.bat

# Opción 2: Directamente con npm (si ELECTRON_RUN_AS_NODE no está set)
npm run dev
```

**Verificar:**
- ✅ La app abre correctamente
- ✅ No hay errores de "require('electron') returns string"
- ✅ DevTools se abren automáticamente (development mode)

## Paso 3: Conectar Dispositivo en PlayGuard

1. En la UI de PlayGuard, ve a la sección "New Test Recording"
2. Verifica que el dispositivo aparezca en el dropdown "Target Device"
   - Debería mostrar: `POCO X3 Pro (4b141bc2)` o similar
3. Si no aparece, haz clic en el botón de refresh devices (si existe)

## Paso 4: Configurar Test

1. **Test Name:** "Test Coordinate Mode"
2. **Description:** "Testing coordinate-based recording without Unity SDK"
3. **Tags:** `coordinate`, `basic`
4. **Target Device:** Selecciona el Xiaomi POCO X3 Pro

## Paso 5: Iniciar Grabación

1. Haz clic en **"Start Recording"**
2. **Verificar en consola (DevTools):**
   ```
   [TestRecorder] Starting recording for device 4b141bc2
   [TestRecorder] Attempting to detect Unity SDK...
   [UnityBridge] Detecting Unity SDK on device 4b141bc2...
   [UnityBridge] Unity SDK not detected: [algún error de conexión]
   [TestRecorder] Unity SDK not detected - using coordinate-based recording
   ```

3. **Verificar en UI:**
   - ✅ Indicador muestra: 🟡 **"Coordinate Mode (SDK Not Detected)"**
   - ✅ Estado: "Recording..."
   - ✅ Timer empieza a correr
   - ✅ Screenshot inicial aparece después de ~1-2 segundos

## Paso 6: Capturar Acciones

### Test 1: Capturar Screenshot Inicial
- **Verificar:** Screenshot del home screen aparece en "Device Preview"
- **Verificar en lista de acciones:** Primera acción tipo "screenshot" con descripción "Initial state"

### Test 2: Hacer Tap en el Dispositivo
1. Haz clic en cualquier parte del screenshot mostrado en PlayGuard
2. **Verificar:**
   - ✅ Animación de "ping" rojo en la posición del click
   - ✅ El tap se ejecuta en el dispositivo real
   - ✅ Después de ~1.5s, aparece screenshot actualizado
   - ✅ Nueva acción aparece en la lista: `"Tap at (x, y)"`
   - ✅ **NO** debe tener badge "SDK" (porque no hay SDK)

### Test 3: Múltiples Taps
1. Haz 3-4 taps en diferentes posiciones
2. **Verificar para cada tap:**
   - ✅ Descripción: `"Tap at (x, y)"` con coordenadas correctas
   - ✅ Sin badge "SDK"
   - ✅ Tipo: "tap"
   - ✅ Timestamp incrementa correctamente

### Test 4: Tap Manual (coordenadas específicas)
1. En "Manual Controls", ingresa:
   - X: `540` (centro horizontal en 1080px)
   - Y: `1200` (centro vertical en 2400px)
2. Haz clic en "Tap"
3. **Verificar:**
   - ✅ Tap se ejecuta en el dispositivo
   - ✅ Nueva acción con coordenadas exactas (540, 1200)

## Paso 7: Detener Grabación

1. Haz clic en **"Stop"**
2. **Verificar en consola:**
   ```
   [TestRecorder] Stopping recording with X actions
   [UnityBridge] Disconnected from Unity SDK (o no aparece si nunca se conectó)
   ```
3. **Verificar en UI:**
   - ✅ Estado cambia a "Stopped"
   - ✅ Botón "Save Test" aparece
   - ✅ Timer se detiene

## Paso 8: Guardar Test

1. Haz clic en **"Save Test"**
2. **Verificar:**
   - ✅ Alert de éxito: "Test saved successfully to: [path]"
   - ✅ La UI se resetea al estado inicial
   - ✅ Test name, description, tags se limpian

3. **Verificar archivo guardado:**
```bash
# Ver tests guardados
dir "%APPDATA%\playguard\tests"
```

## Paso 9: Revisar Archivo de Test Guardado

1. Abre el archivo JSON guardado
2. **Verificar estructura:**

```json
{
  "id": "test_...",
  "name": "Test Coordinate Mode",
  "description": "Testing coordinate-based recording without Unity SDK",
  "version": "1.0",
  "tags": ["coordinate", "basic"],
  "createdAt": "...",
  "updatedAt": "...",
  "steps": [
    {
      "id": "step_1",
      "type": "screenshot",
      "description": "Initial state",
      ...
    },
    {
      "id": "step_2",
      "type": "tap",
      "description": "Tap at (540, 1200)",
      "target": { "x": 540, "y": 1200 },
      ...
    }
  ]
}
```

3. **Verificar que cada step tenga:**
   - ✅ `type` correcto (tap, screenshot, etc.)
   - ✅ `description` con coordenadas (NO nombres de elementos)
   - ✅ `target` con coordenadas x, y
   - ✅ **NO** debe tener `elementPath`, `elementName`, o `elementType`

## Checklist de Funcionalidad

### ✅ Básico
- [ ] App inicia sin errores
- [ ] Dispositivo detectado automáticamente
- [ ] Grabación inicia correctamente
- [ ] Indicador muestra "Coordinate Mode"

### ✅ Screenshots
- [ ] Screenshot inicial se captura
- [ ] Screenshots se actualizan después de cada tap
- [ ] Screenshots se muestran correctamente en UI (no hay CSP errors)

### ✅ Acciones
- [ ] Taps desde UI ejecutan en dispositivo
- [ ] Coordenadas correctas en acciones grabadas
- [ ] Sin badges "SDK" en acciones
- [ ] Lista de acciones se actualiza en tiempo real

### ✅ Guardado
- [ ] Test se guarda correctamente
- [ ] Archivo JSON tiene estructura correcta
- [ ] Coordenadas en JSON (no elementos)

## Problemas Comunes

### Screenshot no aparece
**Causa:** CSP bloqueando data URIs
**Solución:** Verificar que index.ts tenga la CSP correcta:
```typescript
'Content-Security-Policy': [
  "default-src 'self'; img-src 'self' data: blob:; ..."
]
```

### Tap no ejecuta en dispositivo
**Causa:** ADB no funcionando correctamente
**Solución:**
```bash
adb devices
adb shell input tap 540 1200  # Test manual
```

### "Coordinate Mode" nunca aparece
**Causa:** Estado no se actualiza desde backend
**Solución:** Verificar polling en updateRecordingState() (cada 1s)

## Siguiente Paso

Una vez que el modo coordinate funcione al 100%, procederemos a:
1. Crear juego Unity de prueba
2. Integrar PlayGuard SDK
3. Probar modo element (SDK conectado)
