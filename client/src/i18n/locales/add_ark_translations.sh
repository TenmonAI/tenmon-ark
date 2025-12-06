#!/bin/bash

# ko.json
jq '. + {
  "ark": {
    "projects": "Ark 프로젝트",
    "new_project": "새 프로젝트",
    "project_detail": "프로젝트 상세",
    "edit_preview": "편집 미리보기",
    "cut_point_timeline": "컷 포인트 타임라인",
    "subtitle_preview": "자막 미리보기",
    "balance_graph": "화수 균형 그래프",
    "download_srt": "SRT 다운로드",
    "download_vtt": "VTT 다운로드",
    "breath_point": "호흡점",
    "hi_to_mizu": "화에서 수로",
    "mizu_to_hi": "수에서 화로",
    "fire": "화",
    "water": "수",
    "balance": "균형"
  }
}' ko.json > ko.json.tmp && mv ko.json.tmp ko.json

# zh-CN.json
jq '. + {
  "ark": {
    "projects": "Ark 项目",
    "new_project": "新项目",
    "project_detail": "项目详情",
    "edit_preview": "编辑预览",
    "cut_point_timeline": "切点时间轴",
    "subtitle_preview": "字幕预览",
    "balance_graph": "火水平衡图",
    "download_srt": "下载 SRT",
    "download_vtt": "下载 VTT",
    "breath_point": "呼吸点",
    "hi_to_mizu": "火到水",
    "mizu_to_hi": "水到火",
    "fire": "火",
    "water": "水",
    "balance": "平衡"
  }
}' zh-CN.json > zh-CN.json.tmp && mv zh-CN.json.tmp zh-CN.json

# zh-TW.json
jq '. + {
  "ark": {
    "projects": "Ark 專案",
    "new_project": "新專案",
    "project_detail": "專案詳情",
    "edit_preview": "編輯預覽",
    "cut_point_timeline": "切點時間軸",
    "subtitle_preview": "字幕預覽",
    "balance_graph": "火水平衡圖",
    "download_srt": "下載 SRT",
    "download_vtt": "下載 VTT",
    "breath_point": "呼吸點",
    "hi_to_mizu": "火到水",
    "mizu_to_hi": "水到火",
    "fire": "火",
    "water": "水",
    "balance": "平衡"
  }
}' zh-TW.json > zh-TW.json.tmp && mv zh-TW.json.tmp zh-TW.json

echo "翻訳追加完了"
