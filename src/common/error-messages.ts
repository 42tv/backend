/**
 * 공통 에러 메시지 상수
 * 일관된 에러 메시지 관리를 위해 사용
 */
export const ErrorMessages = {
  USER: {
    NOT_FOUND: '존재하지 않는 사용자입니다.',
    ALREADY_EXISTS: '이미 존재하는 아이디입니다.',
    NICKNAME_ALREADY_EXISTS: '이미 존재하는 닉네임입니다.',
    INVALID_PASSWORD: '비밀번호가 일치하지 않습니다',
    INVALID_NICKNAME_LENGTH: '닉네임은 1자리 이상 10자리 이하로 입력해주세요',
    CANNOT_SELF_BLOCK: '자기 자신을 차단할 수 없습니다.',
    ALREADY_BLOCKED: '이미 차단된 사용자입니다.',
    NOT_BLOCKED: '차단되지 않은 사용자입니다.',
    CANNOT_SELF_MANAGE: '자기 자신을 매니저로 추가할 수 없습니다.',
    ALREADY_MANAGER: '이미 매니저로 등록된 사용자입니다.',
    NOT_MANAGER: '매니저로 등록되지 않은 사용자입니다.',
    CANNOT_SEND_TO_SELF: '자기 자신에게는 쪽지를 보낼 수 없습니다.',
    VIEWER_INFO_UNAVAILABLE: '시청자 정보를 불러올 수 없습니다.',
    INVALID_TOKEN_INDEX: 'Invalid user index in token',
    ALREADY_BLOCKED_POST: '이미 차단한 유저입니다',
    NOT_ADULT_VERIFIED: '성인 인증이 필요합니다',
  },
  BROADCASTER: {
    NOT_FOUND: '존재하지 않는 방송자입니다.',
    NOT_BROADCASTING: '방송에 참여하지 않았거나 방송이 진행 중이지 않습니다.',
    STREAMER_NOT_FOUND: '존재하지 않는 스트리머입니다.',
    NOT_LIVE: '방송중인 스트리머가 아닙니다.',
    VIEWER_LIST_NO_PERMISSION:
      '해당 방송자의 시청자 목록을 조회할 권한이 없습니다.',
    KICK_NO_PERMISSION: '시청자를 kick할 권한이 없습니다.',
    ALREADY_RECOMMENDED_TODAY: '오늘 이미 추천하셨습니다.',
  },
  CHANNEL: {
    NOT_FOUND: '채널이 존재하지 않습니다.',
    ALREADY_EXISTS: '이미 채널이 생성되어 있습니다.',
    CANNOT_CHANGE_WHILE_BROADCASTING: '방송중에는 변경불가능합니다',
  },
  BROADCAST: {
    SETTING_NOT_FOUND: '방송 설정이 존재하지 않습니다.',
    FAN_ONLY: '팬 전용 방송입니다',
    GUEST_NOT_ALLOWED: '게스트는 시청할 수 없습니다',
    WRONG_PASSWORD: '비밀번호가 틀렸습니다',
    USER_BANNED: '해당 방송에 제재된 사용자입니다',
  },
  POST: {
    SETTING_NOT_FOUND: '쪽지 설정을 찾을 수 없습니다.',
    FAN_LEVEL_NOT_SET: '팬레벨이 설정되지 않았습니다.',
    FAN_LEVEL_TOO_LOW: '팬레벨이 부족하여 쪽지를 보낼 수 없습니다.',
  },
  FILE: {
    NOT_PROVIDED: '파일이 없습니다',
    INVALID_FORMAT: 'jpeg, png, jpg, webp 파일만 업로드 가능합니다',
    SIZE_LIMIT_EXCEEDED: '파일 사이즈는 5MB 이하로 업로드 가능합니다',
    UPLOAD_FAILED: '파일 업로드에 실패했습니다',
  },
  PASSWORD: {
    INVALID_FORMAT:
      '새 비밀번호는 8자리 이상 알파벳,숫자,특수문자 1개씩 이상이어야 합니다',
  },
  BOOKMARK: {
    INVALID_DELETE_REQUEST: '유효하지 않은 북마크 삭제요청입니다',
  },
  FAN_LEVEL: {
    INVALID_COLOR: '잘못된 색상 값입니다. 유효한 색상값을 입력해주세요.',
    INVALID_NAME_LENGTH: '팬레벨 이름은 1자 이상 10자 이하로 입력해주세요.',
    INVALID_MIN_DONATION: '최소 후원 금액은 0원 이상이어야 합니다.',
  },
  AUTH: {
    GUEST_NOT_ALLOWED: 'Member Guard not allow guest',
    INVALID_TOKEN: 'Invalid or expired token',
    NO_EMAIL_FOUND: 'No email found',
  },
  AWS: {
    IVS_CHANNEL_CREATE_FAILED: 'AWS의 IVS 채널 생성요청 실패',
    IVS_CHANNEL_DELETE_FAILED: 'AWS의 IVS 채널 삭제요청 실패',
    STREAM_KEY_CREATE_FAILED: 'AWS의 streamKey 생성 실패',
    STREAM_KEY_DELETE_FAILED: 'AWS의 스트림키 삭제 실패',
    S3_UPLOAD_FAILED: 'AWS S3 파일 업로드 실패',
  },
  GENERIC: {
    INVALID_REQUEST: '유효하지 않은 요청입니다',
    UPDATE_FAILED: '업데이트에 실패했습니다',
    DELETE_FAILED: '삭제에 실패했습니다',
    TRANSACTION_FAILED: 'User, Channel, Ivs 생성 트랜잭션 실패',
  },
} as const;
