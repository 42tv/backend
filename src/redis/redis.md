redis 이벤트 요약
1. 방송 웹소켓 Room에 관련된 이벤트는 `room:{broadcasterId}`로 전달
2. 서버 커맨드 관련은 server_command:${this.serverId}로 전달