variable "vpc_id" {
  type = string
}

variable "vpc_private_subnets_tags" {
  type = list(string)

}


variable "vpc_public_subnets_tags" {
  type = list(string)

}


