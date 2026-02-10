# LOCAL REPORT (Mac) - #午後

## git
/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset
## main...origin/main [ahead 1]
 M api/src/core/llmWrapper.ts
 M client/src/components/fileUpload/FileList.tsx
 M client/src/components/mobile/ChatMenuSheet.tsx
 M client/src/pages/ChatRoom.tsx
 M package.json
 M pnpm-lock.yaml
 M tsconfig.json
R  web/src/i18n/useI18n.ts -> web/src/i18n/useI18n.tsx
?? client/package.json
?? client/pnpm-lock.yaml
?? client/tsconfig.json
?? reports/LOCAL_REPORT.md

HEAD:
b644b6a1f2f170b1bc1e62a95b30780ac5698921

recent commits:
b644b6a feat(web): Ark skin + i18n toggle (ja default)
2efe241 fix(web): restore deps so vite build works on VPS
2139d2e Merge pull request #3 from TenmonAI/feat/web-gpt-light
55b5bc2 feat(web): GPT light shell (web-only)
728136e fix(web): default API_BASE_URL to same-origin (avoid mixed content)
de52034 fix(web): force vite base to /pwa/ (subpath deploy)
f5c3eac fix(web): export App as named export (match main.tsx)
2e776fa feat(web): add tabs + mount ChatPage/KokuzoPage (no router)
9280608 feat(chat): HYBRID_END_QUESTION_V2 (reply-time enforce question close)
81524ae feat(chat): HYBRID_END_QUESTION_V1 (ensure normal HYBRID ends with question)
01206ca feat(chat): DETAIL_DOMAIN_EVIDENCE_V1 (#detail domain -> conversation+evidence)
768be51 feat(chat): add HYBRID_TALK_WRAP_V2 (light opener+question on finalResponse)
a45d787 fix(chat): restore chat.ts from known-good SHA (80a3d00)
fbfba4b fix(chat): move HYBRID_TALK_WRAP_V1 after finalResponse declaration
76ae98b feat(talk): wrap HYBRID finalResponse with danshari cadence
80a3d00 fix(chat): use conversational response for HYBRID surface
cdd6c13 fix(kanagi): make responseComposer self-contained (build pass)
7183006 fix(kanagi): restore missing symbols for responseComposer (build/pass)
6e37f81 fix(kanagi): dedupe responseComposer (keep single conversational surface)
2bd599b feat(persona): add danshari phrasebook v2

## web build
-rw-r--r--  1 sarutahiko  staff    511  2 10 17:34 web/package.json
-rw-r--r--  1 sarutahiko  staff  45863  2 10 17:34 web/pnpm-lock.yaml
v22.20.0
10.4.1

build result:

> tenmon-ark-web@0.1.0 build /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/web
> vite build

vite v5.4.21 building for production...
transforming...
✓ 51 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.41 kB │ gzip:  0.28 kB
dist/assets/index-Cz9_KUnK.css   23.57 kB │ gzip:  5.62 kB
dist/assets/index-D0hzaqiC.js   165.93 kB │ gzip: 53.05 kB
✓ built in 375ms

dist:
total 8
drwxr-xr-x@  4 sarutahiko  staff  128  2 10 18:44 .
drwxr-xr-x@ 12 sarutahiko  staff  384  2 10 18:44 ..
drwxr-xr-x   4 sarutahiko  staff  128  2 10 18:44 assets
-rw-r--r--   1 sarutahiko  staff  407  2 10 18:44 index.html
total 376
drwxr-xr-x  4 sarutahiko  staff     128  2 10 18:44 .
drwxr-xr-x@ 4 sarutahiko  staff     128  2 10 18:44 ..
-rw-r--r--  1 sarutahiko  staff   23570  2 10 18:44 index-Cz9_KUnK.css
-rw-r--r--  1 sarutahiko  staff  167202  2 10 18:44 index-D0hzaqiC.js

index.html:
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TENMON-ARK Web</title>
    <script type="module" crossorigin src="/pwa/assets/index-D0hzaqiC.js"></script>
    <link rel="stylesheet" crossorigin href="/pwa/assets/index-Cz9_KUnK.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
