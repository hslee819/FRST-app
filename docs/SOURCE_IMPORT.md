# 실제 프로젝트 소스

2026-11-06에 `C:\coding\app`의 개발 소스를 이 저장소의 `app/`으로 가져왔습니다. GitHub 최신 변경을 먼저 반영했고, 소스 가져오기는 기존 배포 화면, 아이콘, ZIP, README를 덮어쓰지 않습니다. 새 소스는 기존 파일과 이름이 같아도 충돌하지 않도록 별도 폴더에 두었습니다.

작업 중 원격에 추가된 `기존 앱 화면/`·`개선 앱 화면/` 폴더 정리도 반영했습니다. 기존 배포본은 그 원격 변경에 따른 위치에 보존하며, 이 가져오기 커밋은 소스와 작업 지침을 추가합니다.

## 가져온 범위

- `app/index.html`, JS, CSS, 빌드·미리보기 도구: FOCUS 대시보드
- `app/premium/`: 프리미엄 대시보드
- `app/EBOOK/`: eBook·플래시카드 소스와 연동 테스트
- `app/ta/`: TA 소스, 원본 화면, 빌드·미리보기 도구, 회귀 테스트
- `app/n/`: 가져오기 도중 원본에 추가된 재종 N 앱의 소스·빌드·미리보기 도구, 참고 이미지와 자산
- 단일 HTML 배포본과 원본 JPG/PNG 참고 자료
- `original-checksums.json`: 이전 작업의 기록으로 보존. 내부의 절대 경로는 현재 실행 경로가 아닙니다.

로컬 설정 `.codex/`, 임시 검증 자료 `ta/.qa/`, 이전 배포 준비 폴더 `github-upload/`와 그 안의 중첩 `.git`은 제외했습니다. 원본 폴더는 수정하지 않았습니다. 가져온 작업 지침은 현재 소스와 테스트에 맞게 정리했습니다. eBook 진입 파일은 `EBOOK/ebook.html`이며, TA는 현재의 접이식 메뉴와 전체 화면 레이아웃을 유지합니다.

앞으로는 **이 저장소의 `app/`**에서 개발합니다. `C:\coding\app`과의 자동 양방향 복사는 설정하지 않았습니다. 루트의 기존 배포 화면을 새 소스로 교체하는 작업도 이번 가져오기에 포함하지 않았습니다.

## 배포 첫 화면 연결

후속 대조에서 `C:\Coding\app`의 재종 N 앱에 추가된 몰입도·성적 화면과 테스트 등 18개 소스·배포 파일, 최신 README를 반영했습니다. 원본의 프로젝트 파일 173개를 재대조했고, 저장소용으로 보정한 지침·README 4개를 제외한 파일은 원본과 일치합니다. N 빌드와 회귀 테스트 27개가 통과했습니다. 앞으로 전체 최신 버전의 커밋·푸시 요청 시에는 원본 폴더도 대조합니다.

소스 가져오기 후 Vercel에서 최신 앱에 접근할 수 있도록 루트 `index.html`의 E-BOOK, TA, 시대인재N 링크를 각각 `app/EBOOK.html`, `app/ta/TA.html`, `app/n/N.html`로 연결했습니다. 스케줄러·타이머와 콘텐츠 서랍장은 기존 경로를 유지합니다. `기존 앱 화면/`과 `개선 앱 화면/`의 이전 배포 파일은 보존합니다. 이후 앱을 수정할 때는 소스와 해당 배포본을 함께 갱신해야 첫 화면에서 최신 결과를 열 수 있습니다.

## 빌드와 검증

Node.js 20 이상이 필요하고 패키지 설치는 필요 없습니다. 저장소 루트에서 실행합니다. 각 명령의 성공을 확인한 다음 다음 명령을 실행합니다.

```powershell
node app/build-standalone.mjs
node app/premium/build-standalone.mjs
node app/n/build.mjs
node --test app/n/tests/*.test.mjs
npm.cmd --prefix app/ta run build
node app/EBOOK/build.mjs
npm.cmd --prefix app/ta test
node --test app/EBOOK/tests/*.test.mjs
node app/EBOOK/verify.mjs
git diff --check
```

eBook은 TA 배포본을 포함하므로 TA를 먼저 빌드합니다. 생성 파일은 모두 `app/` 안에 있습니다. `app/ta/basic.html`의 원본 SHA256은 `996146692DDE8CB54CB68681E9DAC4C0C04EE2BC0657622D984A83C42F2C8FF5`입니다. `.gitattributes`는 가져온 파일의 줄바꿈이 Git 설정으로 자동 변환되어 원본 검증이 깨지는 것을 방지합니다.

원본의 CRLF 줄바꿈을 허용하고, 기존 빌더가 생성하는 `app/몰입도.html`, `app/몰입도-리디자인.html`, `app/n/N.html`의 공백 줄은 그대로 보존하도록 해당 생성 파일의 줄 끝 공백 검사만 제외했습니다. 개발 소스의 공백 검사는 유지합니다.

자동 검사는 빌드와 회귀 동작을 확인합니다. VM/DOM 모의 검사는 실제 브라우저의 배치와 렌더링 검증을 대신하지 않습니다.

원본 폴더에서도 작업이 진행 중이어서 최종 대조 시점의 165개 파일을 가져왔습니다. 뒤늦게 추가된 재종 N 앱 소스와 테스트도 포함했고, `app/n/N.html`은 가져온 소스로 다시 빌드했습니다. TA 41개, eBook 연동 6개, N 앱 15개 테스트와 eBook 통합 검사가 통과했습니다. 원본 폴더의 이후 변경은 이 복사본에 자동 반영되지 않습니다.

## 미리보기

| 대상 | 저장소 루트에서 실행 | 주소 |
| --- | --- | --- |
| FOCUS | `node app/preview.mjs` | `http://127.0.0.1:4173` |
| 프리미엄 | `node app/premium/preview.mjs` | `http://127.0.0.1:4174` |
| 재종 N | `node app/n/preview.mjs` | `http://127.0.0.1:4176` |
| TA | `npm.cmd --prefix app/ta run preview` | `http://127.0.0.1:4174/renewal.html` |
| eBook | `node app/EBOOK/preview.mjs` | `http://127.0.0.1:4175` |

프리미엄과 TA는 기본 포트가 같으므로 하나씩 실행하거나 `PORT` 환경 변수로 구분합니다. 서버는 `Ctrl+C`로 종료합니다.

## 협업 절차

저장소 루트 `AGENTS.md`에 사용자의 상시 작업 지시를 기록했습니다. 이 저장소의 작업을 시작할 때 별도 요청 없이 원격 변경을 가져와 반영하고, 수정 후 관련 검증을 거쳐 커밋·푸시합니다. 로컬의 미완료 변경과 타인의 커밋은 보존합니다. 푸시 직전에도 원격을 다시 확인하며 강제 푸시는 사용하지 않습니다.

GitHub는 각자의 로컬 파일을 실시간으로 바꾸지 않습니다. 상대방은 자신의 로컬에서 최신 커밋을 가져와야 합니다. 미커밋 변경이 없고 브랜치가 단순히 뒤처진 경우에는 `git pull --ff-only`로 받을 수 있습니다.

`AGENTS.md`의 프로젝트 지침 방식은 [OpenAI 공식 문서](https://learn.chatgpt.com/docs/agent-configuration/agents-md)를 참고했습니다. 이 파일은 작업 지침이며 상시 동기화 데몬이나 자동 실행 Git hook은 아닙니다.
