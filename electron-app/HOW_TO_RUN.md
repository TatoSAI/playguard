# Cómo Ejecutar PlayGuard

## Problema Conocido: ELECTRON_RUN_AS_NODE

Cuando ejecutas PlayGuard desde Claude Code o VS Code, la variable de entorno `ELECTRON_RUN_AS_NODE=1` puede interferir con el arranque de Electron, causando errores como:

```
TypeError: Cannot read properties of undefined (reading 'getPath')
```

## Soluciones

### Opción 1: Usar el Launcher CMD (RECOMENDADO) ✅

**Doble clic en el archivo:**
```
Launch-PlayGuard.cmd
```

Este script automáticamente:
- Verifica y limpia la variable `ELECTRON_RUN_AS_NODE`
- Abre PlayGuard en un entorno limpio
- Muestra los logs de desarrollo en la misma ventana

### Opción 2: Usar npm script

**Desde una terminal externa (NO desde Claude Code):**
```bash
npm run dev:clean
```

Este comando ejecuta el mismo script CMD de forma automática.

### Opción 3: Si no funciona ninguna

**Reinicia tu terminal/IDE completamente:**
1. Cierra Claude Code o VS Code
2. Cierra todas las ventanas de terminal
3. Abre una terminal nueva
4. Navega a `e:\Claude Projects\PlayGuard\electron-app`
5. Ejecuta: `npm run dev`

## Notas Técnicas

- **¿Por qué VBScript?** Los archivos `.bat` y `.cmd` heredan variables de entorno del proceso padre. VBScript crea un proceso completamente aislado.
- **Entorno de desarrollo:** Este problema solo ocurre en desarrollo cuando se ejecuta desde IDEs que establecen `ELECTRON_RUN_AS_NODE`.
- **Producción:** La aplicación compilada (`.exe`) no se ve afectada por este problema.

## Verificar que Funciona

Cuando PlayGuard inicia correctamente, verás:
1. Una ventana CMD con los logs de Vite/Electron
2. La ventana de PlayGuard abre automáticamente
3. No hay errores de "Cannot read properties of undefined"

## Ayuda Adicional

Si sigues teniendo problemas, verifica:
- ✅ ADB está instalado: `adb version`
- ✅ Node.js está instalado: `node -v` (v24.13.0 o superior)
- ✅ Dependencias instaladas: `npm install`
