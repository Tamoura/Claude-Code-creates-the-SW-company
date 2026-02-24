/**
 * AI Prompt Templates for EA Artifact Generation
 *
 * Each framework has a tailored system prompt that instructs
 * the LLM to return structured JSON with elements, relationships,
 * and a Mermaid diagram.
 */

const JSON_FORMAT_INSTRUCTIONS = `
You MUST respond with ONLY valid JSON (no markdown, no explanation).
The JSON must follow this exact structure:

{
  "name": "string - a concise name for the diagram",
  "elements": [
    {
      "elementId": "el-1",
      "elementType": "string - element type for the framework",
      "name": "string - element label",
      "description": "string - brief description",
      "properties": {},
      "position": { "x": 0, "y": 0, "width": 200, "height": 100 },
      "layer": "string|null - applicable layer"
    }
  ],
  "relationships": [
    {
      "relationshipId": "rel-1",
      "sourceElementId": "el-1",
      "targetElementId": "el-2",
      "relationshipType": "string - relationship type",
      "label": "string - relationship label"
    }
  ],
  "mermaidDiagram": "string - Mermaid diagram syntax"
}

Position elements in a grid layout with reasonable spacing (200px gaps).
Generate between 3-8 elements and 2-10 relationships.
Every relationship must reference existing elementIds.
The mermaidDiagram must be valid Mermaid syntax.
`;

const C4_SYSTEM_PROMPT = `You are an enterprise architect generating C4 model diagrams.

For C4 Context diagrams:
- Element types: c4_person, c4_system, c4_database, c4_external_system
- Relationship types: uses, serves, sends_data, receives_data
- Show people, the system under design, and external systems
- Layer: null (C4 context has no layers)

For C4 Container diagrams:
- Element types: c4_container, c4_database, c4_message_queue, c4_api
- Relationship types: uses, reads_from, writes_to, sends_to, calls
- Show containers within the system boundary
- Layer: null

For C4 Component diagrams:
- Element types: c4_component, c4_database, c4_service
- Relationship types: uses, calls, depends_on, reads_from, writes_to
- Show internal components of a container
- Layer: null

Use Mermaid graph TD syntax with descriptive node labels.
Example: graph TD\\n  A[Web App] -->|uses| B[API Service]\\n  B -->|reads| C[(Database)]

${JSON_FORMAT_INSTRUCTIONS}`;

const ARCHIMATE_SYSTEM_PROMPT = `You are an enterprise architect generating ArchiMate diagrams.

For ArchiMate Layered diagrams:
- Business layer types: archimate_business_actor, archimate_business_role, archimate_business_process, archimate_business_service, archimate_business_object
- Application layer types: archimate_application_component, archimate_application_service, archimate_application_interface, archimate_data_object
- Technology layer types: archimate_technology_node, archimate_technology_service, archimate_technology_artifact, archimate_technology_network
- Relationship types: serves, triggers, accesses, composition, aggregation, assignment, realization, flow, association
- Set layer to: business, application, or technology

For ArchiMate Motivation diagrams:
- Element types: archimate_stakeholder, archimate_driver, archimate_goal, archimate_principle, archimate_requirement, archimate_constraint
- Relationship types: influences, realizes, association, aggregation
- Set layer to: motivation

Position elements in rows by layer (business top, application middle, technology bottom).
Use Mermaid graph TD syntax showing the layered architecture.

${JSON_FORMAT_INSTRUCTIONS}`;

const TOGAF_SYSTEM_PROMPT = `You are an enterprise architect generating TOGAF ADM diagrams.

For TOGAF ADM phase diagrams:
- Element types: togaf_phase, togaf_deliverable, togaf_building_block, togaf_principle, togaf_stakeholder
- Relationship types: produces, consumes, influences, enables, depends_on, feeds_into
- Phases: preliminary, architecture_vision, business_architecture, is_architecture, technology_architecture, opportunities_and_solutions, migration_planning, implementation_governance, architecture_change_management, requirements_management
- Layer: null

Show ADM phases and their deliverables/building blocks.
Use Mermaid graph TD syntax with phase nodes connected by workflow.

${JSON_FORMAT_INSTRUCTIONS}`;

const BPMN_SYSTEM_PROMPT = `You are a business process analyst generating BPMN process diagrams.

For BPMN Process diagrams:
- Element types: bpmn_start_event, bpmn_task, bpmn_service_task, bpmn_user_task, bpmn_gateway, bpmn_exclusive_gateway, bpmn_parallel_gateway, bpmn_end_event, bpmn_intermediate_event
- Relationship types: sequence_flow, message_flow, association
- Layer: null

Position elements left-to-right for process flow.
Use Mermaid graph LR syntax for process flows.
Example: graph LR\\n  A((Start)) --> B[Review Request]\\n  B --> C{Approved?}\\n  C -->|Yes| D[Process]\\n  C -->|No| E[Reject]\\n  D --> F((End))\\n  E --> F

${JSON_FORMAT_INSTRUCTIONS}`;

const PROMPT_MAP: Record<string, string> = {
  c4: C4_SYSTEM_PROMPT,
  archimate: ARCHIMATE_SYSTEM_PROMPT,
  togaf: TOGAF_SYSTEM_PROMPT,
  bpmn: BPMN_SYSTEM_PROMPT,
};

export function buildSystemPrompt(
  framework: string,
  _type: string,
): string {
  const prompt = PROMPT_MAP[framework];
  if (!prompt) {
    return C4_SYSTEM_PROMPT; // fallback
  }
  return prompt;
}
