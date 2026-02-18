export function getCategoriesData() {
  return {
    statusOptions: [
      { label: 'Adopt', description: 'We use this and recommend it.' },
      { label: 'Trial', description: 'We are testing this in selected production scenarios.' },
      { label: 'Assess', description: 'We are currently evaluating/testing this.' },
      { label: 'Hold', description: 'We use this, but do not recommend it for new features.' },
      { label: 'Retire', description: 'We are actively replacing or removing this.' }
    ],
    categories: [
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
            { label: 'HTTP / RESTful', description: 'Web-based synchronous request-response protocols (REST APIs, OpenAPI).' },
            { label: 'GraphQL', description: 'Query language for APIs with strongly-typed schema (Apollo, Relay, Strawberry Shake, Hot Chocolate).' },
            { label: 'gRPC', description: 'Binary remote procedure call framework utilizing HTTP/2.' },
            { label: 'WebSocket / Real-time', description: 'Persistent bidirectional communication channels (SignalR, Socket.IO, WebSocket API).' },
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
            { label: 'Event Sourcing', description: 'State is derived from a sequentially appended log of immutable events.' }
          ],
          description: 'Defines the conceptual approach to how state mutations and data retrievals are structured.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-ownership',
          aspect: 'Data Ownership',
          appliesTo: { architecturalRole: ['Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Shared DB', description: 'Multiple services read and write to the same database schema.' },
            { label: 'DB per Service', description: 'Each service exclusively owns its database and schema.' },
            { label: 'Domain-Owned Models', description: 'Data contracts are strictly owned by specific domain boundaries.' }
          ],
          description: 'Describes who owns data and how ownership is technically enforced to prevent coupling.',
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
          id: 'arch-failure',
          aspect: 'Failure Domains',
          examples: [
            { label: 'Isolation Boundaries', description: 'Containing failures to a specific sub-system.' },
            { label: 'Bulkheads', description: 'Resource isolation per component to prevent cascading resource exhaustion.' },
            { label: 'Graceful Degradation', description: 'Deliberately reducing functionality to keep core systems alive under stress.' }
          ],
          description: 'Captures how systemic failures are isolated so that a single component crash does not bring down the entire application.',
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
          id: 'arch-integration',
          aspect: 'Integration Pattern',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'API Gateway', description: 'Single entry point routing requests to internal APIs.' },
            { label: 'Backend-for-Frontend (BFF)', description: 'Tailored backend aggregation layer for specific UI clients.' },
            { label: 'Adapter', description: 'Translating interfaces to integrate legacy systems.' }
          ],
          description: 'Describes the pattern used to handle external or internal integration points and API aggregation.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-consistency',
          aspect: 'Consistency Model',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Strong Consistency', description: 'A read operation is guaranteed to return the most recent write across all nodes.' },
            { label: 'Eventual Consistency', description: 'System state will eventually converge, meaning stale data may be read temporarily.' },
            { label: 'Saga Pattern', description: 'Distributed transactions are managed via a sequence of local transactions.' }
          ],
          description: 'Defines the target data consistency level across different systems, microservices, or database nodes.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-extensibility',
          aspect: 'Extensibility Model',
          examples: [
            { label: 'Plugin Architecture', description: 'System is designed to load external feature modules at runtime.' },
            { label: 'Extension Points / Hooks', description: 'Pre-defined lifecycle hooks allowing custom code execution.' },
            { label: 'Event-Driven Webhooks', description: 'Emitting events to allow external systems to react to changes.' }
          ],
          description: 'Captures how the architecture anticipates and supports future functional extensions without requiring core modifications.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-feature',
          aspect: 'Feature Strategy',
          examples: [
            { label: 'Feature Flags', description: 'Dynamic toggling of features at runtime without redeployment.' },
            { label: 'Progressive Rollout', description: 'Gradual exposure of new features to a subset of users (Canary).' },
            { label: 'Build-Time Configuration', description: 'Features are statically enabled or disabled during compilation.' }
          ],
          description: 'Describes how the release and visibility of new features are controlled and decoupled from code deployments.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'arch-dep',
          aspect: 'Dependency Management',
          examples: [
            { label: 'Strict Vetting', description: 'Mandatory security and architecture review before introducing new libraries.' },
            { label: 'Allowed List', description: 'Developers may only select from a pre-approved repository of libraries.' },
            { label: 'Free Choice', description: 'Teams autonomously choose third-party dependencies as needed.' }
          ],
          description: 'Captures the governance model applied to the selection, maintenance, and updating of third-party libraries.',
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
            { label: 'Windows', description: 'Requires a Microsoft Windows environment (Windows 10, Windows 11).' },
            { label: 'Linux', description: 'Requires a Linux distribution (Ubuntu, Debian, Fedora, RHEL).' },
            { label: 'macOS / iOS / Android', description: 'Requires Apple or Google OS (macOS 12+, iOS 15+, Android 11+).' }
          ],
          description: 'Defines the underlying operating systems required to execute the client application.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-apptype',
          aspect: 'App Type & Stack',
          examples: [
            { label: 'Web SPA Framework', description: 'Browser-based Single Page Application (Angular, React, Vue.js, Svelte, Solid.js).' },
            { label: 'Native Desktop', description: 'Application compiled for specific desktop environments (WPF, WinForms, Qt, JavaFX).' },
            { label: 'Hybrid Desktop', description: 'Web technologies wrapped in a native container (Electron, Tauri, NW.js).' }
          ],
          description: 'Describes the fundamental UI architecture and the selected technology stack.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-state',
          aspect: 'State Management',
          examples: [
            { label: 'Global State Container', description: 'Centralized, predictable state management pattern (Redux, Zustand, MobX, Pinia, Vuex, NgRx, Recoil, Jotai).' },
            { label: 'Reactive Programming', description: 'Stream-based state management using observables (RxJS, Bacon.js, xstream).' },
            { label: 'MVVM Data Binding', description: 'Model-View-ViewModel pattern separating UI from state logic (Knockout.js, MVVM Light).' },
            { label: 'Local Component State', description: 'State is managed exclusively within individual components (React useState/useReducer, Vue Composition API).' }
          ],
          description: 'Captures the strategy for holding, updating, and sharing data across different views or components.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-complib',
          aspect: 'Component Library',
          examples: [
            { label: 'Proprietary Suite', description: 'Licensed commercial UI component packages (Telerik, DevExpress, Syncfusion, AG Grid, Kendo UI).' },
            { label: 'Open-Source Design System', description: 'Publicly available component libraries (Material UI, Ant Design, Chakra UI, Vuetify, PrimeVue, Bootstrap, Tailwind UI, shadcn/ui).' },
            { label: 'In-House Components', description: 'Custom-built UI elements maintained internally.' }
          ],
          description: 'Identifies the origin of the core user interface elements.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-cache',
          aspect: 'Client Caching Strategy',
          examples: [
            { label: 'Service Worker', description: 'Caching network requests for offline use (Workbox, sw-precache, sw-toolbox).' },
            { label: 'Local Database', description: 'Structured local data storage (IndexedDB, Dexie.js, LocalForage, SQLite, PouchDB).' },
            { label: 'In-Memory Only', description: 'Data is only cached during the active user session (SessionStorage, in-memory objects).' }
          ],
          description: 'Describes how data is cached locally on the client to reduce network requests and support offline modes.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-error',
          aspect: 'Client Error Handling',
          examples: [
            { label: 'Global Error Boundary', description: 'Centralized UI component catching rendering errors (React Error Boundaries, Vue errorHandler).' },
            { label: 'HTTP Interceptors', description: 'Centralized catching of failed network requests (Axios interceptors, Angular HttpInterceptor, fetch wrappers).' },
            { label: 'Silent Failure', description: 'Errors are logged but do not actively disrupt the UI state.' }
          ],
          description: 'Describes the code-level strategy for handling runtime exceptions gracefully within the UI without crashing the application.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-logging',
          aspect: 'Client Logging',
          examples: [
            { label: 'Browser Console', description: 'Standard console outputs intended for debugging only (console.log, console.error).' },
            { label: 'Custom Logger Abstraction', description: 'Wrapper preventing direct console calls and allowing log-level filtering (loglevel, winston, pino, bunyan).' }
          ],
          description: 'Captures how client-side events are recorded within the code (Note: Telemetry to external servers is in Ops).',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-a11y',
          aspect: 'Accessibility (A11y)',
          examples: [
            { label: 'WCAG Compliance', description: 'Adherence to specific Web Content Accessibility Guidelines (WCAG 2.1 Level AA/AAA).' },
            { label: 'Screenreader Support', description: 'Implementation of ARIA attributes for assistive technologies (NVDA, JAWS, VoiceOver, TalkBack).' },
            { label: 'Keyboard Navigation', description: 'Ensuring all interactive elements are operable via keyboard (tabindex, focus management).' }
          ],
          description: 'Captures the defined standard for making the application usable by people with disabilities.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-i18n',
          aspect: 'Internationalization (i18n)',
          examples: [
            { label: 'Runtime Translation Library', description: 'Dynamic loading of language files at runtime (i18next, vue-i18n, react-intl, FormatJS, ngx-translate, Transloco).' },
            { label: 'Build-Time Localization', description: 'Compiling separate application bundles for each supported language (Angular i18n, Polyglot.js).' }
          ],
          description: 'Describes the architectural approach to supporting multiple languages and cultural formats in the UI.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-analytics',
          aspect: 'Client Analytics',
          examples: [
            { label: 'SaaS Analytics', description: 'Tracking user interaction via cloud tools (Google Analytics, Pendo, Mixpanel, Amplitude, Heap, Hotjar).' },
            { label: 'Self-Hosted Tracking', description: 'Internal behavioral tracking (Matomo, Plausible, Umami).' },
            { label: 'No Tracking', description: 'No telemetry or behavioral data is collected.' }
          ],
          description: 'Defines how user behavior and UI interaction flows are measured and analyzed.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-build',
          aspect: 'Frontend Build System',
          examples: [
            { label: 'Module Bundler', description: 'Packaging code and assets (Webpack, Vite, Rollup, esbuild, Parcel, Turbopack).' },
            { label: 'Module Federation', description: 'Runtime code sharing across separately built applications (Webpack Module Federation, Vite Federation).' },
            { label: 'Monorepo Tooling', description: 'Managing multi-package repositories (Nx, Turborepo, Lerna, Rush, pnpm workspaces).' },
            { label: 'Native Compiler', description: 'Compiling UI code to native executables (Flutter, React Native, .NET MAUI, Electron, Tauri).' }
          ],
          description: 'Describes the toolchain used to compile, minify, and package the frontend assets for deployment.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-quality',
          aspect: 'Code Quality & Formatting',
          examples: [
            { label: 'Linter', description: 'Static analysis for code patterns (ESLint, TSLint, Stylelint, oxlint, Biome).' },
            { label: 'Formatter', description: 'Opinionated code styling enforcement (Prettier, dprint, Biome).' }
          ],
          description: 'Captures the automated rules ensuring consistent styling and preventing common syntax errors in the UI codebase.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-unittest',
          aspect: 'Frontend Unit Testing',
          examples: [
            { label: 'DOM Testing Framework', description: 'Tools for testing UI component rendering (Jest, Vitest, React Testing Library, Vue Test Utils, Jasmine, Mocha, Karma).' },
            { label: 'Headless Browser Tests', description: 'Executing tests in a browser environment without UI (Puppeteer, Playwright, jsdom).' }
          ],
          description: 'Defines the framework used to validate isolated frontend logic and component behavior.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'fe-dev-env',
          aspect: 'Development Environment',
          examples: [
            { label: 'Lightweight Editor', description: 'Editors heavily extended via plugins (VS Code, Sublime Text, Atom, Zed).' },
            { label: 'Full IDE', description: 'Integrated development environments (Visual Studio, WebStorm, IntelliJ IDEA, Rider).' }
          ],
          description: 'Describes the expected and officially supported local tooling setup for frontend engineers.',
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
            { label: '.NET Runtime', description: 'Execution environment for C#, F#, or VB.NET (.NET 6/7/8, .NET Framework, ASP.NET Core, Mono).' },
            { label: 'Java Virtual Machine (JVM)', description: 'Execution environment for Java, Kotlin, or Scala (OpenJDK, Oracle JDK, GraalVM, Amazon Corretto, Spring Boot).' },
            { label: 'Scripting Runtime', description: 'Interpreted runtimes (Node.js, Deno, Bun, Python, Ruby, PHP, Go).' }
          ],
          description: 'Defines the foundational platform on which the server-side or core business logic executes.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-api-doc',
          aspect: 'API Documentation',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'OpenAPI Specification', description: 'Machine-readable interface files for RESTful services (Swagger/Swashbuckle, Redoc, Scalar, Stoplight, NSwag).' },
            { label: 'GraphQL Schema', description: 'Introspectable schema definition language for GraphQL APIs (GraphQL SDL, Apollo Studio, GraphiQL).' },
            { label: 'AsyncAPI Specification', description: 'Documentation standard for event-driven architectures (AsyncAPI, CloudEvents).' }
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
            { label: 'Object-Relational Mapper (ORM)', description: 'Framework that maps database schemas to code entities (Entity Framework, Hibernate, Sequelize, TypeORM, Prisma, Django ORM, SQLAlchemy).' },
            { label: 'Micro-ORM', description: 'Lightweight mapper focusing on raw SQL execution (Dapper, Slapper, PetaPoco).' },
            { label: 'Raw SQL / Drivers', description: 'Direct execution of queries using low-level database drivers (ADO.NET, JDBC, psycopg2, mysql2, pg).' }
          ],
          description: 'Captures the abstraction level used to interact with data stores.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-ioc',
          aspect: 'IoC Container',
          examples: [
            { label: 'Built-in DI Framework', description: 'Using the dependency injection container provided by the core runtime (ASP.NET Core DI, Spring Framework, NestJS).' },
            { label: 'Third-Party DI Library', description: 'Integrating specialized external libraries for DI (Autofac, Ninject, Unity, InversifyJS, TSyringe, Guice, Dagger).' },
            { label: 'Manual Composition', description: 'Instantiating dependencies manually at the composition root.' }
          ],
          description: 'Defines the mechanism used to implement Inversion of Control and dependency injection.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-cache',
          aspect: 'Server-Side Caching',
          examples: [
            { label: 'In-Memory Cache', description: 'Caching data locally within the application process (MemoryCache, Caffeine, Guava Cache, node-cache).' },
            { label: 'Distributed Cache', description: 'Externalizing cache to a shared memory store (Redis, Memcached, Hazelcast, Apache Ignite).' }
          ],
          description: 'Defines how the backend mitigates database load and reduces latency for frequently accessed data.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-jobs',
          aspect: 'Job Scheduling',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Application-Level Scheduler', description: 'Scheduling libraries integrated directly into the application process (Hangfire, Quartz.NET, node-cron, Bull, BullMQ, APScheduler, Celery).' },
            { label: 'External Batch Processor', description: 'Dedicated external services triggered by time-based events (Kubernetes CronJobs, AWS EventBridge, Azure Functions Timer).' }
          ],
          description: 'Describes the architecture for executing time-based or long-running background tasks.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-workflow',
          aspect: 'Workflow Engine',
          appliesTo: { architecturalRole: ['Standalone System', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'BPMN Engine', description: 'Executable business process models (Camunda, Flowable, Activiti, jBPM).' },
            { label: 'State Machine', description: 'Code-based workflow orchestrators (Temporal, Elsa Workflows, Conductor, AWS Step Functions, Cadence).' }
          ],
          description: 'Captures how complex, multi-step, or durable business processes are orchestrated and tracked.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-error',
          aspect: 'Backend Error Handling',
          examples: [
            { label: 'Global Exception Middleware', description: 'Centralized interception of unhandled exceptions converting them to standard HTTP responses (ASP.NET Exception Filters, Express error middleware, Spring @ControllerAdvice).' },
            { label: 'Result Pattern', description: 'Returning explicit success/failure objects instead of throwing exceptions (FluentResults, LanguageExt, Result<T>, Railway-oriented programming).' }
          ],
          description: 'Describes the structural code pattern utilized to manage exceptions and provide meaningful error states.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-logging',
          aspect: 'Backend Logging Framework',
          examples: [
            { label: 'Structured Logging Library', description: 'Emitting logs as queryable JSON objects (Serilog, NLog, Log4net, Winston, Pino, Bunyan, Logback, Log4j2, slf4j).' },
            { label: 'Standard Text Logger', description: 'Classic string-based logging (System.Diagnostics.Trace, Console logging).' }
          ],
          description: 'Describes the in-code library used to generate log events before they are shipped to aggregation servers.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-unittest',
          aspect: 'Backend Unit Testing',
          examples: [
            { label: 'xUnit / NUnit / JUnit', description: 'Standard object-oriented testing frameworks (xUnit.net, NUnit, MSTest, JUnit 5, TestNG, pytest, RSpec, PHPUnit).' },
            { label: 'Mocking Libraries', description: 'Tools for generating fake dependencies (Moq, NSubstitute, FakeItEasy, Mockito, Sinon, Jest mocks).' },
            { label: 'Assertion Libraries', description: 'Fluent APIs for writing expressive test assertions (Fluent Assertions, Shouldly, AssertJ, Chai, Hamcrest).' },
            { label: 'Test Data Builders', description: 'Libraries for creating test objects (AutoMapper for DTOs, AutoFixture, Bogus, Factory Bot).' }
          ],
          description: 'Defines the frameworks used to isolate and test backend classes and domain logic.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-integration',
          aspect: 'Backend Integration Testing',
          examples: [
            { label: 'In-Memory Test Servers', description: 'Bootstrapping the application in memory for fast API testing (WebApplicationFactory, Spring Boot Test, Supertest).' },
            { label: 'Testcontainers', description: 'Spinning up real databases in Docker for tests (Testcontainers, Docker Compose for testing).' }
          ],
          description: 'Captures how data access layers and API endpoints are validated against real infrastructure during development.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-perf',
          aspect: 'Code-Level Profiling',
          examples: [
            { label: 'Micro-Benchmarking', description: 'Measuring execution time of specific algorithms (BenchmarkDotNet, JMH, Criterion, Apache JMeter).' },
            { label: 'Memory Profiling', description: 'Analyzing heap allocations and memory leaks locally (dotMemory, VisualVM, Chrome DevTools, Valgrind).' }
          ],
          description: 'Describes how the development team analyzes code performance and optimization at a granular level.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'be-dev-env',
          aspect: 'Development Environment',
          examples: [
            { label: 'Full IDE', description: 'Heavyweight IDEs providing deep language integration (Visual Studio, IntelliJ IDEA, Rider, PyCharm, WebStorm, Eclipse, NetBeans).' },
            { label: 'Lightweight Editor', description: 'Fast, plugin-based editors (VS Code, Sublime Text, Vim, Emacs, Neovim).' }
          ],
          description: 'Describes the officially supported local IDE and tooling setup for backend engineers.',
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
            { label: 'Commercial RDBMS', description: 'Licensed relational database management systems (Oracle Database, Microsoft SQL Server, IBM Db2).' },
            { label: 'Open-Source RDBMS', description: 'Community-driven relational database systems (PostgreSQL, MySQL, MariaDB, SQLite, CockroachDB).' }
          ],
          description: 'Specifies the primary database engine utilized for highly structured, ACID-compliant transactional data storage.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-schema',
          aspect: 'Schema Migration Management',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Code-First Migrations', description: 'Database changes derived from code models (Entity Framework Migrations, Alembic, Django Migrations, TypeORM Migrations).' },
            { label: 'SQL-Based Versioning', description: 'Executing versioned SQL scripts (Liquibase, Flyway, DbUp, golang-migrate).' }
          ],
          description: 'Captures how database schema alterations are version-controlled, reviewed, and deployed without data loss.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-nosql',
          aspect: 'NoSQL Databases',
          examples: [
            { label: 'Document Store', description: 'Database designed for semi-structured document-oriented information (MongoDB, CouchDB, RavenDB, Cosmos DB).' },
            { label: 'Key-Value Store', description: 'In-memory or on-disk database optimized for rapid retrieval via unique keys (Redis, Memcached, DynamoDB, Riak).' },
            { label: 'Search Engine', description: 'Data store optimized for full-text search and complex queries (Elasticsearch, OpenSearch, Solr, Meilisearch, Typesense, Algolia).' }
          ],
          description: 'Captures non-relational database technologies employed for specific use cases like flexible schemas or high-speed caching.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-vectordb',
          aspect: 'Vector Database / Search',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Dedicated Vector DB', description: 'Databases built specifically for high-dimensional vector embeddings (Pinecone, Weaviate, Qdrant, Milvus, Chroma, Vespa).' },
            { label: 'Relational Vector Extension', description: 'Using vector extensions within traditional databases (pgvector for PostgreSQL, Azure Cosmos DB vector search).' }
          ],
          description: 'Captures the storage and retrieval engine used for semantic search and contextual memory for AI models.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-middleware',
          aspect: 'Message Bus & Integration Middleware',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Message Broker', description: 'Intermediary program that translates messages (RabbitMQ, ActiveMQ, Azure Service Bus, AWS SQS, Google Pub/Sub, NATS).' },
            { label: 'Event Streaming Platform', description: 'Distributed systems for real-time data feeds and event streams (Apache Kafka, Redpanda, Pulsar, Amazon Kinesis).' },
            { label: 'ETL / Integration Server', description: 'Platforms dedicated to extracting, transforming, and loading data (Apache NiFi, Talend, Informatica, Azure Data Factory, AWS Glue).' }
          ],
          description: 'Describes the infrastructure components responsible for asynchronous routing, message queuing, and event streaming between services.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-dataplatform',
          aspect: 'Data Platform & Warehousing',
          appliesTo: { architecturalRole: ['Standalone System', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Data Warehouse', description: 'Central repository of integrated data for reporting and analysis (Snowflake, Amazon Redshift, Google BigQuery, Azure Synapse, Teradata).' },
            { label: 'Data Lakehouse', description: 'Architecture combining data lakes with data warehouse capabilities (Databricks, Apache Iceberg, Delta Lake, Apache Hudi).' }
          ],
          description: 'Defines the architecture used for handling big data, historical analytics, and federated queries.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-analytics',
          aspect: 'Data Analytics & Visualization',
          appliesTo: { architecturalRole: ['Standalone System', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Business Intelligence Tools', description: 'Software used to retrieve, analyze, transform, and report data for business intelligence (Power BI, Tableau, Looker, Qlik, Metabase, Apache Superset, Grafana).' },
            { label: 'Time-Series Analytics', description: 'Tools specifically designed to visualize and analyze industrial or IoT time-series data (InfluxDB, TimescaleDB, Prometheus + Grafana).' },
            { label: 'Embedded Dashboards', description: 'Analytics components directly integrated into the primary user interface (Chart.js, D3.js, Apache ECharts, Plotly, Recharts).' }
          ],
          description: 'Captures the presentation layer for data reporting. This details how end-users interact with aggregated data, generate reports, and monitor KPIs.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'infra-cloud-services',
          aspect: 'Managed Cloud Services (PaaS/SaaS)',
          examples: [
            { label: 'Object Storage', description: 'Cloud-based unstructured data storage (AWS S3, Azure Blob Storage, Google Cloud Storage, MinIO, Backblaze B2).' },
            { label: 'Cognitive / AI APIs', description: 'External cloud services for machine learning or NLP (OpenAI API, Azure Cognitive Services, Google Cloud AI, AWS Bedrock, Anthropic Claude API).' },
            { label: 'Serverless Compute', description: 'Event-driven, short-lived compute functions (AWS Lambda, Azure Functions, Google Cloud Functions, Cloudflare Workers, Vercel Functions).' }
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
          id: 'ops-deploy',
          aspect: 'Deployment Artifact',
          examples: [
            { label: 'Container Image', description: 'Standardized OS-level virtualization package (Docker Image, OCI Image, Podman Image).' },
            { label: 'OS Installer', description: 'Native installation routines (MSI, DEB, RPM, PKG, AppImage, Snap, Flatpak).' },
            { label: 'Serverless Package', description: 'Zipped code bundles deployed to function runtimes (AWS SAM, Serverless Framework, ZIP archives).' }
          ],
          description: 'Describes the immutable artifact format utilized to transport the compiled application into a runtime environment.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-update',
          aspect: 'Update Mechanism',
          examples: [
            { label: 'Automated Pull', description: 'Infrastructure actively fetches the latest artifacts (Kubernetes GitOps with ArgoCD, Flux CD, Fleet).' },
            { label: 'Push Pipeline', description: 'CI/CD pipeline forces artifacts onto the target servers (GitHub Actions, GitLab CI, Jenkins, Azure DevOps Pipelines, CircleCI).' },
            { label: 'Manual Execution', description: 'Updates require human interaction and execution on the target machine.' }
          ],
          description: 'Captures how new software versions are physically placed and activated on target environments.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-config',
          aspect: 'Configuration Management',
          examples: [
            { label: 'Environment Variables', description: 'Configuration supplied directly through the OS or container runtime (.env files, Kubernetes ConfigMaps/Secrets).' },
            { label: 'Central Config Server', description: 'A dedicated service dispensing configuration dynamically (Consul, Spring Cloud Config, AWS AppConfig, Azure App Configuration).' },
            { label: 'Local Config Files', description: 'Static JSON/YAML/XML files deployed alongside the application (appsettings.json, config.yaml, application.properties).' }
          ],
          description: 'Describes the strategy for managing environment-specific settings outside of the source code.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-resources',
          aspect: 'Resource Constraints & Requirements',
          examples: [
            { label: 'Hardware Accelerators', description: 'Strict requirement for GPUs or TPUs.' },
            { label: 'Fixed CPU/RAM Allocations', description: 'Application demands statically reserved memory or cores.' }
          ],
          description: 'Identifies specific hardware dependencies that limit where the application can be hosted.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-remote',
          aspect: 'Remote Support Access',
          examples: [
            { label: 'VPN & SSH', description: 'Direct network-level and shell access.' },
            { label: 'Zero-Trust Tunnels', description: 'Granular application-layer access without opening broad networks.' },
            { label: 'Telemetry Export Only', description: 'No inbound access allowed; diagnostics rely on exported log files.' }
          ],
          description: 'Captures the allowed pathways for operations teams to interact with the system for debugging and maintenance.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-webserver',
          aspect: 'Webserver / Reverse Proxy',
          appliesTo: { executionType: ['Web Application', 'Headless Service / API'] },
          examples: [
            { label: 'OS-Native Web Server', description: 'Web servers integrated tightly with the host operating system (IIS, Apache HTTP Server, nginx).' },
            { label: 'Reverse Proxy', description: 'Intermediary servers that forward client requests to backend processes (nginx, HAProxy, Traefik, Envoy, Caddy, Kong, YARP).' },
            { label: 'Application-Level Proxy', description: 'Reverse proxies built into the application runtime (Kestrel with YARP, Node.js http-proxy, Spring Cloud Gateway).' }
          ],
          description: 'Specifies the infrastructure component responsible for accepting HTTP requests and routing traffic.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-virtualization',
          aspect: 'Hardware Virtualization',
          examples: [
            { label: 'Type 1 Hypervisor', description: 'Bare-metal virtualization software running directly on the host hardware (VMware ESXi, Proxmox VE, Microsoft Hyper-V Server, Citrix Hypervisor).' },
            { label: 'Type 2 Hypervisor', description: 'Virtualization software running on top of a conventional operating system (VMware Workstation, VirtualBox, Parallels, Hyper-V on Windows).' },
            { label: 'Cloud IaaS', description: 'Infrastructure as a Service providing virtualized computing resources over the internet (AWS EC2, Azure Virtual Machines, Google Compute Engine, DigitalOcean Droplets).' }
          ],
          description: 'Describes the hypervisor technology used if the system architecture relies on partitioning physical servers into multiple virtual machines.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-container-runtime',
          aspect: 'Container Runtime',
          examples: [
            { label: 'Daemon-based Runtime', description: 'Container engine relying on a background service (Docker Engine, containerd, CRI-O).' },
            { label: 'Daemonless Runtime', description: 'Container engine capable of running containers as standard user processes (Podman, LXC, Railcar).' }
          ],
          description: 'Identifies the low-level software component responsible for executing containers on a host operating system.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-orchestration',
          aspect: 'Container Orchestration',
          examples: [
            { label: 'Cluster Orchestration', description: 'Systems for automating deployment and scaling across clusters (Kubernetes, K3s, OpenShift, Nomad, Docker Swarm, Apache Mesos).' },
            { label: 'Local Orchestration', description: 'Tools for defining and running multi-container applications on a single host (Docker Compose, Podman Compose).' }
          ],
          description: 'Captures the mechanisms used to manage container lifecycles, handle load balancing, and ensure desired states.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-registry',
          aspect: 'Artifact / Container Registry',
          examples: [
            { label: 'Cloud Registry', description: 'Managed registry services provided by cloud vendors (Azure Container Registry, AWS ECR, Google Container Registry, Docker Hub, GitHub Container Registry, GitLab Container Registry).' },
            { label: 'Self-Hosted Registry', description: 'Private registry instances deployed within the organizational network (Harbor, Nexus Repository, JFrog Artifactory, Quay).' },
            { label: 'General Artifact Repository', description: 'Systems capable of storing various package formats alongside container images (Artifactory, Nexus, Azure Artifacts).' }
          ],
          description: 'Describes the central storage location for immutable build artifacts and container images.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-iac',
          aspect: 'Infrastructure as Code (IaC)',
          examples: [
            { label: 'Declarative Provisioning', description: 'Defining the desired end-state of infrastructure using configuration files (Terraform, Pulumi, AWS CloudFormation, Azure Bicep, OpenTofu).' },
            { label: 'Configuration Management', description: 'Tools focused on installing software on existing servers (Ansible, Chef, Puppet, SaltStack).' }
          ],
          description: 'Defines the methodology for provisioning and managing infrastructure through machine-readable definition files.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-cicd',
          aspect: 'CI/CD Pipeline',
          examples: [
            { label: 'Cloud-Based CI/CD', description: 'Managed continuous integration and deployment services (GitHub Actions, GitLab CI/CD, CircleCI, Travis CI, Bitbucket Pipelines, Azure DevOps).' },
            { label: 'Repository-Integrated CI', description: 'Pipelines configured directly within the source code hosting platform (GitHub Actions workflows, GitLab CI YAML).' }
          ],
          description: 'Describes the automated workflows utilized to compile code, run tests, and deploy releases.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-log-aggregation',
          aspect: 'Log Aggregation',
          examples: [
            { label: 'Centralized Search Stack', description: 'Combinations of indexing engines and visualization dashboards (ELK Stack - Elasticsearch/Logstash/Kibana, OpenSearch, Grafana Loki, Splunk).' },
            { label: 'Cloud Observability Platform', description: 'SaaS solutions for unified log management and analysis (Datadog, New Relic, Dynatrace, Sumo Logic, Loggly).' }
          ],
          description: 'Captures the strategy for consolidating log data from disparate servers and microservices into a single repository.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-metrics',
          aspect: 'Metrics & Alerting',
          examples: [
            { label: 'Time-Series Monitoring', description: 'Systems designed specifically to collect and query numeric metric data over time (Prometheus, Victoria Metrics, InfluxDB, Graphite, TimescaleDB).' },
            { label: 'Cloud-Native Monitoring', description: 'Built-in metric aggregation services provided by cloud environments (AWS CloudWatch, Azure Monitor, Google Cloud Monitoring).' },
            { label: 'Incident Management Systems', description: 'Platforms that route alerts to on-call personnel based on predefined rules (PagerDuty, Opsgenie, VictorOps, Alertmanager, OnCall).' }
          ],
          description: 'Describes the mechanisms used to continuously measure system health and notify operational staff when thresholds are breached.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'ops-tracing',
          aspect: 'Distributed Tracing',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware'] },
          examples: [
            { label: 'Telemetry Standards', description: 'Vendor-agnostic APIs for generating trace data (OpenTelemetry, OpenTracing, OpenCensus).' },
            { label: 'APM Solutions', description: 'Application Performance Monitoring suites incorporating automatic tracing (Jaeger, Zipkin, Datadog APM, New Relic, Dynatrace, Elastic APM, AWS X-Ray).' }
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
            { label: 'Automated DB Snapshots', description: 'Database management systems automatically capturing state at defined intervals (AWS RDS automated backups, Azure SQL Database backups, pg_dump cron jobs).' },
            { label: 'Offsite Replication', description: 'Copying backup data to geographically separate storage locations (AWS S3 Cross-Region Replication, Azure Geo-Redundant Storage, rsync to remote sites).' },
            { label: 'Immutable Storage', description: 'Backups written to storage media that cannot be modified or deleted, protecting against ransomware (AWS S3 Object Lock, Azure Immutable Blobs, Veeam Immutability).' }
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
            { label: 'Token-Based Auth', description: 'Issuing cryptographically signed tokens to verify identity across stateless requests (JWT, OAuth 2.0, PASETO).' },
            { label: 'Federated Identity', description: 'Delegating authentication responsibility to an external, trusted identity provider (SAML 2.0, OpenID Connect, Azure AD, Okta, Auth0, Keycloak, AWS Cognito).' }
          ],
          description: 'Describes the mechanisms employed to definitively verify the identity of a human user or a communicating system.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-authz',
          aspect: 'Authorization (Permissions)',
          examples: [
            { label: 'Role-Based Access Control (RBAC)', description: 'Permissions are assigned to roles, and users are assigned to those roles (built into most frameworks, Azure RBAC, AWS IAM Roles).' },
            { label: 'Attribute-Based Access Control (ABAC)', description: 'Access is granted based on policies evaluating attributes (AWS IAM Policies, Open Policy Agent - OPA, Casbin, Cedar).' }
          ],
          description: 'Defines the logic and enforcement points used to determine what an authenticated identity is permitted to execute or view.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-secrets',
          aspect: 'Secret Management',
          examples: [
            { label: 'Centralized Vaults', description: 'Dedicated systems for securely storing and auditing API keys and passwords (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, Google Secret Manager, CyberArk, 1Password Secrets Automation).' },
            { label: 'Environment Injection', description: 'Injecting secrets directly into the application process via OS variables at startup (Kubernetes Secrets, Docker Secrets, dotenv files).' }
          ],
          description: 'Captures the architecture for handling sensitive configuration data without hardcoding it in source code.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-encryption',
          aspect: 'Encryption (Rest & Transit)',
          examples: [
            { label: 'Transport Layer Security', description: 'Cryptographic protocols designed to provide communications security over a network (TLS 1.2/1.3, HTTPS, mTLS, STARTTLS).' },
            { label: 'Storage-Level Encryption', description: 'Encrypting data transparently at the disk or filesystem level (BitLocker, LUKS, dm-crypt, AWS KMS, Azure Storage Service Encryption, database TDE - Transparent Data Encryption).' }
          ],
          description: 'Details the cryptographic strategies implemented to protect data confidentiality in transit and at rest.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-vuln-scan',
          aspect: 'Vulnerability Scanning',
          examples: [
            { label: 'Static Analysis (SAST)', description: 'Scanning source code for common security vulnerabilities without executing the program (SonarQube, Checkmarx, Veracode, Fortify, Semgrep, CodeQL).' },
            { label: 'Software Composition Analysis (SCA)', description: 'Identifying known vulnerabilities within third-party dependencies and libraries (Snyk, WhiteSource, Black Duck, OWASP Dependency-Check, npm audit, Trivy).' },
            { label: 'Dynamic Analysis (DAST)', description: 'Interacting with a running web application to identify vulnerabilities like injection flaws (OWASP ZAP, Burp Suite, Acunetix, Netsparker).' }
          ],
          description: 'Describes the automated tooling integrated into the development lifecycle to proactively detect security flaws.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-audit',
          aspect: 'Audit & Compliance Logging',
          examples: [
            { label: 'Full Audit Trail', description: 'Recording all read and write operations along with user context.' },
            { label: 'Critical Operations Only', description: 'Selectively recording events that mutate sensitive business data.' }
          ],
          description: 'Describes the strategy for tracing historical actions to satisfy legal compliance and forensic investigations.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'sec-licensing',
          aspect: 'Licensing & Usage Enforcement',
          examples: [
            { label: 'Online Activation', description: 'Validation of usage rights against a central vendor server (Microsoft Product Activation, Adobe Creative Cloud licensing).' },
            { label: 'Floating License Server', description: 'Local network server managing a pool of concurrent usage tokens (FlexNet, RLM - Reprise License Manager, Sentinel LDK).' },
            { label: 'Hardware Dongle', description: 'Physical cryptography device required to execute the software (Wibu-Systems CodeMeter, SafeNet Sentinel, HASP).' }
          ],
          description: 'Captures the technical mechanisms used to protect intellectual property and enforce commercial usage rights.',
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
            { label: 'Vendor SDK', description: 'Interacting with hardware utilizing closed-source libraries provided by the manufacturer (National Instruments NI-DAQmx, Basler Pylon SDK, FLIR Spinnaker SDK).' },
            { label: 'Standardized Protocols', description: 'Utilizing industry-standard communication protocols (SCPI - Standard Commands for Programmable Instruments, Modbus, OPC UA, MQTT).' }
          ],
          description: 'Identifies the layer of software utilized to bridge the application logic with the physical hardware.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'hw-buffering',
          aspect: 'Data Buffering Strategy',
          examples: [
            { label: 'Ring-Buffer', description: 'Fixed-size circular buffer preventing memory overallocation.' },
            { label: 'FIFO Queues', description: 'First-in, first-out memory structures for sequential processing.' }
          ],
          description: 'Captures how continuous streams of incoming hardware data are staged in memory prior to processing.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'hw-realtime',
          aspect: 'Real-Time Requirements',
          examples: [
            { label: 'Hard Real-Time', description: 'Missing a processing deadline results in absolute system failure.' },
            { label: 'Soft Real-Time', description: 'Missing deadlines degrades performance but does not cause failure.' }
          ],
          description: 'Defines the latency strictness required for hardware interactions, dictating the choice of operating system and runtime.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'hw-lifecycle',
          aspect: 'Connection Lifecycle',
          examples: [
            { label: 'Persistent Connection', description: 'Connections to hardware interfaces remain open for the duration of the process.' },
            { label: 'On-Demand Polling', description: 'Connections are established, queried, and immediately closed to save resources.' }
          ],
          description: 'Captures the stability and resource management strategy regarding hardware sockets and ports.',
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
            { label: 'ALM Integration', description: 'Test management integrated directly into the Application Lifecycle Management tool (Azure DevOps Test Plans, Jira Zephyr, HP ALM/Quality Center).' },
            { label: 'Dedicated Test Software', description: 'Standalone systems specialized purely in test planning and execution (TestRail, qTest, Xray, PractiTest, TestLink).' }
          ],
          description: 'Describes the methodology and tooling for documenting and tracking manual and automated tests.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-traceability',
          aspect: 'Requirement Traceability',
          examples: [
            { label: 'Direct ALM Linking', description: 'Test cases are explicitly linked to business requirements or user stories in the tracking tool.' },
            { label: 'Coverage Matrices', description: 'Generating reports that map executed code against defined feature requirements.' }
          ],
          description: 'Defines the mechanism used to prove that all specified business requirements have been corresponding, executed tests.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-code-quality',
          aspect: 'Code Quality & Coverage',
          examples: [
            { label: 'Static Code Analysis', description: 'Tools that analyze source code for bugs and technical debt (SonarQube, SonarCloud, CodeClimate, Codacy, DeepSource, ReSharper).' },
            { label: 'Code Coverage Tracking', description: 'Instrumentation measuring the percentage of executed source code (Coverlet, JaCoCo, Istanbul/nyc, Coverage.py, Cobertura, OpenCover).' }
          ],
          description: 'Describes mechanisms used to measure test coverage and enforce maintainability standards.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-integration',
          aspect: 'Integration & API Testing',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'API Testing Frameworks', description: 'Tools designed to send programmatic requests to backend APIs (Postman/Newman, REST Assured, Karate DSL, Pact, Insomnia, HTTPie, curl).' },
            { label: 'Contract Testing', description: 'Verifying that services adhere to a shared, agreed-upon contract (Pact, Spring Cloud Contract, Postman Contract Testing).' }
          ],
          description: 'Defines the methodology for testing interactions between discrete system components without a UI.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-e2e',
          aspect: 'End-to-End (E2E) Testing',
          appliesTo: { executionType: ['Web Application', 'Desktop Application', 'Mobile Application'] },
          examples: [
            { label: 'Browser Automation', description: 'Tools that control web browsers programmatically (Selenium WebDriver, Playwright, Cypress, Puppeteer, WebDriverIO, TestCafe).' },
            { label: 'Desktop UI Automation', description: 'Frameworks capable of interacting with native OS UI components (WinAppDriver, Appium, TestStack.White, FlaUI, Ranorex, Squish).' }
          ],
          description: 'Describes the approach to validating the entire software stack from the user interface down to the database.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-performance',
          aspect: 'Performance & Load Testing',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Protocol-Level Load Testing', description: 'Simulating high concurrency by sending large volumes of network requests (Apache JMeter, Gatling, k6, Locust, Artillery, NBomber).' },
            { label: 'Cloud-Distributed Stress Testing', description: 'Utilizing cloud infrastructure to simulate massive user traffic (Azure Load Testing, AWS Distributed Load Testing, BlazeMeter, Flood.io).' }
          ],
          description: 'Describes the approach to simulating high user traffic to validate system stability and SLAs.',
          answers: [{ technology: '', status: '', comments: '' }]
        },
        {
          id: 'qa-testdata',
          aspect: 'Test Data Management',
          appliesTo: { architecturalRole: ['Standalone System', 'Domain Service / Microservice', 'Integration Bridge / Middleware', 'AI / ML Inference Engine'] },
          examples: [
            { label: 'Synthetic Data Generation', description: 'Programmatically creating fake datasets for testing (Faker.js, Bogus, Mockaroo, Generatedata, AutoFixture, Factory Bot).' },
            { label: 'Production Anonymization', description: 'Scrubbing or obfuscating PII from production data before use in test environments (Delphix, Tonic, AWS Database Migration Service with masking, SQL Data Masking).' }
          ],
          description: 'Captures the strategy for provisioning and securing data used during testing to maintain privacy compliance.',
          answers: [{ technology: '', status: '', comments: '' }]
        }
      ]
    }
  ]
  };
}