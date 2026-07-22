# Crisis Desk AI

> AI-powered emergency incident reporting and triage system.

Welcome — glad you're here. This document covers the architecture, how the pieces talk to each other, and how to get the project running locally or in production.

---

## 🔗 Quick Links

| Resource             | Link                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Live API             | [fx41l1wzbe.execute-api.ap-south-1.amazonaws.com/health](https://fx41l1wzbe.execute-api.ap-south-1.amazonaws.com/health) |
| Swagger UI (OpenAPI) | [dockermahin/crsdsk-ai-swagger](https://hub.docker.com/repository/docker/dockermahin/crsdsk-ai-swagger)                  |
| MCP Server (Docker)  | [dockermahin/mcp-crisis-desk-ai](https://hub.docker.com/repository/docker/dockermahin/mcp-crisis-desk-ai)                |
| Technical Reference  | [crisis-desk-ai-technical-documentation](https://gitmahin.github.io/crisis-desk-ai/)                                     |

---

The live API is up and ready to hit directly — no setup needed:

```
https://fx41l1wzbe.execute-api.ap-south-1.amazonaws.com
```

Want the full interactive API reference? Pull and run the Swagger UI image:

```bash
docker run --name crsdsk-swagger -p 8081:8080 dockermahin/crsdsk-ai-swagger:latest
```

Then open [http://localhost:8081](http://localhost:8081).

---

> [!WARNING]
> The live instance uses a **free-tier Voyage AI** key for embeddings. Under rapid or repeated hits, you may occasionally see a `500 Internal Server Error` due to rate limiting — this isn't a bug, just a free-tier limit. Retrying after a short pause usually resolves it.

## 📖 API Quick Reference

| Method | Endpoint                        | Description                                  |
| ------ | ------------------------------- | -------------------------------------------- |
| GET    | `/health`                       | Health check                                 |
| POST   | `/api/v1/user/create`           | Create a new user                            |
| GET    | `/api/v1/user/login`            | Log in a user                                |
| GET    | `/api/v1/reports`               | Get all reports (filter by category/urgency) |
| POST   | `/api/v1/reports`               | Create a new report                          |
| GET    | `/api/v1/reports/{id}`          | Get a report by ID                           |
| DELETE | `/api/v1/reports/{id}`          | Delete a report by ID                        |
| PATCH  | `/api/v1/reports/{id}`          | Update a report                              |
| GET    | `/api/v1/reports/stats/summary` | Get aggregate report analytics               |
| POST   | `/api/agent`                    | Invoke AI agent with MCP tool access         |

> Full request/response schemas, examples, and error codes are in the Swagger UI above.

## 🏗️ Architecture

This is a **monorepo**, structured around a few core ideas:

- **API layer** — an Express server deployed via the Serverless Framework on AWS Lambda, handling both REST endpoints and MCP tool/resource communication.
- **Database access** — centralized in `packages/database`.
- **Response & error events** — standardized through `packages/shared/src/events`.
- **Redis** — a single centralized instance, shared via `packages/shared`.
- **Validation** — handled with Zod, centralized in `packages/zod`.
- **Logging** — structured request logging via `pino`.
- **Infrastructure** — provisioned and managed with Terraform.
- **CI/CD** — automated deployments via GitHub Actions.

### MCP Response Contracts

- Tool responses use the `MCPToolResponse` class.
- Resource responses use the `MCPResourceResponse` class.

### Express Response Contracts

- Success responses use `ApiResponse`.
- Errors use `ApiError`.

---

## 🤖 How Clients Use the Tools

### Full agentic mode — `attachAgent`

Lets an AI model orchestrate tool calls on your behalf.

- Pass the model via the `X-Model-CRN` header (defaults to `openai/gpt-oss-20b` on Groq).
- You **must** also send `X-Use-Agent: true` — without it, the request is rejected.

### Direct tool execution — `useMCPTool`

Runs a single, specific tool by name.

- Takes a `toolName` and a `value` (tool arguments).
- _(Note: `value` naming is a known TODO — will likely be renamed for clarity.)_

### Resources

Resources back the RAG (retrieval-augmented generation) architecture: when the AI needs context, relevant data is pulled from the vector store and passed into the model.

---

## ⚡ Caching

Analytics endpoints use a slightly different caching strategy: once a specific user hits the endpoint **3+ times**, their result is cached for **5 minutes**.

A separate Redis-backed rate limiter also protects the API from abuse.

---

## 📚 Documentation

All technical/code documentation is generated with **TypeDoc**.

---

## 🛠️ Development Setup

1. Follow the general environment setup as described in the product setup guide.
2. For the MCP server specifically, configure environment variables in a `.env` file — see `.env.example` for the required keys.
3. Start local infrastructure:
   ```bash
   docker compose up
   ```
   This spins up **Redis**, **PostgreSQL**, and **MongoDB** locally.
4. Install dependencies:
   ```bash
   pnpm install
   ```
5. Build shared packages:
   ```bash
   pnpm build:pkg
   ```
6. Run the app:
   ```bash
   pnpm dev
   # or, to run only the MCP server + API server:
   pnpm --filter mcp --filter server dev
   ```
7. Point `mcp.json` at your locally running MCP server.

---

## 🚀 Production Setup

### 1. Terraform & Secrets

- Terraform state is stored securely in **HCP Terraform Cloud**, using **remote state management**.
- Environment variables don't need to be configured in multiple places — everything is served centrally through **AWS SSM**.
- Before applying, create the following environment variables (used by Terraform as `TF_VAR_*`):

  ```
  TF_VAR_database_url
  TF_VAR_groq_api_key
  TF_VAR_redis_username
  TF_VAR_redis_password
  TF_VAR_redis_host
  TF_VAR_redis_port
  TF_VAR_jwt_access_secret_key
  TF_VAR_jwt_refresh_secret_key
  TF_VAR_voyage_ai_api_key
  TF_VAR_mongo_url
  ```

### 2. VPC & Networking

The project runs inside a **custom VPC**, which you'll need to create and link in Terraform.

- A **NAT Gateway** is required for the private route table — the MCP container runs in a private subnet and needs outbound access to the database, Redis, and other services.
- Network layout: **2 public subnets**, **2 private subnets**.
- Security groups are created automatically during `terraform apply` — no manual setup needed.

Update the VPC reference here before applying:

```hcl
// ./terraform/modules/aws-vpc/main.tf
data "aws_vpc" "teambinary" {
  id = var.vpc_id # << change here
}
```

### 3. Database Setup

Two databases are used: **PostgreSQL** and **MongoDB**.

Vector search is handled automatically at the application level — you just need to create the databases and pass in the connection URLs.

### 4. Redis Setup

Create a Redis instance (Redis Cloud or another provider of your choice), then set the connection details via the `TF_VAR_*` variables above.

---

That's it — you're good to go. 🎉
