variable "vpc_cidr" {
  description = "CIDR block for the DevOps Portfolio VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability Zones for the VPC public subnets"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}