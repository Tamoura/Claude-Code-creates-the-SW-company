# Knowledge Graph System

**Phase 3 Enhancement**: Visual representation of all company knowledge, relationships, and dependencies.

## Purpose

Create a queryable graph of all knowledge in the company:
- Products and their relationships
- Features and dependencies
- Agents and their expertise
- Decisions and their context
- Patterns and their usage
- Bugs and their fixes

## Graph Schema

```
NODES:
├── Product
├── Feature
├── Component
├── Agent
├── Pattern
├── Decision
├── Bug
├── Test
└── Deployment

RELATIONSHIPS:
├── DEPENDS_ON
├── USED_BY
├── CREATED_BY
├── FIXED_BY
├── TESTED_BY
├── DEPLOYED_TO
├── IMPLEMENTS
├── BLOCKS
└── SIMILAR_TO
```

## Node Types

### Product Node

```typescript
interface ProductNode {
  id: string;                    // "stablecoin-gateway"
  type: "Product";
  name: string;
  status: "planning" | "development" | "production";
  created_at: string;
  tech_stack: {
    frontend: string[];
    backend: string[];
    database: string;
  };
  metrics: {
    lines_of_code: number;
    test_coverage: number;
    deployment_count: number;
  };
}

// Relationships
PRODUCT --CONTAINS--> FEATURE
PRODUCT --USES--> PATTERN
PRODUCT --DEVELOPED_BY--> AGENT
PRODUCT --DEPLOYED_TO--> ENVIRONMENT
```

### Feature Node

```typescript
interface FeatureNode {
  id: string;                    // "user-authentication"
  type: "Feature";
  name: string;
  status: "pending" | "in_progress" | "complete";
  created_at: string;
  complexity: "low" | "medium" | "high";
}

// Relationships
FEATURE --BELONGS_TO--> PRODUCT
FEATURE --DEPENDS_ON--> FEATURE
FEATURE --IMPLEMENTED_BY--> AGENT
FEATURE --TESTED_BY--> TEST
FEATURE --USES--> PATTERN
```

### Component Node

```typescript
interface ComponentNode {
  id: string;                    // "LoginForm"
  type: "Component";
  file_path: string;
  language: string;              // "TypeScript"
  lines_of_code: number;
  complexity_score: number;
}

// Relationships
COMPONENT --PART_OF--> FEATURE
COMPONENT --DEPENDS_ON--> COMPONENT
COMPONENT --USES--> PATTERN
COMPONENT --TESTED_BY--> TEST
```

### Agent Node

```typescript
interface AgentNode {
  id: string;                    // "backend-engineer"
  type: "Agent";
  expertise: string[];
  tasks_completed: number;
  success_rate: number;
  learned_patterns: number;
}

// Relationships
AGENT --CREATED--> FEATURE
AGENT --FIXED--> BUG
AGENT --KNOWS--> PATTERN
AGENT --MADE--> DECISION
```

### Pattern Node

```typescript
interface PatternNode {
  id: string;                    // "PATTERN-001"
  type: "Pattern";
  name: string;
  category: string;              // "backend", "frontend", etc.
  confidence: number;            // 0.0 - 1.0
  times_applied: number;
  success_rate: number;
}

// Relationships
PATTERN --LEARNED_BY--> AGENT
PATTERN --USED_IN--> PRODUCT
PATTERN --USED_IN--> FEATURE
PATTERN --SIMILAR_TO--> PATTERN
```

### Decision Node

```typescript
interface DecisionNode {
  id: string;                    // "DEC-001"
  type: "Decision";
  question: string;
  chosen_option: string;
  alternatives: string[];
  rationale: string;
  made_by: string;               // Agent or CEO
  date: string;
}

// Relationships
DECISION --AFFECTS--> PRODUCT
DECISION --AFFECTS--> FEATURE
DECISION --MADE_BY--> AGENT
DECISION --RESULTED_IN--> PATTERN
```

### Bug Node

