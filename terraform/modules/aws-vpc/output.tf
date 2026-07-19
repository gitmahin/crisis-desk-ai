output "vpc_id_ouput" {
  type = string
  value = data.aws_vpc.teambinary.id
}


output "vpc_private_subnet_ids" {
  type = list(string)
  value = data.aws_subnets.private.ids
}

output "vpc_public_subnet_ids" {
  type = list(string)
  value = data.aws_subnets.public.ids
}