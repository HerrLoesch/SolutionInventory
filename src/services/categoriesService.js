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
            { 
              label: 'Web Application', 
              description: 'Runs in a web browser. Includes Single Page Applications (SPAs) and traditional Thin Clients.' 
            },
            { 
              label: 'Desktop Application', 
              description: 'Installed and executed directly on a user\'s local operating system (Rich/Thick Client).' 
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
              description: 'Asynchronous process running continuously or scheduled in the background (e.g., message processors, cron jobs).' 
            },
            { 
              label: 'Embedded / IoT', 
              description: 'Software running directly on specialized, often resource-constrained hardware or devices.' 
            }
          ],
          architecturalRole: [
            { 
              label: 'Standalone System', 
              description: 'An independent, self-contained application that does not heavily rely on other internal services to function.' 
            },
            { 
              label: 'Domain Service / Microservice', 
              description: 'A specialized service owning a specific business domain within a larger distributed architecture.' 
            },
            { 
              label: 'Integration Bridge / Middleware', 
              description: 'A system primarily responsible for connecting, translating, or synchronizing data between other discrete systems.' 
            },
            { 
              label: 'Add-on / Plugin', 
              description: 'An extension module that adds functionality to a larger host application and cannot run independently.' 
            },
            { 
              label: 'AI / ML Inference Engine', 
              description: 'A dedicated service or worker executing machine learning models, processing natural language, or generating predictions.' 
            }
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
            { label: 'Layered', description: 'Separation of presentation, business logic, and data access into distinct horizontal layers.' },
            { label: 'Hexagonal', description: 'Core domain logic surrounded by interfaces (ports) and technical implementations (adapters).' },
            { label: 'Clean Arch', description: 'Concentric layers with strict dependency rules pointing inward toward the core entities and use cases.' },
            { label: 'Plugin-Based', description: 'Core application exposing extension points for dynamically loaded modules.' }
          ],
          description: 'Describes the foundational structural pattern of the application. This information is critical for reviewers to understand how domain logic is isolated, how dependencies are managed, and what trade-offs were made regarding overall system complexity and long-term maintainability.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-protocols',
          aspect: 'Communication Protocols',
          examples: [
            { label: 'HTTP / RESTful / GraphQL', description: 'Web-based synchronous request-response protocols over HTTP.' },
            { label: 'SOAP / OData', description: 'XML- or JSON-based web service protocols with strict schemas.' },
            { label: 'gRPC', description: 'Binary remote procedure call framework utilizing HTTP/2.' },
            { label: 'AMQP / MQTT', description: 'Publish-subscribe and message-queue protocols.' },
            { label: 'SignalR / WebSockets', description: 'Protocols for bidirectional, persistent connections.' }
          ],
          description: 'Defines the primary protocols utilized for data exchange across system boundaries and client-server interactions. This is essential for evaluating network requirements, payload overhead, firewall configurations, and general interoperability constraints.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-state',
          aspect: 'Application State Model',
          examples: [
            { label: 'Stateless Services', description: 'No client session state is retained on the server between requests.' },
            { label: 'Stateful (In-Memory)', description: 'Server processes hold session or domain state in memory, requiring sticky sessions.' },
            { label: 'Distributed Cache Backed', description: 'State is offloaded to a distributed cache to maintain stateless compute nodes.' }
          ],
          description: 'Describes where the runtime state of user sessions and ongoing processes is held. This directly dictates how easily the application can be scaled horizontally and how it handles node failures.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-data-pattern',
          aspect: 'Data Architecture Patterns',
          examples: [
            { label: 'Standard CRUD', description: 'Direct mapping of objects to database tables for Create, Read, Update, and Delete operations.' },
            { label: 'CQRS', description: 'Command Query Responsibility Segregation, separating the models for reading and writing data.' },
            { label: 'Event Sourcing', description: 'State is derived from a sequentially appended log of immutable events rather than overwriting records.' }
          ],
          description: 'Defines the conceptual approach to how state mutations and data retrievals are structured. Complex domains often separate read and write models to scale them independently and handle intricate business logic.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-tenancy',
          aspect: 'Multi-Tenancy Model',
          examples: [
            { label: 'Isolated Silo', description: 'Dedicated infrastructure and isolated databases for each tenant.' },
            { label: 'Shared Compute / Isolated Data', description: 'Tenants share application instances but utilize strictly separated database schemas or instances.' },
            { label: 'Fully Pooled', description: 'All tenants share compute and database resources, separated only by a tenant identifier in the tables.' }
          ],
          description: 'Captures how the system isolates data and compute resources for different customers or tenants. This deeply impacts data security, compliance boundaries, and infrastructure operating costs.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-datetime',
          aspect: 'Date & Time Representation',
          examples: [
            { label: 'ISO 8601 (UTC)', description: 'Standardized string format representing absolute time (e.g., 2026-02-14T15:17:22Z).' },
            { label: 'Unix Timestamp', description: 'Numeric representation indicating seconds or milliseconds since the Unix epoch.' },
            { label: 'Local Time with Offset', description: 'Time representation that preserves the specific timezone offset of the origin.' }
          ],
          description: 'Specifies the standardized format used for storing, processing, and transmitting temporal data. A strictly defined standard across all layers is crucial for preventing timezone discrepancies, sorting anomalies, and data corruption in distributed systems.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-res',
          aspect: 'Resilience Patterns',
          examples: [
            { label: 'Retry', description: 'Automatic re-execution of failed operations assuming transient network or service issues.' },
            { label: 'Circuit Breaker', description: 'Mechanism to block outgoing requests to a failing service to prevent cascading failures.' },
            { label: 'Fallback', description: 'Providing predefined default values or cached data when a primary service is unavailable.' }
          ],
          description: 'Captures the software-level mechanisms implemented to handle partial system failures gracefully. This indicates how robust the application is against network unreliability, third-party outages, and unexpected load spikes without requiring manual intervention.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-off',
          aspect: 'Offline Capability',
          examples: [
            { label: 'Online-Only', description: 'The application blocks user interaction or fails when network connectivity is lost.' },
            { label: 'Local-First', description: 'Primary read and write operations occur on a local database, with background synchronization to a central server.' },
            { label: 'Sync-on-Connect', description: 'Specific operations are queued locally during offline periods and transmitted once connectivity is re-established.' }
          ],
          description: 'Describes the application behavior and data handling strategy when network connectivity is disrupted. This dictates the necessity for local storage mechanisms, conflict resolution algorithms, and state synchronization processes.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-decompose',
          aspect: 'Service Decomposition',
          examples: [
            { label: 'Monolith', description: 'All business logic, UI serving, and data access are compiled and deployed as a single process.' },
            { label: 'Modular Monolith', description: 'A single deployable unit where internal components are strictly isolated through defined boundaries.' },
            { label: 'Microservices', description: 'Business capabilities are split into independent processes that are deployed and scaled separately.' }
          ],
          description: 'Describes the strategy for dividing the solution into executable units. This decision deeply impacts deployment orchestration, team autonomy, integration testing, and the overall complexity of the delivery pipeline.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-consistency',
          aspect: 'Consistency Model',
          examples: [
            { label: 'Strong Consistency', description: 'A read operation is guaranteed to return the most recent write across all nodes.' },
            { label: 'Eventual Consistency', description: 'System state will eventually converge, meaning stale data may be read temporarily.' },
            { label: 'Saga Pattern', description: 'Distributed transactions are managed via a sequence of local transactions and compensating actions.' }
          ],
          description: 'Defines the target data consistency level across different systems, microservices, or database nodes. This is a fundamental decision balancing data accuracy against system availability and performance under network partitions.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-topology',
          aspect: 'Deployment Topology',
          examples: [
            { label: 'Single Instance', description: 'One application instance serves all users within a specific environment.' },
            { label: 'Multi-Tenant (Shared)', description: 'Multiple client organizations are served by a single application instance and database schema.' },
            { label: 'Multi-Region', description: 'The application is deployed across multiple geographic regions for latency reduction or legal compliance.' }
          ],
          description: 'Describes the physical or logical distribution model of the system. This clarifies how scaling is addressed, how data residency requirements are met, and how tenant isolation is implemented.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-cloud',
          aspect: 'Cloud Strategy & Dependency',
          examples: [
            { label: 'Cloud-Native', description: 'Heavily reliant on proprietary managed services of a specific cloud provider.' },
            { label: 'Cloud-Agnostic', description: 'Designed to run on any cloud utilizing standard containers and open-source infrastructure.' },
            { label: 'Hybrid Cloud', description: 'Architecture spans across on-premise infrastructure and public cloud environments.' },
            { label: 'On-Premise Only', description: 'No integration or reliance on public cloud services.' }
          ],
          description: 'Defines the strategic approach to cloud adoption. This highlights the degree of vendor lock-in, application portability, and network requirements for external cloud integrations.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-ai',
          aspect: 'AI Integration Pattern',
          examples: [
            { label: 'RAG (Retrieval-Augmented Generation)', description: 'Augmenting LLM prompts with dynamic data retrieved from secure external sources.' },
            { label: 'Embedded ML Model', description: 'Machine learning models loaded and executed directly within the application process.' },
            { label: 'Agentic Workflow', description: 'AI agents capable of making decisions and executing tool calls autonomously.' }
          ],
          description: 'Defines how Artificial Intelligence and Machine Learning are logically integrated. This heavily impacts system latency, data privacy boundaries, and protection against prompt injection attacks.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'frontend',
      title: 'Front-End',
      desc: 'Client-side frameworks, UI libraries and patterns',
      entries: [
        {
          id: 'fe-clientos',
          aspect: 'Client OS',
          examples: [
            { label: 'Windows', description: 'Requires a Microsoft Windows operating system environment.' },
            { label: 'Linux', description: 'Requires a Linux distribution.' },
            { label: 'macOS / iOS / Android', description: 'Requires Apple or Google operating systems.' }
          ],
          description: 'Defines the underlying operating systems required to execute the client application. This limits the potential user base and defines the required testing environments for hardware and OS-specific integrations.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-apptype',
          aspect: 'App Type & Stack',
          examples: [
            { label: 'Web SPA Framework', description: 'Browser-based Single Page Application (e.g., Angular, React, Vue).' },
            { label: 'Native Desktop', description: 'Application compiled for specific desktop environments (e.g., WPF, WinForms).' },
            { label: 'Hybrid Desktop', description: 'Web technologies wrapped in a native container (e.g., Electron, Tauri).' }
          ],
          description: 'Describes the fundamental UI architecture and the selected technology stack. This determines the execution context (browser vs. native), the update distribution mechanism, and the required skillset for frontend development.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-state',
          aspect: 'State Management',
          examples: [
            { label: 'Global State Container', description: 'Centralized, predictable state management pattern (e.g., NgRx, Redux).' },
            { label: 'MVVM Data Binding', description: 'Model-View-ViewModel pattern separating UI from state logic.' },
            { label: 'Local Component State', description: 'State is managed exclusively within individual components and passed via properties.' }
          ],
          description: 'Captures the strategy for holding, updating, and sharing data across different views or components. A clear state management pattern is vital for preventing race conditions and rendering inconsistencies in complex user interfaces.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-complib',
          aspect: 'Component Library',
          examples: [
            { label: 'Proprietary Suite', description: 'Licensed commercial UI component packages.' },
            { label: 'Open-Source Design System', description: 'Publicly available component libraries implementing standard design guidelines.' },
            { label: 'In-House Components', description: 'Custom-built UI elements maintained internally by the development team.' }
          ],
          description: 'Identifies the origin of the core user interface elements. This helps evaluate external dependencies, vendor lock-in risks, and the effort required to maintain visual consistency across the application.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-a11y',
          aspect: 'Accessibility (A11y)',
          examples: [
            { label: 'WCAG Compliance', description: 'Adherence to specific Web Content Accessibility Guidelines (e.g., AA level).' },
            { label: 'Screenreader Support', description: 'Implementation of ARIA attributes and semantic HTML for assistive technologies.' },
            { label: 'Keyboard Navigation', description: 'Ensuring all interactive elements are reachable and operable via keyboard.' }
          ],
          description: 'Captures the defined standard for making the application usable by people with disabilities. This is increasingly critical for legal compliance in public sector projects and broadens the overall user accessibility.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-i18n',
          aspect: 'Internationalization (i18n)',
          examples: [
            { label: 'Runtime Translation Library', description: 'Dynamic loading of language files at runtime based on user preference.' },
            { label: 'Build-Time Localization', description: 'Compiling separate application bundles for each supported language.' },
            { label: 'Formatting Libraries', description: 'Tools for adapting dates, numbers, and currencies to regional standards.' }
          ],
          description: 'Describes the architectural approach to supporting multiple languages and cultural formats. This affects the build pipeline, the translation workflow, and how text assets are managed alongside the codebase.',
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
            { label: 'Scripting Runtime', description: 'Interpreted or JIT-compiled runtimes like Node.js or Python.' }
          ],
          description: 'Defines the foundational platform on which the server-side business logic executes. This dictates the ecosystem of available libraries, performance characteristics, and hosting requirements.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-api-doc',
          aspect: 'API Documentation',
          examples: [
            { label: 'OpenAPI Specification', description: 'Machine-readable interface files for describing, producing, and consuming RESTful web services.' },
            { label: 'AsyncAPI Specification', description: 'Documentation standard for message-driven and event-driven architectures.' },
            { label: 'Static Documentation', description: 'Manually maintained wikis or markdown files describing the interfaces.' }
          ],
          description: 'Describes the methodology for documenting exposed interfaces. Standardized, machine-readable documentation is crucial for automated client generation and establishing clear contracts with external consumers.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-api-versioning',
          aspect: 'API Versioning',
          examples: [
            { label: 'URL Path Versioning', description: 'Embedding the version number directly in the endpoint URI.' },
            { label: 'Header Versioning', description: 'Clients specify the desired API version via custom HTTP headers or Accept headers.' },
            { label: 'Schema Evolution', description: 'Avoiding strict versioning in favor of deprecating specific fields and extending schemas (common in GraphQL).' }
          ],
          description: 'Defines the lifecycle strategy for APIs. A clear versioning approach is required to deploy non-backward-compatible changes without breaking integrations for existing clients.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-dal',
          aspect: 'Data Access Layer (DAL)',
          examples: [
            { label: 'Object-Relational Mapper (ORM)', description: 'Framework that maps database schemas to object-oriented code entities.' },
            { label: 'Micro-ORM', description: 'Lightweight mapper focusing on raw SQL execution with basic object mapping.' },
            { label: 'Raw SQL / Drivers', description: 'Direct execution of database queries using low-level database drivers.' }
          ],
          description: 'Captures the abstraction level used to interact with data stores. This choice represents a trade-off between developer productivity, type safety, and the ability to optimize complex queries for performance.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-ioc',
          aspect: 'IoC Container',
          examples: [
            { label: 'Built-in DI Framework', description: 'Using the dependency injection container provided by the core runtime framework.' },
            { label: 'Third-Party DI Library', description: 'Integrating specialized external libraries for advanced object lifetime management.' },
            { label: 'Manual Composition', description: 'Instantiating and injecting dependencies manually at the composition root without a framework.' }
          ],
          description: 'Defines the mechanism used to implement Inversion of Control. Managing dependencies centrally is essential for maintaining modularity, enabling unit testing through mocking, and controlling object lifecycles.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-jobs',
          aspect: 'Job Scheduling',
          examples: [
            { label: 'Application-Level Scheduler', description: 'Scheduling libraries integrated directly into the backend application process.' },
            { label: 'External Batch Processor', description: 'Dedicated external services or functions triggered by time-based events.' },
            { label: 'OS-Level Scheduler', description: 'Relying on operating system cron jobs or task schedulers to trigger scripts.' }
          ],
          description: 'Describes the architecture for executing time-based, recurring, or long-running background tasks independently of immediate user requests. This impacts how the system handles heavy processing without blocking the main thread.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'infra-data',
      title: 'Infrastructure & Data',
      desc: 'Databases, caches, queues and analytics',
      entries: [
        {
          id: 'infra-rdbms',
          aspect: 'Relational Database (RDBMS)',
          examples: [
            { label: 'Commercial RDBMS', description: 'Licensed relational database management systems.' },
            { label: 'Open-Source RDBMS', description: 'Community-driven relational database systems.' },
            { label: 'Embedded RDBMS', description: 'Relational databases running within the application process without a separate server.' }
          ],
          description: 'Specifies the primary database engine utilized for highly structured, ACID-compliant transactional data storage. This is a foundational decision regarding data integrity, query capabilities, and operational licensing costs.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-nosql',
          aspect: 'NoSQL Databases',
          examples: [
            { label: 'Document Store', description: 'Database designed for storing, retrieving, and managing semi-structured document-oriented information.' },
            { label: 'Key-Value Store', description: 'In-memory or on-disk database optimized for rapid retrieval via unique keys.' },
            { label: 'Search Engine', description: 'Data store optimized for full-text search and complex analytical queries.' }
          ],
          description: 'Captures non-relational database technologies employed for specific use cases where traditional relational models are bottlenecks. This often addresses requirements for flexible schemas, high-speed caching, or distributed search.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-middleware',
          aspect: 'Integration Middleware & Brokers',
          examples: [
            { label: 'Message Broker', description: 'Intermediary program module that translates a message from the formal messaging protocol of the sender to the receiver.' },
            { label: 'Event Streaming Platform', description: 'Distributed systems designed to handle real-time data feeds and event streams at scale.' },
            { label: 'ETL / Integration Server', description: 'Platforms dedicated to extracting, transforming, and loading data between disparate systems.' }
          ],
          description: 'Describes the infrastructure components responsible for asynchronous routing, message queuing, and event streaming. This is central to decoupling microservices and integrating with external legacy systems reliably.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-dataplatform',
          aspect: 'Data Platform & Warehousing',
          examples: [
            { label: 'Distributed SQL Engine', description: 'Query engines capable of querying massive datasets distributed across various storage systems.' },
            { label: 'Data Warehouse', description: 'Central repository of integrated data from multiple sources used for reporting and data analysis.' },
            { label: 'Data Lakehouse', description: 'Architecture combining the flexibility of data lakes with the data management capabilities of data warehouses.' }
          ],
          description: 'Defines the overarching architecture used for handling big data, historical analytics, and federated queries across the organization. This isolates heavy analytical workloads from operational transactional databases.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-analytics',
          aspect: 'Data Analytics & Visualization',
          examples: [
            { label: 'Business Intelligence Tools', description: 'Software used to retrieve, analyze, transform, and report data for business intelligence.' },
            { label: 'Time-Series Analytics', description: 'Tools specifically designed to visualize and analyze industrial or IoT time-series data.' },
            { label: 'Embedded Dashboards', description: 'Analytics components directly integrated into the primary user interface.' }
          ],
          description: 'Captures the presentation layer for data reporting. This details how end-users interact with aggregated data, generate reports, and monitor key performance indicators derived from the system data.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-cloud-services',
          aspect: 'Managed Cloud Services (PaaS/SaaS)',
          examples: [
            { label: 'Object Storage', description: 'Cloud-based unstructured data storage (e.g., AWS S3, Azure Blob).' },
            { label: 'Cognitive / AI APIs', description: 'External cloud services for machine learning, vision, or natural language processing.' },
            { label: 'Serverless Compute', description: 'Event-driven, short-lived compute functions (e.g., AWS Lambda, Azure Functions).' }
          ],
          description: 'Captures the reliance on specific managed cloud services that replace traditional, self-hosted infrastructure components. This is crucial for understanding data flow and external dependencies.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-vectordb',
          aspect: 'Vector Database / Search',
          examples: [
            { label: 'Dedicated Vector DB', description: 'Databases built specifically for high-dimensional vector embeddings (e.g., Milvus, Pinecone, Qdrant).' },
            { label: 'Relational Vector Extension', description: 'Using vector extensions within traditional databases (e.g., pgvector in PostgreSQL).' },
            { label: 'Cloud Search Service', description: 'Managed cloud services for semantic search and AI memory (e.g., Azure AI Search).' }
          ],
          description: 'Captures the storage and retrieval engine used for semantic search, similarity matching, and contextual memory for AI models.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'ops',
      title: 'Ops',
      desc: 'Operational tooling, hosting and deployment',
      entries: [
        {
          id: 'ops-webserver',
          aspect: 'Webserver / Reverse Proxy',
          examples: [
            { label: 'OS-Native Web Server', description: 'Web servers integrated tightly with the host operating system.' },
            { label: 'Reverse Proxy', description: 'Intermediary servers that forward client requests to backend application servers.' },
            { label: 'Embedded Web Server', description: 'Web server components running directly within the application process.' }
          ],
          description: 'Specifies the infrastructure component responsible for accepting HTTP requests, handling SSL termination, and routing traffic to the correct application processes.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-virtualization',
          aspect: 'Hardware Virtualization',
          examples: [
            { label: 'Type 1 Hypervisor', description: 'Bare-metal virtualization software running directly on the host hardware.' },
            { label: 'Type 2 Hypervisor', description: 'Virtualization software running on top of a conventional operating system.' },
            { label: 'Cloud IaaS', description: 'Infrastructure as a Service providing virtualized computing resources over the internet.' }
          ],
          description: 'Describes the hypervisor technology used if the system architecture relies on partitioning physical servers into multiple virtual machines. This dictates hardware utilization and isolation strategies.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-container-runtime',
          aspect: 'Container Runtime',
          examples: [
            { label: 'Daemon-based Runtime', description: 'Container engine relying on a background service running with elevated privileges.' },
            { label: 'Daemonless Runtime', description: 'Container engine capable of running containers as standard user processes.' },
            { label: 'Core Runtime Standard', description: 'Low-level runtime focused purely on container execution lifecycle.' }
          ],
          description: 'Identifies the low-level software component responsible for executing containers on a host operating system. This is relevant for operational security, resource overhead, and compatibility with orchestration tools.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-orchestration',
          aspect: 'Container Orchestration',
          examples: [
            { label: 'Cluster Orchestration', description: 'Systems for automating deployment, scaling, and operations of application containers across clusters of hosts.' },
            { label: 'Managed Control Plane', description: 'Cloud-provider managed services for container orchestration.' },
            { label: 'Local Orchestration', description: 'Tools for defining and running multi-container applications on a single host.' }
          ],
          description: 'Captures the mechanisms used to manage container lifecycles, handle load balancing, and ensure desired state configurations across multiple server nodes. This is the backbone of microservice operations.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-registry',
          aspect: 'Artifact / Container Registry',
          examples: [
            { label: 'Cloud Registry', description: 'Managed registry services provided by cloud vendors.' },
            { label: 'Self-Hosted Registry', description: 'Private registry instances deployed within the organizational network.' },
            { label: 'General Artifact Repository', description: 'Systems capable of storing various package formats alongside container images.' }
          ],
          description: 'Describes the central storage location for immutable build artifacts and container images. A well-managed registry is critical for deployment reproducibility, vulnerability scanning, and access control.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-iac',
          aspect: 'Infrastructure as Code (IaC)',
          examples: [
            { label: 'Declarative Provisioning', description: 'Tools that define the desired end-state of cloud infrastructure using configuration files.' },
            { label: 'Configuration Management', description: 'Tools focused on installing software and maintaining configuration on existing servers.' },
            { label: 'Cloud-Native Templates', description: 'Infrastructure definition languages specific to a single cloud provider.' }
          ],
          description: 'Defines the methodology for provisioning and managing infrastructure through machine-readable definition files. This ensures environments are reproducible, version-controlled, and free from manual configuration drift.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-cicd',
          aspect: 'CI/CD Pipeline',
          examples: [
            { label: 'Cloud-Based CI/CD', description: 'Managed continuous integration and deployment services.' },
            { label: 'Self-Hosted CI Server', description: 'Automation servers managed internally for building and testing code.' },
            { label: 'Repository-Integrated CI', description: 'Pipelines configured directly within the source code hosting platform.' }
          ],
          description: 'Describes the automated workflows utilized to compile code, run tests, and deploy releases. A defined pipeline reduces manual errors, accelerates feedback loops, and enforces quality gates before production deployments.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-log-aggregation',
          aspect: 'Log Aggregation',
          examples: [
            { label: 'Centralized Search Stack', description: 'Combinations of indexing engines, log shippers, and visualization dashboards.' },
            { label: 'Cloud Observability Platform', description: 'SaaS solutions for unified log management and analysis.' },
            { label: 'Syslog Servers', description: 'Traditional centralized logging using standard network protocols.' }
          ],
          description: 'Captures the strategy for consolidating log data from disparate servers and microservices into a single, searchable repository. This is vital for post-incident forensics, debugging, and identifying systemic errors.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-metrics',
          aspect: 'Metrics & Alerting',
          examples: [
            { label: 'Time-Series Monitoring', description: 'Systems designed specifically to collect and query numeric metric data over time.' },
            { label: 'Cloud-Native Monitoring', description: 'Built-in metric aggregation services provided by cloud environments.' },
            { label: 'Incident Management Systems', description: 'Platforms that route alerts to on-call personnel based on predefined rules.' }
          ],
          description: 'Describes the mechanisms used to continuously measure system health (CPU, memory, request rates) and notify operational staff when thresholds are breached, enabling proactive incident response.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-tracing',
          aspect: 'Distributed Tracing',
          examples: [
            { label: 'Telemetry Standards', description: 'Vendor-agnostic APIs and SDKs for instrumenting code and generating trace data.' },
            { label: 'Trace Visualization', description: 'Platforms for storing and querying the causal relationship between operations across microservices.' },
            { label: 'APM Solutions', description: 'Application Performance Monitoring suites incorporating automatic tracing capabilities.' }
          ],
          description: 'Defines the methodology for tracking the lifecycle of a single request as it traverses multiple independent services. This is indispensable for pinpointing latency bottlenecks and failures in complex distributed architectures.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-dr',
          aspect: 'Disaster Recovery & SLAs',
          examples: [
            { label: 'Active-Active', description: 'Multiple environments serving traffic simultaneously, allowing immediate failover.' },
            { label: 'Active-Passive', description: 'A secondary environment that is continuously updated but only takes over traffic upon primary failure.' },
            { label: 'Cold Standby', description: 'Infrastructure that must be manually provisioned and restored from backups in case of a disaster.' }
          ],
          description: 'Defines the operational preparedness for catastrophic failures. It establishes the target Recovery Time Objective (RTO) and Recovery Point Objective (RPO), which dictate backup frequencies and failover strategies.',
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
          description: 'Details the operational procedures designed to prevent catastrophic data loss. A defined strategy ensures that critical business information can be restored to a known good state following hardware failures or cyberattacks.',
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
          description: 'Captures the rules and mechanisms enforcing how long different categories of data are retained in the system. This is necessary for managing storage costs and adhering to legal frameworks.',
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
            { label: 'Federated Identity', description: 'Delegating authentication responsibility to an external, trusted identity provider.' },
            { label: 'Directory Services', description: 'Authentication relying on internal corporate user directories.' }
          ],
          description: 'Describes the mechanisms employed to definitively verify the identity of a human user or a communicating system. Strong authentication is the first line of defense against unauthorized system access.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-authz',
          aspect: 'Authorization (Permissions)',
          examples: [
            { label: 'Role-Based Access Control (RBAC)', description: 'Permissions are assigned to roles, and users are assigned to those roles.' },
            { label: 'Attribute-Based Access Control (ABAC)', description: 'Access is granted based on policies evaluating user, resource, and environment attributes.' },
            { label: 'Access Control Lists (ACL)', description: 'Explicit lists defining which users or processes have access to individual objects.' }
          ],
          description: 'Defines the logic and enforcement points used to determine what an authenticated identity is permitted to execute or view. Proper authorization prevents privilege escalation and lateral movement.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-secrets',
          aspect: 'Secret Management',
          examples: [
            { label: 'Centralized Vaults', description: 'Dedicated systems for securely storing, accessing, and auditing API keys and passwords.' },
            { label: 'Cloud KMS', description: 'Key management services provided by cloud vendors for cryptographic operations.' },
            { label: 'Environment Injection', description: 'Injecting secrets directly into the application process via operating system variables at startup.' }
          ],
          description: 'Captures the architecture for handling sensitive configuration data. Removing hardcoded secrets from source code and utilizing secure retrieval mechanisms is fundamental to preventing credential leakage.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-encryption',
          aspect: 'Encryption (Rest & Transit)',
          examples: [
            { label: 'Transport Layer Security', description: 'Cryptographic protocols designed to provide communications security over a computer network.' },
            { label: 'Storage-Level Encryption', description: 'Encrypting data transparently at the disk or filesystem level.' },
            { label: 'Application-Level Encryption', description: 'Encrypting specific fields or payloads within the application code before storage.' }
          ],
          description: 'Details the cryptographic strategies implemented to protect data confidentiality. Encryption in transit prevents eavesdropping, while encryption at rest protects against physical theft or unauthorized disk access.',
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
          description: 'Describes the automated tooling integrated into the development lifecycle to proactively detect security flaws. Continuous scanning is necessary to identify regressions and zero-day vulnerabilities in dependencies.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    },
    {
      id: 'hardware-io',
      title: 'Hardware & IO',
      desc: 'Hardware interfaces, sensors, and real-time IO',
      entries: [
        {
          id: 'hw-communication',
          aspect: 'Communication Patterns',
          examples: [
            { label: 'Polling Mechanism', description: 'The software repeatedly queries the hardware interface at predefined intervals for state changes.' },
            { label: 'Interrupt-Driven', description: 'The hardware actively signals the CPU and software when data is ready or a state change occurs.' },
            { label: 'Event-Driven Abstraction', description: 'Low-level hardware interactions are abstracted into higher-level software events for the application.' }
          ],
          description: 'Describes the architectural pattern utilized to exchange data with physical hardware. This decision drastically impacts CPU utilization, power consumption, and the latency of hardware reactions.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'hw-driver',
          aspect: 'Driver Abstraction',
          examples: [
            { label: 'Vendor SDK', description: 'Interacting with hardware utilizing closed-source libraries provided by the manufacturer.' },
            { label: 'Native OS Interfaces', description: 'Communicating directly with the operating system kernel or standard device files.' },
            { label: 'Standardized Protocols', description: 'Utilizing industry-standard communication protocols (e.g., SCPI, Modbus) independent of specific hardware vendors.' }
          ],
          description: 'Identifies the layer of software utilized to bridge the application logic with the physical hardware. This reveals the degree of vendor lock-in and the complexity involved in replacing hardware components.',
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
            { label: 'ALM Integration', description: 'Test management integrated directly into the broader Application Lifecycle Management tool.' },
            { label: 'Dedicated Test Software', description: 'Standalone systems specialized purely in test planning, execution, and reporting.' },
            { label: 'Document-Based', description: 'Maintaining test procedures in spreadsheets or text documents.' }
          ],
          description: 'Describes the methodology and tooling for documenting, organizing, and tracking the execution of both manual and automated tests. This ensures test coverage is visible and tied to business requirements.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-code-quality',
          aspect: 'Code Quality & Coverage',
          examples: [
            { label: 'Static Code Analysis', description: 'Tools that analyze source code for bugs, code smells, and technical debt without executing it.' },
            { label: 'Code Coverage Tracking', description: 'Instrumentation that measures the percentage of source code executed during automated tests.' },
            { label: 'Automated Linting', description: 'Enforcing syntactical rules and code formatting standards automatically during the build.' }
          ],
          description: 'Describes the automated mechanisms used to measure test coverage, identify code smells, and enforce maintainability standards across the codebase independently of functional correctness.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-integration',
          aspect: 'Integration & API Testing',
          examples: [
            { label: 'API Testing Frameworks', description: 'Tools designed to send programmatic requests to backend APIs and assert the responses.' },
            { label: 'Contract Testing', description: 'Verifying that services can communicate with each other by checking that they adhere to a shared, agreed-upon contract.' },
            { label: 'Service Mocking / Virtualization', description: 'Simulating the behavior of external or unavailable dependencies to isolate the system under test.' }
          ],
          description: 'Defines the methodology for testing interactions between discrete system components, microservices, or external third-party systems without relying on a full graphical user interface.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-e2e',
          aspect: 'End-to-End (E2E) Testing',
          examples: [
            { label: 'Browser Automation', description: 'Tools that control web browsers programmatically to simulate user journeys.' },
            { label: 'Desktop UI Automation', description: 'Frameworks capable of interacting with native operating system UI components.' },
            { label: 'Mobile Device Testing', description: 'Tools that automate interactions on physical or emulated mobile devices.' }
          ],
          description: 'Describes the approach to validating the entire software stack from the user interface down to the database. E2E tests are critical for catching integration issues that unit tests might miss.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-performance',
          aspect: 'Performance & Load Testing',
          examples: [
            { label: 'Protocol-Level Load Testing', description: 'Simulating high concurrency by sending large volumes of network requests to the server.' },
            { label: 'Developer-Centric Load Testing', description: 'Performance tests written in code and maintained alongside the application repository.' },
            { label: 'Cloud-Distributed Stress Testing', description: 'Utilizing cloud infrastructure to simulate massive, geographically distributed user traffic.' }
          ],
          description: 'Describes the approach to simulating high user traffic and data volumes to validate system stability, identify bottlenecks, and verify performance SLAs under stress.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-testdata',
          aspect: 'Test Data Management',
          examples: [
            { label: 'Synthetic Data Generation', description: 'Programmatically creating realistic but entirely fake datasets for testing purposes.' },
            { label: 'Production Anonymization', description: 'Taking production data and scrubbing or obfuscating Personally Identifiable Information (PII) before use in test environments.' },
            { label: 'State Snapshots', description: 'Utilizing database clones or snapshots to provide a consistent, reproducible data baseline before each test run.' }
          ],
          description: 'Captures the strategy for provisioning, managing, and securing the data used during testing. This is essential for ensuring reliable test scenarios while strictly maintaining compliance with data privacy regulations.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    }
  ]
}