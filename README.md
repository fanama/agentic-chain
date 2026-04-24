# 🤖 Agentic Framework (V3)

Bienvenue dans la documentation officielle de l'**Agentic Framework V3**. Cette version marque une transition majeure d'une exécution linéaire vers une architecture en **Graphe d'États Dynamique (State Graph)**, plaçant les outils et le routage au cœur du moteur d'orchestration.

---

## 🌟 Philosophie "Tool-First"

L'expérience utilisateur est désormais centrée sur l'approche **Tool-First**. Plutôt que de créer des nœuds vides pour y assigner des fonctions a posteriori, l'architecte visualise d'abord ses capacités globales (le Registre d'outils) et les injecte directement dans son workflow. L'édition du code JavaScript brut des outils se fait à la volée, sans jamais casser la structure du graphe existant.

---

## 🏗️ Architecture du Système

Le système est divisé en trois pôles interactifs :
1. **Le Registre (Tools) :** Création, édition et listage des outils d'action.
2. **Le Graphe Builder :** Assemblage des nœuds et configuration du routage.
3. **Le Moteur d'Exécution (Runner) :** Initialisation du `StateStore`, exécution, monitoring (logs) et import/export JSON.

### Diagramme de Cas d'Utilisation


```mermaid
flowchart LR
    client[Utilisateur / Architecte]

    subgraph Registre
        createTool((Créer un Outil))
        editTool((Éditer un Outil))
        viewTools((Lister les Outils))
    end

    subgraph Graphe Builder
        addNode((Ajouter un noeud au Plan))
        configNode((Configurer Routage))
        deleteNode((Supprimer Nœud))
    end

    subgraph Moteur d'Exécution
        initPlan((Initialiser Input))
        execPlan((Exécuter Graphe))
        viewLogs((Consulter Logs & State))
        exportPlan((Exporter Graph JSON))
        loadPlan((Charger Graph JSON))
    end

    client --> createTool
    client --> editTool
    client --> viewTools

    client --> addNode
    client --> configNode
    client --> deleteNode

    client --> initPlan
    client --> execPlan
    client --> viewLogs
    client --> loadPlan
    client --> exportPlan

    addNode --> viewTools 
    execPlan --> configNode 
```

### Architecture des Classes (Pattern Polymorphe)

Les outils d'action (`ToolStep`) et de routage (`ConditionStep`, `LoopStep`) héritent de la même interface et sont traités sur un pied d'égalité par le moteur.

```mermaid
classDiagram
    direction TB

    class StateStore {
        -Object context
        +update(key, value) void
        +getAll() Object
    }

    class ToolRegistry {
        -Map tools
        +set(id, tool) void
        +get(id) Tool
    }

    class Tool {
        +UUID id
        +String desc
        +String execFnString
        -Function executeFn
        +execute(context: Object) Promise~Result~
    }

    class Step {
        <<Interface>>
        +UUID id
        +execute(context: Object, logger) Promise~Step~
    }

    class ToolStep {
        +UUID tool_id
        +UUID next_step_id
    }

    class ConditionStep {
        +String condition_expression
        +UUID true_step_id
        +UUID false_step_id
    }

    ToolRegistry "1" *-- "*" Tool : stocke
    Step <|-- ToolStep : implémente
    Step <|-- ConditionStep : implémente

    ToolStep "*" --> "1" Tool : référence
    ToolStep "*" --> "1" Step : pointe vers (next)
    ConditionStep "*" --> "2" Step : pointe vers (true/false)
```

---

## 🔄 Flux de Travail (Exécution)

Lors du clic sur **Démarrer l'Agent**, le moteur opère en deux phases distinctes :

1. **La Compilation (Wiring) :** Le *Wiring Engine* lit la configuration textuelle de l'UI (les IDs), instancie les objets `Step` en mémoire, et transforme les chaînes de caractères en véritables pointeurs d'objets JavaScript imbriqués.
2. **L'Exécution Dynamique :** Le moteur lance le nœud racine et laisse le graphe s'auto-naviguer jusqu'à sa fin (ou jusqu'à atteindre la limite de sécurité anti-boucle infinie).

```mermaid
graph TD
    A[/Input JSON Initial/] --> Init[Initialisation du StateStore]
    Init --> Compiler[Phase de Wiring : Lier les IDs aux Objets JS]
    Compiler --> Fetch[Récupérer le Nœud Actuel]

    Fetch --> CheckType{Type de Nœud ?}

    %% Cas 1 : Tool
    CheckType -- "ToolStep" --> ExecTool[Exécuter fonction JS de l'Outil]
    ExecTool --> SaveState[Sauvegarder résultat dans StateStore via 'outputKey']
    SaveState --> RouteTool[Pointer vers 'nextId']

    %% Cas 2 : Condition
    CheckType -- "ConditionStep" --> EvalCond[Évaluer l'expression JS]
    EvalCond --> IsCondTrue{Résultat booléen ?}
    IsCondTrue -- "VRAI" --> RouteTrue[Pointer vers 'trueId']
    IsCondTrue -- "FAUX" --> RouteFalse[Pointer vers 'falseId']

    %% Consolidation
    RouteTool --> NextNode
    RouteTrue --> NextNode
    RouteFalse --> NextNode

    NextNode{Pointeur existe ? Limite de sécurité OK ?}
    NextNode -- "VRAI" --> Fetch
    NextNode -- "FAUX" --> End((Fin de l'Exécution))
```

---

## 🧩 Composants Clés & Évolutions (V2 vs V3)

| Composant | Rôle dans la V3 | Évolution majeure |
| :--- | :--- | :--- |
| **ToolRegistry** | Catalogue d'outils central. | Interface unifiée. Verrouillage de l'ID lors de l'édition pour garantir l'intégrité du graphe. |
| **Tool** | Logique métier isolée. | Stocke le code JS brut (`execFnString`) permettant l'édition dynamique via l'interface utilisateur. |
| **StateStore** | Mémoire centrale ("cerveau"). | Injecté directement dans l'exécution via l'objet JS global `state`. Permet un accès/mutation via `state.variable`. |
| **Nodes (UI)** | Représentation visuelle du graphe. | Utilisation d'identifiants stricts (`etape_1`) pour un câblage réseau bidirectionnel remplaçant la liste linéaire. |
| **Wiring Engine** | Compilateur pré-exécution. | **Nouveauté :** Rend le graphe 100% autonome en transformant l'UI déclarative en graphe d'objets liés en mémoire. |

---

## 🗺️ Expérience Architecte (User Journey)

L'utilisation du framework suit un parcours fluide, conçu pour l'itération rapide :

```mermaid
journey
    title Cycle de vie d'un workflow
    
    section 1. Préparation (Registry)
      Création d'outils JS personnalisés: 5: Architecte
      Test de validation de la syntaxe JS: 4: Système
      Modification d'outils existants (Édition): 5: Architecte
      
    section 2. Assemblage (Graphe Builder)
      Clic direct sur '+ Ajouter au Plan': 5: Architecte
      Génération d'un NodeID auto (ex: etape_1): 4: Système
      Configuration du routage (true/false/next): 4: Architecte
      
    section 3. Exécution & Monitoring
      Définition du Nœud Racine et Input JSON: 5: Architecte
      Compilation (Instanciation & Câblage objet): 5: Système
      Mise à jour en temps réel du StateStore: 5: Système
      Affichage détaillé des logs (Succès/Warn/Err): 4: Système
```
