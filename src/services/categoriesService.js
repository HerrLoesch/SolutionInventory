export function getCategoriesData() {
  return [
    {
      id: 'solution-desc',
      title: 'Solution Description',
      desc: 'General information about the solution',
      isMetadata: true,
      metadata: {
        productName: '',
        company: '',
        department: '',
        contactPerson: '',
        description: ''
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
            { label: 'Layered', description: 'Separate presentation, business, and data layers.' },
            { label: 'Hexagonal', description: 'Ports-and-adapters around the domain.' },
            { label: 'Clean Arch', description: 'Dependency rule toward core use cases.' },
            { label: 'Plugin-Based', description: 'Extensible via plugin modules.' }
          ],
          description: 'Describes the overarching structural pattern of the solution and the goals it serves. Helps clarify how responsibilities are sliced and dependencies are managed.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-res',
          aspect: 'Resilience Patterns',
          examples: [
            { label: 'Retry', description: 'Retry transient failures.' },
            { label: 'Circuit Breaker (Polly)', description: 'Open the circuit after repeated failures.' },
            { label: 'Fallback', description: 'Provide a degraded alternative.' }
          ],
          description: 'Captures which resilience mechanisms are actively used. This helps assess how stable the solution remains under failures and load spikes.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-off',
          aspect: 'Offline Capability',
          examples: [
            { label: 'Online-Only', description: 'Requires continuous connectivity.' },
            { label: 'Local-First', description: 'Works locally and syncs later.' },
            { label: 'Sync-on-Connect', description: 'Queues changes until connectivity returns.' }
          ],
          description: 'Describes whether and how the solution works without connectivity. This shows which sync or fallback concepts are in place.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-dep',
          aspect: 'Dependency Management',
          examples: [
            { label: 'Strict Vetting', description: 'Security or architecture review required.' },
            { label: 'Allowed List', description: 'Only preapproved libraries allowed.' },
            { label: 'Free Choice', description: 'Teams choose dependencies freely.' }
          ],
          description: 'Captures how dependencies are selected and maintained. Helps clarify the governance applied to libraries.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-decompose',
          aspect: 'Service Decomposition',
          examples: [
            { label: 'Monolith', description: 'Single deployable unit.' },
            { label: 'Modular Monolith', description: 'Modules in one deployable.' },
            { label: 'Microservices', description: 'Independently deployed services.' },
            { label: 'SOA', description: 'Service-oriented integration style.' }
          ],
          description: 'Describes how the solution is split into services or modules. This makes the chosen granularity and decoupling clear.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-comm',
          aspect: 'Communication Style',
          examples: [
            { label: 'Sync', description: 'Request waits for response.' },
            { label: 'Async', description: 'Fire-and-forget or queued.' },
            { label: 'Event-Driven', description: 'Publish/subscribe via events.' },
            { label: 'Request/Response', description: 'Explicit request with reply.' }
          ],
          description: 'Captures the communication style between components or services. This clarifies whether sync/async or event-driven approaches are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-integration',
          aspect: 'Integration Pattern',
          examples: [
            { label: 'API Gateway', description: 'Single entry point for APIs.' },
            { label: 'Backend-for-Frontend', description: 'Tailored backend per UI.' },
            { label: 'Aggregator', description: 'Combines multiple services.' },
            { label: 'Adapter', description: 'Translates between interfaces.' }
          ],
          description: 'Describes the pattern used for internal or external integrations. This clarifies how interfaces are grouped or adapted.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-consistency',
          aspect: 'Consistency Model',
          examples: [
            { label: 'Strong Consistency', description: 'Reads reflect latest writes.' },
            { label: 'Eventual Consistency', description: 'Converges over time.' },
            { label: 'Saga', description: 'Distributed transaction pattern.' },
            { label: 'Outbox', description: 'Reliable event publishing.' }
          ],
          description: 'Defines the target consistency level. This shows how data synchronization and concurrency are handled.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-ownership',
          aspect: 'Data Ownership',
          examples: [
            { label: 'Shared DB', description: 'Multiple services share schema.' },
            { label: 'DB per Service', description: 'Each service owns its database.' },
            { label: 'Domain-Owned Models', description: 'Domain owns its data contracts.' }
          ],
          description: 'Describes who owns data and how ownership is organized. This clarifies whether data is shared or separated.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-extensibility',
          aspect: 'Extensibility Model',
          examples: [
            { label: 'Plugin Architecture', description: 'Features added as plugins.' },
            { label: 'Extension Points', description: 'Defined hooks for add-ons.' },
            { label: 'IoC', description: 'Inversion of control with DI.' }
          ],
          description: 'Captures how extensions are designed technically. This shows how new features can be integrated without major rework.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-topology',
          aspect: 'Deployment Topology',
          examples: [
            { label: 'Single Instance', description: 'One deployment per environment.' },
            { label: 'Multi-Tenant', description: 'Multiple tenants share runtime.' },
            { label: 'Multi-Region', description: 'Deployed across regions.' },
            { label: 'Edge', description: 'Runs near devices or users.' }
          ],
          description: 'Describes the target deployment topology. This makes clear whether single, multi-tenant, or multi-region is planned.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-observability',
          aspect: 'Observability Architecture',
          examples: [
            { label: 'Tracing', description: 'Distributed request tracing.' },
            { label: 'Metrics', description: 'Numeric telemetry for systems.' },
            { label: 'Log Correlation', description: 'Link logs by trace IDs.' },
            { label: 'OpenTelemetry', description: 'Standardized telemetry signals.' }
          ],
          description: 'Defines how observability is covered at an architectural level. This shows how tracing, metrics, and logs work together.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-feature',
          aspect: 'Config / Feature Strategy',
          examples: [
            { label: 'Feature Flags', description: 'Toggle features at runtime.' },
            { label: 'Toggles', description: 'Enable or disable capabilities.' },
            { label: 'Progressive Rollout', description: 'Gradual exposure by cohort.' }
          ],
          description: 'Describes how configuration and feature releases are controlled. This helps contextualize rollouts and experiments.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-failure',
          aspect: 'Failure Domains',
          examples: [
            { label: 'Isolation', description: 'Contain failures to a boundary.' },
            { label: 'Bulkheads', description: 'Resource isolation per component.' },
            { label: 'Graceful Degradation', description: 'Reduced functionality on failure.' }
          ],
          description: 'Captures how failures are isolated and mitigated. This clarifies how robust boundaries are defined in the architecture.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        }
      ]
    },
    {
      id: 'frontend',
      title: 'Front-End',
      desc: 'Client-side frameworks, UI libraries and patterns',
      entries: [
        {
          id: 'fe-apptype',
          aspect: 'App Type & Stack',
          examples: [
            { label: 'Angular', description: 'Angular framework for SPAs.' },
            { label: 'React', description: 'React component-based UI.' },
            { label: 'WPF', description: 'Windows desktop UI framework.' },
            { label: 'Qt', description: 'Cross-platform native UI.' },
            { label: 'Electron', description: 'Desktop apps with web tech.' }
          ],
          description: 'Describes the UI architecture and stack used for the front end. Helps clarify which platform and runtime are chosen.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-state',
          aspect: 'State Management',
          examples: [
            { label: 'NgRx', description: 'Redux-style state for Angular.' },
            { label: 'Redux', description: 'Predictable state container.' },
            { label: 'MVVM', description: 'Model-View-ViewModel pattern.' },
            { label: 'Local State', description: 'Component-level state only.' }
          ],
          description: 'Captures how UI state is managed. This clarifies the strategy for consistency and scalability.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-complib',
          aspect: 'Component Library',
          examples: [
            { label: 'Syncfusion', description: 'Commercial UI component suite.' },
            { label: 'Material', description: 'Material Design components.' },
            { label: 'In-House', description: 'Custom-built components.' },
            { label: 'Native', description: 'OS-native widgets.' }
          ],
          description: 'Describes where UI components come from and how consistent they are. This clarifies whether standard libraries or in-house components are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-unittest',
          aspect: 'Unit Testing',
          examples: [
            { label: 'Jest', description: 'JS test runner and assertions.' },
            { label: 'Jasmine', description: 'Behavior-driven test framework.' },
            { label: 'Karma', description: 'Browser-based test runner.' },
            { label: 'Vitest', description: 'Vite-native test runner.' }
          ],
          description: 'Defines the framework used for frontend tests. This shows how logic and components are safeguarded.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-quality',
          aspect: 'Code Formatting',
          examples: [
            { label: 'ESLint', description: 'Linting for JS and TS.' },
            { label: 'Prettier', description: 'Opinionated code formatter.' },
            { label: 'Stylelint', description: 'CSS and style linting.' }
          ],
          description: 'Describes which linting/formatting rules are enforced. This helps understand style and quality standards.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-i18n',
          aspect: 'Internationalization',
          examples: [
            { label: 'i18next', description: 'Runtime translation library.' },
            { label: 'Angular i18n', description: 'Angular built-in i18n.' },
            { label: '.resx files', description: '.NET resource files.' }
          ],
          description: 'Captures how localization is implemented. This clarifies the translation and fallback approach.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-cache',
          aspect: 'Caching Strategy',
          examples: [
            { label: 'Workbox', description: 'Service worker caching toolkit.' },
            { label: 'Dexie.js', description: 'IndexedDB wrapper for caching.' },
            { label: 'Nuxt', description: 'Framework with caching modules.' }
          ],
          description: 'Describes how data is cached on the client. This helps assess performance and offline behavior.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-analytics',
          aspect: 'Analytics',
          examples: [
            { label: 'Google Analytics', description: 'Hosted analytics service.' },
            { label: 'Matomo', description: 'Self-hosted analytics.' },
            { label: 'Pendo', description: 'Product analytics and guidance.' }
          ],
          description: 'Defines how user behavior is measured. This shows which tracking solution is used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-dev-env',
          aspect: 'Development Environment',
          examples: [
            { label: 'Visual Studio', description: 'Full IDE for Windows.' },
            { label: 'VS Code', description: 'Lightweight editor.' },
            { label: 'Rider', description: '.NET IDE by JetBrains.' }
          ],
          description: 'Describes the expected IDE setup and tools. This helps standardize the development environment.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-logging',
          aspect: 'Logging',
          examples: [
            { label: 'Console', description: 'Browser console logging.' },
            { label: 'Sentry', description: 'Client error tracking.' },
            { label: 'AppInsights', description: 'Azure Application Insights.' }
          ],
          description: 'Captures how client errors and logs are recorded. This clarifies which monitoring solution is used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-error',
          aspect: 'Error Handling Strategy',
          examples: [
            { label: 'Global Handler', description: 'Centralized error boundary or handler.' },
            { label: 'Result Pattern', description: 'Explicit result objects for errors.' },
            { label: 'Crash-Report', description: 'Client crash reporting.' }
          ],
          description: 'Describes how errors are handled and shown in the UI. This shows whether global handlers or component-specific strategies are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-build',
          aspect: 'Build System',
          examples: [
            { label: 'Nx', description: 'Monorepo build system.' },
            { label: 'Webpack', description: 'Module bundler.' },
            { label: 'Vite', description: 'Dev server and bundler.' },
            { label: 'Angular CLI', description: 'Angular build tooling.' }
          ],
          description: 'Describes how frontend assets are built and bundled. This clarifies the build workflow and toolchain.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
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
          aspect: 'Tech Stack',
          examples: [
            { label: '.NET', description: 'Microsoft .NET runtime.' },
            { label: 'Java', description: 'JVM-based runtime.' },
            { label: 'Python', description: 'Python runtime for services.' },
            { label: 'C++', description: 'Native runtime for performance.' }
          ],
          description: 'Defines the runtime where business logic runs. This shows which platform and language stack are set.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-api',
          aspect: 'API / Interface',
          examples: [
            { label: 'REST', description: 'HTTP-based REST API.' },
            { label: 'GraphQL', description: 'Graph-based API layer.' },
            { label: 'gRPC', description: 'Binary RPC over HTTP/2.' },
            { label: 'WCF', description: 'Legacy .NET service framework.' }
          ],
          description: 'Describes which interfaces are exposed. This clarifies how clients and integrations communicate.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-dal',
          aspect: 'Data Access (DAL)',
          examples: [
            { label: 'EF Core', description: 'ORM for .NET.' },
            { label: 'Dapper', description: 'Micro-ORM.' },
            { label: 'Hibernate', description: 'ORM for Java.' },
            { label: 'SQL', description: 'Handwritten SQL queries.' }
          ],
          description: 'Captures how data access is implemented. This helps understand ORM/SQL strategies and performance tradeoffs.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-unittest',
          aspect: 'Unit Testing',
          examples: [
            { label: 'xUnit', description: '.NET unit testing framework.' },
            { label: 'NUnit', description: '.NET unit testing framework.' },
            { label: 'MsTest', description: 'Microsoft test framework.' },
            { label: 'JUnit', description: 'Java unit testing framework.' }
          ],
          description: 'Describes which test framework is used for backend logic. This shows how classes and methods are safeguarded.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-integration',
          aspect: 'Integration',
          examples: [
            { label: 'TestServer', description: 'In-memory ASP.NET testing.' },
            { label: 'RestAssured', description: 'API testing for Java.' },
            { label: 'Postman', description: 'Manual API testing tool.' }
          ],
          description: 'Captures how interfaces or dependencies are tested. This clarifies what end-to-end or API tests exist.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-perf',
          aspect: 'Performance',
          examples: [
            { label: 'Benchmark.Net', description: '.NET micro-benchmarking.' },
            { label: 'k6', description: 'Load testing tool.' },
            { label: 'JMeter', description: 'Load testing tool.' }
          ],
          description: 'Describes how performance is measured and validated. This shows whether micro-benchmarks or load tests are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-cache',
          aspect: 'Caching Strategy',
          examples: [
            { label: 'Redis', description: 'Distributed in-memory cache.' },
            { label: 'Memcached', description: 'Key-value cache.' },
            { label: 'In-Memory (Dict)', description: 'Process local cache.' }
          ],
          description: 'Defines how data is cached server-side. This helps assess latency and scalability.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-jobs',
          aspect: 'Job Scheduling',
          examples: [
            { label: 'Hangfire', description: '.NET background jobs.' },
            { label: 'Quartz.NET', description: 'Scheduler for .NET.' },
            { label: 'Cron', description: 'Unix-like scheduling.' },
            { label: 'Windows Task', description: 'Windows Task Scheduler.' }
          ],
          description: 'Describes how background or scheduled jobs are implemented. This shows which engine is used for recurring tasks.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-workflow',
          aspect: 'Workflow Management',
          examples: [
            { label: 'Camunda', description: 'BPM and workflow engine.' },
            { label: 'Elsa Workflows', description: '.NET workflow engine.' },
            { label: 'Temporal', description: 'Durable workflow engine.' },
            { label: 'Logic Apps', description: 'Azure workflow service.' }
          ],
          description: 'Captures how complex processes are orchestrated. This clarifies whether workflows are explicitly modeled.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-logging',
          aspect: 'Logging',
          examples: [
            { label: 'NLog', description: '.NET logging framework.' },
            { label: 'Serilog', description: 'Structured logging.' },
            { label: 'Log4j', description: 'Java logging framework.' }
          ],
          description: 'Describes how server-side logs are structured. This shows which logging strategy is in place.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-error',
          aspect: 'Error Handling Strategy',
          examples: [
            { label: 'Global Handler', description: 'Centralized exception handling.' },
            { label: 'Result Pattern', description: 'Return results instead of throw.' },
            { label: 'Crash-Report', description: 'Capture and report crashes.' }
          ],
          description: 'Describes how errors are processed on the server. This shows whether central handlers or result patterns are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-format',
          aspect: 'Code Formatting',
          examples: [
            { label: 'Resharper', description: '.NET code analysis and formatting.' },
            { label: 'StyleCop', description: 'C# style and analyzers.' }
          ],
          description: 'Captures which formatters/analyzers are enforced. This helps standardize style and code quality.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-dev-env',
          aspect: 'Development Environment',
          examples: [
            { label: 'Visual Studio', description: 'Microsoft IDE.' },
            { label: 'VS Code', description: 'Lightweight editor.' },
            { label: 'Rider', description: 'JetBrains .NET IDE.' }
          ],
          description: 'Describes the IDE setup used for backend development. This ensures consistent tooling foundations.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        }
      ]
    },
    {
      id: 'ops',
      title: 'Ops',
      desc: 'Operational tooling and practices',
      entries: [
        {
          id: 'ops-deploy',
          aspect: 'Deployment Artifact',
          examples: [
            { label: 'Docker Image', description: 'Container image.' },
            { label: 'MSI/Exe Installer', description: 'Windows installer package.' },
            { label: 'Portable Zip', description: 'Zip with binaries.' },
            { label: 'Helm Chart', description: 'Kubernetes package.' }
          ],
          description: 'Describes the artifact used to deliver the solution. This clarifies how installations and deployments are performed.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-update',
          aspect: 'Update Mechanism',
          examples: [
            { label: 'Auto-Update (ClickOnce/Squirrel)', description: 'Client auto-updates.' },
            { label: 'Manual Install', description: 'Manual update process.' },
            { label: 'Pull (K8s)', description: 'Cluster pulls updates.' }
          ],
          description: 'Captures how updates are distributed and activated. This helps understand whether push or pull is used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-config',
          aspect: 'Configuration Mgmt',
          examples: [
            { label: 'appsettings.json', description: '.NET config file.' },
            { label: 'Env Vars', description: 'Environment variables.' },
            { label: 'Registry', description: 'Windows registry settings.' },
            { label: 'Central Config DB', description: 'Central configuration database.' }
          ],
          description: 'Describes how configurations are managed and changed. This clarifies where settings live and how they are managed.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-backup',
          aspect: 'Backup Strategy',
          examples: [
            { label: 'Built-in Backup Job', description: 'App-managed backups.' },
            { label: 'External Script', description: 'Scripted backups.' },
            { label: 'DB Dump', description: 'Database export.' },
            { label: 'VM Snapshot', description: 'Snapshot of VM.' }
          ],
          description: 'Captures how backups are organized and who runs them. This clarifies how recovery is planned.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-remote',
          aspect: 'Remote Support',
          examples: [
            { label: 'VPN Access', description: 'Remote access via VPN.' },
            { label: 'TeamViewer', description: 'Remote desktop tool.' },
            { label: 'Remote Shell', description: 'SSH or remote shell access.' },
            { label: 'Log Export Tool', description: 'Export logs for support.' }
          ],
          description: 'Describes how support accesses customer systems. This shows which remote methods are permitted.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-telemetry',
          aspect: 'Telemetry / Crash Reports',
          examples: [
            { label: 'Automated (Sentry/AppCenter)', description: 'Automatic error reporting.' },
            { label: 'User Prompt', description: 'Ask user to send report.' },
            { label: 'None (Offline)', description: 'No telemetry collected.' }
          ],
          description: 'Captures how telemetry and crash reports are collected. This helps contextualize monitoring and feedback channels.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-resources',
          aspect: 'Resource Constraints',
          examples: [
            { label: 'Fixed RAM/CPU limit', description: 'Hard resource caps.' },
            { label: 'GPU required', description: 'Requires GPU.' },
            { label: 'Specific Disk IOPS', description: 'IO throughput requirement.' }
          ],
          description: 'Describes which hardware resources are required. This clarifies limits and operational requirements.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-logging',
          aspect: 'Logging',
          examples: [
            { label: 'NLog', description: '.NET logging.' },
            { label: 'Serilog', description: 'Structured logging.' },
            { label: 'Log4j', description: 'Java logging.' },
            { label: 'Graylog', description: 'Central log aggregation.' }
          ],
          description: 'Captures how logs are collected and aggregated. This shows the level of operational visibility.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-cicd',
          aspect: 'CI/CD Pipeline',
          examples: [
            { label: 'Azure DevOps', description: 'Microsoft CI/CD.' },
            { label: 'GitHub Actions', description: 'GitHub CI/CD.' },
            { label: 'Jenkins', description: 'Self-hosted CI/CD.' }
          ],
          description: 'Describes how build and deployment are automated. This clarifies stages, approvals, and tooling.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-iac',
          aspect: 'Infrastructure as Code',
          examples: [
            { label: 'Terraform', description: 'HCL-based IaC.' },
            { label: 'Bicep', description: 'Azure IaC.' },
            { label: 'Ansible', description: 'Configuration management.' },
            { label: 'Manual', description: 'Manual provisioning.' }
          ],
          description: 'Captures how infrastructure is provisioned reproducibly. This shows whether IaC is used for environments.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-registry',
          aspect: 'Container Registry',
          examples: [
            { label: 'ACR', description: 'Azure Container Registry.' },
            { label: 'Docker Hub', description: 'Public or private registry.' },
            { label: 'Harbor', description: 'Enterprise registry.' },
            { label: 'Nexus', description: 'Artifact repository.' }
          ],
          description: 'Describes where container images are stored and versioned. This clarifies which registry is the source.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        }
      ]
    },
    {
      id: 'security',
      title: 'Security',
      desc: 'Security controls and risk management',
      entries: [
        {
          id: 'sec-auth',
          aspect: 'Authentication',
          examples: [
            { label: 'SAML2', description: 'Federated SSO.' },
            { label: 'OIDC', description: 'OpenID Connect.' },
            { label: 'Windows Auth', description: 'Integrated Windows auth.' },
            { label: 'LDAP', description: 'Directory-based auth.' }
          ],
          description: 'Describes how users or systems are authenticated. This shows which standards and providers are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-privacy-rest',
          aspect: 'Data Privacy (At Rest)',
          examples: [
            { label: 'OS Encrypt', description: 'Disk encryption.' },
            { label: 'App Encrypt (DPAPI)', description: 'App-level encryption.' },
            { label: 'Plaintext', description: 'No encryption.' }
          ],
          description: 'Defines how data at rest is protected. This makes the chosen encryption or storage strategy visible.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-privacy-transit',
          aspect: 'Data Privacy (In Transit)',
          examples: [
            { label: 'TLS 1.3', description: 'Modern TLS.' },
            { label: 'mTLS', description: 'Mutual TLS.' },
            { label: 'VPN only', description: 'Private network only.' }
          ],
          description: 'Defines how data in transit is protected. This clarifies the protocols and protection level of communications.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-audit',
          aspect: 'Audit & Compliance',
          examples: [
            { label: 'Full Audit Trail', description: 'Record all actions.' },
            { label: 'Critical Ops only', description: 'Record critical actions only.' }
          ],
          description: 'Describes which audit and compliance requirements are implemented. This shows what events are traceable and how strict the rules are.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-licensing',
          aspect: 'Licensing / DRM',
          examples: [
            { label: 'Hardware Dongle', description: 'Physical license key.' },
            { label: 'License Key File', description: 'Signed license file.' },
            { label: 'Online Activation', description: 'Activation via server.' },
            { label: 'Floating Server', description: 'Shared license pool.' }
          ],
          description: 'Captures how usage rights are enforced technically. This helps understand protection against unauthorized use.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-testing',
          aspect: 'Security Testing',
          examples: [
            { label: 'SonarQube', description: 'Static analysis.' },
            { label: 'OWASP ZAP', description: 'DAST scanner.' },
            { label: 'Veracode', description: 'SAST/DAST platform.' }
          ],
          description: 'Describes which automated security checks run. This shows how vulnerabilities are detected early.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-secrets',
          aspect: 'Secret Management',
          examples: [
            { label: 'Env Vars', description: 'Secrets via env vars.' },
            { label: 'Vault', description: 'Central secrets store.' },
            { label: 'Credential Store', description: 'OS credential storage.' }
          ],
          description: 'Captures how secrets are stored and retrieved. This clarifies whether centralized vaults are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        }
      ]
    },
    {
      id: 'infra-data',
      title: 'Infrastructure & Data',
      desc: 'Databases, caches, queues and infra choices',
      entries: [
        {
          id: 'infra-database',
          aspect: 'Database Engine',
          examples: [
            { label: 'Oracle', description: 'Enterprise RDBMS.' },
            { label: 'Postgres', description: 'Open-source RDBMS.' },
            { label: 'SQL Server', description: 'Microsoft RDBMS.' }
          ],
          description: 'Describes the primary database engine. This shows which platform is set as the main store.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'infra-schema',
          aspect: 'Schema Migration',
          examples: [
            { label: 'Liquibase', description: 'DB migration tool.' },
            { label: 'Flyway', description: 'DB migration tool.' },
            { label: 'EF Migrations', description: '.NET migrations.' }
          ],
          description: 'Captures how schema changes are versioned and rolled out. This helps understand how DB changes are handled.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'infra-broker',
          aspect: 'Message Broker',
          examples: [
            { label: 'RabbitMQ', description: 'AMQP broker.' },
            { label: 'Kafka', description: 'Streaming platform.' },
            { label: 'Azure Service Bus', description: 'Managed messaging.' }
          ],
          description: 'Describes how asynchronous communication is implemented. This shows which broker provides decoupling.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'infra-orchestration',
          aspect: 'Orchestration',
          examples: [
            { label: 'K8s', description: 'Container orchestration.' },
            { label: 'Docker Compose', description: 'Local multi-container.' },
            { label: 'Windows Service', description: 'Windows service hosting.' }
          ],
          description: 'Captures how processes or deployments are orchestrated. This clarifies whether container orchestration or services are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        }
      ]
    },
    {
      id: 'hardware-io',
      title: 'Hardware & IO',
      desc: 'Hardware interfaces, sensors, serial/USB, real-time IO',
      entries: [
        {
          id: 'hw-communication',
          aspect: 'Communication Patterns',
          examples: [
            { label: 'Polling', description: 'Regularly query device.' },
            { label: 'Interrupt', description: 'Device-driven signaling.' },
            { label: 'Event-Driven', description: 'Publish events on change.' }
          ],
          description: 'Describes how data is retrieved from hardware. This shows whether polling or events are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-buffering',
          aspect: 'Data Buffering',
          examples: [
            { label: 'Ring-Buffer', description: 'Circular buffer.' },
            { label: 'FIFO', description: 'First in, first out.' },
            { label: 'Double-Buffering', description: 'Swap buffers.' }
          ],
          description: 'Captures how incoming data streams are buffered. This helps estimate throughput and latency.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-realtime',
          aspect: 'Real-time Requirements',
          examples: [
            { label: 'Hard Realtime', description: 'Strict deadlines.' },
            { label: 'Soft Realtime', description: 'Best-effort deadlines.' },
            { label: 'Best Effort', description: 'No strict guarantees.' }
          ],
          description: 'Describes which latency requirements apply. This clarifies whether hard or soft real time is needed.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-lifecycle',
          aspect: 'Connection Lifecycle',
          examples: [
            { label: 'Persistent', description: 'Always open.' },
            { label: 'Session-Based', description: 'Open per session.' },
            { label: 'On-Demand', description: 'Open as needed.' }
          ],
          description: 'Captures how connections are established and maintained. This shows whether sessions are persistent or on-demand.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-driver',
          aspect: 'Driver Abstraction',
          examples: [
            { label: 'Vendor API', description: 'Vendor SDK or API.' },
            { label: 'Native Driver (DLL)', description: 'Native driver calls.' },
            { label: 'SCPI', description: 'Standard instrument protocol.' }
          ],
          description: 'Describes how deep hardware access goes. This clarifies whether vendor APIs or standard protocols are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
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
            { label: 'Azure DevOps', description: 'Test plans in ADO.' },
            { label: 'Xray (jira)', description: 'Jira test management.' }
          ],
          description: 'Describes where test cases are managed. This shows how test suites are organized.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'qa-traceability',
          aspect: 'Traceability',
          examples: [
            { label: 'Built-in Link (ADO/Jira)', description: 'Link to work items.' },
            { label: 'Polarion', description: 'ALM traceability.' }
          ],
          description: 'Captures how requirements and tests are linked. This helps ensure traceability.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'qa-e2e',
          aspect: 'E2E Testing',
          examples: [
            { label: 'Cypress', description: 'Web E2E testing.' },
            { label: 'Playwright', description: 'Cross-browser E2E.' },
            { label: 'Selenium', description: 'Browser automation.' },
            { label: 'Ranorex', description: 'Desktop UI testing.' }
          ],
          description: 'Describes how UI/system tests are implemented. This shows which tools are used for end-to-end testing.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'qa-performance',
          aspect: 'Performance Testing',
          examples: [
            { label: 'Benchmark.Net', description: '.NET benchmarks.' },
            { label: 'JMeter', description: 'Load testing.' },
            { label: 'Gatling', description: 'Load testing.' },
            { label: 'k6', description: 'Load testing.' }
          ],
          description: 'Captures how load and performance are tested. This clarifies which tools are used for stress testing.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        }
      ]
    }
  ]
}