```typescript
interface BugNode {
  id: string;                    // "BUG-042"
  type: "Bug";
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "fixed" | "wontfix";
  created_at: string;
  fixed_at?: string;
}

// Relationships
BUG --FOUND_IN--> FEATURE
BUG --FIXED_BY--> AGENT
BUG --FIXED_IN--> DEPLOYMENT
BUG --SIMILAR_TO--> BUG
BUG --CAUSED_BY--> COMPONENT
```

## Example Queries

### Query 1: Product Dependencies

```cypher
// "What does stablecoin-gateway depend on?"

MATCH (p:Product {id: 'stablecoin-gateway'})-[:USES]->(pattern:Pattern)
RETURN p.name, pattern.name, pattern.category

RESULT:
| Product          | Pattern                | Category  |
|------------------|------------------------|-----------|
| stablecoin-gateway   | Next.js 14 Setup       | frontend  |
| stablecoin-gateway   | Tailwind Configuration | frontend  |
| stablecoin-gateway   | Vitest Testing         | testing   |
```

### Query 2: Agent Expertise

```cypher
// "What has backend-engineer worked on?"

MATCH (agent:Agent {id: 'backend-engineer'})-[:CREATED]->(feature:Feature)
MATCH (feature)-[:BELONGS_TO]->(product:Product)
RETURN agent.name, product.name, feature.name, feature.status

RESULT:
| Agent             | Product              | Feature           | Status   |
|-------------------|----------------------|-------------------|----------|
| backend-engineer  | stablecoin-gateway       | Calculator API    | complete |
| backend-engineer  | analytics-dashboard  | Pricing Endpoint  | complete |
| backend-engineer  | user-portal          | Auth Middleware   | complete |
```

### Query 3: Pattern Usage

```cypher
// "Where is Prisma Connection Pooling pattern used?"

MATCH (pattern:Pattern {name: 'Prisma Connection Pooling'})-[:USED_IN]->(product:Product)
RETURN pattern.name, product.name, pattern.confidence

RESULT:
| Pattern                    | Product              | Confidence |
|----------------------------|----------------------|------------|
| Prisma Connection Pooling  | user-portal          | 1.0        |
| Prisma Connection Pooling  | analytics-dashboard  | 1.0        |
| Prisma Connection Pooling  | meetingmind     | 1.0        |
```

### Query 4: Feature Dependencies

```cypher
// "What would break if I change user-authentication?"

MATCH (auth:Feature {id: 'user-authentication'})<-[:DEPENDS_ON]-(dependent:Feature)
MATCH (dependent)-[:BELONGS_TO]->(product:Product)
RETURN auth.name, dependent.name, product.name

RESULT:
| Feature             | Dependent On Auth        | Product         |
|---------------------|--------------------------|-----------------|
| user-authentication | User Profile Management  | user-portal     |
| user-authentication | Session Management       | user-portal     |
| user-authentication | API Key Management       | analytics-dash  |
```

### Query 5: Similar Bugs

```cypher
// "Has this bug happened before?"

MATCH (bug:Bug {description: 'Tailwind CSS not loading in production'})
MATCH (similar:Bug)-[:SIMILAR_TO]->(bug)
MATCH (similar)-[:FIXED_BY]->(agent:Agent)
RETURN similar.id, similar.description, agent.name, similar.solution

RESULT:
| Bug ID  | Description                      | Fixed By          | Solution              |
|---------|----------------------------------|-------------------|-----------------------|
| BUG-015 | Tailwind classes not applying    | frontend-engineer | Update config path    |
| BUG-027 | PostCSS not finding tailwind     | frontend-engineer | Add to package.json   |
```

### Query 6: Critical Path

```cypher
// "What's the critical path for releasing analytics-dashboard?"

MATCH path = (start:Feature {status: 'pending'})-[:DEPENDS_ON*]->(end:Feature)
WHERE (start)-[:BELONGS_TO]->(:Product {id: 'analytics-dashboard'})
WITH path, length(path) as len
ORDER BY len DESC
LIMIT 1
RETURN [node in nodes(path) | node.name] as critical_path

RESULT:
| Critical Path                                                    |
|------------------------------------------------------------------|
| [Dashboard UI, API Endpoints, Database Schema, Auth Integration] |
```

