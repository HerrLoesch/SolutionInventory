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
          examples: 'Layered, Hexagonal, Clean Arch, Plugin-Based',
          description: 'Describes the overarching structural pattern of the solution and the goals it serves. Helps clarify how responsibilities are sliced and dependencies are managed.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-res',
          aspect: 'Resilience Patterns',
          examples: 'Retry, Circuit Breaker (Polly), Fallback',
          description: 'Captures which resilience mechanisms are actively used. This helps assess how stable the solution remains under failures and load spikes.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-off',
          aspect: 'Offline Capability',
          examples: 'Online-Only, Local-First, Sync-on-Connect',
          description: 'Describes whether and how the solution works without connectivity. This shows which sync or fallback concepts are in place.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-dep',
          aspect: 'Dependency Management',
          examples: 'Strict Vetting, Allowed List, Free Choice',
          description: 'Captures how dependencies are selected and maintained. Helps clarify the governance applied to libraries.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-decompose',
          aspect: 'Service Decomposition',
          examples: 'Monolith, Modular Monolith, Microservices, SOA',
          description: 'Describes how the solution is split into services or modules. This makes the chosen granularity and decoupling clear.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-comm',
          aspect: 'Communication Style',
          examples: 'Sync, Async, Event-Driven, Request/Response',
          description: 'Captures the communication style between components or services. This clarifies whether sync/async or event-driven approaches are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-integration',
          aspect: 'Integration Pattern',
          examples: 'API Gateway, Backend-for-Frontend, Aggregator, Adapter',
          description: 'Describes the pattern used for internal or external integrations. This clarifies how interfaces are grouped or adapted.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-consistency',
          aspect: 'Consistency Model',
          examples: 'Strong Consistency, Eventual Consistency, Saga, Outbox',
          description: 'Defines the target consistency level. This shows how data synchronization and concurrency are handled.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-ownership',
          aspect: 'Data Ownership',
          examples: 'Shared DB, DB per Service, Domain-Owned Models',
          description: 'Describes who owns data and how ownership is organized. This clarifies whether data is shared or separated.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-extensibility',
          aspect: 'Extensibility Model',
          examples: 'Plugin Architecture, Extension Points, IoC',
          description: 'Captures how extensions are designed technically. This shows how new features can be integrated without major rework.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-topology',
          aspect: 'Deployment Topology',
          examples: 'Single Instance, Multi-Tenant, Multi-Region, Edge',
          description: 'Describes the target deployment topology. This makes clear whether single, multi-tenant, or multi-region is planned.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-observability',
          aspect: 'Observability Architecture',
          examples: 'Tracing, Metrics, Log Correlation, OpenTelemetry',
          description: 'Defines how observability is covered at an architectural level. This shows how tracing, metrics, and logs work together.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-feature',
          aspect: 'Config / Feature Strategy',
          examples: 'Feature Flags, Toggles, Progressive Rollout',
          description: 'Describes how configuration and feature releases are controlled. This helps contextualize rollouts and experiments.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-failure',
          aspect: 'Failure Domains',
          examples: 'Isolation, Bulkheads, Graceful Degradation',
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
          examples: 'Angular, React, WPF, Qt, Electron',
          description: 'Describes the UI architecture and stack used for the front end. Helps clarify which platform and runtime are chosen.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-state',
          aspect: 'State Management',
          examples: 'NgRx, Redux, MVVM, Local State',
          description: 'Captures how UI state is managed. This clarifies the strategy for consistency and scalability.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-complib',
          aspect: 'Component Library',
          examples: 'Syncfusion, Material, In-House, Native',
          description: 'Describes where UI components come from and how consistent they are. This clarifies whether standard libraries or in-house components are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-unittest',
          aspect: 'Unit Testing',
          examples: 'Jest, Jasmine, Karma, Vitest',
          description: 'Defines the framework used for frontend tests. This shows how logic and components are safeguarded.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-quality',
          aspect: 'Code Formatting',
          examples: 'ESLint, Prettier, Stylelint',
          description: 'Describes which linting/formatting rules are enforced. This helps understand style and quality standards.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-i18n',
          aspect: 'Internationalization',
          examples: 'i18next, Angular i18n, .resx files',
          description: 'Captures how localization is implemented. This clarifies the translation and fallback approach.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-cache',
          aspect: 'Caching Strategy',
          examples: 'Workbox, Dexie.js, Nuxt',
          description: 'Describes how data is cached on the client. This helps assess performance and offline behavior.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-analytics',
          aspect: 'Analytics',
          examples: 'Google Analytics, Matomo, Pendo',
          description: 'Defines how user behavior is measured. This shows which tracking solution is used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-dev-env',
          aspect: 'Development Environment',
          examples: 'Visual Studio, VS Code, Rider',
          description: 'Describes the expected IDE setup and tools. This helps standardize the development environment.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-logging',
          aspect: 'Logging',
          examples: 'Console, Sentry, AppInsights',
          description: 'Captures how client errors and logs are recorded. This clarifies which monitoring solution is used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-error',
          aspect: 'Error Handling Strategy',
          examples: 'Global Handler, Result Pattern, Crash-Report',
          description: 'Describes how errors are handled and shown in the UI. This shows whether global handlers or component-specific strategies are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-build',
          aspect: 'Build System',
          examples: 'Nx, Webpack, Vite, Angular CLI',
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
          examples: '.NET, Java, Python, C++',
          description: 'Defines the runtime where business logic runs. This shows which platform and language stack are set.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-api',
          aspect: 'API / Interface',
          examples: 'REST, GraphQL, gRPC, WCF',
          description: 'Describes which interfaces are exposed. This clarifies how clients and integrations communicate.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-dal',
          aspect: 'Data Access (DAL)',
          examples: 'EF Core, Dapper, Hibernate, SQL',
          description: 'Captures how data access is implemented. This helps understand ORM/SQL strategies and performance tradeoffs.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-unittest',
          aspect: 'Unit Testing',
          examples: 'xUnit, NUnit, MsTest, JUnit',
          description: 'Describes which test framework is used for backend logic. This shows how classes and methods are safeguarded.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-integration',
          aspect: 'Integration',
          examples: 'TestServer, RestAssured, Postman',
          description: 'Captures how interfaces or dependencies are tested. This clarifies what end-to-end or API tests exist.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-perf',
          aspect: 'Performance',
          examples: 'Benchmark.Net, k6, JMeter',
          description: 'Describes how performance is measured and validated. This shows whether micro-benchmarks or load tests are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-cache',
          aspect: 'Caching Strategy',
          examples: 'Redis, Memcached, In-Memory (Dict)',
          description: 'Defines how data is cached server-side. This helps assess latency and scalability.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-jobs',
          aspect: 'Job Scheduling',
          examples: 'Hangfire, Quartz.NET, Cron, Windows Task',
          description: 'Describes how background or scheduled jobs are implemented. This shows which engine is used for recurring tasks.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-workflow',
          aspect: 'Workflow Management',
          examples: 'Camunda, Elsa Workflows, Temporal, Logic Apps',
          description: 'Captures how complex processes are orchestrated. This clarifies whether workflows are explicitly modeled.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-logging',
          aspect: 'Logging',
          examples: 'NLog, Serilog, Log4j',
          description: 'Describes how server-side logs are structured. This shows which logging strategy is in place.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-error',
          aspect: 'Error Handling Strategy',
          examples: 'Global Handler, Result Pattern, Crash-Report',
          description: 'Describes how errors are processed on the server. This shows whether central handlers or result patterns are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-format',
          aspect: 'Code Formatting',
          examples: 'Resharper, StyleCop',
          description: 'Captures which formatters/analyzers are enforced. This helps standardize style and code quality.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-dev-env',
          aspect: 'Development Environment',
          examples: 'Visual Studio, VS Code, Rider',
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
          examples: 'Docker Image, MSI/Exe Installer, Portable Zip, Helm Chart',
          description: 'Describes the artifact used to deliver the solution. This clarifies how installations and deployments are performed.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-update',
          aspect: 'Update Mechanism',
          examples: 'Auto-Update (ClickOnce/Squirrel), Manual Install, Pull (K8s)',
          description: 'Captures how updates are distributed and activated. This helps understand whether push or pull is used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-config',
          aspect: 'Configuration Mgmt',
          examples: 'appsettings.json, Env Vars, Registry, Central Config DB',
          description: 'Describes how configurations are managed and changed. This clarifies where settings live and how they are managed.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-backup',
          aspect: 'Backup Strategy',
          examples: 'Built-in Backup Job, External Script, DB Dump, VM Snapshot',
          description: 'Captures how backups are organized and who runs them. This clarifies how recovery is planned.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-remote',
          aspect: 'Remote Support',
          examples: 'VPN Access, TeamViewer, Remote Shell, Log Export Tool',
          description: 'Describes how support accesses customer systems. This shows which remote methods are permitted.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-telemetry',
          aspect: 'Telemetry / Crash Reports',
          examples: 'Automated (Sentry/AppCenter), User Prompt, None (Offline)',
          description: 'Captures how telemetry and crash reports are collected. This helps contextualize monitoring and feedback channels.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-resources',
          aspect: 'Resource Constraints',
          examples: 'Fixed RAM/CPU limit, GPU required, Specific Disk IOPS',
          description: 'Describes which hardware resources are required. This clarifies limits and operational requirements.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-logging',
          aspect: 'Logging',
          examples: 'NLog, Serilog, Log4j, Graylog',
          description: 'Captures how logs are collected and aggregated. This shows the level of operational visibility.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-cicd',
          aspect: 'CI/CD Pipeline',
          examples: 'Azure DevOps, GitHub Actions, Jenkins',
          description: 'Describes how build and deployment are automated. This clarifies stages, approvals, and tooling.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-iac',
          aspect: 'Infrastructure as Code',
          examples: 'Terraform, Bicep, Ansible, Manual',
          description: 'Captures how infrastructure is provisioned reproducibly. This shows whether IaC is used for environments.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-registry',
          aspect: 'Container Registry',
          examples: 'ACR, Docker Hub, Harbor, Nexus',
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
          examples: 'SAML2, OIDC, Windows Auth, LDAP',
          description: 'Describes how users or systems are authenticated. This shows which standards and providers are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-privacy-rest',
          aspect: 'Data Privacy (At Rest)',
          examples: 'OS Encrypt, App Encrypt (DPAPI), Plaintext',
          description: 'Defines how data at rest is protected. This makes the chosen encryption or storage strategy visible.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-privacy-transit',
          aspect: 'Data Privacy (In Transit)',
          examples: 'TLS 1.3, mTLS, VPN only',
          description: 'Defines how data in transit is protected. This clarifies the protocols and protection level of communications.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-audit',
          aspect: 'Audit & Compliance',
          examples: 'Full Audit Trail, Critical Ops only',
          description: 'Describes which audit and compliance requirements are implemented. This shows what events are traceable and how strict the rules are.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-licensing',
          aspect: 'Licensing / DRM',
          examples: 'Hardware Dongle, License Key File, Online Activation, Floating Server',
          description: 'Captures how usage rights are enforced technically. This helps understand protection against unauthorized use.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-testing',
          aspect: 'Security Testing',
          examples: 'SonarQube, OWASP ZAP, Veracode',
          description: 'Describes which automated security checks run. This shows how vulnerabilities are detected early.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-secrets',
          aspect: 'Secret Management',
          examples: 'Env Vars, Vault, Credential Store',
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
          examples: 'Oracle, Postgres, SQL Server',
          description: 'Describes the primary database engine. This shows which platform is set as the main store.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'infra-schema',
          aspect: 'Schema Migration',
          examples: 'Liquibase, Flyway, EF Migrations',
          description: 'Captures how schema changes are versioned and rolled out. This helps understand how DB changes are handled.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'infra-broker',
          aspect: 'Message Broker',
          examples: 'RabbitMQ, Kafka, Azure Service Bus',
          description: 'Describes how asynchronous communication is implemented. This shows which broker provides decoupling.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'infra-orchestration',
          aspect: 'Orchestration',
          examples: 'K8s, Docker Compose, Windows Service',
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
          examples: 'Polling, Interrupt, Event-Driven',
          description: 'Describes how data is retrieved from hardware. This shows whether polling or events are used.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-buffering',
          aspect: 'Data Buffering',
          examples: 'Ring-Buffer, FIFO, Double-Buffering',
          description: 'Captures how incoming data streams are buffered. This helps estimate throughput and latency.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-realtime',
          aspect: 'Real-time Requirements',
          examples: 'Hard Realtime, Soft Realtime, Best Effort',
          description: 'Describes which latency requirements apply. This clarifies whether hard or soft real time is needed.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-lifecycle',
          aspect: 'Connection Lifecycle',
          examples: 'Persistent, Session-Based, On-Demand',
          description: 'Captures how connections are established and maintained. This shows whether sessions are persistent or on-demand.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-driver',
          aspect: 'Driver Abstraction',
          examples: 'Vendor API, Native Driver (DLL), SCPI',
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
          examples: 'Azure DevOps, Xray (jira)',
          description: 'Describes where test cases are managed. This shows how test suites are organized.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'qa-traceability',
          aspect: 'Traceability',
          examples: 'Built-in Link (ADO/Jira), Polarion',
          description: 'Captures how requirements and tests are linked. This helps ensure traceability.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'qa-e2e',
          aspect: 'E2E Testing',
          examples: 'Cypress, Playwright, Selenium, Ranorex',
          description: 'Describes how UI/system tests are implemented. This shows which tools are used for end-to-end testing.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'qa-performance',
          aspect: 'Performance Testing',
          examples: 'Benchmark.Net, JMeter, Gatling, k6',
          description: 'Captures how load and performance are tested. This clarifies which tools are used for stress testing.',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        }
      ]
    }
  ]
}
