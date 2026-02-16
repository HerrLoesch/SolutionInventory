export function getCategoriesData() {
  return [
    {
      id: 'solution-desc',
      title: 'Solution Description',
      desc: 'General information and categorization of the solution',
      isMetadata: true,
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
        executionType: [
          { label: 'Web Application', description: 'Runs in a web browser. Includes Single Page Applications (SPAs) and traditional Thin Clients.' },
          { label: 'Desktop Application', description: 'Installed and executed directly on a user\'s local operating system (Rich/Thick Client).' },
          { label: 'Mobile Application', description: 'Native or hybrid application running on mobile devices (iOS / Android).' },
          { label: 'Headless Service / API', description: 'Backend system providing interfaces or data without a graphical user interface.' },
          { label: 'Background Worker / Daemon', description: 'Asynchronous process running continuously or scheduled in the background.' },
          { label: 'Embedded / IoT', description: 'Software running directly on specialized, often resource-constrained hardware or devices.' }
        ],
        architecturalRole: [
          { label: 'Standalone System', description: 'An independent, self-contained application.' },
          { label: 'Domain Service / Microservice', description: 'A specialized service owning a specific business domain.' },
          { label: 'Integration Bridge / Middleware', description: 'A system primarily responsible for connecting, translating, or synchronizing data.' },
          { label: 'Add-on / Plugin', description: 'An extension module that adds functionality to a larger host application and cannot run independently.' },
          { label: 'AI / ML Inference Engine', description: 'A dedicated service or worker executing machine learning models or generating predictions.' }
        ]
      }
    },
    {
      id: 'architecture',
      title: 'Architecture',
      desc: 'Architectural decisions and capabilities',
      entries: [
        {
          id: 'arch-hlp',
          aspect: 'High-Level Pattern',
          examples: [
            { label: 'Layered', description: 'Separation of presentation, business logic, and data access.' },
            { label: 'Hexagonal', description: 'Core domain logic surrounded by interfaces and technical adapters.' },
            { label: 'Clean Arch', description: 'Concentric layers with strict dependency rules pointing inward.' },
            { label: 'Plugin-Based', description: 'Core application exposing extension points for modules.' }
          ],
          description: 'Describes the foundational structural pattern of the application. Critical for understanding domain isolation and dependencies.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-protocols',
          aspect: 'Communication Protocols',
          examples: [
            { label: 'HTTP / RESTful / GraphQL', description: 'Web-based synchronous request-response protocols.' },
            { label: 'gRPC', description: 'Binary remote procedure call framework utilizing HTTP/2.' },
            { label: 'AMQP / MQTT', description: 'Publish-subscribe and message-queue protocols.' }
          ],
          description: 'Defines the primary protocols utilized for data exchange across system boundaries and client-server interactions.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-state',
          aspect: 'Application State Model',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Stateless Services', description: 'No client session state is retained on the server.' },
            { label: 'Stateful (In-Memory)', description: 'Server processes hold session or domain state in memory.' },
            { label: 'Distributed Cache Backed', description: 'State is offloaded to a distributed cache.' }
          ],
          description: 'Describes where the runtime state of user sessions and ongoing processes is held. Dictates horizontal scalability.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-data-pattern',
          aspect: 'Data Architecture Patterns',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice'] },
          examples: [
            { label: 'Standard CRUD', description: 'Direct mapping of objects to database tables for Create, Read, Update, and Delete operations.' },
            { label: 'CQRS', description: 'Command Query Responsibility Segregation, separating the models for reading and writing data.' },
            { label: 'Event Sourcing', description: 'State is derived from a sequentially appended log of immutable events rather than overwriting records.' }
          ],
          description: 'Defines the conceptual approach to how state mutations and data retrievals are structured.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-tenancy',
          aspect: 'Multi-Tenancy Model',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Isolated Silo', description: 'Dedicated infrastructure and isolated databases for each tenant.' },
            { label: 'Shared Compute / Isolated Data', description: 'Tenants share application instances but utilize separated databases.' },
            { label: 'Fully Pooled', description: 'All tenants share compute and database resources.' }
          ],
          description: 'Captures how the system isolates data and compute resources for different customers or tenants.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-datetime',
          aspect: 'Date & Time Representation',
          examples: [
            { label: 'ISO 8601 (UTC)', description: 'Standardized string format representing absolute time.' },
            { label: 'Unix Timestamp', description: 'Numeric representation indicating seconds since the Unix epoch.' },
            { label: 'Local Time with Offset', description: 'Time representation that preserves the timezone offset.' }
          ],
          description: 'Specifies the standardized format used for storing and transmitting temporal data to prevent timezone bugs.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-res',
          aspect: 'Resilience Patterns',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Retry', description: 'Automatic re-execution of failed operations.' },
            { label: 'Circuit Breaker', description: 'Mechanism to block outgoing requests to a failing service.' },
            { label: 'Fallback', description: 'Providing predefined default values when a primary service is unavailable.' }
          ],
          description: 'Captures the software-level mechanisms implemented to handle partial system failures gracefully.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-off',
          aspect: 'Offline Capability',
          appliesTo: { executionType: ['Web Application', 'Desktop Application', 'Mobile Application'] },
          examples: [
            { label: 'Online-Only', description: 'The application blocks user interaction when network connectivity is lost.' },
            { label: 'Local-First', description: 'Primary read and write operations occur on a local database, syncing in background.' },
            { label: 'Sync-on-Connect', description: 'Specific operations are queued locally and transmitted once connectivity returns.' }
          ],
          description: 'Describes the application behavior and data handling strategy when network connectivity is disrupted.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-decompose',
          aspect: 'Service Decomposition',
          appliesTo: { architecturalRole: ['Standalone System', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Monolith', description: 'All business logic and data access are deployed as a single process.' },
            { label: 'Modular Monolith', description: 'A single deployable unit where internal components are strictly isolated.' },
            { label: 'Microservices', description: 'Business capabilities are split into independently deployed processes.' }
          ],
          description: 'Describes the strategy for dividing the solution into executable units.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-consistency',
          aspect: 'Consistency Model',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Strong Consistency', description: 'A read operation is guaranteed to return the most recent write across all nodes.' },
            { label: 'Eventual Consistency', description: 'System state will eventually converge, meaning stale data may be read temporarily.' },
            { label: 'Saga Pattern', description: 'Distributed transactions are managed via a sequence of local transactions and compensating actions.' }
          ],
          description: 'Defines the target data consistency level across different systems, microservices, or database nodes.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-topology',
          aspect: 'Deployment Topology',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Single Instance', description: 'One application instance serves all users within a specific environment.' },
            { label: 'Multi-Region', description: 'The application is deployed across multiple geographic regions for latency reduction.' }
          ],
          description: 'Describes the physical or logical distribution model of the system.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-cloud',
          aspect: 'Cloud Strategy & Dependency',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Cloud-Native', description: 'Heavily reliant on proprietary managed services of a specific cloud provider.' },
            { label: 'Cloud-Agnostic', description: 'Designed to run on any cloud utilizing standard containers and open infrastructure.' },
            { label: 'On-Premise Only', description: 'No integration or reliance on public cloud services.' }
          ],
          description: 'Defines the strategic approach to cloud adoption. Highlights vendor lock-in and portability.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-ai',
          aspect: 'AI Integration Pattern',
          examples: [
            { label: 'RAG (Retrieval-Augmented Generation)', description: 'Augmenting LLM prompts with dynamically retrieved external data.' },
            { label: 'Embedded ML Model', description: 'Machine learning models executed directly within the application process.' },
            { label: 'Agentic Workflow', description: 'AI agents capable of making decisions and executing tool calls autonomously.' }
          ],
          description: 'Defines how Artificial Intelligence is logically integrated into the architecture.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'frontend',
      title: 'Front-End',
      desc: 'Client-side frameworks, UI libraries and patterns',
      appliesTo: { executionType: ['Web Application', 'Desktop Application', 'Mobile Application'] },
      entries: [
        {
          id: 'fe-clientos',
          aspect: 'Client OS',
          examples: [
            { label: 'Windows', description: 'Requires a Microsoft Windows environment.' },
            { label: 'Linux', description: 'Requires a Linux distribution.' },
            { label: 'macOS / iOS / Android', description: 'Requires Apple or Google OS.' }
          ],
          description: 'Defines the underlying operating systems required to execute the client application.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-apptype',
          aspect: 'App Type & Stack',
          examples: [
            { label: 'Web SPA Framework', description: 'Browser-based Single Page Application (e.g., Angular, React).' },
            { label: 'Native Desktop', description: 'Application compiled for specific desktop environments (e.g., WPF).' },
            { label: 'Hybrid Desktop', description: 'Web technologies wrapped in a native container (e.g., Electron).' }
          ],
          description: 'Describes the fundamental UI architecture and the selected technology stack.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-state',
          aspect: 'State Management',
          examples: [
            { label: 'Global State Container', description: 'Centralized, predictable state management pattern (e.g., Redux).' },
            { label: 'MVVM Data Binding', description: 'Model-View-ViewModel pattern separating UI from state logic.' },
            { label: 'Local Component State', description: 'State is managed exclusively within individual components.' }
          ],
          description: 'Captures the strategy for holding, updating, and sharing data across different views or components.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-complib',
          aspect: 'Component Library',
          examples: [
            { label: 'Proprietary Suite', description: 'Licensed commercial UI component packages.' },
            { label: 'Open-Source Design System', description: 'Publicly available component libraries.' },
            { label: 'In-House Components', description: 'Custom-built UI elements maintained internally.' }
          ],
          description: 'Identifies the origin of the core user interface elements.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-a11y',
          aspect: 'Accessibility (A11y)',
          examples: [
            { label: 'WCAG Compliance', description: 'Adherence to specific Web Content Accessibility Guidelines.' },
            { label: 'Screenreader Support', description: 'Implementation of ARIA attributes for assistive technologies.' },
            { label: 'Keyboard Navigation', description: 'Ensuring all interactive elements are operable via keyboard.' }
          ],
          description: 'Captures the defined standard for making the application usable by people with disabilities.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-i18n',
          aspect: 'Internationalization (i18n)',
          examples: [
            { label: 'Runtime Translation Library', description: 'Dynamic loading of language files at runtime.' },
            { label: 'Build-Time Localization', description: 'Compiling separate application bundles for each supported language.' }
          ],
          description: 'Describes the architectural approach to supporting multiple languages and cultural formats in the UI.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'backend',
      title: 'Back-End',
      desc: 'Server-side runtime, frameworks and patterns',
      entries: [
        {
          id: 'be-runtime',
          aspect: 'Tech Stack & Runtime',
          examples: [
            { label: '.NET Runtime', description: 'Execution environment for C#, F#, or VB.NET.' },
            { label: 'Java Virtual Machine (JVM)', description: 'Execution environment for Java, Kotlin, or Scala.' },
            { label: 'Scripting Runtime', description: 'Interpreted runtimes like Node.js or Python.' }
          ],
          description: 'Defines the foundational platform on which the server-side or core business logic executes.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-api-doc',
          aspect: 'API Documentation',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'OpenAPI Specification', description: 'Machine-readable interface files for RESTful services.' },
            { label: 'AsyncAPI Specification', description: 'Documentation standard for event-driven architectures.' }
          ],
          description: 'Describes the methodology for documenting exposed interfaces for consuming clients.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-api-versioning',
          aspect: 'API Versioning',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'URL Path Versioning', description: 'Embedding the version number directly in the endpoint URI.' },
            { label: 'Header Versioning', description: 'Clients specify the desired API version via HTTP headers.' },
            { label: 'Schema Evolution', description: 'Avoiding strict versioning by deprecating specific fields.' }
          ],
          description: 'Defines the lifecycle strategy for APIs to handle non-backward-compatible changes.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-dal',
          aspect: 'Data Access Layer (DAL)',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Object-Relational Mapper (ORM)', description: 'Framework that maps database schemas to code entities.' },
            { label: 'Micro-ORM', description: 'Lightweight mapper focusing on raw SQL execution.' },
            { label: 'Raw SQL / Drivers', description: 'Direct execution of queries using low-level database drivers.' }
          ],
          description: 'Captures the abstraction level used to interact with data stores.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-ioc',
          aspect: 'IoC Container',
          examples: [
            { label: 'Built-in DI Framework', description: 'Using the dependency injection container provided by the core runtime.' },
            { label: 'Third-Party DI Library', description: 'Integrating specialized external libraries for DI.' },
            { label: 'Manual Composition', description: 'Instantiating dependencies manually at the composition root.' }
          ],
          description: 'Defines the mechanism used to implement Inversion of Control and dependency injection.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-jobs',
          aspect: 'Job Scheduling',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Application-Level Scheduler', description: 'Scheduling libraries integrated directly into the application process.' },
            { label: 'External Batch Processor', description: 'Dedicated external services triggered by time-based events.' }
          ],
          description: 'Describes the architecture for executing time-based or long-running background tasks.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'infra-data',
      title: 'Infrastructure & Data',
      desc: 'Databases, caches, queues and analytics',
      appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
      entries: [
        {
          id: 'infra-rdbms',
          aspect: 'Relational Database (RDBMS)',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Commercial RDBMS', description: 'Licensed relational database management systems.' },
            { label: 'Open-Source RDBMS', description: 'Community-driven relational database systems.' }
          ],
          description: 'Specifies the primary database engine utilized for highly structured, ACID-compliant transactional data storage.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-nosql',
          aspect: 'NoSQL Databases',
          examples: [
            { label: 'Document Store', description: 'Database designed for semi-structured document-oriented information.' },
            { label: 'Key-Value Store', description: 'In-memory or on-disk database optimized for rapid retrieval via unique keys.' },
            { label: 'Search Engine', description: 'Data store optimized for full-text search and complex queries.' }
          ],
          description: 'Captures non-relational database technologies employed for specific use cases like flexible schemas or high-speed caching.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-vectordb',
          aspect: 'Vector Database / Search',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Dedicated Vector DB', description: 'Databases built specifically for high-dimensional vector embeddings.' },
            { label: 'Relational Vector Extension', description: 'Using vector extensions within traditional databases (e.g., pgvector).' }
          ],
          description: 'Captures the storage and retrieval engine used for semantic search and contextual memory for AI models.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-middleware',
          aspect: 'Message Bus & Integration Middleware',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Message Broker', description: 'Intermediary program that translates messages (e.g., RabbitMQ, ActiveMQ).' },
            { label: 'Event Streaming Platform', description: 'Distributed systems for real-time data feeds and event streams (e.g., Kafka).' },
            { label: 'ETL / Integration Server', description: 'Platforms dedicated to extracting, transforming, and loading data.' }
          ],
          description: 'Describes the infrastructure components responsible for asynchronous routing, message queuing, and event streaming between services.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-dataplatform',
          aspect: 'Data Platform & Warehousing',
          appliesTo: { architecturalRole: ['Standalone System', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Data Warehouse', description: 'Central repository of integrated data for reporting and analysis.' },
            { label: 'Data Lakehouse', description: 'Architecture combining data lakes with data warehouse capabilities.' }
          ],
          description: 'Defines the architecture used for handling big data, historical analytics, and federated queries.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-analytics',
          aspect: 'Data Analytics & Visualization',
          appliesTo: { architecturalRole: ['Standalone System', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Business Intelligence Tools', description: 'Software used to retrieve, analyze, transform, and report data for business intelligence (e.g. Power BI, Tableau).' },
            { label: 'Time-Series Analytics', description: 'Tools specifically designed to visualize and analyze industrial or IoT time-series data.' },
            { label: 'Embedded Dashboards', description: 'Analytics components directly integrated into the primary user interface.' }
          ],
          description: 'Captures the presentation layer for data reporting. This details how end-users interact with aggregated data, generate reports, and monitor KPIs.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-cloud-services',
          aspect: 'Managed Cloud Services (PaaS/SaaS)',
          examples: [
            { label: 'Object Storage', description: 'Cloud-based unstructured data storage (e.g., AWS S3, Azure Blob).' },
            { label: 'Cognitive / AI APIs', description: 'External cloud services for machine learning or NLP.' },
            { label: 'Serverless Compute', description: 'Event-driven, short-lived compute functions.' }
          ],
          description: 'Captures the reliance on specific managed cloud services that replace traditional, self-hosted infrastructure components.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'ops',
      title: 'Ops',
      desc: 'Operational tooling, hosting and deployment',
      appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
      entries: [
        {
          id: 'ops-webserver',
          aspect: 'Webserver / Reverse Proxy',
          appliesTo: { executionType: ['Web Application', 'Headless Service / API'] },
          examples: [
            { label: 'OS-Native Web Server', description: 'Web servers integrated tightly with the host operating system.' },
            { label: 'Reverse Proxy', description: 'Intermediary servers that forward client requests to backend processes.' }
          ],
          description: 'Specifies the infrastructure component responsible for accepting HTTP requests and routing traffic.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-virtualization',
          aspect: 'Hardware Virtualization',
          examples: [
            { label: 'Type 1 Hypervisor', description: 'Bare-metal virtualization software running directly on the host hardware (e.g., VMware).' },
            { label: 'Type 2 Hypervisor', description: 'Virtualization software running on top of a conventional operating system (e.g., Hyper-V).' },
            { label: 'Cloud IaaS', description: 'Infrastructure as a Service providing virtualized computing resources over the internet.' }
          ],
          description: 'Describes the hypervisor technology used if the system architecture relies on partitioning physical servers into multiple virtual machines.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-container-runtime',
          aspect: 'Container Runtime',
          examples: [
            { label: 'Daemon-based Runtime', description: 'Container engine relying on a background service (e.g., Docker Engine).' },
            { label: 'Daemonless Runtime', description: 'Container engine capable of running containers as standard user processes (e.g., Podman).' }
          ],
          description: 'Identifies the low-level software component responsible for executing containers on a host operating system.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-orchestration',
          aspect: 'Container Orchestration',
          examples: [
            { label: 'Cluster Orchestration', description: 'Systems for automating deployment and scaling across clusters (e.g., Kubernetes).' },
            { label: 'Local Orchestration', description: 'Tools for defining and running multi-container applications on a single host (e.g., Compose).' }
          ],
          description: 'Captures the mechanisms used to manage container lifecycles, handle load balancing, and ensure desired states.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-registry',
          aspect: 'Artifact / Container Registry',
          examples: [
            { label: 'Cloud Registry', description: 'Managed registry services provided by cloud vendors (e.g., ACR, Docker Hub).' },
            { label: 'Self-Hosted Registry', description: 'Private registry instances deployed within the organizational network (e.g., Harbor).' },
            { label: 'General Artifact Repository', description: 'Systems capable of storing various package formats alongside container images.' }
          ],
          description: 'Describes the central storage location for immutable build artifacts and container images.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-iac',
          aspect: 'Infrastructure as Code (IaC)',
          examples: [
            { label: 'Declarative Provisioning', description: 'Defining the desired end-state of infrastructure using configuration files (e.g., Terraform).' },
            { label: 'Configuration Management', description: 'Tools focused on installing software on existing servers (e.g., Ansible).' }
          ],
          description: 'Defines the methodology for provisioning and managing infrastructure through machine-readable definition files.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-cicd',
          aspect: 'CI/CD Pipeline',
          examples: [
            { label: 'Cloud-Based CI/CD', description: 'Managed continuous integration and deployment services.' },
            { label: 'Repository-Integrated CI', description: 'Pipelines configured directly within the source code hosting platform.' }
          ],
          description: 'Describes the automated workflows utilized to compile code, run tests, and deploy releases.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-log-aggregation',
          aspect: 'Log Aggregation',
          examples: [
            { label: 'Centralized Search Stack', description: 'Combinations of indexing engines and visualization dashboards (e.g., ELK).' },
            { label: 'Cloud Observability Platform', description: 'SaaS solutions for unified log management and analysis.' }
          ],
          description: 'Captures the strategy for consolidating log data from disparate servers and microservices into a single repository.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-metrics',
          aspect: 'Metrics & Alerting',
          examples: [
            { label: 'Time-Series Monitoring', description: 'Systems designed specifically to collect and query numeric metric data over time (e.g., Prometheus).' },
            { label: 'Cloud-Native Monitoring', description: 'Built-in metric aggregation services provided by cloud environments.' },
            { label: 'Incident Management Systems', description: 'Platforms that route alerts to on-call personnel based on predefined rules.' }
          ],
          description: 'Describes the mechanisms used to continuously measure system health and notify operational staff when thresholds are breached.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-tracing',
          aspect: 'Distributed Tracing',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Telemetry Standards', description: 'Vendor-agnostic APIs for generating trace data (e.g., OpenTelemetry).' },
            { label: 'APM Solutions', description: 'Application Performance Monitoring suites incorporating automatic tracing.' }
          ],
          description: 'Defines the methodology for tracking the lifecycle of a single request as it traverses multiple independent services.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-dr',
          aspect: 'Disaster Recovery & SLAs',
          examples: [
            { label: 'Active-Active', description: 'Multiple environments serving traffic simultaneously, allowing immediate failover.' },
            { label: 'Cold Standby', description: 'Infrastructure that must be manually provisioned and restored from backups in case of a disaster.' }
          ],
          description: 'Defines the operational preparedness for catastrophic failures, establishing RTO and RPO.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-backup',
          aspect: 'Backup Strategy',
          examples: [
            { label: 'Automated DB Snapshots', description: 'Database management systems automatically capturing state at defined intervals.' },
            { label: 'Offsite Replication', description: 'Copying backup data to geographically separate storage locations.' },
            { label: 'Immutable Storage', description: 'Backups written to storage media that cannot be modified or deleted, protecting against ransomware.' }
          ],
          description: 'Details the operational procedures designed to prevent catastrophic data loss.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-retention',
          aspect: 'Data Retention & Archiving',
          examples: [
            { label: 'Automated Purging', description: 'Systematic deletion of specific data classes after a defined time window.' },
            { label: 'Long-Term Archiving', description: 'Moving historical data to lower-cost, immutable storage tiers for compliance.' },
            { label: 'Indefinite Storage', description: 'All data is retained permanently without automated lifecycle management.' }
          ],
          description: 'Captures the rules and mechanisms enforcing how long different categories of data are retained in the system.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'security',
      title: 'Security',
      desc: 'Security controls, identities and risk management',
      entries: [
        {
          id: 'sec-authn',
          aspect: 'Authentication (Identity)',
          examples: [
            { label: 'Token-Based Auth', description: 'Issuing cryptographically signed tokens to verify identity across stateless requests.' },
            { label: 'Federated Identity', description: 'Delegating authentication responsibility to an external, trusted identity provider.' }
          ],
          description: 'Describes the mechanisms employed to definitively verify the identity of a human user or a communicating system.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-authz',
          aspect: 'Authorization (Permissions)',
          examples: [
            { label: 'Role-Based Access Control (RBAC)', description: 'Permissions are assigned to roles, and users are assigned to those roles.' },
            { label: 'Attribute-Based Access Control (ABAC)', description: 'Access is granted based on policies evaluating attributes.' }
          ],
          description: 'Defines the logic and enforcement points used to determine what an authenticated identity is permitted to execute or view.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-secrets',
          aspect: 'Secret Management',
          examples: [
            { label: 'Centralized Vaults', description: 'Dedicated systems for securely storing and auditing API keys and passwords.' },
            { label: 'Environment Injection', description: 'Injecting secrets directly into the application process via OS variables at startup.' }
          ],
          description: 'Captures the architecture for handling sensitive configuration data without hardcoding it in source code.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-encryption',
          aspect: 'Encryption (Rest & Transit)',
          examples: [
            { label: 'Transport Layer Security', description: 'Cryptographic protocols designed to provide communications security over a network.' },
            { label: 'Storage-Level Encryption', description: 'Encrypting data transparently at the disk or filesystem level.' }
          ],
          description: 'Details the cryptographic strategies implemented to protect data confidentiality in transit and at rest.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-vuln-scan',
          aspect: 'Vulnerability Scanning',
          examples: [
            { label: 'Static Analysis (SAST)', description: 'Scanning source code for common security vulnerabilities without executing the program.' },
            { label: 'Software Composition Analysis (SCA)', description: 'Identifying known vulnerabilities within third-party dependencies and libraries.' },
            { label: 'Dynamic Analysis (DAST)', description: 'Interacting with a running web application to identify vulnerabilities like injection flaws.' }
          ],
          description: 'Describes the automated tooling integrated into the development lifecycle to proactively detect security flaws.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'hardware-io',
      title: 'Hardware & IO',
      desc: 'Hardware interfaces, sensors, and real-time IO',
      appliesTo: { executionType: ['Desktop Application', 'Mobile Application', 'Embedded / IoT', 'Background Worker / Daemon'] },
      entries: [
        {
          id: 'hw-communication',
          aspect: 'Communication Patterns',
          examples: [
            { label: 'Polling Mechanism', description: 'The software repeatedly queries the hardware interface for state changes.' },
            { label: 'Interrupt-Driven', description: 'The hardware actively signals the CPU and software when data is ready.' }
          ],
          description: 'Describes the architectural pattern utilized to exchange data with physical hardware.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'hw-driver',
          aspect: 'Driver Abstraction',
          examples: [
            { label: 'Vendor SDK', description: 'Interacting with hardware utilizing closed-source libraries provided by the manufacturer.' },
            { label: 'Standardized Protocols', description: 'Utilizing industry-standard communication protocols (e.g., SCPI, Modbus).' }
          ],
          description: 'Identifies the layer of software utilized to bridge the application logic with the physical hardware.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'qa-testing',
      title: 'General QA & Testing',
      desc: 'Test case management, traceability, and testing frameworks',
      entries: [
        {
          id: 'qa-testcase',
          aspect: 'Test Case Management',
          examples: [
            { label: 'ALM Integration', description: 'Test management integrated directly into the Application Lifecycle Management tool.' },
            { label: 'Dedicated Test Software', description: 'Standalone systems specialized purely in test planning and execution.' }
          ],
          description: 'Describes the methodology and tooling for documenting and tracking manual and automated tests.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-code-quality',
          aspect: 'Code Quality & Coverage',
          examples: [
            { label: 'Static Code Analysis', description: 'Tools that analyze source code for bugs and technical debt.' },
            { label: 'Code Coverage Tracking', description: 'Instrumentation measuring the percentage of executed source code.' }
          ],
          description: 'Describes mechanisms used to measure test coverage and enforce maintainability standards.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-integration',
          aspect: 'Integration & API Testing',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'API Testing Frameworks', description: 'Tools designed to send programmatic requests to backend APIs.' },
            { label: 'Contract Testing', description: 'Verifying that services adhere to a shared, agreed-upon contract.' }
          ],
          description: 'Defines the methodology for testing interactions between discrete system components without a UI.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-e2e',
          aspect: 'End-to-End (E2E) Testing',
          appliesTo: { executionType: ['Web Application', 'Desktop Application', 'Mobile Application'] },
          examples: [
            { label: 'Browser Automation', description: 'Tools that control web browsers programmatically.' },
            { label: 'Desktop UI Automation', description: 'Frameworks capable of interacting with native OS UI components.' }
          ],
          description: 'Describes the approach to validating the entire software stack from the user interface down to the database.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-performance',
          aspect: 'Performance & Load Testing',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Protocol-Level Load Testing', description: 'Simulating high concurrency by sending large volumes of network requests.' },
            { label: 'Cloud-Distributed Stress Testing', description: 'Utilizing cloud infrastructure to simulate massive user traffic.' }
          ],
          description: 'Describes the approach to simulating high user traffic to validate system stability and SLAs.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-testdata',
          aspect: 'Test Data Management',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Synthetic Data Generation', description: 'Programmatically creating fake datasets for testing.' },
            { label: 'Production Anonymization', description: 'Scrubbing or obfuscating PII from production data before use in test environments.' }
          ],
          description: 'Captures the strategy for provisioning and securing data used during testing to maintain privacy compliance.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    }
  ];
}