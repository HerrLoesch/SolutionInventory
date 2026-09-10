// Seed data for the "Software System Interview" catalog: an additional,
// built-in catalog shipped alongside the exhaustive Standard Catalog
// (categoriesService.js). Built by buildInterviewCatalog in catalogService.js.
//
// Design intent (differs from the Standard Catalog on purpose):
//   - It structures an *interview* about a software system, so it is curated
//     and consolidated (fewer, higher-signal aspects) and ordered as a natural
//     conversation: context → domain → architecture → stack → cross-cutting →
//     delivery → operations → hardware.
//   - Every aspect separates Practices (patterns/methodologies) from Tools
//     (concrete technologies) using the typed example model (§3.1a). This is
//     the whole point: Practices roll up into candidate *reference
//     architectures*, Tools roll up into candidate *toolchains* (the roll-up
//     itself happens outside SolutionInventory).
//   - `description` on each entry is phrased as interviewer guidance ("what to
//     probe / why it matters") rather than a neutral definition.
//
// The executionType / architecturalRole option vocabularies are kept identical
// to the Standard Catalog so that `appliesTo` conditions reference valid values
// and the (hardcoded) metadata fill-in form works the same way for both
// catalogs. If one drifts, appliesTo stays self-consistent within this catalog
// but instances made from different catalogs would diverge, so keep them in sync.

const EXECUTION_TYPE_OPTIONS = [
  { label: 'Not specified', description: 'Applicability is not yet determined. All questions will be shown.' },
  {
    label: 'Web Application',
    description: 'Runs in a web browser. Includes Single Page Applications (SPAs) and traditional Thin Clients.'
  },
  {
    label: 'Desktop Application',
    description: "Installed and executed directly on a user's local operating system (Rich/Thick Client)."
  },
  {
    label: 'Mobile Application',
    description: 'Native or hybrid application running on mobile devices (iOS / Android).'
  },
  {
    label: 'Headless Service / API',
    description: 'Backend system providing interfaces or data without a graphical user interface.'
  },
  {
    label: 'Background Worker / Daemon',
    description: 'Asynchronous process running continuously or scheduled in the background.'
  },
  {
    label: 'Embedded / IoT',
    description: 'Software running directly on specialized, often resource-constrained hardware or devices.'
  }
]

const ARCHITECTURAL_ROLE_OPTIONS = [
  { label: 'Not specified', description: 'Applicability is not yet determined. All questions will be shown.' },
  { label: 'Standalone System', description: 'An independent, self-contained application.' },
  { label: 'Domain Service / Microservice', description: 'A specialized service owning a specific business domain.' },
  {
    label: 'Integration Bridge / Middleware',
    description: 'A system primarily responsible for connecting, translating, or synchronizing data.'
  },
  {
    label: 'Add-on / Plugin',
    description:
      'An extension module that adds functionality to a larger host application and cannot run independently.'
  },
  {
    label: 'AI / ML Inference Engine',
    description: 'A dedicated service or worker executing machine learning models or generating predictions.'
  }
]

// Frequently-reused appliesTo value sets, so the same intent stays spelled
// identically everywhere (a typo here would only cost a validateCatalog warning,
// but consistency keeps the interview logic predictable).
const SERVER_SIDE_ROLES = [
  'Standalone System',
  'Domain Service / Microservice',
  'Integration Bridge / Middleware',
  'AI / ML Inference Engine'
]
const DISTRIBUTED_ROLES = ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware']
const UI_EXECUTION_TYPES = ['Web Application', 'Desktop Application', 'Mobile Application']

function practice(label, description = '') {
  return { type: 'practice', label, description }
}
function tool(label, description = '') {
  return { type: 'tool', label, description }
}

