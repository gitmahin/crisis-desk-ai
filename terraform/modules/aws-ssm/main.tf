resource "aws_ssm_parameter" "database_url" {
  name  = "/crsai/prod/database_url"
  type  = "SecureString"
  value = var.database_url
  tags  = var.tags
}

resource "aws_ssm_parameter" "groq_api_key" {
  name  = "/crsai/prod/groq_api_key"
  type  = "SecureString"
  value = var.groq_api_key
  tags  = var.tags
}

resource "aws_ssm_parameter" "redis_username" {
  name  = "/crsai/prod/redis_username"
  type  = "SecureString"
  value = var.redis_username
  tags  = var.tags
}

resource "aws_ssm_parameter" "redis_password" {
  name  = "/crsai/prod/redis_password"
  type  = "SecureString"
  value = var.redis_password
  tags  = var.tags
}

resource "aws_ssm_parameter" "redis_host" {
  name  = "/crsai/prod/redis_host"
  type  = "SecureString"
  value = var.redis_host
  tags  = var.tags
}

resource "aws_ssm_parameter" "redis_port" {
  name  = "/crsai/prod/redis_port"
  type  = "SecureString"
  value = var.redis_port
  tags  = var.tags
}

resource "aws_ssm_parameter" "jwt_access_secret_key" {
  name  = "/crsai/prod/jwt_access_secret_key"
  type  = "SecureString"
  value = var.jwt_access_secret_key
  tags  = var.tags
}

resource "aws_ssm_parameter" "jwt_refresh_secret_key" {
  name  = "/crsai/prod/jwt_refresh_secret_key"
  type  = "SecureString"
  value = var.jwt_refresh_secret_key
  tags  = var.tags
}

resource "aws_ssm_parameter" "voyage_ai_api_key" {
  name  = "/crsai/prod/voyage_ai_api_key"
  type  = "SecureString"
  value = var.voyage_ai_api_key
  tags  = var.tags
}


resource "aws_ssm_parameter" "mongo_url" {
  name  = "/crsai/prod/mongo_url"
  type  = "SecureString"
  value = var.mongo_url
  tags  = var.tags
}
