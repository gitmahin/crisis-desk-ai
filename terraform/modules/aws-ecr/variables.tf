# Name of the container repository
variable "ecr_repo_name" {
  type = string
}


variable "default_service_tags" {
  type = map(string)
}