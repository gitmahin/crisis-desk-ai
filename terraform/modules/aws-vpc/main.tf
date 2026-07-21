# ==============================================================================
# Existing Networking Infrastructure
# Fetch metadata for a pre-existing VPC and its associated subnets.
# ==============================================================================

# Fetch existing VPC attributes
data "aws_vpc" "teambinary" {
  id = var.vpc_id
}

# Look up private subnet IDs filtered by VPC ID and name tags
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

# Look up public subnet IDs filtered by VPC ID and name tags
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

