variable "aws_region" {
  description = "AWS region for CleanPro"
  type        = string
  default     = "eu-north-1"
}

variable "instance_type" {
  description = "EC2 instance type for the CleanPro exercise"
  type        = string
  default     = "t3.micro"
}

variable "project_name" {
  description = "Project name used for AWS resource tags"
  type        = string
  default     = "CleanPro"
}