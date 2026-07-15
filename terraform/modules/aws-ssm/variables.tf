variable "database_url" {
  type = string
}

variable "groq_api_key" {
  type = string
}

variable "redis_username" {
  type = string
}

variable "redis_password" {
  type = string
}

variable "redis_host" {
  type = string
}

variable "redis_port" {
  type = string
}

variable "jwt_access_secret_key" {
  type = string
}

variable "jwt_refresh_secret_key" {
  type = string
}

variable "tags" {
  type = map(string)
}
