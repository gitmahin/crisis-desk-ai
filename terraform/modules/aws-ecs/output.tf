output "alb_dns_name_output" {
  value       = aws_lb.app_lb.dns_name
  description = "Public url. You can hit in this url and run into postman."
}