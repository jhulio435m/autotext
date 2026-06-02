import { EventEmitter } from 'node:events';

const lockEmitter = new EventEmitter();
lockEmitter.setMaxListeners(200);

const CLIENT_EVENT = 'lock-event';

export function subscribeLockEvents(req, res) {
  const userId = req.auth?.userId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write('data: {"type":"connected"}\n\n');

  function onEvent(payload) {
    if (payload.userId && payload.userId !== userId) return;
    res.write(`data: ${JSON.stringify(payload.data)}\n\n`);
  }

  lockEmitter.on(CLIENT_EVENT, onEvent);

  const keepAlive = setInterval(() => {
    try {
      res.write(':keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on('close', () => {
    lockEmitter.off(CLIENT_EVENT, onEvent);
    clearInterval(keepAlive);
  });
}

export function emitLockEvent(userId, data) {
  lockEmitter.emit(CLIENT_EVENT, { userId, data });
}
