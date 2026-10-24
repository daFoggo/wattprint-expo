# Cấu hình Claude global (tóm tắt)

Nguồn: `C:\Users\Foggo\.claude\` (bản sao thông tin, sửa file gốc mới có hiệu lực)

## Session chính: `settings.json`
| Khóa | Giá trị |
|---|---|
| model | sonnet |
| effortLevel | medium |
| maxEffortLevel | medium (trần effort) |
| permissions.defaultMode | auto |
| theme | dark |
| autoUpdatesChannel | latest |

Model của subagent KHÔNG nằm trong settings.json mà ở frontmatter từng file agent.

## Subagent: `agents/*.md`
| Agent | model | effort | tools | Vai trò |
|---|---|---|---|---|
| planner | opus | medium | Read, Grep, Glob, WebFetch, WebSearch | Thiết kế/lập plan, không sửa file |
| reviewer | opus | medium | Read, Grep, Glob, Bash | Review đúng/bảo mật/phạm vi, chỉ đọc |
| implementer | sonnet | medium | tất cả | Viết code theo task (TDD) |
| scout | haiku | medium | Read, Grep, Glob | Tìm kiếm/đọc code, trả bản tóm tắt |
| runner | haiku | medium | Bash, Read, Grep | Chạy test/build/lint, tóm tắt log |

## Hook (PreToolUse, matcher Bash)
Đã xóa 2 mục gọi trực tiếp `.py` (trùng). Còn lại:
1. `block-dangerous.py` qua python uv 3.12
2. `filter-test-output.py` qua python uv 3.12

## Quy ước
- Không dùng Fable (claude-fable-5-1).
- Đã đổi scout và runner sang haiku; giữ nguyên các agent còn lại.
