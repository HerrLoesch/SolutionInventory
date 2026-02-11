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
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-eh',
          aspect: 'Error Handling Strategy',
          examples: 'Global Handler, Result Pattern, Crash-Report',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-res',
          aspect: 'Resilience Patterns',
          examples: 'Retry, Circuit Breaker (Polly), Fallback',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-off',
          aspect: 'Offline Capability',
          examples: 'Online-Only, Local-First, Sync-on-Connect',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-dpr',
          aspect: 'Data Privacy (At Rest)',
          examples: 'OS Encrypt, App Encrypt (DPAPI), Plaintext',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-dpt',
          aspect: 'Data Privacy (In Transit)',
          examples: 'TLS 1.3, mTLS, VPN only',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-audit',
          aspect: 'Audit & Compliance',
          examples: 'Full Audit Trail, Critical Ops only',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'arch-dep',
          aspect: 'Dependency Management',
          examples: 'Strict Vetting, Allowed List, Free Choice',
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
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-state',
          aspect: 'State Management',
          examples: 'NgRx, Redux, MVVM, Local State',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-complib',
          aspect: 'Component Library',
          examples: 'Syncfusion, Material, In-House, Native',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-unittest',
          aspect: 'Unit Testing',
          examples: 'Jest, Jasmine, Karma, Vitest',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-quality',
          aspect: 'Code Formatting',
          examples: 'ESLint, Prettier, Stylelint',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-i18n',
          aspect: 'Internationalization',
          examples: 'i18next, Angular i18n, .resx files',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-cache',
          aspect: 'Caching Strategy',
          examples: 'Workbox, Dexie.js, Nuxt',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-analytics',
          aspect: 'Analytics',
          examples: 'Google Analytics, Matomo, Pendo',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-dev-env',
          aspect: 'Development Environment',
          examples: 'Visual Studio, VS Code, Rider',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-logging',
          aspect: 'Logging',
          examples: 'Console, Sentry, AppInsights',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'fe-build',
          aspect: 'Build System',
          examples: 'Nx, Webpack, Vite, Angular CLI',
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
          aspect: 'Runtime Environment',
          examples: '.NET Core, JVM, Node.js, C++',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-api',
          aspect: 'API / Interface',
          examples: 'REST, GraphQL, gRPC, WCF',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-dal',
          aspect: 'Data Access (DAL)',
          examples: 'EF Core, Dapper, Hibernate, SQL',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-unittest',
          aspect: 'Unit Testing',
          examples: 'xUnit, NUnit, MsTest, JUnit',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-integration',
          aspect: 'Integration',
          examples: 'TestServer, RestAssured, Postman',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-perf',
          aspect: 'Performance',
          examples: 'Benchmark.Net, k6, JMeter',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-cache',
          aspect: 'Caching Strategy',
          examples: 'Redis, Memcached, In-Memory (Dict)',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-jobs',
          aspect: 'Job Scheduling',
          examples: 'Hangfire, Quartz.NET, Cron, Windows Task',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-workflow',
          aspect: 'Workflow Management',
          examples: 'Camunda, Elsa Workflows, Temporal, Logic Apps',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-logging',
          aspect: 'Logging',
          examples: 'NLog, Serilog, Log4j',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-format',
          aspect: 'Code Formatting',
          examples: 'Resharper, StyleCop',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'be-dev-env',
          aspect: 'Development Environment',
          examples: 'Visual Studio, VS Code, Rider',
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
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-update',
          aspect: 'Update Mechanism',
          examples: 'Auto-Update (ClickOnce/Squirrel), Manual Install, Pull (K8s)',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-config',
          aspect: 'Configuration Mgmt',
          examples: 'appsettings.json, Env Vars, Registry, Central Config DB',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-backup',
          aspect: 'Backup Strategy',
          examples: 'Built-in Backup Job, External Script, DB Dump, VM Snapshot',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-remote',
          aspect: 'Remote Support',
          examples: 'VPN Access, TeamViewer, Remote Shell, Log Export Tool',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-telemetry',
          aspect: 'Telemetry / Crash Reports',
          examples: 'Automated (Sentry/AppCenter), User Prompt, None (Offline)',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-resources',
          aspect: 'Resource Constraints',
          examples: 'Fixed RAM/CPU limit, GPU required, Specific Disk IOPS',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-logging',
          aspect: 'Logging',
          examples: 'NLog, Serilog, Log4j, Graylog',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-cicd',
          aspect: 'CI/CD Pipeline',
          examples: 'Azure DevOps, GitHub Actions, Jenkins',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-iac',
          aspect: 'Infrastructure as Code',
          examples: 'Terraform, Bicep, Ansible, Manual',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'ops-registry',
          aspect: 'Container Registry',
          examples: 'ACR, Docker Hub, Harbor, Nexus',
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
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-licensing',
          aspect: 'Licensing / DRM',
          examples: 'Hardware Dongle, License Key File, Online Activation, Floating Server',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-testing',
          aspect: 'Security Testing',
          examples: 'SonarQube, OWASP ZAP, Veracode',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'sec-secrets',
          aspect: 'Secret Management',
          examples: 'Env Vars, Vault, Credential Store',
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
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'infra-schema',
          aspect: 'Schema Migration',
          examples: 'Liquibase, Flyway, EF Migrations',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'infra-broker',
          aspect: 'Message Broker',
          examples: 'RabbitMQ, Kafka, Azure Service Bus',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'infra-orchestration',
          aspect: 'Orchestration',
          examples: 'K8s, Docker Compose, Windows Service',
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
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-buffering',
          aspect: 'Data Buffering',
          examples: 'Ring-Buffer, FIFO, Double-Buffering',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-realtime',
          aspect: 'Real-time Requirements',
          examples: 'Hard Realtime, Soft Realtime, Best Effort',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-lifecycle',
          aspect: 'Connection Lifecycle',
          examples: 'Persistent, Session-Based, On-Demand',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'hw-driver',
          aspect: 'Driver Abstraction',
          examples: 'Vendor API, Native Driver (DLL), SCPI',
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
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'qa-traceability',
          aspect: 'Traceability',
          examples: 'Built-in Link (ADO/Jira), Polarion',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'qa-e2e',
          aspect: 'E2E Testing',
          examples: 'Cypress, Playwright, Selenium, Ranorex',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        },
        {
          id: 'qa-performance',
          aspect: 'Performance Testing',
          examples: 'Benchmark.Net, JMeter, Gatling, k6',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        }
      ]
    }
  ]
}
