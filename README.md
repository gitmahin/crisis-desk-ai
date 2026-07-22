### Hey, welcome. Happy to see you here.

# Crisis Desk AI

## Application architecture

application is build on to of monorepo architecture.
using express server by aws serverless framework for api communication and mcp server
database is accessing from pacakges/database
application response events are managing from packages/shared/src/events
centralized redis instance from packages/shared
zod validation is from packages/zod
Its using pino logger for logging request in express server
application infrastructuer is handling by terraform
auto deployment by git actions ci/cd

## lets talk about mcp responses

for tool response
its using MCPToolResponse class
for resource response its using MCPResourceResponse class

express is using Apiresponse and Apierror class

## how consumer is using tools on top of api

we have attachAgent for full agentic operation. you can pass ai model name via header x-model-crn
this is from groq collection by default uses gpt-oss-20b. to use agentic solution you must have to pass another header x-use-agent=true. otherwise it will throw error

we have useMCPTool which takes values and toolname to perform one specific operation. value is for tool arguments. i should change the naming of it :)

# how resources are used

resources are used by reg arcitecture if ai is interacting with it. by getting query from user it get data from vectorized and passes to ai if need.

## Caching algorithm

for getting analytics its caching machanism is different. if user hits 3 times + data for that specific user will be cached for 5 mins.
there is also ratelimiter redis

## All code technical documenting is performed by typedoc

# Development setup

follow environment setup from product setup but for mcp server specify envs in .env file. see .env.example.
run docker compose up to start the redis, postgres and mongodb locally.
pnpm install
pnpm build:pkg
pnpm dev
or, pnpm --filter mcp --filter server dev

configure the mcp.json to localhsot running mcp server

# Production setup

## Initial terraform setup

### Environment Secrets setup

Store secure states in hcp cloud
Its using remote state management method for security
No need to setup environment variables multiples places
as these are using via aws ssm. so enviroment variables are served by one centralized system, aws ssm
you just have to create all these environment variables

```
"TF_VAR_database_url"

"TF_VAR_groq_api_key"

"TF_VAR_redis_username"

"TF_VAR_redis_password"

"TF_VAR_redis_host"

"TF_VAR_redis_port"
"TF_VAR_jwt_access_secret_key"
"TF_VAR_jwt_refresh_secret_key"
"TF_VAR_voyage_ai_api_key"
"TF_VAR_mongo_url"
```

## VPC & Networking

This project is hosted on custom vpc. so you have to create your vpc and link in terraform
You must have to create NAT Gateway for private route table as mcp container is running in private network. it needs to connect to the database, redis and other services etc
two public subnets and two private subnets
Dont worry about security groups. Security groups are created seperately when you write
`terraform apply`

./terraform/modules/aws-vpc/main.tf

```tf
data "aws_vpc" "teambinary" {
  id = var.vpc_id # << change here
}
```

## Database setup

This application is using two database, one postgres and mongodb
you dont need to setup vector searching. it automatically create in application level. just create database and pass the url

## redis setup

create redis database in redis cloud or from other

you are good to go
