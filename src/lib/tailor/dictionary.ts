/**
 * Skills and tools that show up in job descriptions, with their common
 * spellings. One line per skill: "Canonical name | alias | alias".
 * An alias starting with "=" is matched case-sensitively ("=Go" matches the
 * language, not the verb "go").
 *
 * This list is the reason matching is reliable without AI: "JS", "Javascript"
 * and "ECMAScript" all count as the same skill.
 */
const RAW: Record<string, string> = {
  Languages: `
JavaScript | js | ecmascript | es6
TypeScript | ts
Python | py
Java
Kotlin
Swift
Go | golang | =Go
Rust
C++ | cpp
C# | csharp | c sharp
PHP
Ruby
Scala
Dart
Elixir
SQL
Bash | shell scripting
HTML | html5
CSS | css3`,
  Frontend: `
React | react.js | reactjs
Next.js | nextjs | next js
Vue | vue.js | vuejs
Nuxt | nuxt.js
Angular | angularjs
Svelte | sveltekit
Redux | redux toolkit
TanStack Query | react query
Tailwind CSS | tailwind | tailwindcss
Sass | scss
Webpack
Vite
Storybook
Web accessibility | accessibility | a11y | wcag
Responsive design | responsive
Web performance | core web vitals | lighthouse`,
  Backend: `
Node.js | node | nodejs
Express | express.js | expressjs
NestJS | nest.js
Django
Flask
FastAPI
Spring Boot | =Spring
Laravel
Ruby on Rails | rails
.NET | dotnet | asp.net
GraphQL
REST APIs | restful | rest api | restful apis | =REST
gRPC
Microservices | microservice | micro-services
WebSockets | websocket
OAuth | oauth2 | openid connect | oidc
Message queues | rabbitmq | kafka | sqs`,
  Data: `
PostgreSQL | postgres | psql
MySQL
MongoDB | mongo
Redis
SQLite
Elasticsearch | opensearch
DynamoDB
Firebase | firestore
Supabase
Prisma
Data modeling | data modelling | database design
ETL | data pipelines | data pipeline
Pandas
NumPy
Spark | pyspark | apache spark
Airflow
dbt
Power BI | powerbi
Tableau
Excel | microsoft excel | spreadsheets
Data analysis | data analytics
Statistics | statistical analysis`,
  "Cloud & DevOps": `
AWS | amazon web services
Azure | microsoft azure
Google Cloud | gcp | google cloud platform
Docker | containers | containerization
Kubernetes | k8s
Terraform | infrastructure as code | iac
CI/CD | ci cd | continuous integration | continuous delivery | continuous deployment
GitHub Actions
GitLab CI
Jenkins
Linux | unix
Nginx
Serverless | lambda | aws lambda
Monitoring | observability | prometheus | grafana | datadog
Vercel
Git | github | gitlab | version control`,
  Testing: `
Unit testing | unit tests
Jest
Vitest
Cypress
Playwright
Selenium
Pytest
Test-driven development | tdd
End-to-end testing | e2e | end to end testing
QA | quality assurance`,
  Mobile: `
React Native
Flutter
Android
iOS
Mobile development | mobile apps`,
  "AI & ML": `
Machine learning | ml
Deep learning
LLMs | llm | large language models | generative ai | genai
Prompt engineering
RAG | retrieval-augmented generation | retrieval augmented generation
PyTorch
TensorFlow
scikit-learn | sklearn
NLP | natural language processing
Computer vision`,
  Design: `
Figma
UI design | user interface design
UX design | ux | user experience
Design systems | design system
Prototyping | prototype
Wireframing | wireframes
User research | usability testing
Adobe Creative Suite | photoshop | illustrator | adobe xd
Sketch | =Sketch`,
  Practices: `
Agile | agile methodologies
Scrum
Kanban
Jira
Code review | code reviews
System design | software architecture | architecture
Security | application security | owasp
Performance optimization | performance tuning
Technical documentation | documentation
Mentoring | mentorship | coaching
Stakeholder management | stakeholders
Project management
Product management
Cross-functional collaboration | cross-functional
Customer support | customer service
Leadership | team lead | led a team`,
}

export type DictionaryEntry = { name: string; category: string; aliases: string[] }

export const DICTIONARY: DictionaryEntry[] = Object.entries(RAW).flatMap(([category, block]) =>
  block
    .trim()
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()).filter(Boolean))
    .map(([name, ...rest]) => ({
      name,
      category,
      // "Go | golang | =Go": the case-sensitive form replaces the plain name.
      aliases: rest.includes(`=${name}`) ? rest : [name, ...rest],
    })),
)
