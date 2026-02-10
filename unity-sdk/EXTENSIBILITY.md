# PlayGuard SDK - Extensibilidad Custom

## Futuras Mejoras: Custom Properties y Actions

El SDK será extensible para que cada juego pueda agregar sus propias propiedades y acciones específicas.

## Casos de Uso

### 1. Propiedades Custom del Juego
```csharp
// Ejemplo: Verificar estado del jugador
PlayGuard.RegisterCustomProperty("playerScore", () => {
    return PlayerManager.Instance.GetScore().ToString();
});

PlayGuard.RegisterCustomProperty("playerInventory", () => {
    return JsonUtility.ToJson(Inventory.Instance.GetItems());
});

PlayGuard.RegisterCustomProperty("currentLevel", () => {
    return GameManager.Instance.CurrentLevel.ToString();
});
```

**Uso en PlayGuard:**
```json
{
  "command": "getCustomProperty",
  "parameters": {
    "property": "playerScore"
  }
}
```

### 2. Acciones Custom del Juego
```csharp
// Ejemplo: Acciones de testing específicas del juego
PlayGuard.RegisterCustomAction("giveCoins", (amount) => {
    PlayerManager.Instance.AddCoins(int.Parse(amount));
});

PlayGuard.RegisterCustomAction("completeLevel", () => {
    LevelManager.Instance.ForceCompleteLevel();
});

PlayGuard.RegisterCustomAction("unlockAllLevels", () => {
    ProgressManager.Instance.UnlockAll();
});
```

**Uso en PlayGuard:**
```json
{
  "command": "executeCustomAction",
  "parameters": {
    "action": "giveCoins",
    "args": ["1000"]
  }
}
```

### 3. Comandos Custom Complejos
```csharp
// Ejemplo: Queries complejas del estado del juego
PlayGuard.RegisterCustomCommand("getQuestStatus", (questId) => {
    Quest quest = QuestManager.Instance.GetQuest(questId);
    return JsonUtility.ToJson(new {
        id = quest.Id,
        completed = quest.IsCompleted,
        progress = quest.Progress,
        objectives = quest.GetObjectives()
    });
});
```

## Implementación Propuesta (Versión 2.0)

### API Extensible

```csharp
public class PlayGuardSDK : MonoBehaviour
{
    // Dictionaries para extensiones custom
    private Dictionary<string, Func<string, string>> customCommands;
    private Dictionary<string, Func<string>> customProperties;
    private Dictionary<string, Action<string[]>> customActions;

    // Métodos públicos para registro
    public void RegisterCustomCommand(string name, Func<string, string> handler)
    {
        customCommands[name] = handler;
    }

    public void RegisterCustomProperty(string name, Func<string> getter)
    {
        customProperties[name] = getter;
    }

    public void RegisterCustomAction(string name, Action<string[]> action)
    {
        customActions[name] = action;
    }
}
```

### Ejemplo de Integración en Juego

```csharp
using PlayGuard;
using UnityEngine;

public class GameTestExtensions : MonoBehaviour
{
    void Start()
    {
        PlayGuardSDK sdk = FindObjectOfType<PlayGuardSDK>();
        if (sdk == null) return; // SDK no está activo (production build)

        // Register game-specific properties
        sdk.RegisterCustomProperty("playerName", () =>
            PlayerData.Instance.Name);

        sdk.RegisterCustomProperty("playerLevel", () =>
            PlayerData.Instance.Level.ToString());

        sdk.RegisterCustomProperty("hasCompletedTutorial", () =>
            ProgressManager.HasCompletedTutorial.ToString().ToLower());

        // Register game-specific actions
        sdk.RegisterCustomAction("skipTutorial", (args) => {
            TutorialManager.Instance.Skip();
        });

        sdk.RegisterCustomAction("addResource", (args) => {
            string resourceType = args[0];
            int amount = int.Parse(args[1]);
            ResourceManager.Instance.Add(resourceType, amount);
        });

        // Register complex commands
        sdk.RegisterCustomCommand("analyzeGameState", (param) => {
            var state = new {
                player = PlayerData.Instance.ToJson(),
                inventory = Inventory.Instance.ToJson(),
                quests = QuestManager.Instance.GetActiveQuests(),
                flags = GameFlags.Instance.GetAll()
            };
            return JsonUtility.ToJson(state);
        });

        Debug.Log("[GameTestExtensions] Custom test extensions registered");
    }
}
```

## Ventajas

### Para QA/Testers:
- ✅ Verificar estado interno del juego sin modificar código
- ✅ Ejecutar acciones de testing rápido (skip tutorials, add resources)
- ✅ Validar lógica de negocio específica del juego
- ✅ Tests más robustos (basados en estado, no solo UI)

### Para Developers:
- ✅ Mantener tests actualizados con cambios del juego
- ✅ Exponer solo lo necesario para testing
- ✅ Facilitar debugging de issues reportados
- ✅ Tests más significativos (game state > UI state)

## Casos de Uso Reales

### Test: Verificar compra en tienda
```typescript
// PlayGuard test case
{
  steps: [
    { action: "getCustomProperty", params: { property: "playerCoins" } },
    { action: "tapElement", params: { path: "Shop/BuyButton" } },
    { action: "waitForElement", params: { name: "PurchaseConfirm" } },
    { action: "tapElement", params: { path: "PurchaseConfirm/YesButton" } },
    { action: "wait", params: { duration: 1000 } },
    {
      action: "assertCustomProperty",
      params: {
        property: "playerCoins",
        expectedLessThan: initialCoins
      }
    }
  ]
}
```

### Test: Progresión de nivel
```typescript
{
  steps: [
    { action: "customAction", params: { action: "skipTutorial" } },
    { action: "customAction", params: { action: "setLevel", args: ["10"] } },
    { action: "tapElement", params: { path: "PlayButton" } },
    {
      action: "assertCustomProperty",
      params: {
        property: "currentLevel",
        expected: "10"
      }
    }
  ]
}
```

## Roadmap de Implementación

### v1.0 (MVP Actual)
- ✅ Detección de UI Canvas
- ✅ GameObjects inspection
- ✅ Acciones básicas (tap, swipe, text)

### v2.0 (Extensibilidad)
- 🔄 Custom properties registration
- 🔄 Custom actions registration
- 🔄 Custom commands registration
- 🔄 PlayGuard UI para custom properties

### v3.0 (Avanzado)
- 🔄 Hot reload de extensiones
- 🔄 Property watchers (observar cambios)
- 🔄 Event hooks (on level complete, etc.)
- 🔄 Visual debugging de properties

## Notas de Seguridad

⚠️ **IMPORTANTE**: Custom actions pueden ser peligrosas si se exponen en production.

### Buenas Prácticas:

```csharp
#if DEVELOPMENT_BUILD || UNITY_EDITOR
    // Solo registrar custom actions en development
    sdk.RegisterCustomAction("giveCoins", GiveCoinsCheat);
#endif
```

### Validación Recomendada:

```csharp
sdk.RegisterCustomAction("addResource", (args) => {
    // Validar parámetros
    if (args.Length < 2) {
        throw new ArgumentException("addResource requires 2 arguments");
    }

    string resourceType = args[0];
    if (!IsValidResourceType(resourceType)) {
        throw new ArgumentException($"Invalid resource type: {resourceType}");
    }

    int amount = int.Parse(args[1]);
    if (amount < 0 || amount > 9999) {
        throw new ArgumentException("Amount must be between 0 and 9999");
    }

    ResourceManager.Instance.Add(resourceType, amount);
});
```

## Feedback Bienvenido

Si tienes ideas para casos de uso específicos o features adicionales, contáctame!
