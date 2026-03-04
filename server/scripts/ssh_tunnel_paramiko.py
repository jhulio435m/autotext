import argparse
import os
import select
import socketserver
import sys
import threading
import time

import paramiko


def parse_args():
  parser = argparse.ArgumentParser(description='Open a local TCP tunnel over SSH using Paramiko.')
  parser.add_argument('--ssh-host', required=True)
  parser.add_argument('--ssh-user', required=True)
  parser.add_argument('--ssh-password', default=os.getenv('SSH_PASSWORD', ''))
  parser.add_argument('--local-host', default='127.0.0.1')
  parser.add_argument('--local-port', type=int, required=True)
  parser.add_argument('--remote-host', default='')
  parser.add_argument('--remote-port', type=int, required=True)
  parser.add_argument('--docker-container', default='')
  return parser.parse_args()


def main():
  args = parse_args()
  if not args.ssh_password:
    print('Missing SSH password. Pass --ssh-password or set SSH_PASSWORD.', file=sys.stderr)
    return 2

  client = paramiko.SSHClient()
  client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
  client.connect(hostname=args.ssh_host, username=args.ssh_user, password=args.ssh_password, timeout=10)
  transport = client.get_transport()
  remote_host = args.remote_host

  if not remote_host and args.docker_container:
    cmd = f"docker inspect -f '{{{{range .NetworkSettings.Networks}}}}{{{{.IPAddress}}}}{{{{end}}}}' {args.docker_container}"
    _, stdout, _ = client.exec_command(cmd)
    remote_host = stdout.read().decode('utf-8', 'ignore').strip()

  if not remote_host:
    print('Missing remote host. Pass --remote-host or --docker-container.', file=sys.stderr)
    client.close()
    return 2

  class Handler(socketserver.BaseRequestHandler):
    def handle(self):
      try:
        chan = transport.open_channel(
          'direct-tcpip',
          (remote_host, args.remote_port),
          self.request.getpeername()
        )
      except Exception:
        return
      if chan is None:
        return
      try:
        while True:
          readable, _, _ = select.select([self.request, chan], [], [], 30)
          if self.request in readable:
            data = self.request.recv(32768)
            if not data:
              break
            chan.sendall(data)
          if chan in readable:
            data = chan.recv(32768)
            if not data:
              break
            self.request.sendall(data)
      finally:
        chan.close()
        self.request.close()

  class ForwardServer(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True

  server = ForwardServer((args.local_host, args.local_port), Handler)
  thread = threading.Thread(target=server.serve_forever, daemon=True)
  thread.start()

  print(
    f'SSH tunnel active: {args.local_host}:{args.local_port} -> '
    f'{remote_host}:{args.remote_port} via {args.ssh_user}@{args.ssh_host}'
  )

  try:
    while True:
      if not transport.is_active():
        print('SSH transport closed.')
        break
      time.sleep(1)
  except KeyboardInterrupt:
    pass
  finally:
    server.shutdown()
    server.server_close()
    client.close()

  return 0


if __name__ == '__main__':
  raise SystemExit(main())