### Query 7: Agent Learning Path

```cypher
// "What patterns has frontend-engineer learned over time?"

MATCH (agent:Agent {id: 'frontend-engineer'})-[:LEARNED]->(pattern:Pattern)
RETURN pattern.name, pattern.learned_from, pattern.times_applied
ORDER BY pattern.learned_from DESC

RESULT:
| Pattern                    | Learned From         | Times Applied |
|----------------------------|----------------------|---------------|
| Tailwind Config Fix        | stablecoin-gateway       | 3             |
| Component Memo Optimization| deal-flow-platform      | 2             |
| E2E Test Flakiness Fix     | meetingmind     | 1             |
```

## Visualization

### Product Ecosystem Map

```
      stablecoin-gateway
          ├─ Features
          │   ├─ Training Calculator
          │   ├─ Inference Calculator
          │   └─ Cost Estimator
          ├─ Patterns Used
          │   ├─ Next.js 14 Setup
          │   ├─ Tailwind Config
          │   └─ Vitest Testing
          └─ Agents
              ├─ frontend-engineer (5 features)
              ├─ backend-engineer (2 features)
              └─ qa-engineer (8 tests)
```

### Dependency Graph

```
Feature: User Dashboard
    │
    ├─DEPENDS_ON─> User Authentication
    │                   │
    │                   └─DEPENDS_ON─> Database Schema
    │
    ├─DEPENDS_ON─> API Client
    │                   │
    │                   └─DEPENDS_ON─> API Endpoints
    │                                       │
    │                                       └─DEPENDS_ON─> Database Schema
    │
    └─DEPENDS_ON─> UI Components
                        │
                        └─USES─> Component Library Pattern
```

## Auto-Population

Graph is automatically populated from:

### 1. Task Graphs

```typescript
// When task completes, update graph

taskComplete(task) {
  // Create feature node if new feature
  if (task.type === 'feature') {
    createNode({
      type: 'Feature',
      id: task.id,
      name: task.name,
      status: 'complete'
    });

    // Create relationships
    createRelationship(feature, product, 'BELONGS_TO');
    createRelationship(agent, feature, 'CREATED');

    // Dependencies
    task.depends_on.forEach(dep => {
      createRelationship(feature, dep, 'DEPENDS_ON');
    });
  }
}
```

### 2. Agent Memory

```typescript
// When agent learns pattern, update graph

agentLearnsPattern(agent, pattern) {
  // Create or update pattern node
  const patternNode = upsertNode({
    type: 'Pattern',
    id: pattern.id,
    name: pattern.name,
    times_applied: pattern.times_applied + 1
  });

  // Create relationship
  createRelationship(agent, patternNode, 'LEARNED');
  createRelationship(patternNode, product, 'USED_IN');
}
```

### 3. Decision Log

```typescript
// When decision made, add to graph

logDecision(decision) {
  const decisionNode = createNode({
    type: 'Decision',
    id: decision.id,
    question: decision.question,
    chosen: decision.chosen_option
  });

  createRelationship(decision, product, 'AFFECTS');
  createRelationship(agent, decision, 'MADE');

  // If decision resulted in pattern
  if (decision.resulted_in_pattern) {
    createRelationship(decision, pattern, 'RESULTED_IN');
  }
}
```

### 4. Bug Tracking

```typescript
// When bug reported and fixed

fixBug(bug) {
  const bugNode = createNode({
    type: 'Bug',
    id: bug.id,
    severity: bug.severity,
    status: 'fixed'
  });

  createRelationship(bug, feature, 'FOUND_IN');
  createRelationship(agent, bug, 'FIXED');
  createRelationship(bug, deployment, 'FIXED_IN');

  // Find similar bugs
  const similar = findSimilarBugs(bug);
  similar.forEach(sim => {
    createRelationship(bug, sim, 'SIMILAR_TO');
  });
}
```

## Dashboard Integration