export function getInterviewCatalogData() {
  return {
    statusOptions: [
      { label: 'Adopt', description: 'We use this and recommend it.' },
      { label: 'Trial', description: 'We are testing this in selected production scenarios.' },
      { label: 'Assess', description: 'We are currently evaluating/testing this.' },
      { label: 'Hold', description: 'We use this, but do not recommend it for new features.' },
      { label: 'Retire', description: 'We are actively replacing or removing this.' }
    ],
    applicabilityOptions: ['applicable', 'not applicable', 'unknown'],
    categories: [
      {
        id: 'context',
        title: 'System Context',
        desc: 'Identity and shape of the interviewed system. Drives which later questions apply.',
        isMetadata: true,
        // Field keys match the (hardcoded) questionnaire metadata fill-in form
        // in Questionnaire.vue exactly (same shape as the Standard Catalog),
        // so every field renders and round-trips. executionType /
        // architecturalRole are the two that drive appliesTo visibility.
        metadata: {
          productName: '',
          company: '',
          department: '',
          contactPerson: '',
          description: '',
          executionType: '',
          architecturalRole: ''
        },
        metadataOptions: {
          executionType: EXECUTION_TYPE_OPTIONS,
          architecturalRole: ARCHITECTURAL_ROLE_OPTIONS
        }
      },
      {
        id: 'domain',
        title: 'Business & Domain Context',
        desc: 'Why the system exists. This framing is what makes a reference architecture meaningful.',
        entries: [
          {
            id: 'dom-capability',
            aspect: 'Business Capability & Value',
            description:
              'Open the interview here: what business capability does the system provide, and how central is it? A core domain justifies more architectural investment than a generic or supporting one.',
            examples: [
              practice('Core Domain', 'The competitive-differentiator capability the organization builds itself.'),
              practice('Supporting Subdomain', 'Necessary but not differentiating; often built pragmatically.'),
              practice('Generic Subdomain', 'A solved problem better bought or adopted off-the-shelf.')
            ]
          },
          {
            id: 'dom-complexity',
            aspect: 'Domain Complexity',
            description:
              'Probe how much genuine business logic lives in the system. This is the single strongest signal for whether patterns like DDD, CQRS or a rich domain model are warranted.',
            examples: [
              practice('CRUD-Oriented', 'Mostly create/read/update/delete over forms and records.'),
              practice('Rich Domain Logic', 'Complex invariants, calculations and business rules.'),
              practice('Workflow / Process-Centric', 'Long-running, multi-step business processes.'),
              practice('Analytical / Data-Centric', 'Aggregation, reporting and insight generation dominate.')
            ]
          },
          {
            id: 'dom-users',
            aspect: 'Primary Users & Access Context',
            description:
              'Who consumes the system and from where. Shapes authentication, tenancy, availability and UI expectations.',
            examples: [
              practice('Internal Staff', 'Employees on a managed/trusted network.'),
              practice('External Customers (B2C)', 'Public, high-scale, untrusted clients.'),
              practice('Business Partners (B2B)', 'Federated organizations with contractual access.'),
              practice('Machine / System Clients', 'Other systems calling APIs, no human UI.')
            ]
          },
          {
            id: 'dom-lifecycle',
            aspect: 'Lifecycle & Evolution Stage',
            description:
              'Where the system sits in its life. Distinguishes recommendations that add capability (greenfield) from those that manage risk and modernization (legacy).',
            examples: [
              practice('Greenfield / MVP', 'Early build, architecture still forming.'),
              practice('Active Growth', 'Feature-rich, evolving under load.'),
              practice('Mature / Maintenance', 'Stable, change is cautious and incremental.'),
              practice('Legacy / Sunset', 'Being contained, replaced or decommissioned.')
            ]
          },
          {
            id: 'dom-drivers',
            aspect: 'Key Constraints & Quality Drivers',
            description:
              'The non-functional forces that dominate design decisions. Capture the two or three that actually constrain choices, not a wish list.',
            examples: [
              practice('Regulatory / Compliance', 'GDPR, HIPAA, ISO, industry certification, auditability.'),
              practice('High Availability', 'Strict uptime / SLA obligations.'),
              practice('Data Sovereignty', 'Geographic or on-premise data-residency requirements.'),
              practice('Cost Sensitivity', 'Infrastructure and licensing cost is a primary constraint.'),
              practice('Time-to-Market', 'Speed of delivery outweighs long-term polish.')
            ]
          }
        ]
      },
      {
        id: 'architecture',
        title: 'Architecture & Patterns',
        desc: 'Structural patterns, the primary source of candidate reference architectures.',
        entries: [
          {
            id: 'arch-style',
            aspect: 'Architectural Style',
            description:
              'The foundational structuring principle of the codebase. Ask how dependencies flow and where the domain logic lives.',
            examples: [
              practice('Layered / N-Tier', 'Presentation, business and data-access layers.'),
              practice('Hexagonal / Ports & Adapters', 'Domain core isolated behind technical adapters.'),
              practice('Clean Architecture', 'Concentric layers, dependencies point inward.'),
              practice('Event-Driven', 'Components react to and emit domain events.'),
              practice('Plugin / Modular', 'Core with runtime-loadable extension modules.')
            ]
          },
          {
            id: 'arch-decomposition',
            aspect: 'Deployment Decomposition',
            description:
              'How the system is split into independently deployable units. A key axis for the target reference architecture.',
            examples: [
              practice('Monolith', 'Single deployable containing all logic.'),
              practice('Modular Monolith', 'One deployable, strictly isolated internal modules.'),
              practice('Microservices', 'Independently deployed services per capability.'),
              practice('Serverless / Functions', 'Event-triggered, individually deployed functions.')
            ]
          },
          {
            id: 'arch-communication',
            aspect: 'Inter-Component Communication',
            description:
              'How parts of the system (and its clients) talk to each other. Synchronous vs. asynchronous is decisive for coupling and resilience.',
            examples: [
              practice('Synchronous Request/Response', 'Blocking calls, caller waits for a reply.'),
              practice('Asynchronous Messaging', 'Decoupled via queues; fire-and-forget or callbacks.'),
              practice('Event Streaming', 'Continuous event log consumed by many subscribers.'),
              tool('HTTP / REST', 'OpenAPI-described resource APIs.'),
              tool('gRPC'),
              tool('GraphQL'),
              tool('WebSocket / SignalR'),
              tool('Apache Kafka'),
              tool('RabbitMQ')
            ]
          },
          {
            id: 'arch-integration',
            aspect: 'Integration & API Strategy',
            appliesTo: { architecturalRole: DISTRIBUTED_ROLES },
            description:
              'How external and internal integration points are mediated. Reveals the seams where the system meets its ecosystem.',
            examples: [
              practice('API Gateway', 'Single managed entry point routing to internal APIs.'),
              practice('Backend-for-Frontend (BFF)', 'Client-tailored aggregation layer.'),
              practice(
                'Anti-Corruption Layer / Adapter',
                'Translation shielding the domain from legacy/external models.'
              ),
              practice('Direct Point-to-Point', 'Components call each other directly, no mediation.'),
              tool('Kong'),
              tool('YARP'),
              tool('Spring Cloud Gateway'),
              tool('Azure API Management')
            ]
          },
          {
            id: 'arch-data-pattern',
            aspect: 'Data & Persistence Pattern',
            appliesTo: { architecturalRole: DISTRIBUTED_ROLES },
            description:
              'The conceptual approach to reads and writes. Distinguishes simple record-keeping from designs that separate or reconstruct state.',
            examples: [
              practice('Standard CRUD', 'Direct object-to-table mapping.'),
              practice('CQRS', 'Separate models for reads and writes.'),
              practice('Event Sourcing', 'State derived from an append-only event log.'),
              practice('Saga / Process Manager', 'Distributed transactions via coordinated local steps.')
            ]
          },
          {
            id: 'arch-consistency',
            aspect: 'Consistency Model',
            appliesTo: { architecturalRole: DISTRIBUTED_ROLES },
            description:
              'The target data-consistency guarantee across nodes/services. Only meaningful once state is distributed, so probe how staleness is tolerated.',
            examples: [
              practice('Strong Consistency', 'Reads always reflect the latest write.'),
              practice('Eventual Consistency', 'State converges over time; stale reads possible.'),
              practice('Read-Your-Writes', 'A client always sees its own prior writes.')
            ]
          },
          {
            id: 'arch-state',
            aspect: 'State & Session Model',
            appliesTo: { architecturalRole: DISTRIBUTED_ROLES },
            description: 'Where runtime/session state is held. Dictates horizontal scalability and failover behavior.',
            examples: [
              practice('Stateless Services', 'No server-side session state retained.'),
              practice('Stateful In-Memory', 'Session/domain state held in the process.'),
              practice('Distributed-Cache-Backed', 'State offloaded to a shared cache.'),
              tool('Redis'),
              tool('Hazelcast')
            ]
          },
          {
            id: 'arch-tenancy',
            aspect: 'Multi-Tenancy Model',
            appliesTo: {
              architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'AI / ML Inference Engine']
            },
            description:
              'For systems serving multiple customers/tenants: how data and compute are isolated between them. A defining choice for SaaS reference architectures and a frequent source of security and cost trade-offs.',
            examples: [
              practice('Isolated Silo', 'Dedicated infrastructure and database per tenant.'),
              practice('Shared Compute / Isolated Data', 'Shared app instances, separate databases per tenant.'),
              practice('Fully Pooled', 'All tenants share compute and database, separated by a tenant key.'),
              practice('Single-Tenant', 'The system serves exactly one organization.')
            ]
          },
          {
            id: 'arch-ai',
            aspect: 'AI / ML Integration',
            description:
              'If and how intelligence is built in. A fast-moving area worth probing for both pattern and provider lock-in.',
            examples: [
              practice('Retrieval-Augmented Generation (RAG)', 'LLM prompts augmented with retrieved context.'),
              practice('Embedded ML Model', 'Model executed inside the application process.'),
              practice('Agentic Workflow', 'Autonomous agents making decisions and tool calls.'),
              practice('External Cognitive API', 'Delegated to a managed AI service.'),
              tool('OpenAI API'),
              tool('Anthropic Claude API'),
              tool('Azure OpenAI'),
              tool('LangChain'),
              tool('pgvector')
            ]
          }
        ]
      },
      {
        id: 'stack',
        title: 'Technology Stack',
        desc: 'The concrete technologies in use, the primary source of candidate toolchains.',
        entries: [
          {
            id: 'stack-backend',
            aspect: 'Backend Language & Runtime',
            appliesTo: { architecturalRole: SERVER_SIDE_ROLES },
            description: 'The platform the server-side / core logic runs on. Anchors the entire backend toolchain.',
            examples: [
              practice('Managed Runtime (JIT/AOT)', 'VM-based platforms with a managed heap.'),
              practice('Interpreted / Scripting', 'Dynamically typed interpreted runtimes.'),
              tool('.NET / ASP.NET Core'),
              tool('JVM (Java / Kotlin)'),
              tool('Node.js'),
              tool('Python'),
              tool('Go')
            ]
          },
          {
            id: 'stack-frontend',
            aspect: 'Frontend Stack',
            appliesTo: { executionType: UI_EXECUTION_TYPES },
            description:
              'The client-side UI architecture and framework. Only relevant when the system has a user interface.',
            examples: [
              practice('Web SPA', 'Browser-based single-page application.'),
              practice('Server-Rendered / MPA', 'Server-rendered pages, optional progressive enhancement.'),
              practice('Native Desktop', 'Compiled for a specific desktop OS.'),
              practice('Hybrid (Web-in-Native)', 'Web technologies in a native shell.'),
              tool('React'),
              tool('Angular'),
              tool('Vue.js'),
              tool('Blazor'),
              tool('WPF'),
              tool('Electron'),
              tool('Flutter')
            ]
          },
          {
            id: 'stack-framework',
            aspect: 'Core Application Framework',
            appliesTo: { architecturalRole: SERVER_SIDE_ROLES },
            description:
              'The dominant application/web framework shaping backend conventions (routing, DI, middleware).',
            examples: [
              tool('ASP.NET Core'),
              tool('Spring Boot'),
              tool('NestJS'),
              tool('Express'),
              tool('Django'),
              tool('FastAPI'),
              tool('Ruby on Rails')
            ]
          },
          {
            id: 'stack-persistence',
            aspect: 'Primary Data Store',
            appliesTo: { architecturalRole: SERVER_SIDE_ROLES },
            description:
              'The main persistence technology and its family. Probe why it was chosen. The fit to the data shape matters more than the brand.',
            examples: [
              practice('Relational (RDBMS)', 'Structured, ACID-compliant tables.'),
              practice('Document Store', 'Semi-structured document-oriented data.'),
              practice('Key-Value / Cache', 'Fast retrieval by key, often in memory.'),
              practice('Search Engine', 'Optimized for full-text and faceted search.'),
              practice('Vector Store', 'High-dimensional embeddings for semantic search.'),
              tool('PostgreSQL'),
              tool('Microsoft SQL Server'),
              tool('MongoDB'),
              tool('Redis'),
              tool('Elasticsearch'),
              tool('Pinecone')
            ]
          },
          {
            id: 'stack-messaging',
            aspect: 'Messaging & Streaming Infrastructure',
            appliesTo: { architecturalRole: DISTRIBUTED_ROLES },
            description:
              'The middleware carrying asynchronous messages and events. Only probe if async communication was indicated earlier.',
            examples: [
              practice('Message Broker (Queue)', 'Point-to-point / work-queue delivery.'),
              practice('Event Streaming Platform', 'Durable, replayable event logs.'),
              tool('RabbitMQ'),
              tool('Apache Kafka'),
              tool('Azure Service Bus'),
              tool('NATS'),
              tool('AWS SQS')
            ]
          },
          {
            id: 'stack-analytics',
            aspect: 'Data Analytics & Reporting',
            appliesTo: { architecturalRole: SERVER_SIDE_ROLES },
            description:
              'How the system turns data into reports, dashboards and insight. Especially relevant for data-centric or analytical domains (see Domain Complexity).',
            examples: [
              practice('BI / Reporting Tool', 'Self-service business-intelligence and reporting.'),
              practice('Embedded Dashboards', 'Charts and analytics built into the product UI.'),
              practice('Data Warehouse / Lakehouse', 'Central analytical store separate from the operational DB.'),
              tool('Power BI'),
              tool('Tableau'),
              tool('Grafana'),
              tool('Metabase'),
              tool('Snowflake'),
              tool('Databricks')
            ]
          }
        ]
      },
      {
        id: 'backend',
        title: 'Backend Design & Internals',
        desc: 'How the server-side is built: the patterns and libraries that make up its reference architecture and toolchain',
        appliesTo: { architecturalRole: SERVER_SIDE_ROLES },
        entries: [
          {
            id: 'be-dal',
            aspect: 'Data Access & Persistence Mapping',
            description:
              'How code reaches the database. The ORM-vs-raw-SQL choice is a strong signal for both the backend toolchain and how the team thinks about the domain.',
            examples: [
              practice('Object-Relational Mapper (ORM)', 'Full framework mapping tables to entities.'),
              practice('Micro-ORM', 'Lightweight mapper over hand-written SQL.'),
              practice('Raw SQL / Driver', 'Direct queries via a low-level database driver.'),
              practice('Repository / Unit-of-Work', 'Persistence abstracted behind repository interfaces.'),
              tool('Entity Framework'),
              tool('Hibernate / JPA'),
              tool('Prisma'),
              tool('TypeORM'),
              tool('Dapper'),
              tool('SQLAlchemy'),
              tool('ADO.NET / JDBC')
            ]
          },
          {
            id: 'be-api-design',
            aspect: 'API Design & Documentation',
            description:
              'How the system exposes and documents its interfaces. Reveals the integration contract and the API toolchain.',
            examples: [
              practice('RESTful / Resource-Oriented', 'HTTP resources, often OpenAPI-described.'),
              practice('RPC / gRPC', 'Procedure-call style, contract via protobuf.'),
              practice('GraphQL Schema', 'Single typed graph endpoint.'),
              practice('AsyncAPI / Event Contracts', 'Documented event-driven interfaces.'),
              practice('Contract-First', 'Interface defined before implementation.'),
              tool('OpenAPI / Swagger'),
              tool('GraphQL SDL'),
              tool('AsyncAPI'),
              tool('Protocol Buffers')
            ]
          },
          {
            id: 'be-api-versioning',
            aspect: 'API Versioning Strategy',
            appliesTo: { architecturalRole: DISTRIBUTED_ROLES },
            description:
              'How breaking changes to public interfaces are handled over time. Matters most where external or many internal clients consume the API.',
            examples: [
              practice('URL Path Versioning', 'Version embedded in the endpoint URI.'),
              practice('Header / Media-Type Versioning', 'Client selects the version via headers.'),
              practice('Schema Evolution', 'Backward-compatible changes, deprecate fields.'),
              practice('No Versioning', 'Single evolving contract, breaking changes coordinated.')
            ]
          },
          {
            id: 'be-di',
            aspect: 'Dependency Injection & Composition',
            description:
              'How dependencies are wired together. A quiet but telling signal of how testable and modular the codebase is.',
            examples: [
              practice('Built-in DI Container', 'The framework-provided injection container.'),
              practice('Third-Party DI Library', 'A dedicated external container.'),
              practice('Manual Composition', 'Dependencies wired by hand at a composition root.'),
              tool('ASP.NET Core DI'),
              tool('Spring Framework'),
              tool('Autofac'),
              tool('InversifyJS'),
              tool('Guice')
            ]
          },
          {
            id: 'be-caching',
            aspect: 'Server-Side Caching',
            description: 'How the backend reduces database load and latency for hot data.',
            examples: [
              practice('In-Memory Cache', 'Cached inside the application process.'),
              practice('Distributed Cache', 'Shared cache across instances.'),
              practice('Read-Through / Write-Behind', 'Cache sits in the data-access path.'),
              tool('Redis'),
              tool('Memcached'),
              tool('MemoryCache (in-process)'),
              tool('Hazelcast')
            ]
          },
          {
            id: 'be-jobs',
            aspect: 'Background Jobs & Scheduling',
            description:
              'How time-based, queued or long-running work is executed outside the request path. Reveals the async processing architecture.',
            examples: [
              practice('In-Process Scheduler', 'Scheduling library inside the app process.'),
              practice('Queue Worker', 'Jobs pulled from a queue by workers.'),
              practice('External Batch / Cron', 'Platform-triggered scheduled jobs.'),
              tool('Hangfire'),
              tool('Quartz'),
              tool('Celery'),
              tool('BullMQ'),
              tool('Kubernetes CronJobs')
            ]
          },
          {
            id: 'be-workflow',
            aspect: 'Workflow & Process Orchestration',
            description:
              'How complex, multi-step or durable business processes are coordinated. Most relevant for workflow/process-centric domains.',
            examples: [
              practice('BPMN Engine', 'Executable business-process models.'),
              practice('Durable Orchestrator / State Machine', 'Code-defined long-running workflows.'),
              practice('Event Choreography', 'Services react to events without a central coordinator.'),
              tool('Camunda'),
              tool('Temporal'),
              tool('Elsa Workflows'),
              tool('AWS Step Functions')
            ]
          },
          {
            id: 'be-error',
            aspect: 'Error-Handling Pattern',
            description:
              'The structural approach to failures: exceptions vs. explicit result types. Shapes API and code style.',
            examples: [
              practice('Global Exception Middleware', 'Centralized handler mapping errors to responses.'),
              practice('Result / Either Pattern', 'Explicit success/failure objects, no throwing.'),
              practice('Problem Details', 'Standardized machine-readable error payloads (RFC 7807).'),
              tool('FluentResults'),
              tool('LanguageExt'),
              tool('ASP.NET ProblemDetails')
            ]
          },
          {
            id: 'be-schema',
            aspect: 'Schema & Migration Management',
            appliesTo: { architecturalRole: DISTRIBUTED_ROLES },
            description:
              'How database schema changes are versioned and deployed without data loss. This is a core part of the delivery toolchain for stateful services.',
            examples: [
              practice('Code-First Migrations', 'Schema changes generated from code models.'),
              practice('SQL-Based Versioning', 'Versioned, hand-written SQL migration scripts.'),
              practice('Schemaless / Application-Managed', 'No fixed schema; the app manages shape.'),
              tool('Entity Framework Migrations'),
              tool('Flyway'),
              tool('Liquibase'),
              tool('Alembic')
            ]
          }
        ]
      },
      {
        id: 'frontend',
        title: 'Frontend Design & Internals',
        desc: 'How the client/UI is built. Only for systems with a user interface.',
        appliesTo: { executionType: UI_EXECUTION_TYPES },
        entries: [
          {
            id: 'fe-platform',
            aspect: 'Client Platform & OS',
            description: 'What the client runs on. Constrains the UI technology and distribution model.',
            examples: [
              practice('Cross-Platform', 'One codebase targeting several OSes.'),
              tool('Windows'),
              tool('Linux'),
              tool('macOS'),
              tool('iOS'),
              tool('Android')
            ]
          },
          {
            id: 'fe-state',
            aspect: 'State Management',
            description:
              'How UI state is held, updated and shared across views. A defining frontend architecture choice and a clear toolchain signal.',
            examples: [
              practice('Global State Container', 'Centralized, predictable store.'),
              practice('Reactive Streams', 'Observable/stream-based state.'),
              practice('MVVM / Data Binding', 'ViewModel bound to the view.'),
              practice('Local Component State', 'State kept within components.'),
              tool('Redux'),
              tool('Zustand'),
              tool('Pinia'),
              tool('NgRx'),
              tool('RxJS'),
              tool('MobX')
            ]
          },
          {
            id: 'fe-components',
            aspect: 'Component Library & Design System',
            description:
              'Where the UI building blocks come from. Reveals UI toolchain and design-consistency approach.',
            examples: [
              practice('Open-Source Design System', 'Public component library.'),
              practice('Proprietary Suite', 'Licensed commercial components.'),
              practice('In-House Components', 'Custom-built, internally maintained.'),
              tool('Material UI'),
              tool('Vuetify'),
              tool('Ant Design'),
              tool('Telerik / Kendo UI'),
              tool('DevExpress'),
              tool('Bootstrap')
            ]
          },
          {
            id: 'fe-styling',
            aspect: 'Styling & Theming',
            description: 'How the UI is styled and themed, across both web and native desktop clients.',
            examples: [
              practice('Plain / Scoped CSS', 'Stylesheets, optionally component-scoped.'),
              practice('CSS Preprocessor', 'Variables, mixins and nesting compiled to CSS.'),
              practice('Utility-First', 'Composed from atomic utility classes.'),
              practice('Component-Library Theming', 'Theme tokens from the UI library.'),
              practice('Native Desktop Styling', 'Framework-native styling (e.g. WPF XAML).'),
              tool('Sass / SCSS'),
              tool('Tailwind CSS'),
              tool('styled-components'),
              tool('WPF XAML Styles')
            ]
          },
          {
            id: 'fe-data',
            aspect: 'Client Data & Offline Capability',
            description:
              'How the client caches data and behaves without connectivity. Especially relevant for mobile and field/edge clients.',
            examples: [
              practice('In-Memory Only', 'Data cached only for the active session.'),
              practice('Local Database', 'Structured on-device storage.'),
              practice('Service-Worker Cache', 'Cached network requests for offline use.'),
              practice('Offline-First / Sync', 'Local-first writes that sync when online.'),
              tool('IndexedDB'),
              tool('SQLite'),
              tool('Dexie.js'),
              tool('Workbox'),
              tool('PouchDB')
            ]
          },
          {
            id: 'fe-build',
            aspect: 'Frontend Build & Tooling',
            description: 'The toolchain that compiles and packages the client. A direct toolchain signal.',
            examples: [
              practice('Module Bundler', 'Bundles code and assets for the browser.'),
              practice('Monorepo Tooling', 'Manages multi-package repositories.'),
              practice('Module Federation', 'Runtime code sharing across builds.'),
              practice('Native Compiler', 'Compiles UI code to native binaries.'),
              tool('Vite'),
              tool('Webpack'),
              tool('esbuild'),
              tool('Nx'),
              tool('Turborepo'),
              tool('Flutter / React Native')
            ]
          },
          {
            id: 'fe-a11y',
            aspect: 'Accessibility (A11y)',
            description:
              'The defined standard for making the UI usable by people with disabilities. Often a hard requirement in regulated/public sectors.',
            examples: [
              practice('WCAG Compliance', 'Adherence to a WCAG conformance level.'),
              practice('Screenreader / ARIA Support', 'ARIA semantics for assistive technology.'),
              practice('Keyboard Navigation', 'All interactions operable without a mouse.'),
              tool('WCAG 2.1 AA'),
              tool('axe / Lighthouse')
            ]
          },
          {
            id: 'fe-i18n',
            aspect: 'Internationalization (i18n)',
            description:
              'How multiple languages and cultural formats are supported. Relevant wherever the product ships across regions.',
            examples: [
              practice('Runtime Translation', 'Language files loaded at runtime.'),
              practice('Build-Time Localization', 'Separate bundle compiled per language.'),
              tool('i18next'),
              tool('vue-i18n'),
              tool('react-intl'),
              tool('Angular i18n')
            ]
          },
          {
            id: 'fe-logging',
            aspect: 'Client-Side Logging',
            description:
              'How client events and errors are recorded in code (shipping telemetry to servers is separate; see Observability). Probe whether there is any abstraction over raw console output.',
            examples: [
              practice('Browser Console', 'Console output, intended for debugging only.'),
              practice('Custom Logger Abstraction', 'Wrapper with log-level control and optional remote sink.'),
              practice('Error Reporting Service', 'Client crashes/exceptions shipped upstream.'),
              tool('loglevel'),
              tool('Sentry (browser SDK)'),
              tool('console API')
            ]
          },
          {
            id: 'fe-analytics',
            aspect: 'Client Analytics & User Tracking',
            description:
              'How user behavior and UI interaction are measured. Relevant for product decisions and, importantly, for the privacy/compliance posture (ties back to Constraints).',
            examples: [
              practice('SaaS Analytics', 'Behavior tracked via a cloud analytics product.'),
              practice('Self-Hosted Tracking', 'Behavioral analytics kept in-house.'),
              practice('No Tracking', 'No behavioral telemetry collected.'),
              tool('Google Analytics'),
              tool('Mixpanel'),
              tool('Amplitude'),
              tool('Matomo'),
              tool('Plausible'),
              tool('Hotjar')
            ]
          }
        ]
      },
      {
        id: 'crosscutting',
        title: 'Cross-Cutting Concerns',
        desc: 'Security, observability and configuration: patterns and tools that span the whole system',
        entries: [
          {
            id: 'cc-authn',
            aspect: 'Authentication',
            description: 'How identity is established. Federation vs. self-managed is the key distinction.',
            examples: [
              practice('Token-Based', 'Signed tokens verify identity on stateless requests.'),
              practice('Federated Identity / SSO', 'Delegated to a trusted external provider.'),
              practice('Session-Based', 'Server-side session with a cookie.'),
              tool('OAuth 2.0 / OpenID Connect'),
              tool('Keycloak'),
              tool('Microsoft Entra ID'),
              tool('Auth0'),
              tool('Okta')
            ]
          },
          {
            id: 'cc-authz',
            aspect: 'Authorization',
            description: 'How permissions are modeled and enforced once identity is known.',
            examples: [
              practice('Role-Based (RBAC)', 'Permissions grouped into roles.'),
              practice('Attribute-Based (ABAC)', 'Policy evaluated over attributes.'),
              practice('Relationship-Based / Policy', 'Externalized policy decisions.'),
              tool('Open Policy Agent (OPA)'),
              tool('Casbin'),
              tool('Cedar')
            ]
          },
          {
            id: 'cc-secrets',
            aspect: 'Secrets & Encryption',
            description:
              'How sensitive configuration and data are protected. Probe both secret storage and encryption in transit/at rest.',
            examples: [
              practice('Centralized Vault', 'Dedicated audited secret store.'),
              practice('Environment Injection', 'Secrets injected at startup by the platform.'),
              practice('Envelope Encryption / KMS', 'Keys managed by a key-management service.'),
              tool('HashiCorp Vault'),
              tool('Azure Key Vault'),
              tool('AWS Secrets Manager'),
              tool('TLS 1.3')
            ]
          },
          {
            id: 'cc-network',
            aspect: 'Network Security & Segmentation',
            description:
              'How the network around the system is secured and partitioned: perimeter, trust zones and, for industrial systems, IT/OT segmentation. A key control that the application-level auth questions do not capture.',
            examples: [
              practice('Perimeter Firewall / DMZ', 'Classic edge firewalling with a demilitarized zone.'),
              practice('Zero-Trust Networking', 'No implicit trust; every request authenticated/authorized.'),
              practice('Network Segmentation (Zones/VLANs)', 'Traffic partitioned into isolated segments.'),
              practice('OT/IT Segmentation (IEC 62443)', 'Zones-and-conduits separation of control networks.'),
              practice('WAF / API Protection', 'Application-layer filtering in front of the system.'),
              tool('Web Application Firewall (Cloudflare / Azure / AWS)'),
              tool('mTLS'),
              tool('Service Mesh (Istio / Linkerd)'),
              tool('VPN / Zero-Trust Access')
            ]
          },
          {
            id: 'cc-observability',
            aspect: 'Observability',
            description:
              'How the running system is understood: logging, metrics and tracing. Consolidate here. One honest answer beats three shallow ones.',
            examples: [
              practice('Structured Logging', 'Queryable, JSON-style log events.'),
              practice('Metrics & Alerting', 'Numeric time-series with thresholds.'),
              practice('Distributed Tracing', 'Request lifecycles across services.'),
              practice('Centralized Aggregation', 'Logs/metrics shipped to one searchable place.'),
              tool('OpenTelemetry'),
              tool('Prometheus / Grafana'),
              tool('ELK / OpenSearch'),
              tool('Datadog'),
              tool('Serilog'),
              tool('Jaeger')
            ]
          },
          {
            id: 'cc-resilience',
            aspect: 'Resilience & Fault Tolerance',
            appliesTo: { architecturalRole: DISTRIBUTED_ROLES },
            description:
              'Software-level mechanisms for surviving partial failures. Most relevant for distributed / networked systems.',
            examples: [
              practice('Retry with Backoff', 'Automatic re-execution of transient failures.'),
              practice('Circuit Breaker', 'Stop calling a failing dependency.'),
              practice('Bulkhead / Isolation', 'Contain failures to a subsystem.'),
              practice('Graceful Degradation', 'Reduce function to keep the core alive.'),
              tool('Polly'),
              tool('Resilience4j')
            ]
          },
          {
            id: 'cc-config',
            aspect: 'Configuration & Feature Management',
            description: 'How environment-specific settings and feature toggles are managed outside the code.',
            examples: [
              practice('Environment Variables', 'Config via OS/container environment.'),
              practice('Central Config Server', 'Dynamic configuration from a service.'),
              practice('Feature Flags', 'Runtime toggling decoupled from deploys.'),
              tool('Consul'),
              tool('Azure App Configuration'),
              tool('LaunchDarkly')
            ]
          },
          {
            id: 'cc-audit',
            aspect: 'Audit & Compliance Logging',
            description:
              'Whether and how security-/business-relevant actions are recorded for forensics and compliance. A hard requirement in regulated domains (flagged under Constraints).',
            examples: [
              practice('Full Audit Trail', 'All read/write actions recorded with user context.'),
              practice('Critical Operations Only', 'Only sensitive, state-changing actions logged.'),
              practice('Immutable / Tamper-Evident Log', 'Append-only, verifiable audit records.'),
              practice('No Dedicated Audit Trail', 'No separate audit logging beyond ordinary logs.')
            ]
          },
          {
            id: 'cc-licensing',
            aspect: 'Licensing & Usage Enforcement',
            description:
              'For commercial or on-premise/desktop/machine software: how usage rights are technically enforced. Often overlooked but decisive for distribution and OT deployments.',
            examples: [
              practice('Online Activation', 'Rights validated against a vendor server.'),
              practice('Floating License Server', 'On-network server managing concurrent seats.'),
              practice('Hardware Dongle', 'Physical device required to run the software.'),
              practice('None / Open Source', 'No usage enforcement.'),
              tool('FlexNet'),
              tool('Wibu CodeMeter'),
              tool('Sentinel LDK')
            ]
          }
        ]
      },
      {
        id: 'delivery',
        title: 'Quality & Delivery',
        desc: 'How the system is tested, built and shipped: practices and toolchain',
        entries: [
          {
            id: 'del-testing',
            aspect: 'Testing Strategy',
            description:
              'The shape of the test portfolio. Probe which levels genuinely exist and run in CI, not which are aspirational.',
            examples: [
              practice('Unit Testing', 'Isolated logic-level tests.'),
              practice('Integration Testing', 'Against real dependencies (DB, APIs).'),
              practice('End-to-End Testing', 'Through the UI / full stack.'),
              practice('Contract Testing', 'Verifying agreed service contracts.'),
              practice('Load / Performance Testing', 'Behavior under traffic.'),
              tool('xUnit / JUnit / pytest'),
              tool('Playwright'),
              tool('Testcontainers'),
              tool('k6'),
              tool('Pact')
            ]
          },
          {
            id: 'del-quality',
            aspect: 'Code Quality & Security Scanning',
            description:
              'The automated gates guarding the codebase: static analysis, dependency scanning, coverage, formatting.',
            examples: [
              practice('Static Analysis (SAST)', 'Scanning source for bugs and vulnerabilities.'),
              practice('Dependency Scanning (SCA)', 'Known-vulnerability checks on libraries.'),
              practice('Coverage Gating', 'Enforced minimum test coverage.'),
              practice('Linting & Formatting', 'Consistent style and pattern enforcement.'),
              tool('SonarQube'),
              tool('Snyk'),
              tool('ESLint / Prettier'),
              tool('CodeQL')
            ]
          },
          {
            id: 'del-cicd',
            aspect: 'CI/CD Pipeline',
            description:
              'How code reaches production. Probe both the branching/integration practice and the pipeline tooling.',
            examples: [
              practice('Trunk-Based Development', 'Short-lived branches, frequent integration.'),
              practice('GitFlow / Release Branches', 'Long-lived release/feature branches.'),
              practice('GitOps', 'Git as the source of truth for deployments.'),
              tool('GitHub Actions'),
              tool('GitLab CI/CD'),
              tool('Azure DevOps'),
              tool('Jenkins'),
              tool('Argo CD')
            ]
          },
          {
            id: 'del-artifact',
            aspect: 'Build & Deployment Artifact',
            description: 'The immutable unit that gets shipped. Strongly shapes hosting options.',
            examples: [
              practice('Container Image', 'OCI/Docker image.'),
              practice('OS Installer / Package', 'Native install package.'),
              practice('Serverless Bundle', 'Zipped code for a function runtime.'),
              practice('Self-Contained Binary', 'Single native executable.'),
              tool('Docker'),
              tool('MSI / DEB / RPM')
            ]
          },
          {
            id: 'del-release',
            aspect: 'Release Strategy',
            appliesTo: { architecturalRole: SERVER_SIDE_ROLES },
            description:
              'How new versions are rolled out to reduce risk. Relevant once the system is a hosted service.',
            examples: [
              practice('Rolling Update', 'Instances replaced gradually.'),
              practice('Blue-Green', 'Switch traffic between two environments.'),
              practice('Canary', 'Expose to a small subset first.'),
              practice('Big-Bang', 'All at once, with downtime window.')
            ]
          },
          {
            id: 'del-testmgmt',
            aspect: 'Test Management & Traceability',
            description:
              'How tests and their link to requirements are managed and documented. A strong signal in regulated or safety-critical contexts.',
            examples: [
              practice('ALM-Integrated', 'Test management inside the ALM/issue tracker.'),
              practice('Dedicated Test Tool', 'Standalone test-management system.'),
              practice('Requirement Traceability', 'Tests explicitly linked to requirements.'),
              practice('Ad-hoc / None', 'No formal test management.'),
              tool('Azure Test Plans'),
              tool('Xray'),
              tool('TestRail'),
              tool('Zephyr')
            ]
          },
          {
            id: 'del-devenv',
            aspect: 'Development Environment & IDE',
            description:
              'The officially supported local tooling and IDE. A team/toolchain signal, independent of what the software runs on.',
            examples: [
              practice('Full IDE', 'Heavyweight IDE with deep language integration.'),
              practice('Lightweight Editor', 'Fast, plugin-based editor.'),
              practice('Cloud / Remote Dev Environment', 'Standardized, hosted development workspaces.'),
              tool('Visual Studio'),
              tool('JetBrains (IntelliJ / Rider / …)'),
              tool('VS Code'),
              tool('Neovim'),
              tool('GitHub Codespaces')
            ]
          },
          {
            id: 'del-profiling',
            aspect: 'Performance Profiling',
            description:
              'How the team analyzes runtime performance and resource use at a granular level during development (production tracing lives under Observability).',
            examples: [
              practice('CPU / Micro-Benchmarking', 'Measuring execution time of hot paths.'),
              practice('Memory Profiling', 'Analyzing allocations and leaks.'),
              practice('Ad-hoc / None', 'No systematic profiling.'),
              tool('BenchmarkDotNet'),
              tool('dotMemory / dotTrace'),
              tool('Chrome DevTools'),
              tool('VisualVM'),
              tool('py-spy')
            ]
          }
        ]
      },
      {
        id: 'operations',
        title: 'Operations & Runtime',
        desc: 'Where and how the system runs, scales and recovers',
        appliesTo: { architecturalRole: SERVER_SIDE_ROLES },
        entries: [
          {
            id: 'ops-hosting',
            aspect: 'Hosting & Cloud Strategy',
            description:
              'Where the system lives and how tied it is to a provider. A major driver of the target reference architecture and its portability.',
            examples: [
              practice('Cloud-Native', 'Leans on provider-managed services.'),
              practice('Cloud-Agnostic', 'Portable across clouds via standard containers.'),
              practice('On-Premise', 'Runs in owned data centers.'),
              practice('Hybrid', 'Split across cloud and on-premise.'),
              tool('AWS'),
              tool('Microsoft Azure'),
              tool('Google Cloud')
            ]
          },
          {
            id: 'ops-runtime',
            aspect: 'Runtime & Orchestration',
            description: 'The execution substrate and how workloads are scheduled and kept alive.',
            examples: [
              practice('Container Orchestration', 'Clustered scheduling and self-healing.'),
              practice('Single-Host Containers', 'Compose-style on one machine.'),
              practice('Virtual Machines / IaaS', 'Long-lived provisioned servers.'),
              practice('Serverless', 'Provider-managed, event-driven compute.'),
              tool('Kubernetes'),
              tool('Docker Compose'),
              tool('AWS ECS'),
              tool('Azure Functions')
            ]
          },
          {
            id: 'ops-webserver',
            aspect: 'Web Server / Reverse Proxy',
            appliesTo: { executionType: ['Web Application', 'Headless Service / API'] },
            description:
              'What terminates and routes HTTP traffic in front of the application. Relevant for web apps and HTTP APIs.',
            examples: [
              practice('OS-Native Web Server', 'Web server tightly integrated with the host OS.'),
              practice('Reverse Proxy', 'Forwards client requests to backend processes.'),
              practice('Application-Level Proxy', 'Proxy built into the app runtime.'),
              tool('nginx'),
              tool('IIS'),
              tool('Traefik'),
              tool('Envoy'),
              tool('HAProxy'),
              tool('Caddy')
            ]
          },
          {
            id: 'ops-registry',
            aspect: 'Artifact & Container Registry',
            description: 'Where immutable build artifacts and container images are stored and distributed.',
            examples: [
              practice('Cloud Registry', 'Managed registry from a cloud vendor.'),
              practice('Self-Hosted Registry', 'Private registry inside the org network.'),
              practice('General Artifact Repository', 'Stores many package formats plus images.'),
              tool('Azure Container Registry'),
              tool('AWS ECR'),
              tool('Harbor'),
              tool('JFrog Artifactory'),
              tool('Nexus Repository')
            ]
          },
          {
            id: 'ops-scaling',
            aspect: 'Scaling & Availability',
            description:
              'How the system grows with load and survives failures. Probe the actual topology, not the theoretical maximum.',
            examples: [
              practice('Single Instance', 'One instance per environment.'),
              practice('Horizontal Autoscaling', 'Instances added/removed with load.'),
              practice('Multi-Region', 'Deployed across geographies.'),
              practice('Active-Active DR', 'Multiple live environments, instant failover.')
            ]
          },
          {
            id: 'ops-iac',
            aspect: 'Infrastructure as Code',
            description: 'Whether infrastructure is reproducible from definitions or configured by hand.',
            examples: [
              practice('Declarative Provisioning', 'Desired-state infrastructure definitions.'),
              practice('Configuration Management', 'Automated setup of existing servers.'),
              practice('Manual / ClickOps', 'Infrastructure changed by hand.'),
              tool('Terraform'),
              tool('Pulumi'),
              tool('Ansible'),
              tool('Bicep')
            ]
          },
          {
            id: 'ops-data-lifecycle',
            aspect: 'Backup, Recovery & Retention',
            description: 'How data is protected against loss and governed over time. Probe RPO/RTO if HA was flagged.',
            examples: [
              practice('Automated Snapshots', 'Scheduled point-in-time backups.'),
              practice('Offsite Replication', 'Copies in a separate location/region.'),
              practice('Immutable Backups', 'Write-once storage resisting tampering.'),
              practice('Retention Policies', 'Lifecycle rules for purging/archiving.')
            ]
          }
        ]
      },
      {
        id: 'hardware',
        title: 'Hardware, Edge & Industrial Control',
        desc: 'Physical interfaces, real-time control and industrial systems: machine control, HMI/SCADA, edge & IIoT',
        appliesTo: { executionType: ['Embedded / IoT', 'Desktop Application', 'Background Worker / Daemon'] },
        entries: [
          {
            id: 'hw-control-role',
            aspect: 'Automation & Control Role',
            description:
              'For industrial systems, open here: where in the automation stack (Purdue / ISA-95 levels) does this software sit? A machine controller, a supervisory SCADA layer and an operator HMI raise very different follow-up questions.',
            examples: [
              practice(
                'PLC / PAC Control Logic',
                'Deterministic machine or process control on a programmable controller.'
              ),
              practice('SCADA Supervisory', 'Supervisory control and data acquisition across distributed equipment.'),
              practice('HMI / Operator Interface', 'The operator-facing visualization and interaction layer.'),
              practice('Motion / Drive Control', 'Coordinated axis, servo or robot motion control.'),
              practice('MES / Line Coordination', 'Manufacturing execution above the real-time control layer.'),
              practice('Edge Gateway / Data Concentrator', 'Aggregates and bridges field data to higher levels.')
            ]
          },
          {
            id: 'hw-control-logic',
            aspect: 'Control Logic Programming Model',
            description:
              'How the control logic itself is authored. Distinguishes standards-based PLC programming from high-level code on a controller, a strong signal for portability and the engineering toolchain.',
            examples: [
              practice('IEC 61131-3 Languages', 'Ladder (LD), Function Block (FBD), Structured Text (ST), SFC, IL.'),
              practice('IEC 61499 Function Blocks', 'Distributed, event-driven control model.'),
              practice('Motion Control (PLCopen)', 'Standardized motion function blocks.'),
              practice('State-Machine / Sequential', 'Explicit step/state sequencing of the process.'),
              practice(
                'High-Level Language on Controller',
                'C/C++/Rust or similar running directly on the controller.'
              ),
              tool('CODESYS'),
              tool('TwinCAT (Beckhoff)'),
              tool('TIA Portal (Siemens)'),
              tool('Studio 5000 / RSLogix (Rockwell)'),
              tool('GX Works (Mitsubishi)'),
              tool('Automation Studio (B&R)')
            ]
          },
          {
            id: 'hw-interface',
            aspect: 'Device Interface & I/O Access',
            description:
              'How the software reaches sensors, actuators and I/O at the low level: the access mechanism, not the network protocol (that is the next question).',
            examples: [
              practice('Polling', 'Software repeatedly queries device state.'),
              practice('Interrupt-Driven', 'Hardware signals the software when data is ready.'),
              practice('Memory-Mapped / DMA', 'Direct access to device registers or shared memory buffers.'),
              practice('Vendor SDK / Driver', 'Closed-source manufacturer libraries or kernel drivers.'),
              tool('NI-DAQmx'),
              tool('SCPI (instrument control)'),
              tool('libusb / serial (RS-232/RS-485)')
            ]
          },
          {
            id: 'hw-fieldbus',
            aspect: 'Industrial Communication Protocols',
            description:
              'The fieldbus and industrial-network protocols wiring controllers, I/O, drives and supervisory systems together. Capture every protocol in play. This is prime toolchain/interoperability signal.',
            examples: [
              practice('Real-Time Ethernet Fieldbus', 'Cyclic, deterministic industrial Ethernet.'),
              practice('Classic Fieldbus', 'Traditional serial/industrial buses.'),
              practice('Semantic Interoperability Layer', 'Information-model-based exchange (OPC UA companion specs).'),
              practice('Pub/Sub Telemetry', 'Publish/subscribe messaging for plant data (e.g. Sparkplug B).'),
              tool('PROFINET'),
              tool('EtherCAT'),
              tool('EtherNet/IP'),
              tool('PROFIBUS'),
              tool('Modbus TCP / RTU'),
              tool('OPC UA'),
              tool('OPC Classic (DA/HDA)'),
              tool('MQTT Sparkplug B'),
              tool('CANopen'),
              tool('IO-Link'),
              tool('S7comm'),
              tool('DNP3'),
              tool('IEC 61850'),
              tool('BACnet')
            ]
          },
          {
            id: 'hw-realtime',
            aspect: 'Real-Time & Timing Constraints',
            description:
              'How strict latency and cycle-time requirements are, which constrains the OS, runtime and controller choice.',
            examples: [
              practice('Hard Real-Time', 'A missed deadline is a system failure.'),
              practice('Soft Real-Time', 'Missed deadlines degrade but do not break the system.'),
              practice('Best-Effort', 'No strict timing guarantees.'),
              tool('RTOS (VxWorks / QNX / FreeRTOS)'),
              tool('PREEMPT_RT Linux'),
              tool('Deterministic PLC scan cycle')
            ]
          },
          {
            id: 'hw-safety',
            aspect: 'Functional Safety & Redundancy',
            description:
              'Safety-critical design for systems that can harm people or equipment: functional-safety rating, redundancy and defined failsafe behavior. Probe which standard applies and whether safety is in software or hardwired.',
            examples: [
              practice(
                'Safety-Rated Controller (Safety PLC)',
                'SIL/PL-rated safety logic on a dedicated safety controller.'
              ),
              practice('Redundant Controllers', 'Hot-standby or dual-redundant controllers for availability.'),
              practice('Watchdog & Failsafe State', 'Defined safe state entered on fault or timeout.'),
              practice('Hardwired Safety Circuit', 'E-stop / safety relays independent of the application software.'),
              tool('IEC 61508 / 62061'),
              tool('ISO 13849'),
              tool('IEC 61511'),
              tool('Siemens Safety Integrated (F-PLC)'),
              tool('Rockwell GuardLogix'),
              tool('Pilz PNOZ / PSS')
            ]
          },
          {
            id: 'hw-hmi',
            aspect: 'HMI & Visualization Platform',
            description:
              'For HMI/SCADA systems: the operator-visualization technology and how the interface is built and deployed (vendor runtime vs. web vs. custom).',
            examples: [
              practice('Vendor HMI Runtime', 'Proprietary HMI/SCADA runtime with its own editor.'),
              practice('Web-Based HMI', 'Browser / thin-client visualization.'),
              practice('Thick-Client SCADA', 'Installed native operator client.'),
              practice('Custom / Embedded GUI', 'Bespoke UI on the device or panel PC.'),
              tool('Ignition (Vision / Perspective)'),
              tool('Siemens WinCC / WinCC OA'),
              tool('AVEVA (Wonderware) InTouch / System Platform'),
              tool('Rockwell FactoryTalk View'),
              tool('COPA-DATA zenon'),
              tool('GE / Emerson iFIX / CIMPLICITY'),
              tool('B&R mapp View')
            ]
          },
          {
            id: 'hw-historian',
            aspect: 'Process Data & Historian',
            description:
              'How process and telemetry data is captured, buffered and stored over time. This is the basis for later analytics and the data model of the plant.',
            examples: [
              practice('Time-Series Historian', 'Purpose-built process historian with compression.'),
              practice('Relational / SQL Logging', 'Process data logged into a relational database.'),
              practice('Store-and-Forward Buffering', 'Local buffering that syncs after a connectivity loss.'),
              practice('Unified Namespace', 'A single semantic, real-time plant data hub.'),
              tool('AVEVA PI (OSIsoft PI)'),
              tool('Ignition Historian'),
              tool('InfluxDB'),
              tool('TimescaleDB'),
              tool('Aspen InfoPlus.21'),
              tool('Canary Historian')
            ]
          },
          {
            id: 'hw-iiot-edge',
            aspect: 'Edge & IIoT Cloud Connectivity',
            description:
              'How OT/edge data is bridged up to IT and cloud systems, the seam where the shop floor meets the enterprise. Probe protocol translation and resilience across that boundary.',
            examples: [
              practice('Edge Gateway', 'On-site device aggregating and normalizing field data.'),
              practice('Protocol Bridging', 'Translating OT protocols to IT (e.g. OPC UA → MQTT/REST).'),
              practice('Store-and-Forward to Cloud', 'Resilient upstream telemetry that survives outages.'),
              practice('Managed Cloud IoT Platform', 'Provider-managed device connectivity and ingestion.'),
              tool('Azure IoT Edge'),
              tool('AWS IoT Greengrass'),
              tool('Kepware / KEPServerEX'),
              tool('HighByte Intelligence Hub'),
              tool('Node-RED'),
              tool('HiveMQ (MQTT)'),
              tool('Litmus Edge')
            ]
          }
        ]
      }
    ]
  }
}
