# 농사 게임

HTML + CSS + JavaScript만으로 만든 농사 게임입니다. 서버가 필요 없고, PC와 모바일 모두 지원합니다.

## 조작

| | PC | 모바일 |
|---|---|---|
| 이동 | WASD | 왼쪽 아래 조이스틱 |
| 수확 | 미니언 위에서 좌클릭 | 미니언 탭 |
| 상점 열기 | 상점 주인 우클릭 | 상점 주인 탭 |

## 이미지·소리 넣기

`assets/images`, `assets/sounds` 폴더에 파일을 넣으면 자동으로 적용됩니다. 파일이 없으면 임시 그림과 합성 효과음이 나옵니다. 파일 이름은 `game.js` 맨 위의 `ASSETS`에서 바꿀 수 있습니다.

## GitHub Pages로 배포하기

1. GitHub에서 **public** 저장소를 만듭니다.
2. 이 폴더의 파일을 모두 저장소에 올립니다 (`index.html`이 맨 위 경로에 있어야 합니다).
3. 저장소의 **Settings → Pages**에서 Source를 `Deploy from a branch`, Branch를 `main` / `(root)`로 선택하고 Save를 누릅니다.
4. 1~2분 뒤 `https://내아이디.github.io/저장소이름/` 주소로 접속할 수 있습니다.