```bash
/orchestrator knowledge graph [query]

# Examples:
/orchestrator knowledge graph "What does stablecoin-gateway depend on?"
/orchestrator knowledge graph "Show me all bugs in user-authentication"
/orchestrator knowledge graph "Which patterns are used most?"
/orchestrator knowledge graph "What has backend-engineer created?"
```

### Graph View in Dashboard

```markdown
## Knowledge Graph

**Node Count**: 245
- Products: 4
- Features: 42
- Components: 156
- Patterns: 15
- Decisions: 18
- Bugs (fixed): 10

**Relationship Count**: 892

**Most Connected**:
- user-authentication (38 connections)
- Tailwind Configuration pattern (12 uses)
- backend-engineer (45 creations)

**Insights**:
- Feature "API Client" blocks 5 other features
- Pattern "Prisma Pooling" used in all products
- Backend engineer has 100% success rate on Auth features
```

## Benefits

### 1. Impact Analysis

**Question**: "What breaks if I change the database schema?"

**Graph Query**:
```cypher
MATCH (schema:Component {name: 'Database Schema'})<-[:DEPENDS_ON]-(affected)
RETURN affected.type, affected.name
```

**Result**: Instant list of affected features/components

### 2. Knowledge Discovery

**Question**: "Has anyone solved this problem before?"

**Graph Query**:
```cypher
MATCH (problem:Bug {description: CONTAINS 'memory leak'})-[:FIXED_BY]->(agent)
MATCH (agent)-[:USED_PATTERN]->(pattern)
RETURN pattern.name, pattern.solution
```

**Result**: Find past solutions and who knows them

### 3. Team Expertise

**Question**: "Who knows about authentication?"

**Graph Query**:
```cypher
MATCH (agent:Agent)-[:CREATED|FIXED]->(item)-[:RELATES_TO]->(:Tag {name: 'authentication'})
RETURN agent.name, count(item) as expertise_score
ORDER BY expertise_score DESC
```

**Result**: Ranked list of agents by expertise

### 4. Technical Debt Visualization

**Question**: "What's our most critical technical debt?"

**Graph Query**:
```cypher
MATCH (component:Component)
WHERE component.complexity_score > 20
  AND component.test_coverage < 0.7
  AND size((component)<-[:DEPENDS_ON]-()) > 5
RETURN component.name, component.complexity_score, component.dependents
ORDER BY component.dependents DESC
```

**Result**: Components that are complex, poorly tested, and widely used

## Storage

### Neo4j Implementation

```typescript
// Example: Using Neo4j driver

import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

async function addProduct(product: ProductNode) {
  const session = driver.session();

  try {
    await session.run(
      `CREATE (p:Product {
        id: $id,
        name: $name,
        status: $status,
        created_at: $created_at
      })`,
      product
    );
  } finally {
    await session.close();
  }
}

async function query(cypher: string, params: any = {}) {
  const session = driver.session();

  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => record.toObject());
  } finally {
    await session.close();
  }
}
```

### Alternative: JSON File Storage

For simpler implementation without Neo4j:

```json
{
  "nodes": [
    {
      "id": "stablecoin-gateway",
      "type": "Product",
      "properties": { "name": "Stablecoin Gateway", "status": "production" }
    },
    {
      "id": "PATTERN-001",
      "type": "Pattern",
      "properties": { "name": "Prisma Pooling", "confidence": 1.0 }
    }
  ],
  "relationships": [
    {
      "from": "stablecoin-gateway",
      "to": "PATTERN-001",
      "type": "USES"
    }
  ]
}
```

Query with JavaScript:

```typescript
function findConnected(nodeId: string, relationshipType: string) {
  return graph.relationships
    .filter(r => r.from === nodeId && r.type === relationshipType)
    .map(r => graph.nodes.find(n => n.id === r.to));
}
```

## Future Enhancements

- **Visual Explorer**: Web UI for exploring graph visually
- **AI-Powered Insights**: LLM analyzes graph for insights
- **Predictive Analysis**: Predict where bugs likely to occur
- **Automated Refactoring Suggestions**: Find coupling, suggest improvements
- **Skills Matrix**: Auto-generate team skills matrix from graph
- **Onboarding**: New agents explore graph to learn codebase
