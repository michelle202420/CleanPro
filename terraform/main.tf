
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_security_group" "cleanpro" {
  name        = "${var.project_name}-sg"
  description = "Security group for CleanPro"

  tags = {
    Name    = "${var.project_name}-sg"
    Project = var.project_name
  }
}

resource "aws_instance" "cleanpro" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.cleanpro.id]

  tags = {
    Name    = var.project_name
    Project = var.project_name
  }
}
