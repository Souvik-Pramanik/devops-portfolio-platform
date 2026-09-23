variable "aws_region" {
  description = "AWS region for the DevOps Portfolio Platform"
  type        = string
  default     = "ap-south-1"
}

variable "image_tag" {
  description = "Immutable ECR image tag"
  type        = string
  default     = "latest"
}
variable "enable_blue_green" {
  description = "Enable the optional ECS CodeDeploy blue/green deployment foundation."
  type        = bool
  default     = false
}
