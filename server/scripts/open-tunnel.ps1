param(
  [string]$SshUser = "yeul",
  [string]$SshHost = "100.115.3.37",
  [int]$LocalPort = 5432,
  [string]$RemoteHost = "127.0.0.1",
  [int]$RemotePort = 5432
)

Write-Host "Abriendo tunel SSH: localhost:$LocalPort -> $RemoteHost:$RemotePort via $SshUser@$SshHost"
Write-Host "Mantén esta terminal abierta mientras uses la app."

ssh -L "${LocalPort}:${RemoteHost}:${RemotePort}" "${SshUser}@${SshHost}"
