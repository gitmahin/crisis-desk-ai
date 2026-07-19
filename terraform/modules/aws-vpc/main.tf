

data "aws_vpc" "teambinary" {
  id = var.vpc_id
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.teambinary.id]
  }

  filter {
    name   = "tag:Name"
    values = var.vpc_private_subnets_tags
  }
}

data "aws_subnets" "public" {
    filter {
    name   = "vpc-id"
    values = [data.aws_vpc.teambinary.id]
  }

  filter {
    name   = "tag:Name"
    values = var.vpc_public_subnets_tags
  }
}

